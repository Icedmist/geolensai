# GeoLens AI 👁️😂

**Offline vision assistance powered by edge computing. See the world through sound and logic.**

A real-time object detection and audio description system built with TensorFlow.js and COCO-SSD for accessibility and environmental awareness.

---

## ✨ Features

### Core Functionality
- **Real-time Object Detection**: COCO-SSD powered AI model runs directly in your browser
- **Audio Descriptions**: Intelligent audio feedback for detected objects and scenes
- **Offline Support**: Model caches locally for offline functionality
- **Edge Computing**: All processing happens on-device, no cloud dependency
- **Low Latency**: Sub-100ms inference times for responsive feedback

### Smart Features
- **Scene Understanding**: Automatically detects environment (Kitchen, Bedroom, Bathroom, Street, etc.)
- **Movement Detection**: Identifies approaching objects with hazard alerts
- **Spatial Awareness**: Tells you if objects are left, center, or right of view
- **Color Recognition**: Describes object colors for better context
- **Confidence Display**: Real-time confidence scores for detections

### Advanced Controls
- **Performance Metrics**: Live FPS counter and inference time display
- **Audio Controls Panel**:
  - Adjustable speech rate (0.5x - 2x speed)
  - Volume control (0-100%)
  - Mute toggle
- **Battery Saver Mode**: Toggle camera view to reduce power consumption
- **Loading Progress**: Visual feedback during model initialization

### UI/UX Enhancements
- **Responsive Design**: Mobile-first approach with breakpoints for all devices
- **Animated Loading**: Spinner with progress bar during model loading
- **Status Indicators**: Color-coded status (Ready/Scanning/Hazard)
- **Scan-line Animation**: Visual feedback on camera feed
- **Glass Morphism**: Modern UI with backdrop blur effects
- **Dark Mode**: Eye-friendly dark theme optimized for accessibility

---

## 🚀 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Camera access permission
- ~50MB internet for first-time model download (then works offline)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/icedmist/geolensai.git
cd geolensai
```

2. Serve the files locally:
```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js
npx http-server

# Or open index.html directly in your browser
```

3. Navigate to `http://localhost:8000` and click **"Launch Core"**

---

## 📖 Usage

### Starting the Application
1. Open `index.html` in your browser
2. Click **"Launch Core"** button
3. Grant camera permissions when prompted
4. Wait for AI model to load (first-time: ~30-60 seconds, cached after)

### During Detection
- **Audio Feedback**: Listen to scene descriptions every 4 seconds
- **Performance Metrics**: Top-left shows FPS and inference time
- **Status Indicator**: Pulsing dot shows system status
- **Confidence Score**: Top-right displays detection confidence

### Controls
| Control | Action |
|---------|--------|
| 🔊 Button | Open/close audio settings |
| ⚡ Button | Toggle battery saver mode |
| Audio Panel | Adjust speech rate, volume, mute |

---

## ⚙️ Technical Stack

### Frontend
- **TensorFlow.js**: Machine learning library
- **COCO-SSD**: Pre-trained object detection model
- **HTML5 Canvas**: Real-time drawing and detection visualization
- **Web Audio API**: Audio processing and speech synthesis

### Storage & Performance
- **IndexedDB**: Local model caching for offline use
- **Screen Wake Lock API**: Prevent device sleep during scanning
- **requestAnimationFrame**: 60fps video processing

### Browser APIs Used
- Geolocation API (ready for future features)
- MediaDevices API (camera access)
- Web Speech API (audio synthesis)
- Vibration API (haptic feedback)
- Battery Status API (planned)

---

## 📱 Device Compatibility

| Device | Support | Notes |
|--------|---------|-------|
| Desktop | ✅ Full | Chrome, Firefox, Safari, Edge |
| Mobile | ✅ Full | iOS Safari, Chrome Mobile, Firefox Mobile |
| Tablet | ✅ Full | iPad, Android tablets |
| Vision Pro | ⏳ Testing | WebXR support in progress |

---

## 🎨 UI/UX Improvements

### Version 1.2+
- ✅ Enhanced landing page with animated logo
- ✅ Responsive font sizing with `clamp()`
- ✅ Loading spinner with progress bar
- ✅ Performance metrics display (FPS, inference time)
- ✅ Audio controls panel with sliders
- ✅ Improved HUD overlay with better hierarchy
- ✅ Status indicator with color-coded feedback
- ✅ Camera sizing optimizations
- ✅ Accessibility improvements (ARIA labels, color contrast)
- ✅ Mobile-optimized breakpoints

---

## 🔧 Configuration

### Model Settings
Edit `script.js` to customize:
```javascript
const MODEL_CONFIG = { base: 'mobilenet_v2' };
const CONFIDENCE_THRESHOLD = 0.55; // 0-1, lower = more detections
```

### Audio Settings
- **Default Speech Rate**: 1.1x
- **Default Volume**: 100%
- **Detection Interval**: 4 seconds

### Performance Tuning
- **Max Inference Detections**: 10 per frame
- **Canvas Resolution**: Matches video stream
- **FPS Target**: 60 (browser optimized)

---

## 📊 Performance

### Metrics
- **Model Load Time**: ~30-60s (first time), <1s (cached)
- **Inference Time**: 80-120ms per frame
- **FPS**: 30-60 depending on device
- **Memory**: ~150-200MB (model + buffers)

### Browser Console
The app logs performance metrics to console:
```
Model downloaded and cached successfully
Geo Lens Active.
FPS: 45
Inference: 95ms
```

---

## ♿ Accessibility

### Features
- 🔊 Audio descriptions for all detected objects
- 🎯 Screen reader friendly ARIA labels
- 📱 Touch-optimized interface
- 🎨 High contrast colors
- 🚫 Respects `prefers-reduced-motion`
- ⌨️ Keyboard navigable controls

---

## 🔐 Privacy & Security

- ✅ **No Cloud Transmission**: All processing happens on-device
- ✅ **No Data Logging**: No personal data is stored
- ✅ **Camera Control**: You control camera permissions
- ✅ **Offline Capable**: Works without internet after first download

---

## 🐛 Troubleshooting

### Model Won't Load
- Check internet connection
- Clear browser cache
- Try incognito/private mode
- Allow IndexedDB permissions

### Camera Not Working
- Grant camera permissions
- Check HTTPS (some browsers require it)
- Verify no other app is using the camera
- Try a different browser

### Audio Not Playing
- Unmute device
- Check volume slider in audio controls
- Enable speakers/headphones
- Check microphone permissions

### Poor Performance
- Close other browser tabs
- Reduce screen brightness (save battery)
- Use battery saver mode (⚡ button)
- Check browser console for errors

---

## 🚀 Future Features

- [ ] Gesture controls (tap-to-speak, swipe)
- [ ] Photo capture with annotations
- [ ] Detection history & statistics
- [ ] Custom confidence threshold slider
- [ ] Object filtering (enable/disable types)
- [ ] Distance estimation
- [ ] Heat map visualization
- [ ] Mobile app (React Native)
- [ ] Cloud sync (optional, encrypted)

---

## 🤝 Contributing

Contributions welcome! Areas of interest:
- Performance optimizations
- UI/UX improvements
- New detection models
- Mobile app development
- Translation & localization
- Documentation

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👨‍💻 Author

**Nasir Ibrahim Imam**

- [GitHub](https://github.com/icedmist)
- [LinkedIn](https://linkedin.com/in/nasir-ibrahim-imam-403ba523b)

---

## 📝 Changelog

### v1.2.0 (Current)
- ✨ Loading spinner with progress bar
- ✨ Performance metrics (FPS, inference time)
- ✨ Audio controls panel with rate/volume/mute
- 🐛 Fixed camera sizing on preview
- 🐛 Improved offline model caching
- ♿ Enhanced accessibility features
- 📱 Better mobile responsiveness

### v1.1.0
- ✨ UI improvements and animations
- ✨ Status indicator with color feedback
- 📱 Mobile-first responsive design
- ♿ Added ARIA labels

### v1.0.0
- 🚀 Initial release
- Object detection with audio feedback
- Offline model support
- Battery saver mode

---

## 🙏 Acknowledgments

- [TensorFlow.js](https://www.tensorflow.org/js) - ML library
- [COCO-SSD](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd) - Object detection model
- [CDN.js](https://cdnjs.com/) - Library hosting

---

**Questions? Issues? Ideas?** Open an issue on GitHub!
