import { exportToFile } from '@ts-graphviz/node';
import { join } from 'path';
import * as fs from 'fs';
import { toDot, Node, Digraph, Edge, NodeAttributes } from 'ts-graphviz';
import { ProjectComponent, ProjectInjectable, ProjectModule } from './projectElements';
import { LookupObject } from './utils';

/**
 * Class to hold logic for creating the project diagram from project elements.
 */
export class ProjectDiagram {
    private _dotDiagram: string;
    public get dotDiagram(): string {
        return this._dotDiagram;
    }

    constructor(private readonly workspaceRootPath: string) {}

    /**
     * Gets the project diagram. MUST be called before saving the diagram.
     * @returns String value of diagram in DOT language.
     */
    public generateDotDiagram(
        modules: ProjectModule[],
        components: ProjectComponent[],
        injectables: ProjectInjectable[],
        modulesLookup: LookupObject<ProjectModule>,
        componentsLookup: LookupObject<ProjectComponent>,
        injectablesLookup: LookupObject<ProjectInjectable>
    ): void {
        // Create a container for the network
        const digraph = new Digraph();

        // Specify options for each project element type
        const moduleOptions: NodeAttributes = {
            shape: 'folder',
        };
        const componentOptions: NodeAttributes = {
            shape: 'box',
            style: 'rounded',
        };
        const injectableOptions: NodeAttributes = {
            shape: 'ellipse',
        };
        
        // Create nodes
        modules.forEach((module) => {
            digraph.addNode(new Node(module.name, moduleOptions));
        });
        components.forEach((component) => {
            digraph.addNode(new Node(component.name, componentOptions));
        });
        injectables.forEach((injectable) => {
            digraph.addNode(new Node(injectable.name, injectableOptions));
        });

        // Create edges
        modules.forEach((module) => {
            // Make sure the module has been added to the digraph before continuing
            const nodeFrom = digraph.getNode(module.name);
            if (nodeFrom == null) {
                return;
            }

            // Connect each module to other modules
            if (module.imports.length > 0) {
                module.imports.forEach((imp) => {
                    const lookupModule = modulesLookup[imp];
                    if (lookupModule != null) {
                        const nodeTo = digraph.getNode(lookupModule.name);
                        if (nodeTo != null) {
                            digraph.addEdge(new Edge([nodeFrom, nodeTo]));
                        }
                    } else {
                        const newNode = new Node(imp, moduleOptions);
                        digraph.addNode(newNode);
                        digraph.addEdge(new Edge([nodeFrom, newNode]));
                    }
                });
            }

            // Connect each module to its components
            if (module.declarations.length > 0) {
                module.declarations.forEach((decl) => {
                    const lookupComponent = componentsLookup[decl];
                    if (lookupComponent != null) {
                        const nodeTo = digraph.getNode(lookupComponent.name);
                        if (nodeTo != null) {
                            digraph.addEdge(new Edge([nodeFrom, nodeTo]));
                        }
                    } else {
                        const newNode = new Node(decl, componentOptions);
                        digraph.addNode(newNode);
                        digraph.addEdge(new Edge([nodeFrom, newNode]));
                    }
                });
            }
        });

        // Connect each component to dependencies it injects
        components.forEach((component) => {
            // Make sure the component has been added to the digraph before continuing
            const nodeFrom = digraph.getNode(component.name);
            if (nodeFrom == null) {
                return;
            }

            if (component.injectedDependencies.length > 0) {
                component.injectedDependencies.forEach((injDep) => {
                    const lookupInjectable = injectablesLookup[injDep];
                    if (lookupInjectable != null) {
                        const nodeTo = digraph.getNode(lookupInjectable.name);
                        if (nodeTo != null) {
                            digraph.addEdge(new Edge([nodeFrom, nodeTo]));
                        }
                    } else {
                        const newNode = new Node(injDep, injectableOptions);
                        digraph.addNode(newNode);
                        digraph.addEdge(new Edge([nodeFrom, newNode]));
                    }
                });
            }
        });

        const dot = toDot(digraph);
        console.log('DOT:', dot);
        this._dotDiagram = dot;

        // const nodeA2 = g.createNode('A_node2');
        // g.createEdge([nodeA1, nodeA2]);
        // const nodeB1 = g.createNode('B_node1');
        // const nodeB2 = g.createNode('B_node2');
        // g.createEdge([nodeB1, nodeB2]);
        // const node1 = g.createNode('node1');
        // const node2 = g.createNode('node2');
        // g.createEdge([node1, node2]);
        // const dot = toDot(g);
        // console.log('DOT:', dot);
        // this._dotDiagram = dot;
    }
    
    /**
     * Saves diagram as an image. Uses Graphviz DOT engine for generation.
     * @param fileFormat Desired image output format.
     */
    public async saveDiagramAsImage(fileFormat: 'jpg' | 'png' | 'svg' = 'png'): Promise<void> {
        // Check DOT diagram has been generated
        if (this._dotDiagram != null) {
            // Check if an output folder already exists
            const outputFolder = join(this.workspaceRootPath, '.ng-project-diagram');
            if (!(fs.existsSync(outputFolder) && fs.lstatSync(outputFolder).isDirectory())) {
                // Create the new folder
                fs.mkdirSync(outputFolder);
            }

            // Export the diagram to the specified file type
            await exportToFile(this._dotDiagram, {
                format: fileFormat,
                output: join(outputFolder, 'diagram.' + fileFormat)
            });
        } else {
            throw new Error('DOT Diagram is undefined. Generate it before trying to save.');
        }
    }
}
