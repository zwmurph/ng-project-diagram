import * as vscode from 'vscode';
import { WorkspaceSymbols } from 'ngast';
import { getLookupFromArray, LookupObject } from './utils';
import { Data, Edge, IdType, Node, Options } from 'vis-network';
import { DiagramPanel } from './diagramPanel';

/**
 * Class that resolves and holds all symbols for the Angular project.
 * Is responsible for creating the network diagram data from project elements.
 */
export class ProjectElements {
    private static instance: ProjectElements | undefined = undefined;

    private workspaceSymbols: WorkspaceSymbols;
    private tsconfigPath: string;

    // Project symbols
    private projectModules: ProjectModule[];
    private projectComponents: ProjectComponent[];
    private projectInjectables: ProjectInjectable[];

    // Project symbol lookups
    private _projectModulesLookup: LookupObject<ProjectModule>;
    public get modulesLookup(): LookupObject<ProjectModule> {
        return this._projectModulesLookup;
    }

    private _projectComponentsLookup: LookupObject<ProjectComponent>;
    public get componentsLookup(): LookupObject<ProjectComponent> {
        return this._projectComponentsLookup;
    }

    private _projectInjectablesLookup: LookupObject<ProjectInjectable>;
    public get injectablesLookup(): LookupObject<ProjectInjectable> {
        return this._projectInjectablesLookup;
    }

    // Network node lookup
    private _networkNodesLookup: LookupObject<Node>;
    public get networkNodesLookup(): LookupObject<Node> {
        return this._networkNodesLookup;
    }

    private _networkNodeMetadataLookup: LookupObject<ProjectNodeMetadata>;
    public get networkNodeMetadataLookup(): LookupObject<ProjectNodeMetadata> {
        return this._networkNodeMetadataLookup;
    }

    // Project diagram data
    private _projectDiagramMetadata: ProjectDiagramMetadata;
    public get diagramMetadata(): ProjectDiagramMetadata {
        return this._projectDiagramMetadata;
    }

    private constructor() { }

    /**
     * Singleton accessor for class. Creates a new instance if not already existing.
     * @returns Instance of `ProjectElements` class.
     */
    public static getInstance(): ProjectElements {
        if (ProjectElements.instance == undefined) {
            ProjectElements.instance = new ProjectElements();
        }
        return ProjectElements.instance;
    }

    /**
     * Sets path to tsconfig file.
     * @param tsconfigPath Path to TypeScript config file.
     */
    public setTsconfigPath(tsconfigPath: string): void {
        this.tsconfigPath = tsconfigPath;
    }

    /**
     * Resolves all symbols within the project.
     * MUST be called before trying to access properties or methods that interact with project symbols or create network data.
     */
    public resolveAllWorkspaceSymbols(): void {
        this.workspaceSymbols = new WorkspaceSymbols(this.tsconfigPath);

        // Elements
        this.resolveProjectModules();
        this.resolveProjectComponents();
        this.resolveProjectInjectables();

        // Element lookups
        this._projectModulesLookup = getLookupFromArray(this.projectModules);
        this._projectComponentsLookup = getLookupFromArray(this.projectComponents);
        this._projectInjectablesLookup = getLookupFromArray(this.projectInjectables);

        // TODO: Directives and pipes at a later time, if needed
        // this.workspaceSymbols.getAllDirectives();
        // this.workspaceSymbols.getAllPipes();
    }

    /**
     * Generates the project diagram network data and options which are used by Vis.js to create the diagram.
     */
    public generateDiagramMetadata(): void {
        // The diagram created with Vis.js uses network terminology. Create containers for the network nodes and edges
        const networkNodes: Node[] = [];
        const networkEdges: Edge[] = [];

        // Create lookup for created nodes
        this._networkNodesLookup = {};
        this._networkNodeMetadataLookup = {};
        
        // Create nodes
        this.projectModules.forEach((module) => {
            const moduleGroup: string = module.internal === true ? 'module' : 'externalModule';
            const moduleNode: Node = { id: module.name, label: module.name, group: moduleGroup };
            networkNodes.push(moduleNode);
            this._networkNodesLookup[module.name] = moduleNode;
            this._networkNodeMetadataLookup[module.name] = this.generateModuleNodeMetadata(module);
        });
        this.projectComponents.forEach((component) => {
            const componentNode: Node = { id: component.name, label: component.name, group: 'component' };
            networkNodes.push(componentNode);
            this._networkNodesLookup[component.name] = componentNode;
            this._networkNodeMetadataLookup[component.name] = this.generateComponentNodeMetadata(component);
        });
        this.projectInjectables.forEach((injectable) => {
            const injectableNode: Node = { id: injectable.name, label: injectable.name, group: 'injectable' };
            networkNodes.push(injectableNode);
            this._networkNodesLookup[injectable.name] = injectableNode;
            this._networkNodeMetadataLookup[injectable.name] = this.generateInjectableNodeMetadata(injectable);
        });

        // Create edges
        this.projectModules.forEach((module: ProjectModule) => {
            // Get the node representing the current iterating module
            const fromNode = this._networkNodesLookup[module.name];
            if (fromNode == null) {
                return;
            }

            // Connect each module to other modules
            module.imports.forEach((moduleImport: string) => {
                // Find the imported module in the network node lookup
                const toNode = this._networkNodesLookup[moduleImport];
                if (toNode == null) {
                    return;
                }

                // Create an edge
                networkEdges.push({
                    id: `${fromNode.id}->${toNode.id}`,
                    from: fromNode.id,
                    to: toNode.id,
                } as Edge);
            });

            // Connect each module to its components
            module.declarations.forEach((moduleDeclaration: string) => {
                // Find the declaration in the network node lookup
                const toNode = this._networkNodesLookup[moduleDeclaration];
                if (toNode == null) {
                    return;
                }

                // Create an edge
                networkEdges.push({
                    id: `${fromNode.id}->${toNode.id}`,
                    from: fromNode.id,
                    to: toNode.id,
                } as Edge);
            });
        });

        // Connect each component to dependencies it injects
        this.projectComponents.forEach((component: ProjectComponent) => {
            // Get the node representing the current iterating component
            const fromNode = this._networkNodesLookup[component.name];
            if (fromNode == null) {
                return;
            }

            component.injectedDependencies.forEach((componentInjectable: string) => {
                // Check if the injected dependency exists in the network node lookup (only create edges to internal)
                const toNode = this._networkNodesLookup[componentInjectable];
                if (toNode == null) {
                    return;
                }

                // Create edge
                networkEdges.push({
                    id: `${fromNode.id}->${toNode.id}`,
                    from: fromNode.id,
                    to: toNode.id,
                } as Edge);
            });
        });

        // Adjust the node levels to provide a more top-down look
        const levelAdjustedNodes = this.calculateNodeLevels(networkNodes, networkEdges);

        // Set network data for the project
        this._projectDiagramMetadata = {
            data: { nodes: levelAdjustedNodes, edges: networkEdges },
            options: this.getNetworkOptions(),
        } as ProjectDiagramMetadata;
    }

    /**
     * Updates network options in project diagram metadata without changing the data itself.
     */
    public updateNetworkOptions(): void {
        // Set network data for the project
        this._projectDiagramMetadata.options = this.getNetworkOptions();
    }

    /**
     * Filters network nodes based on group.
     * @param groupsToRemove Group(s) to remove from network nodes list.
     * @returns Altered project diagram metadata ready for Vis JS to display.
     */
    public filterNetworkNodes(groupsToRemove: string[]): ProjectDiagramMetadata {
        const existingNodes: Node[] = this._projectDiagramMetadata.data.nodes as Node[];
        const filteredNodes: Node[] = existingNodes.filter((node) => !groupsToRemove.includes(node.group!));
        return {
            data: {
                nodes: filteredNodes,
                edges: this._projectDiagramMetadata.data.edges,
            },
            options: this._projectDiagramMetadata.options
        } as ProjectDiagramMetadata;
    }

    /**
     * Gets project modules.
     */
    private resolveProjectModules(): void {
        const modules: ProjectModule[] = [];
        const addedModules: LookupObject<boolean> = {};
        const importedModules: LookupObject<any> = {};

        // Handle main modules (internal)
        this.workspaceSymbols.getAllModules().forEach((module) => {
            // Create a basic object
            const moduleObj: ProjectModule = {
                name: module.name,
                path: module.path,
                imports: [],
                declarations: [],
                providers: [],
                internal: true,
            };

            // Get module imports
            const foundImports = module.getImports();
            if (foundImports != null && foundImports.length > 0) {
                foundImports.forEach((imp) => {
                    // Add name in module object property
                    moduleObj.imports.push(imp.name);

                    // Add to lookup to process below
                    if (importedModules[imp.name] == null) {
                        importedModules[imp.name] = imp;
                    }
                });
            }

            // Get module declarations
            const foundDeclarations = module.getDeclarations();
            if (foundDeclarations != null && foundDeclarations.length > 0) {
                moduleObj.declarations.push(...foundDeclarations.map((declaration) => declaration.name));
            }

            // Check the symbol has been analysed before accessing the analysis
            if (module.isAnalysed === false) {
                module.analyse();
            }
            
            // Get the providers data, if present
            const providersCopy: any = module.analysis?.providers;
            if (providersCopy != null) {
                if (providersCopy.elements != null && providersCopy.elements.length > 0) {
                    providersCopy.elements.forEach((elem: any) => {
                        if (elem.escapedText != null && elem.escapedText != '' && !moduleObj.providers.includes(elem.escapedText)) {
                            moduleObj.providers.push(elem.escapedText);
                        }
                    });
                }
            }

            // Add internal modules to the list
            modules.push(moduleObj);
            addedModules[module.name] = true;
        });

        // Handle imported modules (external)
        for (const [key, value] of Object.entries(importedModules)) {
            if (!(addedModules[key] === true)) {
                modules.push({
                    name: key,
                    path: value.path,
                    internal: false,
                    declarations: [],
                    imports: [],
                    providers: [],
                } as ProjectModule);
                addedModules[key] = true;
            }
        }
        this.projectModules = modules;
    }

    /**
     * Gets project components.
     */
    private resolveProjectComponents(): void {
        const components: ProjectComponent[] = [];
        this.workspaceSymbols.getAllComponents().forEach((component) => {
            // Create a basic object
            const componentObj: ProjectComponent = {
                name: component.name,
                path: component.path,
                selector: undefined,
                changeDetection: undefined,
                injectedDependencies: [],
                inputs: [],
                outputs: [],
            };

            // Update selector and change detection properties
            if (component.metadata != null) {
                componentObj.selector = component.metadata.selector == null ? undefined : component.metadata.selector;
                componentObj.changeDetection = component.metadata.changeDetection === undefined || component.metadata.changeDetection === 1 ? 'Default' : 'OnPush';
            }

            // Find injected dependencies of component and add their names to the list
            const componentCopy: any = component;
            if (componentCopy.deps != null && componentCopy.deps.length > 0) {
                componentCopy.deps.forEach((dep: any) => {
                    const dependency = dep?.token?.value;
                    if (dependency != null && dependency.name != '' && !componentObj.injectedDependencies.includes(dependency.name)) {
                        componentObj.injectedDependencies.push(dependency.name);
                    }
                });
            }

            // Find inputs and outputs of the component
            if (component.metadata?.inputs != null) {
                for (const [key, value] of Object.entries(component.metadata?.inputs)) {
                    if (!componentObj.inputs.includes(key)) {
                        componentObj.inputs.push(key);
                    }
                }
            }
            if (component.metadata?.outputs != null) {
                for (const [key, value] of Object.entries(component.metadata?.outputs)) {
                    if (!componentObj.outputs.includes(key)) {
                        componentObj.outputs.push(key);
                    }
                }
            }

            // Add the component to the list
            components.push(componentObj);
        });
        this.projectComponents = components;
    }

    /**
     * Gets project injectables (services).
     */
    private resolveProjectInjectables(): void {
        const injectables: ProjectInjectable[] = [];
        // Map details from all found injectables
        this.workspaceSymbols.getAllInjectable().forEach((injectable) => {
            // Create a basic object
            const injectableObj: ProjectInjectable = {
                name: injectable.name,
                path: injectable.path,
                providedIn: undefined,
            };

            // Check the symbol has been analysed before accessing the analysis
            if (injectable.isAnalysed === false) {
                injectable.analyse();
            }
            
            // Get the providedIn data, if present
            const providedInCopy: any = injectable.analysis?.meta.providedIn;
            if (providedInCopy != null) {
                if (providedInCopy.node.text != null || providedInCopy.node.text != '') {
                    injectableObj.providedIn = providedInCopy.node.text;
                }
            }

            // Add injectable to list
            injectables.push(injectableObj);
        });
        this.projectInjectables = injectables;
    }

    /**
     * Get network options. Includes general and node group options.
     * @returns Options object.
     */
    private getNetworkOptions(): Options {
        // Get active editor theme - 1: light, 2: dark, 3: high contrast
        const editorThemeId = vscode.window.activeColorTheme.kind;
        // Set a map for contrasting text colours to theme kinds
        const editorThemeIdFontColourMap = {
            1: '#000000',
            2: '#FFFFFF',
            3: '#FFFFFF',
        };

        // Set general network options
        const generalOptions: Options = {
            nodes: { 
                borderWidth: 2,
                font: {
                    color: editorThemeIdFontColourMap[editorThemeId],
                },
                size: 15,
            },
            edges: {
                length: 300,
                smooth: false,
                arrows: 'to',
                arrowStrikethrough: false,
            },
            physics: { enabled: false },
            layout: {
                improvedLayout: true,
                hierarchical: {
                    sortMethod: 'directed',
                    levelSeparation: 200,
                    nodeSpacing: 200,
                    treeSpacing: 200,
                },
            },
            interaction: {
                hover: true,
                navigationButtons: true,
                keyboard: true,
            },
        };
       
        // Options for node groups, individual node options will override these
        const allGroupOptions: Options = {
            groups: {
                module: {
                    shape: 'image',
                    image: '' + DiagramPanel.activePanel?.createUriForLocalResource('module-icon.svg'),
                },
                externalModule: {
                    shape: 'image',
                    image: '' + DiagramPanel.activePanel?.createUriForLocalResource('external-module-icon.svg'),
                },
                component: {
                    shape: 'image',
                    image: '' + DiagramPanel.activePanel?.createUriForLocalResource('component-icon.svg'),
                },
                injectable: {
                    shape: 'image',
                    image: '' + DiagramPanel.activePanel?.createUriForLocalResource('injectable-icon.svg'),
                },
            },
        };

        // Return all options combined together
        return {...generalOptions, ...allGroupOptions};
    }

    /**
     * Calculates levels for nodes based on maximum distance of edges.
     * @param nodes Node array to calculate levels for.
     * @param edges Corresponding edges between `nodes`.
     * @returns Altered nodes with 'nodeOptions.level' set.
     * 
     * Source: [https://stackoverflow.com/a/59621284/].
     */
    private calculateNodeLevels(nodes: Node[], edges: Edge[]): Node[] {
        const reverseEdgesMap = new Map();
        const nodesMap = new Map();
        for (const edge of edges) {
            const to = edge.to;
            const from = edge.from;
            if (reverseEdgesMap.has(to)) {
                reverseEdgesMap.get(to).push(from);
            } else {
                reverseEdgesMap.set(to, [edge.from]);
            }
        }
        for (const node of nodes) {
            nodesMap.set(node.id, node);
        }
        for (const node of nodes) {
            node.level = this.calculateMaxNodeLength(nodesMap, reverseEdgesMap, node.id);
            this._networkNodesLookup[node.id!] = node;  
        }
        return nodes;
    }

    /**
     * Calculates the maximum node length of a given node.
     * @param nodesMap Map of nodes to use for calculation.
     * @param reverseEdgesMap Reversed map of edges to use for calculation.
     * @param nodeId Id of node to calculate length for.
     * @returns Longest depth the node has to any parent.
     * 
     * Source: [https://stackoverflow.com/a/59621284/].
     */
    private calculateMaxNodeLength(nodesMap: Map<any, any>, reverseEdgesMap: Map<any, any>, nodeId: IdType | undefined) {
        if (!(nodesMap instanceof Map)) {
            throw new Error("nodesMap parameter should be an instance of Map");
        }
        if (!(reverseEdgesMap instanceof Map)) {
            throw new Error("reverseEdgesMap parameter should be an instance of Map");
        }
        let parents = [];
        let longestParentDepth = 0;
        if (reverseEdgesMap.has(nodeId)) {
            parents = reverseEdgesMap.get(nodeId);
            for (const parentId of parents) {
                let parentDepth = 1;
                parentDepth += this.calculateMaxNodeLength(nodesMap, reverseEdgesMap, parentId);
                if (parentDepth > longestParentDepth) {
                    longestParentDepth = parentDepth;
                }
            }
        }
        return longestParentDepth;
    }

    /**
     * Generates module metadata to display on the webview UI when node is selected.
     * @param module Module to generate data from.
     * @returns Metadata ready to inject into HTML.
     */
    private generateModuleNodeMetadata(module: ProjectModule): ProjectNodeMetadata {
        let importsText;
        let declarationsText;
        let providersText;
        
        // Create line separated lists from arrays
        if (module.internal === true) {
            if (module.imports.length > 0) {
                importsText = module.imports.join(',<br>');
            }
            if (module.declarations.length > 0) {
                declarationsText = module.declarations.join(',<br>');
            }
            if (module.providers.length > 0) {
                providersText = module.providers.join(',<br>');
            }
        } else {
            // Text to display if module is external
            importsText = 'N/A';
            declarationsText = 'N/A';
            providersText = 'N/A';
        }

        // Compile the metadata
        return {
            name: module.name,
            imports: importsText || 'None',
            declarations: declarationsText || 'None',
            providers: providersText || 'None',
            type: module.internal === true ? 'Internal' : 'External',
        };
    }

    /**
     * Generates component metadata to display on the webview UI when node is selected.
     * @param component Component to generate data from.
     * @returns Metadata ready to inject into HTML.
     */
    private generateComponentNodeMetadata(component: ProjectComponent): ProjectNodeMetadata {
        // Create line separated lists from arrays
        let injectedDependenciesText;
        if (component.injectedDependencies.length > 0) {
            injectedDependenciesText = component.injectedDependencies.join(',<br>');
        }
        let inputsText;
        if (component.inputs.length > 0) {
            inputsText = component.inputs.join(',<br>');
        }
        let outputsText;
        if (component.outputs.length > 0) {
            outputsText = component.outputs.join(',<br>');
        }

        // Compile the metadata
        return {
            name: component.name,
            selector: component.selector,
            changeDetection: component.changeDetection,
            injectedDependencies: injectedDependenciesText || 'None',
            inputs: inputsText || 'None',
            outputs: outputsText || 'None',
        };
    }

    /**
     * Generates injectable metadata to display on the webview UI when node is selected.
     * @param injectable Injectable to generate data from.
     * @returns Metadata ready to inject into HTML.
     */
     private generateInjectableNodeMetadata(injectable: ProjectInjectable): ProjectNodeMetadata {
        return {
            name: injectable.name,
            providedIn: injectable.providedIn === undefined ? 'N/A' : injectable.providedIn,
        };
    }
}

export interface ProjectModule {
    name: string;
    path: string;
    imports: string[];
    declarations: string[];
    providers: string[];
    internal: boolean | undefined;
};

export interface ProjectComponent {
    name: string;
    path: string;
    selector: string | undefined;
    injectedDependencies: string[];
    changeDetection: 'Default' | 'OnPush' | undefined;
    inputs: string[];
    outputs: string[];
}

export interface ProjectInjectable {
    name: string;
    path: string;
    providedIn: string | undefined;
}

export type ProjectDiagramMetadata = {
    data: Data;
    options: Options;
};

export type ProjectNodeMetadata = {
    name: string;
    containerId?: string;
    imports?: string;
    declarations?: string;
    providers?: string;
    type?: string;
    selector?: string;
    changeDetection?: string;
    injectedDependencies?: string;
    inputs?: string;
    outputs?: string;
    providedIn?: string;
};
