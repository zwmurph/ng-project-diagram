import * as vscode from 'vscode';
import { ProjectComponent, ProjectInjectable, ProjectModule } from './projectElements';
import { LookupObject } from './utils';
import { Data, Edge, IdType, Node, NodeOptions, Options } from 'vis-network';

/**
 * Class to hold logic for creating the project diagram from project elements.
 */
export class ProjectDiagram {

    private constructor() {}

    /**
     * Gets the project diagram network data and options. Used by Vis.js to create the diagram.
     * @param modules List of project modules to display.
     * @param components List of project components to display.
     * @param injectables List of project injectables to display.
     * @returns Network data and options for Vis.js.
     */
    public static getProjectDiagramData(
        modules: ProjectModule[],
        components: ProjectComponent[],
        injectables: ProjectInjectable[]
    ): ProjectDiagramMetadata {
        // The diagram created with Vis.js uses network terminology. Create containers for the network nodes and edges
        const networkNodes: Node[] = [];
        const networkEdges: Edge[] = [];

        // Create lookup for created nodes
        const networkNodesLookup: LookupObject<Node> = {};
        
        // Create nodes
        modules.forEach((module) => {
            const moduleNode: Node = { id: module.name, label: module.name, group: 'module' };
            networkNodes.push(moduleNode);
            networkNodesLookup[module.name] = moduleNode;
        });
        components.forEach((component) => {
            const componentNode: Node = { id: component.name, label: component.name, group: 'component' };
            networkNodes.push(componentNode);
            networkNodesLookup[component.name] = componentNode;
        });
        injectables.forEach((injectable) => {
            const injectableNode: Node = { id: injectable.name, label: injectable.name, group: 'injectable' };
            networkNodes.push(injectableNode);
            networkNodesLookup[injectable.name] = injectableNode;
        });

        // Create edges
        modules.forEach((module: ProjectModule) => {
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
        components.forEach((component: ProjectComponent) => {
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
     * Get network options. Includes general and node group options.
     * @returns Options object.
     */
    private static getNetworkOptions(): Options {
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
    private static calculateNodeLevels(nodes: Node[], edges: Edge[]): Node[] {
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
    private static calculateMaxNodeLength(nodesMap: Map<any, any>, reverseEdgesMap: Map<any, any>, nodeId: IdType | undefined) {
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

export type ProjectDiagramMetadata = {
    data: Data,
    options: Options,
};
