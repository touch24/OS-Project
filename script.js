console.log("Deadlock Detection Script Initializing...");

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
    logMessage(`Added new row to ${tableId === 'allocation-table' ? 'Allocations' : 'Requests'}.`);
}

function handleDetectionClick() {
    logMessage("Detection button clicked. Parsing inputs (logic pending)...");
    outputDiv.textContent = "Detection logic not yet implemented.";
    // Future: Call parsing and detection functions here
}


function initializeApp() {
    console.log("Application Initializing...");
    logMessage('Initializing UI components...');

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

    logMessage('UI Initialized. Ready for input.');
}

document.addEventListener('DOMContentLoaded', initializeApp);

console.log("Initial script setup complete.");
