var vertices = ['s', 1, 2, 3, 4, 't'];
var edge1 = { from: 's', to: 1, flow: 0, cap: 16 };
var edge2 = { from: 's', to: 2, flow: 0, cap: 13 };
var edge3 = { from: 2, to: 1, flow: 0, cap: 4 };
var edge4 = { from: 2, to: 4, flow: 0, cap: 14 };
var edge5 = { from: 1, to: 3, flow: 0, cap: 12 };
var edge6 = { from: 3, to: 2, flow: 0, cap: 9 };
var edge7 = { from: 3, to: 't', flow: 0, cap: 20 };
var edge8 = { from: 4, to: 3, flow: 0, cap: 7 };
var edge9 = { from: 4, to: 't', flow: 0, cap: 4 };
var edges = [edge1, edge2, edge3, edge4, edge5, edge6, edge7, edge8, edge9];

var AlgoStatesEnum =
{
    INIT_RESIDUAL: 0,
    ADD_EDGE_RESIDUAL: 1,
    FIND_PATH_RESIDUAL: 2,
    MIN_FLOW_INCREASE: 3,
    FINAL_CALC_MAXFLOW: 4
}

function createGraph(vertices, edges) {
    let connections = new Map();
    for (let verticeId of vertices) {
        let edgesTo = edges.filter(edge => edge.from === verticeId);
        connections.set(verticeId, edgesTo);
    }
    return { "connections": connections, "edges": edges };
}

function generateRandomFlowNetwork(vCnt) {
    if (typeof vCnt === 'undefined')
        vCnt = getRndInteger(1, 10) + 2;
    const eCnt = getRndInteger(1, vCnt * (vCnt - 1) / 2);
    const vertices = [...Array(vCnt - 2).keys()].map((x) => x + 1);
    // @ts-ignore
    vertices.unshift('s');
    // @ts-ignore
    vertices.push('t');

    // For every A, B in {Vertices}
    // No edges A -> A
    // If edge A -> B no B -> A
    let vFrom, vTo;
    const allEdges = [];
    let leftEdgesToAdd = eCnt;
    while (leftEdgesToAdd > 0) {
        //0 is 's' and vCnt-1 is 't'
        vFrom = vertices[getRndInteger(0, vCnt)];
        //Prevent edges A -> A
        do vTo = vertices[getRndInteger(0, vCnt)];
        while (vFrom == vTo);

        if (allEdges.find((edge) => edge.from == vFrom && edge.to == vTo ||
            edge.from == vTo && edge.to == vFrom))
            continue;

        allEdges.push({ from: vFrom, to: vTo, flow: 0, cap: getRndInteger(1, 15) })
        --leftEdgesToAdd;
    }

    return createGraph(vertices, allEdges);
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function* createResidualNetwork(graph) {
    let newEdges = [];
    yield { type: AlgoStatesEnum.INIT_RESIDUAL, obj: graph.connections.keys() };
    for (let edge of graph.edges) {
        if (edge.flow > 0) {
            const newEdge = { from: edge.to, to: edge.from, flow: edge.flow };
            newEdges.push(newEdge);
            yield { type: AlgoStatesEnum.ADD_EDGE_RESIDUAL, obj: newEdge };
        }

        if (edge.flow < edge.cap) {
            const newEdge = { from: edge.from, to: edge.to, flow: (edge.cap - edge.flow) };
            newEdges.push(newEdge);
            yield { type: AlgoStatesEnum.ADD_EDGE_RESIDUAL, obj: newEdge };
        }
    }
    return createGraph(graph.connections.keys(), newEdges);
}

function shortestPathBfs(graph, fromVId, toVId) {
    let recreatePath = function (vStates, lastVId) {
        let path = [lastVId];
        let prevVId = vStates[lastVId].prev;
        while (prevVId != null) {
            path.unshift(prevVId);
            prevVId = vStates[prevVId].prev;
        }
        return path;
    }

    let vStates = new Map();
    for (let verticeId of graph.connections.keys()) {
        vStates[verticeId] = { color: 'w', prev: null };
    }
    let queue = [fromVId];
    while (queue.length > 0) {
        let curId = queue.pop();
        vStates[curId].color = 'b';

        for (let edge of graph.connections.get(curId)) {
            if (edge.to === toVId) {
                vStates[toVId].prev = curId;
                let path = recreatePath(vStates, toVId);
                return path;
            }
            else if (vStates[edge.to].color == 'w') {
                vStates[edge.to].color = 'g';
                vStates[edge.to].prev = curId;
                queue.unshift(edge.to);
            }
        }
    }
    return [];
}

var testGraph = createGraph(vertices, edges);

function* EdmondsKarp(graph) {
    let residualNet = yield* createResidualNetwork(graph);
    let shortestAugmentedPath = shortestPathBfs(residualNet, 's', 't');
    while (shortestAugmentedPath.length > 0) {
        yield { type: AlgoStatesEnum.FIND_PATH_RESIDUAL, obj: shortestAugmentedPath };
        let flows = [];
        for (let i = 0; i < shortestAugmentedPath.length - 1; i++) {
            let curEdge = residualNet.connections.get(shortestAugmentedPath[i])
                .find(edge => edge.to === shortestAugmentedPath[i + 1]);
            flows.push(curEdge.flow);
        }
        let minFlow = Math.min(...flows);
        for (let i = 0; i < shortestAugmentedPath.length - 1; i++) {
            let curEdge = graph.connections.get(shortestAugmentedPath[i])
                .find(edge => edge.to === shortestAugmentedPath[i + 1]);
            curEdge.flow += minFlow;
        }
        yield { type: AlgoStatesEnum.MIN_FLOW_INCREASE, obj: { flow: minFlow, path: shortestAugmentedPath } };
        residualNet = yield* createResidualNetwork(graph);
        shortestAugmentedPath = shortestPathBfs(residualNet, 's', 't');
    }
    let edgesFromStart = graph.connections.get("s");
    let maxFlow = edgesFromStart.reduce((acc, curEdge) => { return acc + curEdge.flow }, 0);
    yield {type: AlgoStatesEnum.FINAL_CALC_MAXFLOW, obj: {edges: edgesFromStart, maxFlow: maxFlow}};
    return maxFlow;
}