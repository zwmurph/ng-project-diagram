import * as vscode from 'vscode';
import { WorkspaceSymbols } from "ngast";
import { getLookupFromArray, LookupObject } from "./utils";
import { Data, Edge, IdType, Node, NodeOptions, Options } from 'vis-network';

/**
 * Class that resolves and holds all symbols for the Angular project.
 * Is responsible for creating the network diagram data from project elements.
 */
export class ProjectElements {
    private static instance: ProjectElements | undefined = undefined;

    private workspaceSymbols: WorkspaceSymbols;
    private tsconfigPath: string;

    // Elements
    private projectModules: ProjectModule[];
    private projectComponents: ProjectComponent[];
    private projectInjectables: ProjectInjectable[];

    // Element lookups
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

    private constructor() { }

    /**
     * Singleton accessor for class.
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
     * MUST be called before accessing symbols, their lookups, or generating network diagram data.
     */
    public resolveAllWorkspaceSymbols(): void {
        this.workspaceSymbols = new WorkspaceSymbols(this.tsconfigPath);

        // Elements
        this.projectModules = this.resolveProjectModules();
        this.projectComponents = this.resolveProjectComponents();
        this.projectInjectables = this.resolveProjectInjectables();

        // Element lookups
        this._projectModulesLookup = getLookupFromArray(this.projectModules);
        this._projectComponentsLookup = getLookupFromArray(this.projectComponents);
        this._projectInjectablesLookup = getLookupFromArray(this.projectInjectables);

        // TODO: Directives and pipes at a later time, if needed
        // this.workspaceSymbols.getAllDirectives();
        // this.workspaceSymbols.getAllPipes();
    }

    /**
     * Gets the project diagram network data and options which are used by Vis.js to create the diagram.
     * @returns Network data and options for Vis.js.
     */
    public getProjectDiagramData(): ProjectDiagramMetadata {
        // The diagram created with Vis.js uses network terminology. Create containers for the network nodes and edges
        const networkNodes: Node[] = [];
        const networkEdges: Edge[] = [];

        // Create lookup for created nodes
        const networkNodesLookup: LookupObject<Node> = {};
        
        // Create nodes
        this.projectModules.forEach((module) => {
            const moduleNode: Node = { id: module.name, label: module.name, group: 'module' };
            networkNodes.push(moduleNode);
            networkNodesLookup[module.name] = moduleNode;
        });
        this.projectComponents.forEach((component) => {
            const componentNode: Node = { id: component.name, label: component.name, group: 'component' };
            networkNodes.push(componentNode);
            networkNodesLookup[component.name] = componentNode;
        });
        this.projectInjectables.forEach((injectable) => {
            const injectableNode: Node = { id: injectable.name, label: injectable.name, group: 'injectable' };
            networkNodes.push(injectableNode);
            networkNodesLookup[injectable.name] = injectableNode;
        });

        // Create edges
        this.projectModules.forEach((module: ProjectModule) => {
            // Get the node representing the current iterating module
            const fromNode = networkNodesLookup[module.name];

            // Connect each module to other modules
            module.imports.forEach((moduleImport: string) => {
                // Check if the imported module exists in the network node lookup
                const toNode = networkNodesLookup[moduleImport];
                if (toNode != null) {
                    networkEdges.push({
                        id: `${fromNode.id}->${toNode.id}`,
                        from: fromNode.id,
                        to: toNode.id,
                    } as Edge);
                } else {
                    // If the node to connect to doesn't exist yet, this means it is an external module
                    //   - not part of 'modules' - so create a node for it
                    const externalModuleNode: Node = { id: moduleImport, label: moduleImport, group: 'externalModule' };
                    networkNodes.push(externalModuleNode);
                    networkNodesLookup[moduleImport] = externalModuleNode;

                    // And create and edge to it
                    networkEdges.push({
                        id: `${fromNode.id}->${externalModuleNode.id}`,
                        from: fromNode.id,
                        to: externalModuleNode.id,
                    } as Edge);
                }
            });

            // Connect each module to its components
            module.declarations.forEach((moduleDeclaration: string) => {
                // Make sure the declaration exists in the network node lookup
                const toNode = networkNodesLookup[moduleDeclaration];
                if (toNode != null) {
                    // Create an edge
                    networkEdges.push({
                        id: `${fromNode.id}->${toNode.id}`,
                        from: fromNode.id,
                        to: toNode.id,
                    } as Edge);
                }
            });
        });

        // Connect each component to dependencies it injects
        this.projectComponents.forEach((component: ProjectComponent) => {
            // Get the node representing the current iterating component
            const fromNode = networkNodesLookup[component.name];

            component.injectedDependencies.forEach((componentInjectable: string) => {
                // Check if the injected dependency exists in the network node lookup
                const toNode = networkNodesLookup[componentInjectable];
                if (toNode != null) {
                    networkEdges.push({
                        id: `${fromNode.id}->${toNode.id}`,
                        from: fromNode.id,
                        to: toNode.id,
                    } as Edge);
                } else {
                    // If the node to connect to doesn't exist yet, this means it is an external injected dependency
                    //   - not part of 'injectables' - so create a node for it
                    const externalInjectableNode: Node = {
                        id: componentInjectable,
                        label: componentInjectable,
                        group: 'externalInjectable'
                    };
                    networkNodes.push(externalInjectableNode);
                    networkNodesLookup[componentInjectable] = externalInjectableNode;

                    // And create and edge to it
                    networkEdges.push({
                        id: `${fromNode.id}->${externalInjectableNode.id}`,
                        from: fromNode.id,
                        to: externalInjectableNode.id,
                    } as Edge);
                }
            });
        });

        // Adjust the node levels to provide a more top-down look
        const levelAdjustedNodes = this.calculateNodeLevels(networkNodes, networkEdges);

        // Return network data for the project
        return {
            data: { nodes: levelAdjustedNodes, edges: networkEdges },
            options: this.getNetworkOptions(),
        } as ProjectDiagramMetadata;
    }

    /**
     * Gets project modules.
     * @returns Array of modules.
     */
    private resolveProjectModules(): ProjectModule[] {
        return this.workspaceSymbols.getAllModules().map((module) => ({
            name: module.name,
            path: module.path,
            imports: module.getImports().map((imp) => imp.name),
            declarations: module.getDeclarations().map((declaration) => declaration.name),
            providers: null // TODO: Linked to providedIn-TODO for project injectables
        } as ProjectModule));
    }

    /**
     * Gets project components.
     * @returns Array of components.
     */
    private resolveProjectComponents(): ProjectComponent[] {
        return this.workspaceSymbols.getAllComponents().map((component) => {
            // Map details from all found components
            const componentObj: ProjectComponent = {
                name: component.name,
                path: component.path,
                selector: component.metadata.selector === null ? '' : component.metadata.selector,
                injectedDependencies: [],
            };

            // Find names of injected dependencies in component and add to details list
            if (component.deps != null && component.deps !== "invalid" && component.deps.length > 0) {
                component.deps.forEach((dependency) => {
                    const dependencyObj = JSON.parse(JSON.stringify(dependency));
                    const dependencyName: string = dependencyObj?.token?.value?.name;
                    componentObj.injectedDependencies.push(dependencyName);
                });
            }
            return componentObj;
        });
    }

    /**
     * Gets project injectables (services).
     * @returns Array of injectables.
     */
    private resolveProjectInjectables(): ProjectInjectable[] {
        // Map details from all found injectables
        return this.workspaceSymbols.getAllInjectable().map((injectable) => ({
            name: injectable.name,
            path: injectable.path,
            providedIn: null // TODO: injectable.metadata.providedIn.node.text
        } as ProjectInjectable));
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
                shape: 'icon',
                icon: {
                    face: "'Font Awesome 5 Free'",
                    size: 50,
                    weight: "900",
                },
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
        const moduleNodeOptions: NodeOptions = {
            icon: { code: "\uf07b", color: "#0096FF" },
        };
        const componentNodeOptions: NodeOptions = {
            icon: { code: "\uf12e", color: "#40B5AD" },
        };
        const injectableNodeOptions: NodeOptions = {
            icon: { code: "\uf362", color: "#5D3FD3" },
        };
        const allGroupOptions: Options = {
            groups: {
                module: moduleNodeOptions,
                externalModule: moduleNodeOptions,
                component: componentNodeOptions,
                injectable: injectableNodeOptions,
                externalInjectable: injectableNodeOptions,
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
}

export interface ProjectModule {
    name: string;
    path: string;
    imports: string[];
    declarations: string[];
    providers: string[] | null;
};

export interface ProjectComponent {
    name: string;
    path: string;
    selector: string;
    injectedDependencies: string[];
}

export interface ProjectInjectable {
    name: string;
    path: string;
    providedIn: string | null;
}

export interface ProjectDiagramMetadata {
    data: Data;
    options: Options;
};
