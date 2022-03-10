// This script will be run within the webview itself. It cannot access the main VS Code APIs directly.
(function() {
    // const vscode = acquireVscodeApi();

    // Event listener for messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        // Execute functions based on command sent in message
        const message = event.data;
        if (message.command === 'DISPLAY-DIAGRAM') {
            displayDiagram(message.data);
        }
    });
}());

/**
 * Parses the DOT diagram into a Vis.js network and displays according to the options.
 * @param {*} dotDiagramString DOT Diagram to display.
 */
function displayDiagram(dotDiagramString) {
    // Get container, options, and parse DOT into Vis.js network
    const container = document.getElementById("project-network");
    const options = {};
    // TODO: Find out why below options don't work
    // const options = {
    //     physics: {
    //         stabilization: false,
    //         barnesHut: {
    //             springLength: 200,
    //         },
    //     },
    // };
    const data = vis.parseDOTNetwork(dotDiagramString);
    
    // Create a new Vis network
    const network = new vis.Network(container, data, options);

    // Post-drawing listener for network
    // network.on("afterDrawing", function(ctx) {
    //     const dataURL = ctx.canvas.toDataURL();
    //     document.getElementById('canvas-img').href = dataURL;
    // });    
}