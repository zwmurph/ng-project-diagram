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
 * Parses the network data into a Vis.js network and displays according to the options.
 * @param {*} networkMetadata Nodes and Edges to display along with Options for the Network.
 */
function displayDiagram(networkMetadata) {
    console.log('data', networkMetadata.data);
    console.log('options', networkMetadata.options);

    // Get the container and create a new Vis.js network
    const container = document.getElementById('project-network');
    const network = new vis.Network(container, networkMetadata.data, networkMetadata.options);
   
    // Only trigger this listener once, after the first drawing of the canvas
    network.once('afterDrawing', () => {
        // Disable hierarchical layout - is only needed for initial render. This allows the user to freely move
        //   nodes on the canvas
        network.setOptions({ layout: { hierarchical: false } });
    });

    // Post-drawing listener for network
    network.on('afterDrawing', function(ctx) {
        console.log('after drawing');
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
