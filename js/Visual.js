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
        arrows:
        {
            to: { enabled: true, scaleFactor: 0.5 }
        },
        font:
        {
            size: 18
        }
    },
    physics: {
        enabled: false
    },
    manipulation: {
        enabled: true
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
        return {
            id: verticeId,
            label: "Node " + verticeId,
            x: verticesPos.get(verticeId)[0],
            y: verticesPos.get(verticeId)[1]
        }
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
        length: 250,
        smooth: { type: 'curvedCW', roundness: 0.1 }
    }
}

function refreshAlgorithm() {
    if(isGraphRefreshed)
        return;

    nodesDataSetResidual.clear();
    edgesDataSetResidual.clear();
    hideResidualNet();

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

function displayRandomGraph() {
    hideResidualNet();
    graph = generateRandomFlowNetwork(6);
    displayOriginalNetwork(graph);
}

function hideResidualNet() {
    let divResidual = document.getElementById("flowNetDup");
    if (!divResidual.hidden)
        divResidual.hidden = true;
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

function changeGraphRefreshed(refreshed)
{
    disableButtons(!refreshed, document.getElementsByClassName("btnsRunAlgorithm"));
    isGraphRefreshed = refreshed;
}

function disableAllButtons(disable)
{
    disableButtons(disable, document.getElementsByTagName("button"));
}

function disableButtons(disable, buttons)
{
    for(let btn of buttons)
    {
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

async function visualizeMinFlowIncrease(minFlowIncrAndPaths) {
    let minFlowIncr = minFlowIncrAndPaths.flow;
    let pathEdges = minFlowIncrAndPaths.path;
    let pathEdgesResidual = minFlowIncrAndPaths.pathResidual;
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
    document.getElementById("btnRandomGraph").disabled = false;
}

async function waitMs(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function cloneObj(obj) {
    return JSON.parse(JSON.stringify(obj))
}