// Global variable to hold all data after fetching
window.allAlerts = []; 

document.addEventListener('DOMContentLoaded', () => {
    // 1. Start the core function to fetch data and run detection
    fetchAndAnalyzeAlerts();
    
    // 2. Keep existing quick actions handlers for the footer section
    const quickActions = document.querySelectorAll('.actions-grid .action-item');
    quickActions.forEach(action => {
        action.addEventListener('click', (e) => {
            const link = action.getAttribute('href');
            if (link === '#') {
                e.preventDefault(); 
                const actionName = action.querySelector('span').textContent;
                console.log(`${actionName} action triggered.`);
            }
        });
    });
});

// --------------------------------------------------------------
// CORE DETECTION AND DISPLAY LOGIC
// --------------------------------------------------------------

async function fetchAndAnalyzeAlerts() {
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = '<p style="text-align:center;">Analyzing data with detection engine...</p>';

    try {
        // This connects to the function you created in the netlify/functions folder
        const response = await fetch('/.netlify/functions/analyze-fraud'); 
        
        if (!response.ok) {
            throw new Error(`Detection Engine Error! Status: ${response.status}`);
        }
        
        const analyzedData = await response.json(); 
        
        window.allAlerts = analyzedData; // Save all data
        
        // --- ADDED THIS LINE (as requested) ---
        // This now calculates stats from the live data.
        updateCommunityStats(analyzedData); 
        
        renderAlerts(analyzedData);
        
        // Show the overall system accuracy (using the static value from the function)
        if (analyzedData.length > 0) {
            displayAccuracyMeter(analyzedData[0].system_accuracy);
        }

    } catch (error) {
        console.error("Error fetching/analyzing alerts:", error);
        alertsContainer.innerHTML = '<p style="text-align:center; color: red;">Error: Could not connect to Detection Engine. Check Netlify deployment.</p>';
    }
}

function renderAlerts(alerts) {
    const alertsContainer = document.getElementById('alerts-container');
    alertsContainer.innerHTML = ''; 

    if (alerts.length === 0) {
        alertsContainer.innerHTML = '<p style="text-align:center;">No current alerts found matching the filter.</p>';
        return;
    }
    
    alerts.forEach(alert => {
        // Determine display properties based on detection result
        const statusText = alert.is_fraud ? "FRAUD DETECTED" : "SAFE / UNCERTAIN";
        const statusClass = alert.is_fraud ? "critical" : "low";

        const card = document.createElement('div');
        // Use a unique class for styling
        card.className = `alert-card-item ${alert.type.toLowerCase().replace(/\s/g, '-')}`;

        card.innerHTML = `
            <div class="card-header-dynamic">
                <span class="scam-type-tag">${alert.type}</span>
                <span class="timestamp">${alert.location || 'N/A'}</span>
            </div>
            <div class="card-body-dynamic">
                <h3>Incident: ${alert.type}</h3>
                <p><strong>Keywords:</strong> ${alert.keywords}</p>
                <p>URL: ${alert.url || 'N/A'}</p>
            </div>
            <div class="card-footer-dynamic">
                <span class="status ${statusClass}">${statusText}</span>
                <span class="confidence-score">Confidence: ${alert.confidence_score.toFixed(1)}%</span>
            </div>
        `;
        alertsContainer.appendChild(card);
    });
}

// Function triggered by the HTML <select onchange="filterAlerts()">
function filterAlerts() {
    const filterValue = document.getElementById('scam-type-filter').value;
    
    if (filterValue === 'all') {
        renderAlerts(window.allAlerts);
    } else {
        const filtered = window.allAlerts.filter(alert => alert.type === filterValue);
        renderAlerts(filtered);
    }
}

// Function to display the required overall accuracy number
function displayAccuracyMeter(accuracy) {
    const meterHTML = `
        <div class="accuracy-meter-box">
            <h3 class="meter-title">System Performance</h3>
            <p class="meter-score">Overall Accuracy: <strong>${accuracy.toFixed(1)}%</strong></p>
            <p class="meter-note">(Based on Rule-Engine evaluation against synthetic data)</p>
        </div>
    `;
    document.getElementById('accuracy-display').innerHTML = meterHTML;
}

// --- ADDED THIS NEW FUNCTION (as requested) ---
// This function updates the community stats from the live data.
function updateCommunityStats(alerts) {
    if (!alerts) {
        return; // Exit if there's no data
    }

    // 1. Calculate stats from the "real-time" data
    const totalIncidents = alerts.length;
    const fraudIncidents = alerts.filter(alert => alert.is_fraud === true).length;
    
    let detectionRate = 0;
    if (totalIncidents > 0) {
        // Calculate (fraud / total) * 100
        detectionRate = (fraudIncidents / totalIncidents) * 100;
    }

    // 2. Get the HTML elements (make sure your HTML has these IDs)
    const incidentsEl = document.getElementById('users-protected-stat');
    const fraudEl = document.getElementById('scams-reported-stat');
    const rateEl = document.getElementById('safety-score-stat');

    // 3. Update the numbers on the page
    if (incidentsEl) {
        incidentsEl.textContent = totalIncidents.toLocaleString('en-US');
    }
    if (fraudEl) {
        fraudEl.textContent = fraudIncidents.toLocaleString('en-US');
    }
    if (rateEl) {
        rateEl.textContent = `${detectionRate.toFixed(0)}%`;
    }
}
