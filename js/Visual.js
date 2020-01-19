let fixedPositions =
    [
        ['s', [-285, 0]],
        [1, [-95, 120]],
        [2, [-95, -120]],
        [3, [95, 120]],
        [4, [95, -120]],
        ['t', [285, 0]]
    ]

let isGraphRefreshed = true;
let verticesPos = new Map(fixedPositions);
let algoSpeedSlider = document.getElementById("algoSpeedRange");
let algoSpeed = algoSpeedSlider.max - algoSpeedSlider.value;
algoSpeedSlider.oninput = function () {
    algoSpeed = this.max - this.value;
}
let graph = generateRandomFlowNetwork(6);
const nodesVisual = generateVisjsNodes(graph);
const edgesVisual = generateVisjsEdges(graph);
let nodesDataSet = new vis.DataSet(nodesVisual);
let edgesDataSet = new vis.DataSet(edgesVisual);
let nodesDataSetResidual = new vis.DataSet(nodesVisual);
let edgesDataSetResidual = new vis.DataSet(edgesVisual);

// create a network
let flowNetContainer = document.getElementById('flowNet');
let flowNetContainerDup = document.getElementById('flowNetDup');
let data = {
    nodes: nodesDataSet,
    edges: edgesDataSet
};
let dataResidual = { nodes: nodesDataSetResidual, edges: edgesDataSetResidual };
let options = {
    configure:
    {
        enabled: false
    },
    edges:
    {
        length: 250,
        arrows:
        {
            to: { enabled: true, scaleFactor: 0.65 }
        },
        font:
        {
            size: 18
        },
        color: "#2B7CE9",
        smooth: { type: 'curvedCW', roundness: 0.1 }
    },
    physics: {
        enabled: false
    },
    manipulation: {
        enabled: true,
        initiallyActive: true,
        addNode: function (data, callback) {
            let newNodeLabel = prompt("Enter the label of the new node.", "Node " + (nodesDataSet.length - 1).toString());
            if (newNodeLabel === null) {
                callback(null);
                return;
            }
            if (newNodeLabel === "") {
                alert("Error: Invalid node label!");
                callback(null);
                return;
            }
            let newNode = {
                id: nodesDataSet.length - 1,
                label: newNodeLabel,
                x: data.x,
                y: data.y
            }
            callback(newNode);
        },
        editNode: function (data, callback) {
            if (data.id === 's' || data.id === 't') {
                alert("Error: You are not able to modify the Source or the Sink node!");
                callback(null);
                return;
            }

            let changedNodeLabel = prompt("Enter the new label for the node.");
            if (changedNodeLabel === null) {
                callback(null);
                return;
            }

            if (changedNodeLabel === "") {
                alert("Error: Please enter a valid label for the new node!");
                callback(null);
                return;
            }

            if (nodesDataSet.get().find(node => node.label === changedNodeLabel) != null) {
                alert("Error: A Node with the same label already exists!");
                callback(null);
                return;
            }
            nodesDataSet.update({ id: data.id, label: changedNodeLabel });
            callback(null);
        },

        deleteNode: function (data, callback) {
            if (data.nodes.find(nodeId => nodeId === 's' || nodeId === 't') != null) {
                alert("Error: You are not able to delete the Source or the Sink node!");
                callback(null);
                return;
            }
            callback(data);
        },

        addEdge: function (data, callback) {
            if (data.from === data.to) {
                alert("Error: An edge connected to iteself is not permited!");
                callback(null);
                return;
            }
            //If A -> B, prevent B -> A
            for (let edge of edgesDataSet.get()) {
                if (edge.from === data.to && edge.to === data.from) {
                    alert("Error: There is already a connection from " +
                        nodesDataSet.get(edge.from).label + " to " + nodesDataSet.get(edge.to).label + "!");
                    callback(null);
                    return;
                }
            }
            let cap = prompt("Enter the capacity of the new edge:");
            if (cap === null) {
                callback(null);
                return;
            }

            if (isNaN(cap) || cap === "" || parseInt(cap) <= 0) {
                alert("Error: Capacity should be positive a number!");
                callback(null);
                return;
            }

            let newEdge = {
                id: EdgeIdGenerator.getNextEdgeId(),
                from: data.from,
                to: data.to,
                label: "0/" + cap
            }
            callback(newEdge);
        },

        editEdge: {
            editWithoutDrag: function (data, callback) {
                let cap = prompt("Enter the capacity of the new edge:");
                if (cap === null) {
                    callback(null);
                    return;
                }
                if (isNaN(cap) || cap === "" || parseInt(cap) <= 0) {
                    alert("Error: Capacity should be positive a number!");
                    callback(null);
                    return;
                }
                edgesDataSet.update({ id: data.id, from: data.from, to: data.to, label: "0/" + cap });
                callback(null);
            }
        }
    },
    interaction: {
        dragView: false,
        zoomView: false
    }
};

let optionsResidual = cloneObj(options);
optionsResidual.manipulation.enabled = false;

let visNet = new vis.Network(flowNetContainer, data, options);
let visNetResidual = new vis.Network(flowNetContainerDup, dataResidual, optionsResidual);

function generateVisjsNodes(graph) {
    return [...graph.connections.keys()].map(verticeId => {

        let node = {
            id: verticeId,
            label: "Node " + verticeId,
            x: verticesPos.get(verticeId)[0],
            y: verticesPos.get(verticeId)[1],
        };

        if (verticeId === 's') {
            node.label = "Source";
            node.shape = "dot";
            node.color = 'rgb(0,255,140)';
            node.borderWidth = 4;
        }
        if (verticeId === 't') {
            node.label = "Sink";
            node.shape = "dot";
            node.color = '#ff1a1a';
            node.borderWidth = 4;
        }
        return node;
    });
}

function generateVisjsEdges(graph) {
    return graph.edges.map(edgeToVisjsEdge);
}

function edgeToVisjsEdge(edge) {
    return {
        id: edge.id,
        from: edge.from,
        to: edge.to,
        label: edge.flow + (typeof edge.cap !== 'undefined' ? "/" + edge.cap : ""),

    }
}

function displayEmptyGraph()
{
    changeGraphRefreshed(true);
    removeResidualNet();
    graph = createGraph(['s', 't'], []);
    displayOriginalNetwork(graph);
}

function refreshAlgorithm() {
    if (isGraphRefreshed)
        return;

    removeResidualNet();

    edgesDataSet.edges
    edgesDataSet.forEach(
        edge => {
            let label = edge.label;
            let flowAndCap = label.split('/');
            edgesDataSet.update({ id: edge.id, label: "0/" + flowAndCap[1] });
        })
    visNet.unselectAll();
    changeGraphRefreshed(true);
}

function removeResidualNet() {
    nodesDataSetResidual.clear();
    edgesDataSetResidual.clear();
    hideResidualNet();
}

function hideResidualNet() {
    let divResidual = document.getElementById("flowNetDup");
    if (!divResidual.hidden)
        divResidual.hidden = true;
}

function displayRandomGraph() {
    changeGraphRefreshed(true);
    removeResidualNet();
    graph = generateRandomFlowNetwork(6);
    displayOriginalNetwork(graph);
}

function revealResidualNet() {
    const container = document.getElementById("flowNetDup");
    if (container.hidden)
        container.hidden = false;
}

function displayOriginalNetwork(graph) {
    const nodesVisual = generateVisjsNodes(graph);
    const edgesVisual = generateVisjsEdges(graph);
    nodesDataSet.clear();
    edgesDataSet.clear();
    nodesDataSet.add(nodesVisual);
    edgesDataSet.add(edgesVisual);
    visNet.fit();
}

function displayResidualNetwork(visNodes, visEdges) {
    const clonedNodes = visNodes.map(node => cloneObj(node));
    const clonedEdges = visEdges.map(edge => cloneObj(edge));
    nodesDataSetResidual.clear();
    edgesDataSetResidual.clear();
    nodesDataSetResidual.add(clonedNodes);
    edgesDataSetResidual.add(clonedEdges);
    visNetResidual.fit();
}

function buildInternalGraph(nodesDataSet, edgesDataSet) {
    const newNodes = [];
    const newEdges = [];
    nodesDataSet.forEach(node => newNodes.push(node.id));
    edgesDataSet.forEach(edge => {
        const flowCap = edge.label.split('/');
        newEdges.push({
            from: edge.from,
            to: edge.to,
            id: edge.id,
            flow: parseInt(flowCap[0]),
            cap: parseInt(flowCap[1])
        })
    })
    return createGraph(newNodes, newEdges);
}

async function runEdmondsKarpAlgorithm() {
    let graph = buildInternalGraph(nodesDataSet, edgesDataSet);
    disableAllButtons(true);
    for (let step of EdmondsKarp(graph)) {
        await waitMs(algoSpeed);
        switch (step.type) {
            case AlgoStatesEnum.INIT_RESIDUAL:
                console.log("INIT_RESIDUAL");
                visualizeInitResidualGraph(step.obj);
                break;
            case AlgoStatesEnum.ADD_EDGE_RESIDUAL:
                console.log("ADD_EDGE_RESIDUAL");
                visualizeAddEdgeToResidualGraph(step.obj);
                break;
            case AlgoStatesEnum.PATH_FOUND_MIN_FLOW_INCREASE:
                console.log("MIN_FLOW_INCREASE");
                await visualizeMinFlowIncrease(step.obj);
                break;
            case AlgoStatesEnum.FINAL_CALC_MAXFLOW:
                console.log("FINAL_CALC_MAXFLOW");
                await visualizeFinalCalculationOfMaxFlow(step.obj);
                break;
            default:
                console.error("Couldn't recognize algorithm step.");
        }
    }
    disableAllButtons(false);
    changeGraphRefreshed(false);
}

function changeGraphRefreshed(refreshed) {
    disableButtons(!refreshed, document.getElementsByClassName("btnsRunAlgorithm"));
    isGraphRefreshed = refreshed;
}

function disableAllButtons(disable) {
    disableButtons(disable, document.getElementsByTagName("button"));
}

function disableButtons(disable, buttons) {
    for (let btn of buttons) {
        btn.disabled = disable;
    }
}

function visualizeInitResidualGraph(vertices) {
    revealResidualNet();

    const positions = visNet.getPositions();
    const visJsNodes = vertices.map(verticeId => {
        let node = nodesDataSet.get(verticeId);
        node.x = positions[verticeId].x;
        node.y = positions[verticeId].y;
        return node;
    });

    //Create empty visual graph
    displayResidualNetwork(visJsNodes, []);
}

function visualizeAddEdgeToResidualGraph(edge) {
    const visJsEdge = edgeToVisjsEdge(edge);
    edgesDataSetResidual.add(visJsEdge);
}

async function visualizeMinFlowIncrease(originalAndResidualPaths) {
    let pathEdges = originalAndResidualPaths.pathOriginal;
    let pathEdgesResidual = originalAndResidualPaths.pathResidual;
    visNetResidual.selectEdges(pathEdgesResidual.map(edge => edge.id));
    await waitMs(algoSpeed);
    visNet.selectEdges(pathEdges.map(edge => edge.id));
    await waitMs(algoSpeed);
    pathEdges.forEach(edge => edgesDataSet.update({ id: edge.id, label: edge.flow + "/" + edge.cap }));
    await waitMs(algoSpeed);
    visNet.unselectAll();
    visNetResidual.unselectAll();
}

async function visualizeFinalCalculationOfMaxFlow(edgesFromStartAndMaxFlow) {
    let edgesFromStart = edgesFromStartAndMaxFlow.edges;
    let maxFlowResult = edgesFromStartAndMaxFlow.maxFlow;
    visNet.selectEdges(edgesFromStart.map(edge => edge.id));
    await waitMs(algoSpeed);
    alert("Max flow is: " + maxFlowResult);
}

async function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cloneObj(obj) {
    return JSON.parse(JSON.stringify(obj))
}