import * as vscode from 'vscode';
import { getToken } from './utils';

/**
 * Class to hold logic for the diagram panel.
 */
export class DiagramPanel {
    public static activePanel: DiagramPanel | undefined = undefined;

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _extensionUri: vscode.Uri;

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._extensionUri = extensionUri;

        // Set the webview's initial content
        this.updatePanelContent();

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

        // Event handler for changes to the content view state - happens when a webview's visibility changes, or when a webview is moved into a new editor column
        this._panel.onDidChangeViewState(() => {
            if (this._panel.visible) {
                this.updatePanelContent();
            }
        }, null, this._disposables);
    }

    /**
     * Creates or shows a diagram panel.
     * @param extensionUri Extension URI, used for creating webview options.
     */
    public static display(extensionUri: vscode.Uri): void {
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
        DiagramPanel.activePanel = new DiagramPanel(newPanel, extensionUri);
    }

    /**
     * Shows a DOT diagram on the webview panel.
     * @param dotDiagram String value of DOT diagram.
     */
    public showDiagramOnPanel(dotDiagram: string): void {
        // Send serialized JSON to the webview
        this._panel.webview.postMessage({ command: 'DISPLAY-DIAGRAM', data: dotDiagram });
    }

    /**
     * Gets options for the webview panel.
     * @param extensionUri Base URI for extension, used to limit which content can be loaded from the webview.
     * @returns Webview options.
     */
    private static getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
        return {
            // Enable JS in the webview
            enableScripts: true,
            // Restrict the webview to only loading content from this extension's 'media' directory.
            localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
        };
    }

    /**
     * Updates the content of the panel.
     */
    private updatePanelContent(): void {
        this._panel.webview.html = this.getWebviewContent();
    }

    /**
     * Generates HTML content for the Webview to render.
     * @returns HTML String.
     */
    private getWebviewContent(): string {
        const webview: vscode.Webview = this._panel.webview;

        // Create the URI to load the main script that will run in the webview
        const scriptPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'main.js');
        const scriptUri = (scriptPath).with({ 'scheme': 'vscode-resource' });

        // Create URI's for stylesheets
        const resetStylesPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css');
        const resetStylesUri = webview.asWebviewUri(resetStylesPath);

        const vscodeStylesPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css');
        const vscodeStylesUri = webview.asWebviewUri(vscodeStylesPath);

        const mainStylesPath = vscode.Uri.joinPath(this._extensionUri, 'media', 'custom.css');
        const mainStylesUri = webview.asWebviewUri(mainStylesPath);

        // Use a token to only allow specific scripts to run - set in Content-Security-Policy.
        const nonce = getToken();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>NG Project Diagram</title>
                <script
                    nonce="${nonce}"
                    type="text/javascript"
                    src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"
                ></script>

                <link href="${resetStylesUri}" rel="stylesheet">
                <link href="${vscodeStylesUri}" rel="stylesheet">
                <link href="${mainStylesUri}" rel="stylesheet">
                </head>
            <body>
                <h1>Hello</h1>
                <a id="canvas-img" download="filename">Download</a>
                <div id="project-network"></div>
                <script nonce="${nonce}" src="${scriptUri}"></script>
            </body>
            </html>
        `;
    }
}
