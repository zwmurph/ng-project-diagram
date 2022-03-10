import * as vscode from 'vscode';
import * as fs from 'fs';
import { join } from 'path';
import { ProjectElements } from './projectElements';
import { ProjectDiagram } from './projectDiagram';
import { DiagramPanel } from './diagramPanel';

// Event handler for extension activation
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension is active');

	// Define the command and add to the extension context
	context.subscriptions.push(vscode.commands.registerCommand('ng-project-diagram.diagram', () => {
		// Get workspace root and check presence
		const wsRoot = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		if (wsRoot) {
			// Find tsconfig file
			const tsconfigPath = join(wsRoot, 'tsconfig.json');
			if (fs.existsSync(tsconfigPath)) {
				// Display an initial webview panel
				// TODO: Add a loading spinner
				DiagramPanel.display(context.extensionUri);

				// Resolve all workspace symbols in the project
				const projectElements = new ProjectElements(tsconfigPath);
				projectElements.resolveAllWorkspaceSymbols();

				console.log('modules', projectElements.modules);
				console.log('components', projectElements.components);
				console.log('injectables', projectElements.injectables);
				console.log('modules lookup', projectElements.getWorkspaceSymbolLookup('module'));

				// Generate a DOT diagram from the project elements
				const projectDiagram = new ProjectDiagram(wsRoot);
				projectDiagram.generateDotDiagram();
				
				// Display the created DOT diagram on the webview panel
				DiagramPanel.activePanel?.showDiagramOnPanel(projectDiagram.dotDiagram);
				
				
				// projectDiagram.saveDiagramAsImage('svg');


			} else {
				vscode.window.showErrorMessage('tsconfig.json cannot be found');
			}
		}
	}));

	// TODO: Register a serializer for the webview panel, so it reloads on editor close/open
}

// Event handler for extension deactivation
export function deactivate() {}
