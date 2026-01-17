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

// 3. STATE
let model = null;
let isScanning = false;
let lastSpeechTime = 0;
let previousFrameData = {}; 
let wakeLock = null;
let modelLoaded = false;

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
        // Trigger model download in background
        const modelUrl = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/';
        
        // Pre-load model to ensure it's cached
        const testModel = await cocoSsd.load(MODEL_CONFIG);
        
        // Store metadata
        const transaction = db.transaction(['models'], 'readwrite');
        const store = transaction.objectStore('models');
        store.put({
            id: 'coco-ssd',
            version: OFFLINE_MODEL_VERSION,
            timestamp: Date.now(),
            url: modelUrl
        });
        
        console.log("Model downloaded and cached successfully");
    } catch (err) {
        console.log("Model download failed:", err.message);
    }
}

// ==========================================
// 5. INITIALIZATION
// ==========================================
// Auto-cache model on page load
window.addEventListener('load', () => {
    cacheModel();
});

scanButton.addEventListener('click', async () => {
    if (isScanning) return;
    
    scanButton.innerText = "LOADING MODEL...";
    scanButton.disabled = true;
    
    try {
        // A. Load Model with offline fallback
        try {
            model = await cocoSsd.load(MODEL_CONFIG);
            modelLoaded = true;
            scanButton.innerText = "STARTING CAMERA...";
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
            startAppUI();
        };

    } catch (err) {
        alert("Error: " + err.message);
        scanButton.innerText = "TRY AGAIN";
        scanButton.disabled = false;
    }
});

function startAppUI() {
    isScanning = true;
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
    // 5. MAIN LOOP
    // ==========================================
    async function detectFrame() {
        if (!isScanning) return;
    
        // Setup Canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    
        // Detect Objects
        const predictions = await model.detect(video, 10, CONFIDENCE_THRESHOLD);
    
        let sceneObjects = [];
        let detailedObjects = []; 
        let maxConfidence = 0;
    
        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            const label = prediction.class;
            const score = prediction.score;
            
            // Track max confidence
            if (score > maxConfidence) maxConfidence = score;
            
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
        
        // Logic Brain (Runs every 4 seconds)
        const now = Date.now();
        if (now - lastSpeechTime > 4000) {
            processSmartLogic(sceneObjects, detailedObjects);
            lastSpeechTime = now;
        }
    
        requestAnimationFrame(detectFrame);
    }
    
    // ==========================================
    // 6. LOGIC BRAIN
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
        
        // Update status indicator based on hazard level
        if (statusDot && statusText) {
            if (subtitle.includes('APPROACHING')) {
                statusDot.style.background = 'var(--error)';
                statusDot.style.boxShadow = '0 0 15px var(--error), inset 0 0 5px rgba(255, 51, 51, 0.5)';
                statusText.innerText = 'Hazard';
            } else if (subtitle.includes('detected')) {
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
    
        if (counts['toilet'] || counts['sink']) return "Bathroom";
        if (counts['bed']) return "Bedroom";
        if (counts['oven'] || counts['refrigerator']) return "Kitchen";
        if (counts['tv'] && counts['couch']) return "Living Room";
        if (counts['car'] || counts['traffic light']) return "Street";
        return "Unknown Room";
    }
    
    function buildSmartDescription(scene, objects) {
        objects.sort((a, b) => (b.movement === 'approaching' ? 1 : -1));
        const topObjs = objects.slice(0, 2); 
    
        let text = "";
        if (scene !== "Unknown Room") text += `In a ${scene}. `;
    
        let parts = topObjs.map(obj => {
            let part = obj.label;
            if (obj.color) part = `${obj.color} ${part}`; 
            if (obj.movement === 'approaching') part += " APPROACHING";
            else part += ` ${obj.position}`;
            return part;
        });
    
        return text + parts.join(", and ");
    }
    
    // ==========================================
    // 7. UTILITIES
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
        if (window.speechSynthesis.speaking) return;
        const u = new SpeechSynthesisUtterance(text);
        u.rate = 1.1; 
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