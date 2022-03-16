// This script will be run within the webview itself. It cannot access the main VS Code APIs directly.
(function() {
    const vscode = acquireVsCodeApi();
    const container = document.getElementById('project-network');

    // Event listener for messages sent from the extension to the webview
    window.addEventListener('message', (event) => {
        // Execute functions based on command sent in message
        const message = event.data;
        if (message.command === 'DISPLAY-DIAGRAM') {
            displayDiagram(message.data, container);
        }
    });

    // Event listener for download button
    document.getElementById('download-btn').addEventListener('click', () => {
        sendNetworkDataUrl(vscode, container);
    });
}());

/**
 * Parses the network data into a Vis.js network and displays according to the options.
 * @param {*} networkMetadata Nodes and Edges to display along with Options for the Network.
 * @param {*} container HTMLElement to act as a container for the Network.
 */
function displayDiagram(networkMetadata, container) {
    console.log('data', networkMetadata.data);
    console.log('options', networkMetadata.options);

    // Create a new Vis.js network
    const network = new vis.Network(container, networkMetadata.data, networkMetadata.options);
   
    // Only trigger this listener once, after the first drawing of the canvas
    network.once('afterDrawing', () => {
        // Disable hierarchical layout - is only needed for initial render. This allows the user to freely move
        //   nodes on the canvas
        network.setOptions({ layout: { hierarchical: false } });
    });
}

/**
 * Sends the network data URL back to the extension.
 * @param {*} vscode VS Code API reference.
 * @param {*} networkContainer HTMLElement reference to the Network container.
 */
function sendNetworkDataUrl(vscode, networkContainer) {
    // Get the data URL from the canvas element
    const canvasElement = networkContainer.getElementsByTagName('canvas')[0];
    const dataUrl = canvasElement.toDataURL();

    // Send a message to the extension with this data
    vscode.postMessage({
        command: 'NETWORK-DATA-URL',
        data: dataUrl,
    });
}
