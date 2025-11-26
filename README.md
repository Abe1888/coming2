# 🚛 3D Truck Visualization

A high-performance, interactive 3D truck visualization built with React, Three.js, and WebGL. Features scroll-based camera animation, real-time IoT sensor visualization, and a separate controller interface.

![3D Truck Visualization](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)

---

## ✨ Features

### 🎬 Main Visualization
- **Scroll-based camera animation** - 8 cinematic phases exploring the truck
- **High-quality 3D model** - Optimized GLB with PBR materials
- **Real-time rendering** - Smooth 60 FPS performance
- **IoT sensor visualization** - Fuel tank sensor and cargo lock
- **Audio system** - Realistic engine rumble, road noise, and truck horn
- **Responsive design** - Works on desktop and tablet

### 🎮 Controller Interface
- **Separate control page** - Perfect for dual-monitor setups
- **Real-time synchronization** - Changes instantly update main page
- **Tabbed interface** - Truck, Camera, Fuel Sensor, Cargo Lock controls
- **Connection status** - Visual indicator for sync status
- **Persistent settings** - Saved in localStorage

### 🔧 Technical Highlights
- **Vanilla Three.js** - Direct WebGL rendering for maximum performance
- **Custom shaders** - PBR materials with proper lighting
- **Optimized assets** - Compressed GLB model with Meshopt
- **Modern architecture** - React 18 + TypeScript + Vite
- **Clean codebase** - Well-documented and maintainable

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/3d-truck-visualization.git
cd 3d-truck-visualization

# Install dependencies
npm install

# Start development server
npm run dev
```

### Access the Application

- **Main Page:** http://localhost:5173/
- **Controller:** http://localhost:5173/controller.html

---

## 📖 Usage

### Main Page

1. **Scroll** to explore the truck through 8 cinematic camera phases
2. **Click the volume icon** (top-right) to toggle audio
3. **Click again** (when audio is on) to trigger the truck horn
4. **Drag** to manually rotate the camera

### Controller Page

1. Open in a separate window or monitor
2. Use tabs to access different controls:
   - **Demo:** Audio controls and visual toggles
   - **Truck:** Position, rotation, and scale
   - **Camera:** Keyframe editor for all 8 phases
   - **Fuel:** Sensor position and configuration
   - **Lock:** Cargo lock position and status
3. Changes sync instantly with the main page

---

## 🎥 Camera Animation Phases

| Phase | Progress | Description |
|-------|----------|-------------|
| **Intro** | 0-5% | Wide establishing shot |
| **Cab Approach** | 5-15% | Moving closer to the cab |
| **Cab Interior** | 15-25% | GPS & ADAS focus |
| **Trailer Side** | 25-35% | Moving along cargo |
| **Fuel Tank** | 35-50% | Close-up of fuel sensor |
| **Container Mid** | 50-70% | Trailer focus |
| **Trailer Back** | 70-85% | Cargo lock close-up |
| **Outro** | 85-100% | Pull back for full view |

---

## 🏗️ Project Structure

```
3D-TRANSLINK/
├── index.html                    # Main entry point
├── controller.html               # Controller entry point
├── src/
│   ├── main.tsx                  # Main 3D application
│   ├── controller.tsx            # Controller application
│   ├── components/               # UI components
│   │   ├── TruckPositionController.tsx
│   │   ├── CameraController.tsx
│   │   └── FuelSensorController.tsx
│   ├── demo/components/          # Demo components
│   │   └── CargoLockController.tsx
│   └── utils/                    # Utility functions
│       ├── createFuelTankSensor.ts
│       └── createCargoLock.ts
├── public/
│   ├── model/
│   │   └── Main_truck_FINAL_opt2.glb  # Optimized truck model
│   └── Logo-white.png
├── package.json
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 🛠️ Build & Deploy

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

---

## 🎨 Customization

### Modify Camera Animation

Edit camera keyframes in `src/main.tsx`:

```typescript
const [cameraKeyframes, setCameraKeyframes] = useState({
  intro: {
    start: { position: [12.4, 0, 0], target: [0, 1.1, 0] },
    end: { position: [3.2, 4.8, 16.1], target: [0, 0, 0] }
  },
  // ... more phases
});
```

### Adjust Truck Position

Use the controller page or edit in `src/main.tsx`:

```typescript
const [truckConfig, setTruckConfig] = useState({
  position: [-3.4, -1.4, 0],
  rotation: [0, Math.PI / 2, 0],
  scale: [50, 50, 50]
});
```

### Modify IoT Sensors

Edit sensor configurations in `src/main.tsx`:

```typescript
const [fuelSensorConfig, setFuelSensorConfig] = useState({
  position: [-1.18, 1.28, -0.01],
  rotation: [0, -4.71238898038469, 0],
  scale: 1.053,
  probeLength: 0.8
});
```

---

## 🎵 Audio System

### Features
- **Engine rumble** - Brown noise filtered for realistic engine sound
- **Road noise** - Pink noise for tire and road interaction
- **Wind ambience** - Bandpass filtered for air movement
- **Truck horn** - Dual-tone sawtooth oscillators (185Hz + 233Hz)

### Controls
- Click volume icon to toggle audio ON/OFF
- Click again (when ON) to trigger horn
- Auto-horn on first scroll (if audio is enabled)

---

## 📊 Performance

### Targets
- **60 FPS** rendering
- **<3 seconds** model load time
- **<100** draw calls
- **<16ms** frame time

### Optimizations
- Meshopt compression on GLB model
- Instanced rendering for repeated elements
- Efficient material reuse
- Optimized shadow maps
- Texture compression

---

## 🌐 Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+

**Requirements:**
- WebGL 2.0 support
- localStorage enabled
- JavaScript enabled

---

## 📝 Documentation

- [DEPLOYMENT.md](./DEPLOYMENT.md) - Deployment guide for GitHub and Netlify
- [CONTROLLER_PAGE.md](./CONTROLLER_PAGE.md) - Controller interface documentation
- [CONTROLLER_TEST_GUIDE.md](./CONTROLLER_TEST_GUIDE.md) - Testing guide

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

---

## 🙏 Acknowledgments

- **Three.js** - 3D rendering library
- **React** - UI framework
- **Vite** - Build tool
- **Meshopt** - Model compression

---

## 📞 Support

For issues or questions:
- Open an issue on GitHub
- Check browser console for errors
- Review documentation in `/docs` folder

---

**Built with ❤️ using React, Three.js, and WebGL**

---

**Last Updated:** November 26, 2025
