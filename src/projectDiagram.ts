import { exportToFile } from '@ts-graphviz/node';
import { join } from 'path';
import * as fs from 'fs';
import { digraph, toDot } from 'ts-graphviz';

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
    public generateDotDiagram(): void {
        // TODO: Actual generation
        const g = digraph('G');

        const nodeA1 = g.createNode('A_node1');
        const nodeA2 = g.createNode('A_node2');
        g.createEdge([nodeA1, nodeA2]);
        
        const nodeB1 = g.createNode('B_node1');
        const nodeB2 = g.createNode('B_node2');
        g.createEdge([nodeB1, nodeB2]);
        
        const node1 = g.createNode('node1');
        const node2 = g.createNode('node2');
        g.createEdge([node1, node2]);
        const dot = toDot(g);

        console.log('DOT:', dot);
        this._dotDiagram = dot;
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
