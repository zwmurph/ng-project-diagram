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
    // const options = {
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

    const options = {
        nodes: { borderWidth: 2 },
        edges: { length: 300, smooth: false },
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
        interaction: { hover: true },
    };

    const data = vis.parseDOTNetwork(dotDiagramString);
    console.log('options', data.options);
    
    // Create a new Vis network and assign to global variable
    const network = new vis.Network(container, data, options);

    setTimeout(()=>{
        network.setOptions({
            layout: {
                hierarchical: false
            },
            physics: {
                stabilization: true
            }
        });
    }, 1000);

    // Post-stabilisation listener for network
    // network.on('stabilized', function() {
    //     console.log('stabilized');
    //     network.setOptions({
    //         physics: {
    //             enabled: false,
    //         },
    //         layout: {
    //             hierarchical: false,
    //         },
    //     });
    // });

    // Post-drawing listener for network
    network.on('afterDrawing', function(ctx) {
        // console.log('after drawing');
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
