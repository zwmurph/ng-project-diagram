import * as vscode from 'vscode';
import * as fs from 'fs';
import { join } from 'path';
import { ProjectElements } from './projectSymbols';

export function activate(context: vscode.ExtensionContext) {
	console.log('Extension is active');

	const diagramCmd = vscode.commands.registerCommand('ng-project-diagram.diagram', () => {
		// Get workspace root and check presence
		const root = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
		if (root) {
			const tsconfigPath = join(root, 'tsconfig.json');
			if (fs.existsSync(tsconfigPath)) {
				const projectElements = new ProjectElements(tsconfigPath);
				projectElements.resolveAllWorkspaceSymbols();
				console.log('modules', projectElements.modules);
				console.log('components', projectElements.components);
				console.log('injectables', projectElements.injectables);

				console.log('modules lookup', projectElements.getWorkspaceSymbolLookup('module'));
			} else {
				vscode.window.showErrorMessage('tsconfig.json cannot be found');
			}
		}
	});

	context.subscriptions.push(diagramCmd);
}

// this method is called when your extension is deactivated
export function deactivate() {}
