// Global variable to hold all data after fetching
window.allAlerts = []; 

// Global counter for the dynamic "wave"
let trendCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Start the core function to fetch data and run detection
    fetchAndAnalyzeAlerts();
    
    // 2. Set an interval to re-calculate the stats
    // This will make the "Detection Rate" fluctuate every 3 seconds (3000ms)
    setInterval(() => {
        // We pass window.allAlerts so it always uses the most recent data
        updateCommunityStats(window.allAlerts);
    }, 3000); // 3000 milliseconds = 3 seconds

    // 3. Keep existing quick actions handlers for the footer section
    const quickActions = document.querySelectorAll('.actions-grid .action-item');
    quickActions.forEach(action => {
        action.addEventListener('click', (e) => {
            const link = action.getAttribute('href');
            // This now ignores the quiz button, which is correct.
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
        
        // --- THIS LINE IS NOW FIXED ---
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

// --- "HYBRID" FUNCTION WITH "RISE AND FALL" RATE ---
// This is the correct function that adds the base numbers.
function updateCommunityStats(alerts) {

    // --- 1. DEFINE YOUR TARGET BASE NUMBERS ---
    const targetTotalIncidents = 1254;
    const targetFraudIncidents = Math.round(targetTotalIncidents * 0.25); // 314
    const targetDetectionRate = 78.0; // The center of our wave
    // ----------------------------------------------------

    let realTimeIncidents = 0;
    let realTimeFraud = 0;

    // This check is important. If alerts is undefined (from the typo), 
    // it won't run, but the next interval will.
    if (alerts && Array.isArray(alerts)) { 
        // 2. Calculate stats from the "real-time" data
        realTimeIncidents = alerts.length;
        realTimeFraud = alerts.filter(alert => alert.is_fraud === true).length;
    }

    // 3. Add your base numbers to the real-time numbers
    const finalIncidents = targetTotalIncidents + realTimeIncidents;
    const finalFraud = targetFraudIncidents + realTimeFraud;

    // --- 4. Make the 78% "rise and fall" smoothly ---
    
    // We use the global trendCounter to create a sine wave.
    trendCounter += 0.2; 
    
    // Math.sin() moves between -1 and 1. We multiply by 0.5 to get a range of -0.5 to +0.5.
    const fluctuation = Math.sin(trendCounter) * 0.5; 
    
    // This makes the rate move smoothly between 77.5% and 78.5%
    const dynamicRate = targetDetectionRate + fluctuation;
    // ----------------------------------------------------------

    // 5. Get the HTML elements
    const incidentsEl = document.getElementById('users-protected-stat');
    const fraudEl = document.getElementById('scams-reported-stat');
    const rateEl = document.getElementById('safety-score-stat');

    // 6. Update the numbers on the page
    if (incidentsEl) {
        incidentsEl.textContent = finalIncidents.toLocaleString('en-US');
    }
    if (fraudEl) {
        fraudEl.textContent = finalFraud.toLocaleString('en-US');
    }
    if (rateEl) {
        // This will now show a smooth rate like "78.2%", "78.4%", "78.5%", "78.4%", "78.2%"
        rateEl.textContent = `${dynamicRate.toFixed(1)}%`;
    }
}
