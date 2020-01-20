let AlgoStatesEnum =
{
    INIT_RESIDUAL: 0,
    ADD_EDGE_RESIDUAL: 1,
    PATH_FOUND_MIN_FLOW_INCREASE: 2,
    FINAL_CALC_MAXFLOW: 3
}

let IdGenerator = function () {
    var counter = 0;
    return {
        getNextId: function () {
            return counter++;
        }
    }
}();

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

    const vertices = [];
    for (let i = 0; i < vCnt - 2; i++) {
        vertices.push(IdGenerator.getNextId());
    }
    vertices.unshift('s');
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

        allEdges.push({ id: IdGenerator.getNextId(), from: vFrom, to: vTo, flow: 0, cap: getRndInteger(1, 15) })
        --leftEdgesToAdd;
    }

    return createGraph(vertices, allEdges);
}

function getRndInteger(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

function* createResidualNetwork(graph) {
    let newEdges = [];
    yield { type: AlgoStatesEnum.INIT_RESIDUAL, obj: Array.from(graph.connections.keys()) };
    for (let edge of graph.edges) {
        if (edge.flow > 0) {
            const newEdge = { id: IdGenerator.getNextId(), from: edge.to, to: edge.from, flow: edge.flow };
            newEdges.push(newEdge);
            yield { type: AlgoStatesEnum.ADD_EDGE_RESIDUAL, obj: newEdge };
        }

        if (edge.flow < edge.cap) {
            const newEdge = { id: IdGenerator.getNextId(), from: edge.from, to: edge.to, flow: (edge.cap - edge.flow) };
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

function* EdmondsKarp(graph) {
    let residualNet = yield* createResidualNetwork(graph);
    let shortestAugmentedPathVertices = shortestPathBfs(residualNet, 's', 't');
    while (shortestAugmentedPathVertices.length > 0) {
        let flows = [];
        let pathEdges = [];
        let pathEdgesResidual = [];
        //find residual path edges
        for (let i = 0; i < shortestAugmentedPathVertices.length - 1; i++) {
            let curEdge = residualNet.connections.get(shortestAugmentedPathVertices[i])
                .find(edge => edge.to === shortestAugmentedPathVertices[i + 1]);
            pathEdgesResidual.push(curEdge);
            flows.push(curEdge.flow);
        }
        let minFlow = Math.min(...flows);
        //find path edges in original graph
        for (let i = 0; i < shortestAugmentedPathVertices.length - 1; i++) {
            let curEdge = graph.connections.get(shortestAugmentedPathVertices[i])
                .find(edge => edge.to === shortestAugmentedPathVertices[i + 1]);
            if (curEdge) {
                curEdge.flow += minFlow;
            }
            else {
                curEdge = graph.connections.get(shortestAugmentedPathVertices[i + 1])
                    .find(edge => edge.to === shortestAugmentedPathVertices[i]);
                curEdge.flow -= minFlow;
            }
            pathEdges.push(curEdge);
        }
        yield {
            type: AlgoStatesEnum.PATH_FOUND_MIN_FLOW_INCREASE,
            obj: { pathOriginal: pathEdges, pathResidual: pathEdgesResidual }
        };
        residualNet = yield* createResidualNetwork(graph);
        shortestAugmentedPathVertices = shortestPathBfs(residualNet, 's', 't');
    }
    let edgesFromStart = graph.connections.get("s");
    let maxFlow = edgesFromStart.reduce((acc, curEdge) => { return acc + curEdge.flow }, 0);
    yield { type: AlgoStatesEnum.FINAL_CALC_MAXFLOW, obj: { edges: edgesFromStart, maxFlow: maxFlow } };
    return maxFlow;
}