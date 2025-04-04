const logDiv = document.getElementById('log');
const outputDiv = document.getElementById('output');

function logMessage(message) {
    if (logDiv) {
        logDiv.innerHTML += message + '\n';
        logDiv.scrollTop = logDiv.scrollHeight;
    } else {
        console.error("Log element not found!");
    }
}

function addRow(tableId) {
    const tableBody = document.getElementById(tableId)?.querySelector('tbody');
    if (!tableBody) {
        console.error(`Table body not found for ID: ${tableId}`);
        return;
    }
    const newRow = tableBody.insertRow();
    const cell1 = newRow.insertCell();
    const cell2 = newRow.insertCell();
    const cell3 = newRow.insertCell();
    const input1 = document.createElement('input');
    input1.type = 'text';
    input1.placeholder = tableId === 'allocation-table' ? 'Resource ID' : 'Process ID';
    cell1.appendChild(input1);
    const input2 = document.createElement('input');
    input2.type = 'text';
    input2.placeholder = tableId === 'allocation-table' ? 'Process ID' : 'Resource ID';
    cell2.appendChild(input2);
    const removeBtn = document.createElement('button');
    removeBtn.textContent = 'Remove';
    removeBtn.className = 'remove-row-btn';
    removeBtn.onclick = function() {
        tableBody.removeChild(newRow);
    };
    cell3.appendChild(removeBtn);
}

function parseInput() {
    const allocations = {};
    const requests = {};
    const processes = new Set();
    let parseError = false;

    try {
        const allocationTable = document.getElementById('allocation-table')?.querySelector('tbody');
        allocationTable?.querySelectorAll('tr').forEach((row, index) => {
            const cells = row.querySelectorAll('input[type="text"]');
            const resourceId = cells[0]?.value.trim();
            const processId = cells[1]?.value.trim();
            if (resourceId && processId) {
                if (allocations[resourceId]) {
                     logMessage(`Warning: Resource ${resourceId} allocated multiple times. Using last entry (Row ${index + 1}).`);
                }
                allocations[resourceId] = processId;
                processes.add(processId);
            } else if (resourceId || processId) {
                 logMessage(`Warning: Incomplete allocation entry in row ${index + 1}. Skipping.`);
            }
        });

        const requestTable = document.getElementById('request-table')?.querySelector('tbody');
        requestTable?.querySelectorAll('tr').forEach((row, index) => {
            const cells = row.querySelectorAll('input[type="text"]');
            const processId = cells[0]?.value.trim();
            const resourceId = cells[1]?.value.trim();
             if (processId && resourceId) {
                if (requests[processId]) {
                    logMessage(`Warning: Process ${processId} requesting multiple resources. Using last entry (Row ${index + 1}).`);
                }
                requests[processId] = resourceId;
                processes.add(processId);
             } else if (processId || resourceId) {
                  logMessage(`Warning: Incomplete request entry in row ${index + 1}. Skipping.`);
             }
        });

        Object.values(allocations).forEach(p => processes.add(p));

    } catch (error) {
        logMessage(`Error during input parsing: ${error.message}`);
        parseError = true;
    }

    if (parseError) {
        return null; // Indicate failure
    }
    return { allocations, requests, processes: Array.from(processes) };
}

function buildWaitForGraph(allocations, requests, processes) {
    const wfg = {};
    processes.forEach(p => { wfg[p] = []; });

    logMessage("Building Wait-For Graph (WFG)...");
    let edgeAdded = false;

    for (const waitingProcess in requests) {
        if (!processes.includes(waitingProcess)) continue; // Should not happen if parseInput is correct

        const requestedResource = requests[waitingProcess];
        const holdingProcess = allocations[requestedResource];

        if (holdingProcess && processes.includes(holdingProcess) && holdingProcess !== waitingProcess) {
             if (!wfg[waitingProcess].includes(holdingProcess)) {
                 wfg[waitingProcess].push(holdingProcess);
                 logMessage(`  WFG Edge: ${waitingProcess} -> ${holdingProcess} ( P${waitingProcess} waits for R${requestedResource} held by P${holdingProcess} )`);
                 edgeAdded = true;
             }
        }
    }
     if (!edgeAdded && Object.keys(requests).length > 0) {
         logMessage("  No dependency edges added to WFG (requests might be for free resources or self).");
     } else if (!edgeAdded && Object.keys(requests).length === 0) {
         logMessage("  No requests found, WFG has no edges.");
     }
    logMessage("WFG construction attempt complete.");
    return wfg;
}


function handleDetectionClick() {
    logDiv.innerHTML = '';
    outputDiv.textContent = '';
    outputDiv.className = ''; // Clear previous status styling
    logMessage("Starting detection...");

    const parsedData = parseInput();

    if (!parsedData) {
        outputDiv.textContent = "Failed to parse input. Please check warnings in the log.";
        return;
    }

    logMessage("\n--- Parsed Input ---");
    logMessage(`Processes Found: [${parsedData.processes.join(', ')}]`);
    logMessage(`Allocations: ${JSON.stringify(parsedData.allocations)}`);
    logMessage(`Requests: ${JSON.stringify(parsedData.requests)}`);

    if (parsedData.processes.length === 0) {
        logMessage("\nNo processes found in input.");
        outputDiv.textContent = "No process data entered.";
        return;
    }

    const wfg = buildWaitForGraph(parsedData.allocations, parsedData.requests, parsedData.processes);
    logMessage(`\nConstructed WFG (Adjacency List): ${JSON.stringify(wfg)}`);

    outputDiv.textContent = "Parsed inputs and built Wait-For Graph. Cycle detection logic pending.";

    // Future: Call cycle detection function here
    // detectCycles(wfg, parsedData.processes);
}

function initializeApp() {
    const addAllocBtn = document.getElementById('add-alloc-btn');
    const addReqBtn = document.getElementById('add-req-btn');
    const detectBtn = document.getElementById('detect-btn');

    if (addAllocBtn) {
        addAllocBtn.addEventListener('click', () => addRow('allocation-table'));
    } else {
         console.error("Add Allocation button not found!");
    }

     if (addReqBtn) {
        addReqBtn.addEventListener('click', () => addRow('request-table'));
    } else {
         console.error("Add Request button not found!");
    }

     if (detectBtn) {
        detectBtn.addEventListener('click', handleDetectionClick);
    } else {
         console.error("Detect button not found!");
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
