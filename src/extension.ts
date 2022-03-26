import * as vscode from 'vscode';
import * as fs from 'fs';
import { join } from 'path';
import { ProjectElements } from './projectElements';
import { DiagramPanel } from './diagramPanel';

// Event handler for extension activation
export function activate(context: vscode.ExtensionContext) {
	// Define the command and add to the extension context
	context.subscriptions.push(vscode.commands.registerCommand('ng-project-diagram.diagram', () => {
		// Capture time of extension start
		const startTime = Date.now();

		// Get workspace root and check presence
		const wsRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		if (wsRoot) {
			// Find tsconfig file
			const tsconfigPath = join(wsRoot, 'tsconfig.json');
			if (fs.existsSync(tsconfigPath)) {
				// Display an initial webview panel
				DiagramPanel.display(context.extensionUri, wsRoot);
				
				// Create a new instance of the project elements class
				const projectElements = ProjectElements.getInstance();
				projectElements.setTsconfigPath(tsconfigPath);

				// Wait for all workspace symbols to be resolved in the project
				projectElements.resolveAllWorkspaceSymbols().then(() => {
					// Wait for project diagram data to be generated
					return projectElements.generateDiagramMetadata(DiagramPanel.activePanel?.canvasIsTransparent);
				}).then(() => {
					// Display the diagram on the webview panel
					DiagramPanel.activePanel?.showDiagramOnPanel(projectElements.diagramMetadata, true, startTime);
				}).catch((error) => {
					console.error(error);
					vscode.window.showErrorMessage('An error occurred while generating the network.');
				});
			} else {
				vscode.window.showErrorMessage('tsconfig.json cannot be found');
			}
		}
	}));
}

// Event handler for extension deactivation
export function deactivate() {}
