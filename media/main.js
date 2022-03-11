// This script will be run within the webview itself. It cannot access the main VS Code APIs directly.
(function() {
    const vscode = acquireVsCodeApi();

    // Event listener for messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        // Execute functions based on command sent in message
        const message = event.data;
        if (message.command === 'DISPLAY-DIAGRAM') {
            displayDiagram(message.data);
        }
    });

    // Event listener for download button
    document.getElementById('download-btn').addEventListener('click', () => {
        sendNetworkDataUrl(vscode);
    });
}());

/**
 * Parses the DOT diagram into a Vis.js network and displays according to the options.
 * @param {*} dotDiagramString DOT Diagram to display.
 */
function displayDiagram(dotDiagramString) {
    // Get container, options, and parse DOT into Vis.js network
    const container = document.getElementById('project-network');
    const options = {
        'physics': {
            'stabilization': false,
        },
        'layout': {
            'randomSeed': 1,
            'hierarchical': {
                'sortMethod': 'directed',
            },
        },
    };
    const data = vis.parseDOTNetwork(dotDiagramString);
    console.log('options', data.options);
    
    // Create a new Vis network and assign to global variable
    const network = new vis.Network(container, data, options);

    // Post-drawing listener for network
    network.on("afterDrawing", function(ctx) {
        const dataURL = ctx.canvas.toDataURL();
        document.getElementById('network-data-url').setAttribute('dataUrl', dataURL);
    });    
}

/**
 * Sends the network data URL back to the extension.
 * @param {*} vscode VS Code API reference.
 */
function sendNetworkDataUrl(vscode) {
    // Get the data URL from the hidden element and send to the extension
    const dataUrl = document.getElementById('network-data-url').getAttribute('dataUrl');
    vscode.postMessage({
        command: 'NETWORK-DATA-URL',
        data: dataUrl,
    });
}
