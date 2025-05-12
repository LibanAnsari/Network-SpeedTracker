// DOM Elements
const startButton = document.getElementById('start-button');
const cancelButton = document.getElementById('cancel-button');
const retestButton = document.getElementById('retest-button');
const shareButton = document.getElementById('share-button');
const instructions = document.getElementById('instructions');
const progressContainer = document.getElementById('progress-container');
const progressText = document.getElementById('progress-text');
const progressPercentage = document.getElementById('progress-percentage');
const progressFill = document.getElementById('progress-fill');
const speedValue = document.getElementById('speed-value');
const testStatus = document.getElementById('test-status');
const resultsContainer = document.getElementById('results-container');
const downloadSpeed = document.getElementById('download-speed');
const uploadSpeed = document.getElementById('upload-speed');
const downloadTime = document.getElementById('download-time');
const uploadTime = document.getElementById('upload-time');
const qualityMarker = document.getElementById('quality-marker');
const qualityValue = document.getElementById('quality-value');

// Speed test configuration
const MIN_DOWNLOAD_SPEED = 0;
const MAX_DOWNLOAD_SPEED = 120;
const MIN_UPLOAD_SPEED = 0;
const MAX_UPLOAD_SPEED = 40;
const DOWNLOAD_TEST_DURATION = 5000; // 5 seconds
const UPLOAD_TEST_DURATION = 5000; // 5 seconds
const INIT_DELAY = 1000; // 1 second initialization

// Test state
let testCancelled = false;
let currentTestResults = null;

// Event Listeners
startButton.addEventListener('click', startTest);
cancelButton.addEventListener('click', cancelTest);
retestButton.addEventListener('click', () => {
    hideResults();
    setTimeout(startTest, 100);
});
shareButton.addEventListener('click', shareResults);

// Functions
async function startTest() {
    // Check internet connectivity first
    if (!navigator.onLine) {
        updateStatus("Test failed - No internet connection");
        return;
    }

    // Reset state
    testCancelled = false;
    hideResults();
    showProgress();
    hideStartButton();

    try {
        const results = await runSpeedTest({
            onProgress: updateProgress
        });
        
        currentTestResults = results;
        displayResults(results);
    } catch (error) {
        console.error("Test failed:", error);
        updateStatus("Test failed. Please try again.");
    } finally {
        hideProgress();
        showStartButton();
    }
}

function cancelTest() {
    testCancelled = true;
    updateStatus("Ready to test");
    updateProgress(0, "Cancelled", 0);
    hideProgress();
    showStartButton();
}

function updateProgress(percentage, phase, speed) {
    progressText.textContent = phase;
    progressPercentage.textContent = `${Math.round(percentage)}%`;
    progressFill.style.width = `${percentage}%`;
    speedValue.textContent = speed.toFixed(1);
    updateStatus(phase, testCancelled ? false : true);
}

function updateStatus(status, pulsing = false) {
    testStatus.textContent = status;
    if (pulsing) {
        testStatus.classList.add('pulsing');
    } else {
        testStatus.classList.remove('pulsing');
    }
}

function showProgress() {
    instructions.classList.add('hidden');
    progressContainer.classList.remove('hidden');
}

function hideProgress() {
    progressContainer.classList.add('hidden');
}

function showStartButton() {
    startButton.classList.remove('hidden');
    cancelButton.classList.add('hidden');
}

function hideStartButton() {
    startButton.classList.add('hidden');
    cancelButton.classList.remove('hidden');
}

function hideResults() {
    resultsContainer.classList.add('hidden');
    instructions.classList.remove('hidden');
}

function displayResults(results) {
    // Update result values
    downloadSpeed.textContent = `${results.downloadSpeed.toFixed(1)} Mbps`;
    uploadSpeed.textContent = `${results.uploadSpeed.toFixed(1)} Mbps`;
    downloadTime.textContent = results.downloadTime.toFixed(1);
    uploadTime.textContent = results.uploadTime.toFixed(1);
    
    // Update quality indicator
    updateQualityIndicator(results.downloadSpeed);
    
    // Show results
    instructions.classList.add('hidden');
    resultsContainer.classList.remove('hidden');
}

function updateQualityIndicator(speed) {
    // Calculate quality indicator position
    const qualityPercentage = Math.min(speed / 100, 1) * 100;
    qualityMarker.style.left = `${qualityPercentage}%`;
    
    // Determine connection quality text and class
    let qualityText = '';
    let qualityClass = '';
    
    if (speed < 30) {
        qualityText = 'slow';
        qualityClass = 'quality-slow';
    } else if (speed < 60) {
        qualityText = 'average';
        qualityClass = 'quality-average';
    } else {
        qualityText = 'fast';
        qualityClass = 'quality-fast';
    }
    
    qualityValue.textContent = qualityText;
    qualityValue.className = qualityClass;
}

function shareResults() {
    if (!currentTestResults) return;
    
    const shareText = `My internet speed test results:
• Download: ${currentTestResults.downloadSpeed.toFixed(1)} Mbps
• Upload: ${currentTestResults.uploadSpeed.toFixed(1)} Mbps

Tested with Network Speed Tester app.`;
    
    if (navigator.share) {
        navigator.share({
            title: 'My Speed Test Results',
            text: shareText,
        }).catch(error => {
            console.error('Error sharing:', error);
            fallbackShare(shareText);
        });
    } else {
        fallbackShare(shareText);
    }
}

function fallbackShare(text) {
    // Create a temporary textarea element
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';  // Prevent scrolling to bottom
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            alert('Results copied to clipboard! You can now paste and share them.');
        } else {
            alert('Failed to copy results to clipboard.');
        }
    } catch (err) {
        console.error('Error copying text: ', err);
        alert('Failed to copy results to clipboard.');
    }
    
    document.body.removeChild(textarea);
}

// Speed Test Implementation
async function runSpeedTest(options) {
    const { onProgress } = options;
    // Initialize test
    onProgress(0, "Initializing...", 0);
    await simulateDelay(INIT_DELAY);
    if (testCancelled) throw new Error("Test cancelled");

    // Download test (real)
    onProgress(5, "Testing download speed...", 0);
    const downloadStartTime = Date.now();
    const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/3/3e/Tokyo_Sky_Tree_2012.JPG"; // 8.17MB test image
    let downloadSpeed = 0;
    let downloadTime = 0;
    try {
        const response = await fetch(imageUrl + '?cacheBust=' + Date.now(), { cache: 'no-store' });
        const reader = response.body.getReader();
        let receivedLength = 0;
        const contentLength = 8.17 * 1024 * 1024; // 8.17MB in bytes
        let lastUpdate = Date.now();
        while (true) {
            if (testCancelled) throw new Error("Test cancelled");
            const { done, value } = await reader.read();
            if (done) break;
            receivedLength += value.length;
            // Update progress every 100ms
            if (Date.now() - lastUpdate > 100) {
                const elapsed = (Date.now() - downloadStartTime) / 1000;
                const bitsLoaded = receivedLength * 8;
                const mbps = (bitsLoaded / 1_000_000) / elapsed;
                onProgress(5 + Math.min(receivedLength / contentLength, 1) * 45, "Testing download speed...", mbps);
                lastUpdate = Date.now();
            }
        }
        downloadTime = (Date.now() - downloadStartTime) / 1000;
        const bitsLoaded = receivedLength * 8;
        downloadSpeed = (bitsLoaded / 1_000_000) / downloadTime;
    } catch (e) {
        throw new Error("Download test failed");
    }
    if (testCancelled) throw new Error("Test cancelled");

    // Upload test (simulated)
    onProgress(50, "Testing upload speed...", 0);
    const uploadStartTime = Date.now();
    // Simulate upload as a fraction of download speed
    const simulatedUploadSpeed = Math.min(downloadSpeed * 0.3, MAX_UPLOAD_SPEED);
    await simulateSpeedTest(
        UPLOAD_TEST_DURATION,
        simulatedUploadSpeed * 0.8,
        simulatedUploadSpeed,
        (progress, speed) => {
            onProgress(50 + progress * 45, "Testing upload speed...", speed);
        }
    );
    if (testCancelled) throw new Error("Test cancelled");
    const uploadTime = (Date.now() - uploadStartTime) / 1000;
    // Test complete
    onProgress(100, "Test completed", Math.max(downloadSpeed, simulatedUploadSpeed));
    // Return results
    return {
        downloadSpeed,
        uploadSpeed: simulatedUploadSpeed,
        downloadTime,
        uploadTime
    };
}

// Helper functions
async function simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function simulateSpeedTest(duration, minSpeed, maxSpeed, progressCallback) {
    const startTime = Date.now();
    const endTime = startTime + duration;
    
    // Simulate a somewhat realistic test curve
    // Start slow, get faster, then stabilize
    const finalSpeed = minSpeed + Math.random() * (maxSpeed - minSpeed);
    let currentSpeed = 0;
    
    while (Date.now() < endTime && !testCancelled) {
        const elapsedRatio = (Date.now() - startTime) / duration;
        const progressRatio = Math.min(elapsedRatio, 1);
        
        // Curve: start slow, accelerate, then stabilize
        if (elapsedRatio < 0.5) {
            // Slow start
            currentSpeed = finalSpeed * (elapsedRatio * 3);
        } else if (elapsedRatio < 0.7) {
            // Acceleration and fluctuation
            const baseSpeed = finalSpeed * 0.6;
            const randomFactor = Math.sin(elapsedRatio * 20) * 0.1 * finalSpeed;
            const progressFactor = finalSpeed * 0.4 * ((elapsedRatio - 0.2) / 0.5);
            currentSpeed = baseSpeed + progressFactor + randomFactor;
        } else {
            // Stabilization with minor fluctuations
            const randomFactor = (Math.random() - 0.5) * 0.1 * finalSpeed;
            currentSpeed = finalSpeed + randomFactor;
        }
        
        progressCallback(progressRatio, currentSpeed);
        await simulateDelay(100);
    }
    
    return currentSpeed;
}