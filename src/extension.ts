import * as vscode from 'vscode';
import * as fs from 'fs';
import { join } from 'path';
import { ProjectElements } from './projectElements';
import { DiagramPanel } from './diagramPanel';

// Event handler for extension activation
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension is active');

	// Define the command and add to the extension context
	context.subscriptions.push(vscode.commands.registerCommand('ng-project-diagram.diagram', () => {
		// Get workspace root and check presence
		const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		if (root) {
			// Find tsconfig file
			const tsconfigPath = join(root, 'tsconfig.json');
			if (fs.existsSync(tsconfigPath)) {
				const projectElements = new ProjectElements(tsconfigPath);
				projectElements.resolveAllWorkspaceSymbols();

				console.log('modules', projectElements.modules);
				console.log('components', projectElements.components);
				console.log('injectables', projectElements.injectables);
				console.log('modules lookup', projectElements.getWorkspaceSymbolLookup('module'));

				DiagramPanel.display();


			} else {
				vscode.window.showErrorMessage('tsconfig.json cannot be found');
			}
		}
	}));
}

// Event handler for extension deactivation
export function deactivate() {}
