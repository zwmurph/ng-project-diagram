import * as vscode from 'vscode';

/**
 * Class to hold logic for the diagram panel
 */
export class DiagramPanel {
	public static activePanel: DiagramPanel | undefined = undefined;

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel) {
        this._panel = panel;

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
     * Creates or shows a diagram panel
     */
    public static display(): void {
        // Show the panel if it already exists, in the editor column it exists in
        if (DiagramPanel.activePanel) {
            DiagramPanel.activePanel._panel.reveal(DiagramPanel.activePanel._panel.viewColumn);
            return;
        }

        // Else, create a new panel in editor column 1 (left-most)
        DiagramPanel.activePanel = new DiagramPanel(vscode.window.createWebviewPanel(
            'ngProjectDiagram',
            'NG Project Diagram',
            vscode.ViewColumn.One,
            { localResourceRoots: [] } // Pass in an empty array to disallow access to any local resources
        ));
    }

    // Updates the content of the panel
    private updatePanelContent(): void {
        this._panel.webview.html = this.getWebviewContent();
    }

    // Returns HTML content for the Webview to render
    private getWebviewContent(): string {
        return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta http-equiv="Content-Security-Policy" content="default-src 'none';">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>NG Project Diagram</title>
    </head>
    <body>
        <h1>Hello World</h1>
    </body>
    </html>
        `;
    }
}
