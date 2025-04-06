const logDiv = document.getElementById('log');
const outputDiv = document.getElementById('output');
const graphContainer = document.getElementById('graph-container');
const resolutionSection = document.getElementById('resolution-section');
const resolutionDetails = document.getElementById('resolution-details');
let network = null;

const safeState = {
    allocations: [ { resource: 'R1', process: 'P1' }, { resource: 'R2', process: 'P2' } ],
    requests: [ { process: 'P1', resource: 'R2' } ]
};
const deadlockState = {
    allocations: [ { resource: 'R1', process: 'P1' }, { resource: 'R2', process: 'P2' }, { resource: 'R3', process: 'P3' } ],
    requests: [ { process: 'P1', resource: 'R2' }, { process: 'P2', resource: 'R3' }, { process: 'P3', resource: 'R1' } ]
};

function logMessage(message) {
    if (logDiv) {
        logDiv.textContent += message + '\n';
        logDiv.scrollTop = logDiv.scrollHeight;
    } else {
        console.error("Log element not found!");
    }
}

function addRow(tableId, data = null) {
    const tableBody = document.getElementById(tableId)?.querySelector('tbody');
    if (!tableBody) {
        console.error(`Table body not found for ID: ${tableId}`);
        return null;
    }
    const newRow = tableBody.insertRow();
    const cell1 = newRow.insertCell();
    const cell2 = newRow.insertCell();
    const cell3 = newRow.insertCell();
    const input1 = document.createElement('input');
    input1.type = 'text';
    const input2 = document.createElement('input');
    input2.type = 'text';

    if (tableId === 'allocation-table') {
        input1.placeholder = 'Resource ID';
        input2.placeholder = 'Process ID';
        if (data && data.resource != null) {
            input1.value = data.resource;
        }
        if (data && data.process != null) {
            input2.value = data.process;
        }
    } else {
        input1.placeholder = 'Process ID';
        input2.placeholder = 'Resource ID';
         if (data && data.process != null) {
            input1.value = data.process;
        }
         if (data && data.resource != null) {
            input2.value = data.resource;
        }
    }
    cell1.appendChild(input1);
    cell2.appendChild(input2);
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-row-btn';
    removeBtn.onclick = function() { this.closest('tr').remove(); };
    cell3.appendChild(removeBtn);
    return newRow;
}

function clearTable(tableId) {
     const tableBody = document.getElementById(tableId)?.querySelector('tbody');
    if (tableBody) {
        tableBody.innerHTML = '';
    }
}

function populateTable(tableId, dataArray) {
    const tableBody = document.getElementById(tableId)?.querySelector('tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    dataArray.forEach(item => { addRow(tableId, item); });
}

function parseInput() {
    const allocations = {};
    const requests = {};
    const processSet = new Set();
    const resourceSet = new Set();
    let parseError = false;
    logMessage("Parsing inputs...");
    try {
        const allocationTable = document.getElementById('allocation-table')?.querySelector('tbody');
        allocationTable?.querySelectorAll('tr').forEach((row, index) => {
            const cells = row.querySelectorAll('input[type="text"]');
            const resourceId = cells[0]?.value.trim().toUpperCase() || null;
            const processId = cells[1]?.value.trim().toUpperCase() || null;
            if (resourceId && processId) {
                if (allocations[resourceId]) { logMessage(`Warning: Resource ${resourceId} assigned multiple times (Row ${index + 1}).`); }
                allocations[resourceId] = processId;
                processSet.add(processId); resourceSet.add(resourceId);
            } else if (resourceId || processId) { logMessage(`Warning: Incomplete assignment row ${index + 1}. Skipping.`); }
        });
        const requestTable = document.getElementById('request-table')?.querySelector('tbody');
        requestTable?.querySelectorAll('tr').forEach((row, index) => {
            const cells = row.querySelectorAll('input[type="text"]');
            const processId = cells[0]?.value.trim().toUpperCase() || null;
            const resourceId = cells[1]?.value.trim().toUpperCase() || null;
             if (processId && resourceId) {
                if (requests[processId]) { logMessage(`Warning: Process ${processId} making multiple requests (Row ${index + 1}).`); }
                requests[processId] = resourceId;
                processSet.add(processId); resourceSet.add(resourceId);
             } else if (processId || resourceId) { logMessage(`Warning: Incomplete request row ${index + 1}. Skipping.`); }
        });
        Object.values(allocations).forEach(p => processSet.add(p));
        Object.keys(requests).forEach(p => processSet.add(p));
        Object.keys(allocations).forEach(r => resourceSet.add(r));
        Object.values(requests).forEach(r => resourceSet.add(r));
    } catch (error) { logMessage(`Error during input parsing: ${error.message}`); parseError = true; }
    logMessage(`Found Processes: [${Array.from(processSet).join(', ') || 'None'}]`);
    logMessage(`Found Resources: [${Array.from(resourceSet).join(', ') || 'None'}]`);
    if (parseError) { return null; }
    return { allocations, requests, processes: Array.from(processSet), resources: Array.from(resourceSet) };
}

function buildRAGData(allocations, requests, processes, resources) {
    const nodes = []; const edges = []; const nodeIds = new Set();
    logMessage("Building RAG data...");
    processes.forEach(p => { const nodeId = `P_${p}`; if (!nodeIds.has(nodeId)) { nodes.push({ id: nodeId, label: p, group: 'process', shape: 'circle', title: `Process ${p}` }); nodeIds.add(nodeId); } });
    resources.forEach(r => { const nodeId = `R_${r}`; if (!nodeIds.has(nodeId)) { nodes.push({ id: nodeId, label: r, group: 'resource', shape: 'box', title: `Resource ${r}` }); nodeIds.add(nodeId); } });
    for (const resourceId in allocations) {
        const processId = allocations[resourceId]; const fromNode = `R_${resourceId}`; const toNode = `P_${processId}`;
        if (nodeIds.has(fromNode) && nodeIds.has(toNode)) { edges.push({ id: `edge_assign_${resourceId}_${processId}`, from: fromNode, to: toNode, arrows: 'to', color: { color: 'green', highlight: 'darkgreen' }, title: `${resourceId} assigned to ${processId}` }); logMessage(`  Assign Edge: ${resourceId} -> ${processId}`); }
        else { logMessage(`  Skipping assign edge: ${resourceId} -> ${processId}`); } }
    for (const processId in requests) {
        const resourceId = requests[processId]; const fromNode = `P_${processId}`; const toNode = `R_${resourceId}`;
        if (nodeIds.has(fromNode) && nodeIds.has(toNode)) { edges.push({ id: `edge_req_${processId}_${resourceId}`, from: fromNode, to: toNode, arrows: 'to', color: { color: 'red', highlight: 'darkred' }, dashes: true, title: `${processId} requests ${resourceId}` }); logMessage(`  Request Edge: ${processId} -> ${resourceId}`); }
        else { logMessage(`  Skipping request edge: ${processId} -> ${resourceId}`); } }
    logMessage("RAG data construction complete.");
    return { nodes, edges };
}

function visualizeGraph(graphData) {
    if (!graphContainer) { logMessage("Graph container element not found!"); return; }
    graphContainer.innerHTML = 'Generating graph...';
     if (network !== null) { network.destroy(); network = null; }
     if (graphData.nodes.length === 0) { graphContainer.textContent = 'No processes or resources entered to display.'; logMessage("Graph visualization skipped: No nodes."); return; }
    const options = {
        nodes: { font: { size: 14, face: 'Segoe UI', color: '#333' }, borderWidth: 1.5, shadow: true },
        edges: { width: 2, shadow: true, smooth: { enabled: true, type: 'cubicBezier', roundness: 0.5 } },
        groups: {
            process: { color: { background: '#97C2FC', border: '#2B7CE9', highlight: { background: '#D2E5FF', border: '#2B7CE9'} }, shape: 'circle' },
            resource: { color: { background: '#FFA500', border: '#FF8C00', highlight: { background: '#FFDAB9', border: '#FF8C00'} }, shape: 'box' } },
        physics: { enabled: true, solver: 'barnesHut', barnesHut: { gravitationalConstant: -4500, centralGravity: 0.1, springLength: 115, springConstant: 0.04, damping: 0.09 }, stabilization: { iterations: 250, fit: true } },
        layout: { hierarchical: false },
        interaction: { dragNodes: true, dragView: true, zoomView: true, tooltipDelay: 200 } };
    try {
        network = new vis.Network(graphContainer, graphData, options);
        network.once("stabilizationIterationsDone", () => { logMessage("Graph visualization stable."); });
         logMessage("Graph visualized successfully.");
    } catch (error) { logMessage(`Error visualizing graph: ${error.message}`); graphContainer.textContent = 'Error visualizing graph.'; console.error("Vis.js Error:", error); }
}

function detectCycleAndParticipants(nodes, edges) {
    logMessage("Starting cycle detection...");
    const adj = new Map(); const nodeMap = new Map(nodes.map(n => [n.id, n]));
    edges.forEach(edge => { if (!adj.has(edge.from)) adj.set(edge.from, []); adj.get(edge.from).push(edge.to); });
    const visited = new Set(); const recursionStack = new Set(); const path = [];
    let cycleFound = false; let cyclePath = [];
    function dfs(nodeId) {
        if (cycleFound) return true;
        visited.add(nodeId); recursionStack.add(nodeId); path.push(nodeId);
        const neighbors = adj.get(nodeId) || [];
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) { if (dfs(neighborId)) return true;
            } else if (recursionStack.has(neighborId)) {
                cycleFound = true; const cycleStartIndex = path.indexOf(neighborId); cyclePath = path.slice(cycleStartIndex);
                const cycleLabels = cyclePath.map(id => nodeMap.get(id)?.label || id);
                logMessage(`  Cycle detected involving ${nodeMap.get(neighborId)?.label || neighborId}`);
                logMessage(`  Cycle Path: ${cycleLabels.join(' -> ')} -> ${nodeMap.get(neighborId)?.label || neighborId}`); return true; } }
        recursionStack.delete(nodeId); path.pop(); return false; }
    for (const nodeId of nodeMap.keys()) { if (!visited.has(nodeId)) { if (dfs(nodeId)) { break; } } }
    if (cycleFound) { logMessage("Cycle detection finished: Deadlock DETECTED."); return { hasCycle: true, cycleNodes: cyclePath.map(id => nodeMap.get(id)?.label || id) };
    } else { logMessage("Cycle detection finished: No cycles found (SAFE)."); return { hasCycle: false, cycleNodes: [] }; }
}

function suggestResolution(cycleNodes) {
    logMessage("\n--- Resolution Suggestions ---");
    if (!cycleNodes || cycleNodes.length === 0) { return "Could not identify cycle participants for suggestions."; }
    const involvedProcesses = cycleNodes.filter(label => label && !label.startsWith('R_'));
    let suggestions = "Potential Deadlock Resolution Strategies:\n\n";
    suggestions += `1. Process Termination:\n   - Abort one or more processes in the cycle (involved: ${involvedProcesses.join(', ') || cycleNodes.join(', ')}).\n   - Considerations: Priority, completion percentage, resources held.\n\n`;
    suggestions += `2. Resource Preemption:\n   - Forcefully take a resource from a process in the cycle and give it to another.\n   - Considerations: Requires rollback/restart mechanisms, selection of victim resource/process.\n\n`;
    suggestions += `3. System Prevention (Not a direct resolution, but a design choice):\n   - Resource Ordering: Enforce a global order for acquiring resources.\n   - Other prevention methods: Request all resources upfront, etc.\n\n`;
    suggestions += `4. Manual Intervention:\n   - An operator analyzes the deadlock and manually takes action.\n`;
    return suggestions;
}

function handleDetectionClick() {
    logDiv.textContent = '';
    outputDiv.textContent = 'Processing...';
    outputDiv.className = '';
    if (resolutionSection) resolutionSection.style.display = 'none';
    if (resolutionDetails) resolutionDetails.textContent = '';
    graphContainer.innerHTML = 'Processing input...';
    if (network) { network.destroy(); network = null; }

    logMessage("Starting detection process...");
    const parsedData = parseInput();
    if (!parsedData) { outputDiv.textContent = "Failed to parse input. Please check inputs and warnings in the log."; outputDiv.className = 'deadlock'; return; }

    logMessage("\n--- Parsed Input Summary ---");
    logMessage(`Processes: [${parsedData.processes.join(', ') || 'None'}]`);
    logMessage(`Resources: [${parsedData.resources.join(', ') || 'None'}]`);
    logMessage(`Assignments: ${JSON.stringify(parsedData.allocations)}`);
    logMessage(`Requests: ${JSON.stringify(parsedData.requests)}`);

    if (parsedData.processes.length === 0 && parsedData.resources.length === 0) {
        logMessage("\nNo processes or resources found.");
        outputDiv.textContent = "No process or resource data entered.";
        outputDiv.className = 'no-deadlock';
        graphContainer.textContent = 'No data entered to build graph.';
        return;
    }

    const ragData = buildRAGData(parsedData.allocations, parsedData.requests, parsedData.processes, parsedData.resources);
    logMessage(`\nRAG Nodes: ${ragData.nodes.length}, Edges: ${ragData.edges.length}`);
    visualizeGraph(ragData);

    let cycleResult = { hasCycle: false, cycleNodes: [] };
    if (ragData.edges.length > 0) {
        cycleResult = detectCycleAndParticipants(ragData.nodes, ragData.edges);
    } else { logMessage("\nNo edges in RAG, deadlock check not applicable."); }

    if (cycleResult.hasCycle) {
        const suggestionsText = suggestResolution(cycleResult.cycleNodes);
        outputDiv.textContent = `DEADLOCK DETECTED!\nCycle Path: ${cycleResult.cycleNodes.join(' -> ')} -> ${cycleResult.cycleNodes[0]}`;
        outputDiv.className = 'deadlock';
        if (resolutionDetails && resolutionSection) {
            resolutionDetails.textContent = suggestionsText;
            resolutionSection.style.display = 'block';
        }
    } else {
        outputDiv.textContent = "NO DEADLOCK DETECTED.";
        outputDiv.className = 'no-deadlock';
    }
     logMessage("\nDetection complete.");
}


function initializeApp() {
    const addAllocBtn = document.getElementById('add-alloc-btn');
    const addReqBtn = document.getElementById('add-req-btn');
    const detectBtn = document.getElementById('detect-btn');
    const toggleLogBtn = document.getElementById('toggle-log-btn');
    const loadSafeBtn = document.getElementById('load-safe-example');
    const loadDeadlockBtn = document.getElementById('load-deadlock-example');
    const clearAllBtn = document.getElementById('clear-all-btn');

    if (addAllocBtn) { addAllocBtn.addEventListener('click', () => addRow('allocation-table')); } else { console.error("Add Assignment button not found!"); }
    if (addReqBtn) { addReqBtn.addEventListener('click', () => addRow('request-table')); } else { console.error("Add Request button not found!"); }
    if (detectBtn) { detectBtn.addEventListener('click', handleDetectionClick); } else { console.error("Detect button not found!"); }

    if (toggleLogBtn && logDiv) {
        logDiv.style.display = 'none';
        toggleLogBtn.textContent = 'Show Log';
        toggleLogBtn.addEventListener('click', () => {
            const isHidden = logDiv.style.display === 'none';
            logDiv.style.display = isHidden ? 'block' : 'none';
            toggleLogBtn.textContent = isHidden ? 'Hide Log' : 'Show Log';
        });
    } else { console.error("Log toggle button or log div not found!"); }

    if (loadSafeBtn) {
         loadSafeBtn.addEventListener('click', () => {
            logMessage("Loading Safe State Example...");
            populateTable('allocation-table', safeState.allocations);
            populateTable('request-table', safeState.requests);
            logMessage("Safe State Example loaded.");
         });
     } else { console.error("Load Safe Example button not found!"); }
     if (loadDeadlockBtn) {
         loadDeadlockBtn.addEventListener('click', () => {
            logMessage("Loading Deadlock State Example...");
            populateTable('allocation-table', deadlockState.allocations);
            populateTable('request-table', deadlockState.requests);
            logMessage("Deadlock State Example loaded.");
         });
     } else { console.error("Load Deadlock Example button not found!"); }

     if(clearAllBtn) {
         clearAllBtn.addEventListener('click', () => {
            clearTable('allocation-table');
            clearTable('request-table');
             outputDiv.textContent = 'Inputs cleared. Result will appear here...';
             outputDiv.className = '';
             if (resolutionSection) resolutionSection.style.display = 'none';
             if (resolutionDetails) resolutionDetails.textContent = '';
             graphContainer.innerHTML = 'Graph will appear here after detection...';
             if (network) { network.destroy(); network = null; }
             logDiv.textContent = '';
            logMessage("Inputs cleared.");
         });
     } else { console.error("Clear All button not found!"); }

    logMessage("Deadlock Detection Tool Initialized.");
}
document.addEventListener('DOMContentLoaded', initializeApp);
