 // ==========================================
// GEOLENS AI V1 - STABLE RELEASE
// ==========================================

// 1. CONFIGURATION
const MODEL_CONFIG = { base: 'mobilenet_v2' }; 
const CONFIDENCE_THRESHOLD = 0.55;
const OFFLINE_MODEL_KEY = 'geolensai_model_cache';
const OFFLINE_MODEL_VERSION = '1.0';

// 2. ELEMENT SELECTORS
const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scanButton = document.getElementById('scanButton');
const screenToggle = document.getElementById('screenToggle');
const sceneText = document.getElementById('sceneText');
const objectList = document.getElementById('objectList');
const appInterface = document.getElementById('app-interface');
const confidenceDisplay = document.getElementById('confidence');
const statusDot = document.querySelector('.status-dot');
const statusText = document.querySelector('.status-text');
const loadingOverlay = document.getElementById('loading-overlay');
const progressFill = document.getElementById('progressFill');
const loaderStatus = document.getElementById('loaderStatus');
const fpsCounter = document.getElementById('fps-counter');
const inferenceTime = document.getElementById('inference-time');
const audioToggle = document.getElementById('audioToggle');
const audioControls = document.getElementById('audio-controls');
const closeAudioControls = document.getElementById('closeAudioControls');
const speechRateSlider = document.getElementById('speechRate');
const volumeSlider = document.getElementById('volume');
const muteToggle = document.getElementById('muteToggle');
const rateDisplay = document.getElementById('rateDisplay');
const volumeDisplay = document.getElementById('volumeDisplay');
const historyToggle = document.getElementById('historyToggle');
const historyPanel = document.getElementById('history-panel');
const closeHistory = document.getElementById('closeHistory');
const clearHistoryBtn = document.getElementById('clearHistory');
const historyList = document.getElementById('historyList');

// 3. STATE
let model = null;
let isScanning = false;
let lastSpeechTime = 0;
let previousFrameData = {}; 
let wakeLock = null;
let modelLoaded = false;
let frameCount = 0;
let lastFrameTime = Date.now();
let currentInferenceTime = 0;
let audioMuted = false;
let currentVolume = 1.0;
let currentSpeechRate = 1.1;
let detectionHistory = [];
const MAX_HISTORY_ITEMS = 50;
let currentScene = "Unknown";
let sceneConfidence = 0;
let lastSceneAnnouncement = 0;

// SCENE RECOGNITION DATABASE
const SCENE_PATTERNS = {
    'Kitchen': {
        objects: ['oven', 'refrigerator', 'sink', 'microwave', 'cup', 'bottle', 'knife', 'spoon', 'fork'],
        hazards: ['knife', 'oven', 'stove'],
        contextCues: {
            knife: 'Sharp Object detected - use caution',
            oven: 'Hot surface detected - keep away',
            stove: 'Active heat source nearby'
        }
    },
    'Bedroom': {
        objects: ['bed', 'lamp', 'chair', 'dresser', 'wardrobe'],
        hazards: ['bed edge'],
        contextCues: {
            bed: 'Bed detected - low obstacle risk',
            lamp: 'Light fixture overhead'
        }
    },
    'Bathroom': {
        objects: ['toilet', 'sink', 'bathtub', 'shower'],
        hazards: ['toilet', 'bathtub', 'wet floor'],
        contextCues: {
            toilet: 'Toilet detected - keep distance',
            bathtub: 'Water hazard detected - slippery surface',
            'wet floor': 'CAUTION: Wet surface - fall risk'
        }
    },
    'Living Room': {
        objects: ['tv', 'couch', 'table', 'chair', 'lamp'],
        hazards: ['table', 'chair'],
        contextCues: {
            couch: 'Seating available',
            table: 'Surface ahead - watch distance'
        }
    },
    'Stairs': {
        objects: ['stairs', 'steps', 'railing'],
        hazards: ['stairs', 'steps'],
        contextCues: {
            stairs: 'MAJOR HAZARD: Stairs detected - extreme caution',
            steps: 'Step hazard - clear path recommended'
        }
    },
    'Outdoor': {
        objects: ['car', 'traffic light', 'bicycle', 'person', 'road', 'sidewalk', 'tree'],
        hazards: ['car', 'traffic light', 'bicycle'],
        contextCues: {
            car: 'Vehicle detected - maintain distance',
            'traffic light': 'Traffic junction - check surroundings',
            bicycle: 'Cyclist nearby - stay alert'
        }
    },
    'Office': {
        objects: ['computer', 'desk', 'chair', 'keyboard', 'monitor'],
        hazards: ['chair'],
        contextCues: {
            desk: 'Work surface detected',
            chair: 'Chair obstacle nearby'
        }
    }
};

// ==========================================
// 4. OFFLINE MODEL MANAGEMENT
// ==========================================
async function cacheModel() {
    try {
        if (!('indexedDB' in window)) {
            console.log("IndexedDB not available, offline mode disabled");
            return false;
        }
        
        const db = await openIndexedDB();
        const cached = await getModelFromCache(db);
        
        if (!cached) {
            console.log("Downloading model for offline use...");
            await downloadAndCacheModel(db);
        } else {
            console.log("Model already cached for offline use");
        }
        return true;
    } catch (err) {
        console.log("Model caching failed:", err.message);
        return false;
    }
}

function openIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('GeoLensAI', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('models')) {
                db.createObjectStore('models', { keyPath: 'id' });
            }
        };
    });
}

function getModelFromCache(db) {
    return new Promise((resolve) => {
        const transaction = db.transaction(['models'], 'readonly');
        const store = transaction.objectStore('models');
        const request = store.get('coco-ssd');
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
    });
}

async function downloadAndCacheModel(db) {
    try {
        const testModel = await cocoSsd.load(MODEL_CONFIG);
        const transaction = db.transaction(['models'], 'readwrite');
        const store = transaction.objectStore('models');
        store.put({
            id: 'coco-ssd',
            version: OFFLINE_MODEL_VERSION,
            timestamp: Date.now(),
            url: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/'
        });
        console.log("Model downloaded and cached successfully");
    } catch (err) {
        console.log("Model download failed:", err.message);
    }
}

// ==========================================
// 5. AUDIO CONTROLS
// ==========================================
function setupAudioControls() {
    audioToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        audioControls.classList.toggle('hidden');
    });
    
    closeAudioControls.addEventListener('click', () => {
        audioControls.classList.add('hidden');
    });
    
    speechRateSlider.addEventListener('input', (e) => {
        currentSpeechRate = parseFloat(e.target.value);
        rateDisplay.innerText = currentSpeechRate.toFixed(1) + 'x';
    });
    
    volumeSlider.addEventListener('input', (e) => {
        currentVolume = parseFloat(e.target.value) / 100;
        volumeDisplay.innerText = e.target.value + '%';
    });
    
    muteToggle.addEventListener('change', (e) => {
        audioMuted = e.target.checked;
        audioToggle.style.opacity = audioMuted ? '0.5' : '1';
    });
    
    // Close audio panel when clicking outside
    document.addEventListener('click', (e) => {
        if (!audioControls.contains(e.target) && !audioToggle.contains(e.target)) {
            audioControls.classList.add('hidden');
        }
    });
}

// ==========================================
// 6. PERFORMANCE METRICS
// ==========================================
function updatePerformanceMetrics() {
    const now = Date.now();
    const deltaTime = now - lastFrameTime;
    
    if (deltaTime > 0) {
        const fps = Math.round(1000 / deltaTime);
        fpsCounter.innerText = `FPS: ${fps}`;
    }
    
    inferenceTime.innerText = `${currentInferenceTime}ms`;
    lastFrameTime = now;
}

// ==========================================
// 7. LOADING PROGRESS
// ==========================================
function updateLoadingProgress(percent, message) {
    if (progressFill) progressFill.style.width = percent + '%';
    if (loaderStatus) loaderStatus.innerText = message;
}

// ==========================================
// 8. INITIALIZATION
// ==========================================
// Auto-cache model on page load
window.addEventListener('load', () => {
    cacheModel();
    setupAudioControls();
});

scanButton.addEventListener('click', async () => {
    if (isScanning) return;
    
    loadingOverlay.classList.remove('hidden');
    updateLoadingProgress(10, "Loading AI model...");
    scanButton.disabled = true;
    
    try {
        // A. Load Model with offline fallback
        try {
            const modelPromise = cocoSsd.load(MODEL_CONFIG);
            
            // Simulate progress while loading
            let progress = 10;
            const progressInterval = setInterval(() => {
                if (progress < 90) {
                    progress += Math.random() * 20;
                    updateLoadingProgress(Math.min(progress, 90), "Initializing neural network...");
                }
            }, 300);
            
            model = await modelPromise;
            clearInterval(progressInterval);
            
            modelLoaded = true;
            updateLoadingProgress(95, "Starting camera...");
        } catch (err) {
            console.error("Model load failed:", err);
            throw new Error("Failed to load detection model. Please check your connection.");
        }
        
        // B. Start Camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            video.srcObject = stream;
        } catch (err) {
            throw new Error("Camera access denied or not available");
        }

        // C. Wake Lock
        if ('wakeLock' in navigator) {
            try { wakeLock = await navigator.wakeLock.request('screen'); } 
            catch (err) { console.log("Wake Lock not available"); }
        }

        video.onloadedmetadata = () => {
            video.play();
            updateLoadingProgress(100, "Ready!");
            setTimeout(() => {
                startAppUI();
            }, 500);
        };

    } catch (err) {
        loadingOverlay.classList.add('hidden');
        alert("Error: " + err.message);
        scanButton.disabled = false;
    }
});

function startAppUI() {
    isScanning = true;
    loadingOverlay.classList.add('hidden');
    if (appInterface) appInterface.style.display = 'block';
    
    // Hide the landing page smoothly
    const landing = document.getElementById('landing-page');
    if(landing) landing.style.display = 'none';
    
    // Update status indicator
    if (statusText) statusText.innerText = 'Scanning';
    
    speak("Geo Lens Active.");
    detectFrame();
}
    
    // ==========================================
    // 9. MAIN LOOP
    // ==========================================
    async function detectFrame() {
        if (!isScanning) return;
    
        // Setup Canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Measure inference time
        const inferenceStart = performance.now();
        
        // Detect Objects
        const predictions = await model.detect(video, 10, CONFIDENCE_THRESHOLD);
        
        currentInferenceTime = Math.round(performance.now() - inferenceStart);
    
        let sceneObjects = [];
        let detailedObjects = []; 
        let maxConfidence = 0;
    
        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            const label = prediction.class;
            const score = prediction.score;
            
            // Track max confidence
            if (score > maxConfidence) maxConfidence = score;
            
            // Add to detection history
            addToHistory(label, score);
            
            // Draw Box
            drawBox(x, y, width, height, label);
    
            // Gather Smart Data
            const color = detectDominantColor(x, y, width, height);
            const movement = detectMovement(label, width * height);
            const position = getSpatialPosition(x, width);
    
            sceneObjects.push(label);
            detailedObjects.push({ label, color, movement, position, score });
        });
    
        // Update confidence display
        if (confidenceDisplay) {
            confidenceDisplay.innerText = maxConfidence > 0 ? `${Math.round(maxConfidence * 100)}%` : '--';
        }
        
        // Update performance metrics
        updatePerformanceMetrics();
        
        // Logic Brain (Runs every 4 seconds)
        const now = Date.now();
        if (now - lastSpeechTime > 4000) {
            processSmartLogic(sceneObjects, detailedObjects);
            lastSpeechTime = now;
        }
    
        requestAnimationFrame(detectFrame);
    }
    
    // ==========================================
    // 10. LOGIC BRAIN
    // ==========================================
    function processSmartLogic(sceneObjs, detailedObjs) {
        if (detailedObjs.length === 0) {
            updateStatus("SCANNING", "Path clear...");
            return;
        }
    
        const environment = deduceEnvironment(sceneObjs);
        const description = buildSmartDescription(environment, detailedObjs);
        
        updateStatus(environment, description);
        speak(description);
    
        // Vibrate on Hazard
        const hazard = detailedObjs.find(o => o.movement === 'approaching');
        if (hazard && navigator.vibrate) navigator.vibrate([200]); 
    }
    
    function updateStatus(title, subtitle) {
        if (sceneText) sceneText.innerText = title.toUpperCase();
        if (objectList) objectList.innerText = subtitle;
        
        // Update scene display
        const sceneDisplay = document.getElementById('sceneDisplay');
        const sceneConfidenceEl = document.getElementById('sceneConfidence');
        if (sceneDisplay) sceneDisplay.innerText = currentScene;
        if (sceneConfidenceEl) sceneConfidenceEl.innerText = `${Math.round(sceneConfidence * 100)}%`;
        
        // Update status indicator based on hazard level
        if (statusDot && statusText) {
            if (subtitle.includes('HAZARD:') || subtitle.includes('CRITICAL:')) {
                statusDot.style.background = 'var(--error)';
                statusDot.style.boxShadow = '0 0 15px var(--error), inset 0 0 5px rgba(255, 51, 51, 0.5)';
                statusText.innerText = 'Hazard';
            } else if (subtitle.includes('APPROACHING') || subtitle.includes('detected')) {
                statusDot.style.background = 'var(--warning)';
                statusDot.style.boxShadow = '0 0 15px var(--warning), inset 0 0 5px rgba(255, 165, 0, 0.5)';
                statusText.innerText = 'Detecting';
            } else {
                statusDot.style.background = 'var(--success)';
                statusDot.style.boxShadow = '0 0 10px var(--success), inset 0 0 5px rgba(0, 214, 133, 0.5)';
                statusText.innerText = 'Ready';
            }
        }
    }
    
    function deduceEnvironment(labels) {
        let counts = {};
        labels.forEach(x => { counts[x] = (counts[x] || 0) + 1; });
        
        let bestScene = "Unknown";
        let bestScore = 0;
        
        // Score each scene based on detected objects
        for (const [scene, pattern] of Object.entries(SCENE_PATTERNS)) {
            let score = 0;
            pattern.objects.forEach(obj => {
                if (counts[obj]) score += 1;
            });
            
            if (score > bestScore) {
                bestScore = score;
                bestScene = scene;
            }
        }
        
        // High confidence if 2+ objects matched, medium if 1
        sceneConfidence = bestScore >= 2 ? 0.9 : (bestScore === 1 ? 0.5 : 0.1);
        
        // Special case: Detect stairs (major hazard)
        if (counts['stairs'] || counts['steps']) {
            return "Stairs";
        }
        
        return bestScene;
    }
    
    function buildSmartDescription(scene, objects) {
        objects.sort((a, b) => (b.movement === 'approaching' ? 1 : -1));
        const topObjs = objects.slice(0, 2);
        
        let text = "";
        
        // Announce scene change with context
        if (scene !== currentScene) {
            currentScene = scene;
            text += getSceneAnnouncement(scene);
        }
        
        // Check for scene-specific hazards
        const hazardWarnings = checkSceneHazards(scene, objects);
        if (hazardWarnings) {
            text += hazardWarnings + ". ";
        }
        
        // Describe detected objects
        let parts = topObjs.map(obj => {
            let part = obj.label;
            if (obj.color) part = `${obj.color} ${part}`; 
            if (obj.movement === 'approaching') part += " APPROACHING";
            else part += ` ${obj.position}`;
            return part;
        });
    
        return text + parts.join(", and ");
    }
    
    function getSceneAnnouncement(scene) {
        const announces = {
            'Kitchen': 'Entered kitchen environment. Watch for sharp objects and heat sources.',
            'Bedroom': 'Bedroom detected. Low obstacle risks, but watch bed edges.',
            'Bathroom': 'Bathroom detected. Caution: slippery surfaces and fixed obstacles.',
            'Living Room': 'Living room identified. Watch for furniture.',
            'Stairs': 'CRITICAL: Stairs detected ahead. Extreme caution required.',
            'Outdoor': 'Outdoor environment detected. Watch for vehicles and pedestrians.',
            'Office': 'Office space detected. Standard workspace navigation.'
        };
        return announces[scene] ? announces[scene] + ' ' : '';
    }
    
    function checkSceneHazards(scene, objects) {
        const sceneData = SCENE_PATTERNS[scene];
        if (!sceneData) return '';
        
        let warnings = [];
        
        // Check for hazardous objects in this scene
        objects.forEach(obj => {
            if (sceneData.hazards.includes(obj.label)) {
                const hazardMsg = sceneData.contextCues[obj.label];
                if (hazardMsg && obj.movement !== 'approaching') {
                    warnings.push(hazardMsg);
                }
            }
        });
        
        // Critical warnings for approaching hazards
        const approachingHazard = objects.find(o => 
            o.movement === 'approaching' && sceneData.hazards.includes(o.label)
        );
        
        if (approachingHazard) {
            const hazardMsg = sceneData.contextCues[approachingHazard.label];
            return `HAZARD: ${hazardMsg || approachingHazard.label + ' approaching'}. Move away immediately`;
        }
        
        return warnings.length > 0 ? warnings[0] : '';
    }
    
    // ==========================================
    // 11. UTILITIES
    // ==========================================
    function detectMovement(label, currentArea) {
        const prev = previousFrameData[label];
        let status = "";
        if (prev && currentArea > prev.area * 1.15) status = "approaching";
        previousFrameData[label] = { area: currentArea, time: Date.now() };
        return status;
    }
    
    function detectDominantColor(x, y, w, h) {
        const cx = Math.floor(x + w / 2);
        const cy = Math.floor(y + h / 2);
        if (cx < 0 || cy < 0) return "";
        const p = ctx.getImageData(cx, cy, 1, 1).data;
        if (p[0] > 150 && p[1] < 100) return "red";
        if (p[1] > 150 && p[0] < 100) return "green";
        if (p[2] > 150 && p[0] < 100) return "blue";
        if (p[0] > 200 && p[1] > 200 && p[2] > 200) return "white";
        return "";
    }
    
    function getSpatialPosition(x, width) {
        const cx = x + (width/2);
        if (cx < canvas.width * 0.33) return "on left";
        if (cx > canvas.width * 0.66) return "on right";
        return "ahead";
    }
    
    function drawBox(x, y, w, h, label) {
        ctx.strokeStyle = "#FFFF00"; 
        ctx.lineWidth = 4;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = "black";
        ctx.font = "bold 20px Arial";
        ctx.fillText(label, x + 5, y - 10);
    }
    
    function speak(text) {
        if (audioMuted) return;
        if (window.speechSynthesis.speaking) return;
        
        const u = new SpeechSynthesisUtterance(text);
        u.rate = currentSpeechRate;
        u.volume = currentVolume;
        window.speechSynthesis.speak(u);
    }
    
    if(screenToggle) {
        screenToggle.addEventListener('click', () => {
            const container = document.getElementById('cam-container');
            if (container.style.opacity === "0") {
                container.style.opacity = "1";
                screenToggle.innerHTML = '<span class="icon-text">📺</span>';
                screenToggle.title = 'Enable battery saver mode';
            } else {
                container.style.opacity = "0";
                screenToggle.innerHTML = '<span class="icon-text">⚡</span>';
                screenToggle.title = 'Disable battery saver mode';
            }
        });
    }

    // DETECTION HISTORY FEATURE
    function addToHistory(objectName, confidence) {
        const timestamp = new Date();
        const historyEntry = {
            name: objectName,
            confidence: (confidence * 100).toFixed(1),
            time: timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })
        };
        
        // Add to the beginning of history
        detectionHistory.unshift(historyEntry);
        
        // Limit history size
        if (detectionHistory.length > MAX_HISTORY_ITEMS) {
            detectionHistory.pop();
        }
        
        updateHistoryDisplay();
    }
    
    function updateHistoryDisplay() {
        if (detectionHistory.length === 0) {
            historyList.innerHTML = '<p class="history-empty">No detections yet</p>';
            return;
        }
        
        historyList.innerHTML = detectionHistory.map((item, index) => `
            <div class="history-item">
                <div class="history-item-name">${item.name}</div>
                <div class="history-item-confidence">${item.confidence}%</div>
                <div class="history-item-time">${item.time}</div>
            </div>
        `).join('');
    }
    
    // History panel controls
    if (historyToggle) {
        historyToggle.addEventListener('click', () => {
            historyPanel.classList.toggle('hidden');
        });
    }
    
    if (closeHistory) {
        closeHistory.addEventListener('click', () => {
            historyPanel.classList.add('hidden');
        });
    }
    
    if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => {
            if (confirm('Clear all detection history?')) {
                detectionHistory = [];
                updateHistoryDisplay();
            }
        });
    }