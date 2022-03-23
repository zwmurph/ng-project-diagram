import * as vscode from 'vscode';
import * as fs from 'fs';
import { join } from 'path';
import { ProjectDiagramMetadata, ProjectElements } from './projectElements';
import { DiagramPanel } from './diagramPanel';

// Event handler for extension activation
export function activate(context: vscode.ExtensionContext) {
	// Define the command and add to the extension context
	context.subscriptions.push(vscode.commands.registerCommand('ng-project-diagram.diagram', () => {
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

				// Resolve all workspace symbols in the project
				projectElements.resolveAllWorkspaceSymbols();

				// Get project diagram data
				projectElements.generateDiagramMetadata();
				
				// Display the diagram on the webview panel
				DiagramPanel.activePanel?.showDiagramOnPanel(projectElements.diagramMetadata);
			} else {
				vscode.window.showErrorMessage('tsconfig.json cannot be found');
			}
		}
	}));
}

// Event handler for extension deactivation
export function deactivate() {}
