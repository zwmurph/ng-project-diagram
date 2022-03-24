import { Font } from 'vis-network';
import * as vscode from 'vscode';
import { ProjectDiagramMetadata, ProjectElements } from './projectElements';
import { getToken, saveDataUrlAsImage } from './utils';

/**
 * Class to hold logic for the diagram panel.
 */
export class DiagramPanel {
    public static activePanel: DiagramPanel | undefined = undefined;

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _extensionUri: vscode.Uri;
    private _workspaceRootPath: string;
    
    private _transparentCanvas: boolean;
    public get canvasIsTransparent(): boolean {
        return this._transparentCanvas;
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, workspaceRootPath: string) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._workspaceRootPath = workspaceRootPath;
        this._transparentCanvas = true;

        // Set the webview's initial content
        this._panel.webview.html = this.getWebviewContent();

        // Event handler for when the panel is closed - happens on user action or programmatically
        this._panel.onDidDispose(() => {
            // Clean up resources and references
            DiagramPanel.activePanel = undefined;
            this._panel.dispose();
            while (this._disposables.length) {
                const disposable = this._disposables.pop();
                if (disposable) {
                    disposable.dispose();
                }
            }

        }, null, this._disposables);

        // Event handler for messages received from the webview
        this._panel.webview.onDidReceiveMessage((message: PanelPOSTMessage) => {
            if (message.command === 'NETWORK-DATA-URL') {
                try {
                    saveDataUrlAsImage(message.data, this._workspaceRootPath);
                    vscode.window.showInformationMessage('Download successful');
                } catch (error) {
                    console.error(error);
                    vscode.window.showErrorMessage('Download unsuccessful');
                }
            } else if (message.command === 'NODE-DOUBLE-CLICKED') {
                this.openFileInEditor(message.data);
            } else if (message.command === 'NODE-SELECTED') {
                this.getMetadataForNode(message.data);
            } else if (message.command === 'RESET-LAYOUT') {
                // Update the network options in case UI theme has changed
                const projectElements = ProjectElements.getInstance();
                projectElements.updateNetworkOptions(this._transparentCanvas);
                // Get the last diagram metadata generated and send to panel to display
                this.showDiagramOnPanel(projectElements.diagramMetadata);
            } else if (message.command === 'SYNC-FILE-CHANGES') {
                // Resolve all workspace symbols to include any new changes in the project
                const projectElements: ProjectElements = ProjectElements.getInstance();
                projectElements.resolveAllWorkspaceSymbols();
                // Create new diagram metadata and send to panel to display
                projectElements.generateDiagramMetadata(this._transparentCanvas);
                this.showDiagramOnPanel(projectElements.diagramMetadata);
            } else if (message.command === 'FILTER-NODE-GROUPS') {
                // Get group states sent from webview and filter to find groups to remove
                const groupStates: { group: string, state: boolean }[] = message.data;
                const groupsToRemove: string[] = groupStates
                    .filter((groupState) => groupState.state === false)
                    .map((groupState) => groupState.group);

                // Filter the list
                const projectElements: ProjectElements = ProjectElements.getInstance();
                const projectMetadata = projectElements.filterNetworkNodes(groupsToRemove);
                // Make sure the node font colour is appropriate
                const font = projectMetadata.options.nodes?.font as Font;
                font.color = projectElements.resolveNetworkNodeLabelFontColour(this._transparentCanvas);

                this.showDiagramOnPanel(projectMetadata);
            } else if (message.command === 'TRANSPARENCY-TOGGLED') {
                // Set new state
                this._transparentCanvas = message.data;

                // Update network options
                const projectElements: ProjectElements = ProjectElements.getInstance();
                const newFontColour = projectElements.resolveNetworkNodeLabelFontColour(this._transparentCanvas);
                
                // Send new options back to webview
                this._panel.webview.postMessage({ command: 'SET-LABEL-OPTIONS', data: newFontColour });
            }
        });
    }

    /**
     * Creates or shows a diagram panel.
     * @param extensionUri Extension URI, used for creating webview options.
     * @param workspaceRootPath Path of the root of the open workspace.
     */
    public static display(extensionUri: vscode.Uri, workspaceRootPath: string): void {
        // Show the panel if it already exists, in the editor column it exists in
        if (DiagramPanel.activePanel) {
            DiagramPanel.activePanel._panel.reveal(DiagramPanel.activePanel._panel.viewColumn);
            return;
        }

        // Else, create a new panel in editor column 1 (left-most)
        const newPanel = vscode.window.createWebviewPanel(
            'ngProjectDiagram',
            'NG Project Diagram',
            vscode.ViewColumn.One,
            DiagramPanel.getWebviewOptions(extensionUri)
        );
        DiagramPanel.activePanel = new DiagramPanel(newPanel, extensionUri, workspaceRootPath);
    }

    /**
     * Shows a diagram on the webview panel.
     * @param diagramMetadata Metadata of the network.
     * @param resetUI Optional parameter to trigger a UI reset on the webview.
     */
    public showDiagramOnPanel(diagramMetadata: ProjectDiagramMetadata, resetUI?: boolean): void {
        // Send serialized JSON to the webview
        this._panel.webview.postMessage({
            command: 'DISPLAY-DIAGRAM',
            data: diagramMetadata,
            highContrastTheme: vscode.window.activeColorTheme.kind === 3
        });
        if (resetUI === true) {
            this._panel.webview.postMessage({ command: 'RESET-UI' });
        }
    }

    /**
     * Creates a URI to use in the webview.
     * @param fileName File name (including extension). File should be inside 'media' directory.
     * @returns VS Code URI for given file.
     */
    public createUriForLocalResource(fileName: string): vscode.Uri {
        const path = vscode.Uri.joinPath(this._extensionUri, 'media', fileName);
        return this._panel.webview.asWebviewUri(path);
    }

    /**
     * Gets options for the webview panel.
     * @param extensionUri Base URI for extension, used to limit which content can be loaded from the webview.
     * @returns Webview options.
     */
    private static getWebviewOptions(extensionUri: vscode.Uri): (vscode.WebviewPanelOptions & vscode.WebviewOptions) {
        return {
            // Enable JS in the webview
            enableScripts: true,
            // Restrict the webview to only loading content from this extension's 'media' directory.
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
            retainContextWhenHidden: true,
        };
    }

    /**
     * Opens the file corresponding to a node in the editor.
     * @param nodeId Node to get file for.
     */
    private openFileInEditor(nodeId: string): void {
        // Get the group the node belongs to to know which lookup to use
        const projectElements = ProjectElements.getInstance();
        const nodeGroup = projectElements.networkNodesLookup[nodeId]?.group;

        // Get the resulting file path
        let filePath: string | undefined = undefined;
        if (nodeGroup != null) {
            if (nodeGroup === 'module' || nodeGroup === 'externalModule') {
                const module = projectElements.modulesLookup[nodeId];
                if (module != null) {
                    filePath = module.path;
                }
            } else if (nodeGroup === 'component') {
                const component = projectElements.componentsLookup[nodeId];
                if (component != null) {
                    filePath = component.path;
                }
            } else if (nodeGroup === 'injectable') {
                const injectable = projectElements.injectablesLookup[nodeId];
                if (injectable != null) {
                    filePath = injectable.path;
                }
            }
        }

        // Open the file in the editor
        if (filePath != null) {
            vscode.workspace.openTextDocument(vscode.Uri.file(filePath)).then((doc: vscode.TextDocument) => {
                // Determine the editor column to show file in
                const panelViewColumn = this._panel.viewColumn!;
                let fileColumn: number = 1;
                if (panelViewColumn === 1) {
                    // Open file in editor right of network
                    fileColumn = 2;
                } else if (panelViewColumn > 1) {
                    // Open file in editor left of network
                    fileColumn = panelViewColumn - 1;
                }

                // Display document
                vscode.window.showTextDocument(doc, fileColumn, false);
            }, (error) => {
                console.error(error);
                vscode.window.showWarningMessage('Unable to load file.');
            });
        } else {
            vscode.window.showWarningMessage('Unable to find file.');
        }
    }

    /**
     * Gets metadata for a given node and returns to the webview for display. 
     * @param nodeId Node to get metadata for.
     */
    private getMetadataForNode(nodeId: string): void {
        // Get the group and metadata associated with the given node
        const projectElements = ProjectElements.getInstance();
        const nodeGroup = projectElements.networkNodesLookup[nodeId]?.group;
        const nodeMetadata = projectElements.networkNodeMetadataLookup[nodeId];

        if (nodeMetadata != null && nodeGroup != null) {
            // Set the container ID to inject the metadata into
            if (nodeGroup === 'module' || nodeGroup === 'externalModule') {
                nodeMetadata.containerId = 'module-details-container';
            } else if (nodeGroup === 'component') {
                nodeMetadata.containerId = 'component-details-container';
            } else if (nodeGroup === 'injectable') {
                nodeMetadata.containerId = 'injectable-details-container';
            }

            // Send serialized JSON to the webview
            this._panel.webview.postMessage({ command: 'DISPLAY-METADATA', data: nodeMetadata });
        } else {
            vscode.window.showWarningMessage('Unable to load data for selected item.');
        }
    }

    /**
     * Generates HTML content for the Webview to render.
     * All SVGs source: [https://fonts.google.com/icons].
     * @returns HTML String.
     */
    private getWebviewContent(): string {
        const webview: vscode.Webview = this._panel.webview;

        // Create the URIs to load the scripts that will run in the webview
        const scriptPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
        const scriptUri = (scriptPath).with({ 'scheme': 'vscode-resource' });

        const visJsScriptPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vis-network.min.js');
        const visJsScriptUri = (visJsScriptPath).with({ 'scheme': 'vscode-resource' });

        // Create URI's for stylesheets
        const resetStylesUri = this.createUriForLocalResource('reset.css');
        const vscodeStylesUri = this.createUriForLocalResource('vscode.css');
        const mainStylesUri = this.createUriForLocalResource('custom.css');

        // Use a token to only allow specific scripts to run - set in Content-Security-Policy.
        const nonce = getToken();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="
                    default-src 'none';
                    script-src 'nonce-${nonce}';
                    style-src ${webview.cspSource} 'unsafe-inline';
                    img-src ${webview.cspSource} data:;
                ">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NG Project Diagram</title>
                <script nonce="${nonce}" type="text/javascript" src="${visJsScriptUri}"></script>
                <link href="${resetStylesUri}" rel="stylesheet">
                <link href="${vscodeStylesUri}" rel="stylesheet">
                <link href="${mainStylesUri}" rel="stylesheet">
            </head>
            <body>
                <div>
                    <div class="toolbar">
                        <button id="download-btn" class="icon-btn">
                            <svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/></g><g><path d="M18,15v3H6v-3H4v3c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-3H18z M17,11l-1.41-1.41L13,12.17V4h-2v8.17L8.41,9.59L7,11l5,5 L17,11z"/></g></svg>
                            <span>Save as Image</span>
                        </button>
                        <button id="reset-btn" class="icon-btn">
                            <svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                            <span>Reset</span>
                        </button>
                        <button id="sync-btn" class="icon-btn">
                            <svg class="svg-icon" xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24" x="0"/></g><g><g><polygon points="7.41,13.41 6,12 2,16 6,20 7.41,18.59 5.83,17 21,17 21,15 5.83,15"/><polygon points="16.59,10.59 18,12 22,8 18,4 16.59,5.41 18.17,7 3,7 3,9 18.17,9"/></g></g></svg>
                            <span>Sync File Changes</span>
                        </button>
                        <div class="dropdown-toggle-container">
                            <button id="dropdown-btn" class="icon-btn">
                                <span>Filter Symbols</span>
                                <svg class="svg-icon right shown" id="drop-down-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 10l5 5 5-5H7z"/></svg>
                                <svg class="svg-icon right" id="drop-up-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M7 14l5-5 5 5H7z"/></svg>
                            </button>
                            <div class="dropdown-content" id="dropdown-toggle-content">
                                <label class="row">
                                    <input type="checkbox" class="toggle-input" name="module" checked />
                                    <span>Show Internal Modules</span>
                                </label>
                                <label class="row">
                                    <input type="checkbox" class="toggle-input" name="externalModule" checked />
                                    <span>Show External Modules</span>
                                </label>
                                <label class="row">
                                    <input type="checkbox" class="toggle-input" name="component" checked />
                                    <span>Show Components</span>
                                </label>
                                <label class="row">
                                    <input type="checkbox" class="toggle-input" name="injectable" checked />
                                    <span>Show Services</span>
                                </label>
                            </div>
                        </div>
                        <label class="transparency-toggle">
                            <input type="checkbox" id="canvas-background-toggle" name="canvas-background" checked />
                            <span>Transparent Background?</span>
                        </label>
                    </div>
                    <div id="module-details-container" class="details-container">
                        <div class="row">
                            <div class="col key">Name:</div>
                            <div class="col val" id="metadata-module-name"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Imports:</div>
                            <div class="col val" id="metadata-module-imports"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Declarations:</div>
                            <div class="col val" id="metadata-module-declarations"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Providers:</div>
                            <div class="col val" id="metadata-module-providers"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Type:</div>
                            <div class="col val" id="metadata-module-type"></div>
                        </div>
                    </div>
                    <div id="component-details-container" class="details-container">
                        <div class="row">
                            <div class="col key">Name:</div>
                            <div class="col val" id="metadata-component-name"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Selector:</div>
                            <div class="col val" id="metadata-component-selector"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Change Detection:</div>
                            <div class="col val" id="metadata-component-changedetection"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Injected Dependencies:</div>
                            <div class="col val" id="metadata-component-injecteddependencies"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Inputs:</div>
                            <div class="col val" id="metadata-component-inputs"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Outputs:</div>
                            <div class="col val" id="metadata-component-outputs"></div>
                        </div>
                    </div>
                    <div id="injectable-details-container" class="details-container">
                        <div class="row">
                            <div class="col key">Name:</div>
                            <div class="col val" id="metadata-injectable-name"></div>
                        </div>
                        <div class="row">
                            <div class="col key">Provided In:</div>
                            <div class="col val" id="metadata-injectable-providedin"></div>
                        </div>
                    </div>
                </div>
                <div id="project-network"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}

type PanelPOSTMessage = {
    command: string;
    data?: any;
};
