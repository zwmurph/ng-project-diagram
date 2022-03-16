import { ProjectComponent, ProjectInjectable, ProjectModule } from './projectElements';
import { LookupObject } from './utils';
import { Data, Edge, Node, NodeOptions, Options } from 'vis-network';

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

        // Return network data for the project
        return {
            data: { nodes: networkNodes, edges: networkEdges },
            options: this.getNetworkOptions(),
        } as ProjectDiagramMetadata;
    }

    /**
     * Get network options. Includes general and node group options.
     * @returns Options object.
     */
    private static getNetworkOptions(): Options {
        // General options for the network as a whole
        // const generalOptions: Options = {
        //     'physics': {
        //         'stabilization': false,
        //         'barnesHut': {
        //             'springConstant': 0,
        //             'avoidOverlap': 0.1
        //         },
        //         'hierarchicalRepulsion': {
        //             'nodeDistance': 140,
        //         },
        //     },
        //     'layout': {
        //         'randomSeed': 1,
        //         'hierarchical': {
        //             'sortMethod': 'directed',
        //             'levelSeparation': 100,
        //         },
        //     },
        // };
        const generalOptions: Options = {
            nodes: { borderWidth: 2 },
            edges: { length: 300, smooth: false, arrows: 'to' },
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
            shape: 'box',
            shapeProperties: {
                borderRadius: 0,
            },
        };
        const componentNodeOptions: NodeOptions = {
            shape: 'box',
        };
        const injectableNodeOptions: NodeOptions = {
            shape: 'ellipse',
        };
        const allGroupOptions: Options = {
            groups: {
                module: moduleNodeOptions,
                externalModule: moduleNodeOptions, // TODO: Specify unique options for external modules
                component: componentNodeOptions,
                injectable: injectableNodeOptions,
                externalInjectable: injectableNodeOptions, // TODO: Specify unique options for external injectables
            },
        };

        // Return all options combined together
        return {...generalOptions, ...allGroupOptions};
    }
}

export type ProjectDiagramMetadata = {
    data: Data,
    options: Options,
};
