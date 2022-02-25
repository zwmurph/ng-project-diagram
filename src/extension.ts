import * as vscode from 'vscode';
import * as fs from 'fs';
import { join } from 'path';
import { ProjectElements } from './projectSymbols';
import { getWebviewContent } from './utils';

// Event handler for extension activation
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension is active');

	// Track for active Webview panel
	let activePanel: vscode.WebviewPanel | undefined = undefined;

	const diagramCmd = vscode.commands.registerCommand('ng-project-diagram.diagram', () => {
		// Get workspace root and check presence
		const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		if (root) {
			// Find tsconfig file
			const tsconfigPath = join(root, 'tsconfig.json');
			if (fs.existsSync(tsconfigPath)) {
				const projectElements = new ProjectElements(tsconfigPath);
				projectElements.resolveAllWorkspaceSymbols();

				// console.log('modules', projectElements.modules);
				// console.log('components', projectElements.components);
				// console.log('injectables', projectElements.injectables);
				// console.log('modules lookup', projectElements.getWorkspaceSymbolLookup('module'));

				// Show the panel if it already exists, else create a new panel
				if (activePanel) {
					activePanel.reveal(activePanel.viewColumn);
				} else {
					// Create a webview panel in view column one and set its content
					activePanel = vscode.window.createWebviewPanel('diagramUI', 'NG Project Diagram', vscode.ViewColumn.One, {
						localResourceRoots: [] // Pass in an empty array to disallow access to any local resources
					});
					activePanel.webview.html = getWebviewContent();
				}

				// Event handler for when the panel is closed
				activePanel.onDidDispose(() => {
					activePanel = undefined;
				}, null, context.subscriptions);
			} else {
				vscode.window.showErrorMessage('tsconfig.json cannot be found');
			}
		} else {
			console.log('no root');
		}
	});

	// Add above defined command to the extension context
	context.subscriptions.push(diagramCmd);
}

// Event handler for extension deactivation
export function deactivate() {}
