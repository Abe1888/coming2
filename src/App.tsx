import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Volume2, VolumeX, Radio, Zap, Cpu, BarChart3, Layers } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// --- AUDIO SYSTEM (ENHANCED) ---
class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  
  // Engine Components
  engineRefs: {
    rumbleFilter?: BiquadFilterNode;
    pistonOsc?: OscillatorNode;
    pistonLFO?: OscillatorNode;
  } = {};

  // Ambience Components
  windRefs: {
    roadGain?: GainNode;
    windGain?: GainNode;
  } = {};

  scannerNode: AudioBufferSourceNode | null = null;
  scannerGain: GainNode | null = null;

  hornOsc1: OscillatorNode | null = null;
  hornOsc2: OscillatorNode | null = null;
  hornGain: GainNode | null = null;

  initialized = false;

  init() {
    if (this.initialized) return;
    
    // Create Context
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    
    // Master Gain (Volume Control)
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0; // Start muted
    this.masterGain.connect(this.ctx.destination);

    this.setupEngine();
    this.setupAmbience();
    this.setupScanner();
    this.setupHorn();
    
    this.initialized = true;
  }

  toggleMute(isMuted: boolean) {
    if (!this.initialized) this.init();
    if (this.ctx?.state === 'suspended') this.ctx.resume();
    
    if (this.masterGain && this.ctx) {
        const now = this.ctx.currentTime;
        this.masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.25, now, 0.3);
    }
  }

  createNoiseBuffer(type: 'pink' | 'brown') {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'pink') {
        let b0, b1, b2, b3, b4, b5, b6;
        b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
            data[i] *= 0.11; 
            b6 = white * 0.115926;
        }
    } else {
        let lastOut = 0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            data[i] = (lastOut + (0.02 * white)) / 1.02;
            lastOut = data[i];
            data[i] *= 3.5; 
        }
    }
    return buffer;
  }

  setupEngine() {
      if (!this.ctx || !this.masterGain) return;
      
      const brownNoise = this.createNoiseBuffer('brown');
      if (brownNoise) {
          const src = this.ctx.createBufferSource();
          src.buffer = brownNoise;
          src.loop = true;
          
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 100;

          const gain = this.ctx.createGain();
          gain.gain.value = 0.4;

          src.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          src.start();
          
          this.engineRefs.rumbleFilter = filter;
      }

      const pistonOsc = this.ctx.createOscillator();
      pistonOsc.type = 'sawtooth';
      pistonOsc.frequency.value = 60;

      const pistonGain = this.ctx.createGain();
      pistonGain.gain.value = 0;

      const pistonLFO = this.ctx.createOscillator();
      pistonLFO.type = 'sine';
      pistonLFO.frequency.value = 12;

      const lfoScaler = this.ctx.createGain();
      lfoScaler.gain.value = 0.15;
      pistonLFO.connect(lfoScaler);
      lfoScaler.connect(pistonGain.gain);
      
      const pistonFilter = this.ctx.createBiquadFilter();
      pistonFilter.type = 'lowpass';
      pistonFilter.frequency.value = 400;

      pistonOsc.connect(pistonFilter);
      pistonFilter.connect(pistonGain);
      pistonGain.connect(this.masterGain);

      pistonOsc.start();
      pistonLFO.start();

      this.engineRefs.pistonOsc = pistonOsc;
      this.engineRefs.pistonLFO = pistonLFO;
  }

  setupAmbience() {
      if (!this.ctx || !this.masterGain) return;
      
      const pinkNoise = this.createNoiseBuffer('pink');
      if (!pinkNoise) return;

      const roadSrc = this.ctx.createBufferSource();
      roadSrc.buffer = pinkNoise;
      roadSrc.loop = true;

      const roadFilter = this.ctx.createBiquadFilter();
      roadFilter.type = 'lowpass';
      roadFilter.frequency.value = 350;
      
      const roadGain = this.ctx.createGain();
      roadGain.gain.value = 0.2;

      roadSrc.connect(roadFilter);
      roadFilter.connect(roadGain);
      roadGain.connect(this.masterGain);
      roadSrc.start();
      
      this.windRefs.roadGain = roadGain;

      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = pinkNoise;
      windSrc.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 600;
      windFilter.Q.value = 0.3;

      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.08;

      windSrc.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.masterGain);
      windSrc.start();

      this.windRefs.windGain = windGain;
  }

  setupScanner() {
      if (!this.ctx || !this.masterGain) return;
      
      const bufferSize = this.ctx.sampleRate * 0.5;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.5;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2500; 
      filter.Q.value = 8; 

      const gain = this.ctx.createGain();
      gain.gain.value = 0; 

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start();
      
      this.scannerNode = noise;
      this.scannerGain = gain;
  }

  setupHorn() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 185;
    
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 233;

    const gain = this.ctx.createGain();
    gain.gain.value = 0;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.masterGain);
    
    osc1.start();
    osc2.start();
    
    this.hornOsc1 = osc1;
    this.hornOsc2 = osc2;
    this.hornGain = gain;
  }

  triggerHorn() {
    if (!this.ctx || !this.hornGain) return;
    const now = this.ctx.currentTime;
    
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(0, now);
    
    this.hornGain.gain.linearRampToValueAtTime(0.8, now + 0.1);
    this.hornGain.gain.linearRampToValueAtTime(0.8, now + 0.8);
    this.hornGain.gain.linearRampToValueAtTime(0, now + 1.0);
    
    this.hornGain.gain.linearRampToValueAtTime(0.8, now + 1.2);
    this.hornGain.gain.linearRampToValueAtTime(0.8, now + 1.5);
    this.hornGain.gain.linearRampToValueAtTime(0, now + 1.8);
  }

  triggerChirp() {
    if (!this.ctx || !this.masterGain || this.masterGain.gain.value < 0.01) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(2000, t);
    osc.frequency.exponentialRampToValueAtTime(1000, t + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.05, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  update(time: number) {
      if (!this.ctx || this.ctx.state === 'suspended') return;
      
      if (this.engineRefs.pistonLFO) {
         this.engineRefs.pistonLFO.frequency.value = 12 + Math.sin(time * 0.3) * 0.5;
      }
      if (this.engineRefs.rumbleFilter) {
          this.engineRefs.rumbleFilter.frequency.value = 100 + Math.sin(time * 0.15) * 5;
      }

      if (this.windRefs.windGain) {
          this.windRefs.windGain.gain.value = 0.10 + Math.sin(time * 0.2) * 0.02;
      }
  }
}

// Enhanced road texture with multiple lanes
const createRoadTexture = () => {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();
  
  // Pure white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Red lane lines (3 lanes)
  ctx.strokeStyle = '#ff0000'; // Bright red
  ctx.lineWidth = 16;
  ctx.setLineDash([]);
  
  // Left lane
  ctx.beginPath();
  ctx.moveTo(size * 0.35, 0);
  ctx.lineTo(size * 0.35, size);
  ctx.stroke();
  
  // Right lane
  ctx.beginPath();
  ctx.moveTo(size * 0.65, 0);
  ctx.lineTo(size * 0.65, size);
  ctx.stroke();
  
  // Center dashed line (red)
  ctx.setLineDash([80, 60]);
  ctx.strokeStyle = '#ff0000'; // Bright red
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

// Translink Telematics Display Texture - Card Style
const createTelematicsTexture = (speed: number = 85, fuelLevel: number = 0.65) => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // Transparent background - no overlay
  ctx.clearRect(0, 0, 2048, 1024);
  
  const centerX = 1024;
  const centerY = 550;
  const mainRadius = 380;

  // Speed indicator arc (segmented) - Brand colors
  const segments = 12;
  const segmentAngle = (Math.PI * 1.2) / segments;
  const startAngle = Math.PI * 0.6;
  
  for (let i = 0; i < segments; i++) {
    const angle = startAngle + i * segmentAngle;
    const speedThreshold = (i + 1) / segments;
    
    let color = '#dc2626'; // Tailwind red-600 - brand color
    if (i > segments * 0.7) color = '#b91c1c'; // red-700
    if (i > segments * 0.85) color = '#991b1b'; // red-800
    
    if (speed / 160 > speedThreshold - 0.08) {
      ctx.fillStyle = color;
    } else {
      ctx.fillStyle = '#2d333b'; // Lighter dark gray for better visibility
    }
    
    ctx.beginPath();
    ctx.arc(centerX, centerY, mainRadius, angle, angle + segmentAngle * 0.85);
    ctx.arc(centerX, centerY, mainRadius - 40, angle + segmentAngle * 0.85, angle, true);
    ctx.closePath();
    ctx.fill();
  }

  // BIG SPEED DISPLAY - CENTER
  ctx.font = 'bold 220px Arial';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(speed).toString(), centerX, centerY + 60);
  
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#dc2626'; // Brand red
  ctx.fillText('KM/H', centerX, centerY + 130);
  
  ctx.font = 'bold 52px monospace';
  ctx.fillStyle = '#dc2626'; // Brand red for ECO mode
  ctx.fillText('ECO MODE', centerX, centerY + 200);
  
  ctx.font = '32px monospace';
  ctx.fillStyle = '#8b949e';
  ctx.fillText('RANGE: 443 KM', centerX, centerY + 250);
  ctx.font = '20px monospace';
  ctx.fillStyle = '#282f3c';
  ctx.fillText('ESTIMATED DISTANCE', centerX, centerY + 280);

  // Fuel gauge (left side) - Brand colors
  const fuelCenterX = 280;
  const fuelCenterY = 550;
  const fuelRadius = 200;
  
  ctx.strokeStyle = '#2d333b'; // Lighter dark gray for better visibility
  ctx.lineWidth = 35;
  ctx.beginPath();
  ctx.arc(fuelCenterX, fuelCenterY, fuelRadius, Math.PI * 0.6, Math.PI * 1.4);
  ctx.stroke();
  
  const fuelAngle = Math.PI * 0.6 + (fuelLevel * Math.PI * 0.8);
  let fuelColor = '#dc2626'; // Brand red for low fuel
  if (fuelLevel > 0.3) fuelColor = '#f97316'; // orange-500 for medium
  if (fuelLevel > 0.6) fuelColor = '#8b949e'; // gray for good level
  
  ctx.strokeStyle = fuelColor;
  ctx.lineWidth = 35;
  ctx.beginPath();
  ctx.arc(fuelCenterX, fuelCenterY, fuelRadius, Math.PI * 0.6, fuelAngle);
  ctx.stroke();
  
  // Draw fuel tank icon (gas pump/tank shape)
  ctx.strokeStyle = '#dc2626'; // Brand red
  ctx.fillStyle = '#dc2626';
  ctx.lineWidth = 3;
  
  // Tank body (rounded rectangle)
  ctx.beginPath();
  ctx.roundRect(fuelCenterX - 25, fuelCenterY - 15, 50, 40, 5);
  ctx.stroke();
  
  // Fuel level inside tank
  const fuelHeight = 30 * fuelLevel;
  ctx.fillRect(fuelCenterX - 20, fuelCenterY + 20 - fuelHeight, 40, fuelHeight);
  
  // Nozzle/spout on top
  ctx.beginPath();
  ctx.moveTo(fuelCenterX - 10, fuelCenterY - 15);
  ctx.lineTo(fuelCenterX - 10, fuelCenterY - 25);
  ctx.lineTo(fuelCenterX + 10, fuelCenterY - 25);
  ctx.lineTo(fuelCenterX + 10, fuelCenterY - 15);
  ctx.stroke();
  
  // Cap on nozzle
  ctx.fillRect(fuelCenterX - 5, fuelCenterY - 30, 10, 5);
  
  // Fuel level percentage
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(fuelLevel * 100) + '%', fuelCenterX, fuelCenterY + 20);
  
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = fuelColor;
  ctx.fillText('FUEL LEVEL', fuelCenterX, fuelCenterY + 50);
  
  ctx.font = '18px monospace';
  ctx.fillStyle = '#282f3c';
  ctx.fillText('SENSOR PRO', fuelCenterX, fuelCenterY + 180);

  // Battery gauge (right side) - Brand colors
  const battCenterX = 1768;
  const battCenterY = 550;
  const battRadius = 200;
  
  ctx.strokeStyle = '#2d333b'; // Lighter dark gray for better visibility
  ctx.lineWidth = 35;
  ctx.beginPath();
  ctx.arc(battCenterX, battCenterY, battRadius, Math.PI * 1.6, Math.PI * 2.4);
  ctx.stroke();
  
  const battLevel = 0.75;
  const battAngle = Math.PI * 1.6 + (battLevel * Math.PI * 0.8);
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 35;
  ctx.beginPath();
  ctx.arc(battCenterX, battCenterY, battRadius, Math.PI * 1.6, battAngle);
  ctx.stroke();
  
  // Draw battery icon (rectangle with terminal)
  ctx.fillStyle = '#8b949e';
  ctx.strokeStyle = '#8b949e';
  ctx.lineWidth = 4;
  
  // Battery body
  ctx.strokeRect(battCenterX - 30, battCenterY - 15, 60, 30);
  ctx.fillRect(battCenterX - 25, battCenterY - 10, 50 * battLevel, 20);
  
  // Battery terminal
  ctx.fillRect(battCenterX + 30, battCenterY - 5, 8, 10);
  
  // Battery percentage
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(battLevel * 100) + '%', battCenterX, battCenterY + 20);
  
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#8b949e';
  ctx.fillText('BATTERY', battCenterX, battCenterY + 50);
  
  ctx.font = '18px monospace';
  ctx.fillStyle = '#282f3c';
  ctx.fillText('75 KM RANGE', battCenterX, battCenterY + 80);

  // Top info bar - Brand colors
  ctx.textAlign = 'left';
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = '#dc2626';
  ctx.fillText('● LIVE', 150, 120);
  
  ctx.textAlign = 'center';
  ctx.font = '24px monospace';
  ctx.fillStyle = '#8b949e';
  ctx.fillText('TEMP: 18°C', centerX - 100, 120);
  ctx.fillText('TIME: 12:45', centerX + 150, 120);
  
  ctx.textAlign = 'right';
  ctx.font = 'bold 40px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.fillText('FUEL LEVEL ', 1820, 110);
  ctx.fillStyle = '#dc2626'; // Brand red
  ctx.fillText('SENSOR PRO', 1900, 150);

  return new THREE.CanvasTexture(canvas);
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioSysRef = useRef<AudioSystem | null>(null);
  const glbModelRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]); // Wheel references for rotation
  
  const [isMuted, setIsMuted] = useState(true);
  const [activePhase, setActivePhase] = useState(0);
  const [showIntroScreen, setShowIntroScreen] = useState(true);
  const [introFadingOut, setIntroFadingOut] = useState(false);

  // SVG Path Refs for dynamic updates
  const headPathRef = useRef<SVGPathElement>(null);
  const probePathRef = useRef<SVGPathElement>(null);
  const filterPathRef = useRef<SVGPathElement>(null);
  const headDotRef = useRef<SVGCircleElement>(null);
  const probeDotRef = useRef<SVGCircleElement>(null);
  const filterDotRef = useRef<SVGCircleElement>(null);

  if (!audioSysRef.current) {
    audioSysRef.current = new AudioSystem();
  }

  const toggleAudio = () => {
    const newState = !isMuted;
    setIsMuted(newState);
    audioSysRef.current?.toggleMute(newState);
  };

  const dismissIntroScreen = () => {
    setIntroFadingOut(true);
    setTimeout(() => {
      setShowIntroScreen(false);
      document.body.style.overflow = 'auto';
    }, 1000);
  };

  useEffect(() => {
    if (showIntroScreen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [showIntroScreen]);

  useEffect(() => {
    if (!mountRef.current) return;

    // === SCENE SETUP ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff); // Pure white background
    
    // Camera (controlled by scroll)
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 3, -20); // Starting position
    
    // Renderer with shadow support
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // === IMPROVED LIGHTING SETUP ===
    // Ambient light for overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Main directional light (sun) - from top-front-right
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(15, 25, 15);
    mainLight.castShadow = true;
    
    // Optimized shadow settings
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.left = -30;
    mainLight.shadow.camera.right = 30;
    mainLight.shadow.camera.top = 30;
    mainLight.shadow.camera.bottom = -30;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 100;
    mainLight.shadow.bias = -0.0005;
    mainLight.shadow.radius = 3; // Softer shadows
    
    scene.add(mainLight);

    // Fill light from left side (no shadows)
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.6);
    fillLight.position.set(-20, 10, 5);
    scene.add(fillLight);

    // Back light for rim lighting effect
    const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
    backLight.position.set(0, 8, -20);
    scene.add(backLight);

    // Hemisphere light for natural sky/ground lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xe8e8e8, 0.4);
    scene.add(hemiLight);

    // === MATERIALS (White & Light Gray Only) ===
    // Using MeshStandardMaterial for proper shadow support
    const lightGrayMat = new THREE.MeshStandardMaterial({ 
      color: 0xe8e8e8,
      roughness: 0.7,
      metalness: 0.1
    });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.4 }); // Subtle dark gray edges

    // === ROAD ===
    const roadTex = createRoadTexture();
    roadTex.repeat.set(1, 12);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 1200),
      new THREE.MeshStandardMaterial({ 
        map: roadTex, 
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.0
      })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = -1.1;
    road.receiveShadow = true; // Road receives shadows
    scene.add(road);

    // === TRUCK GROUP ===
    const truck = new THREE.Group();
    scene.add(truck);

    // Shadow plane removed - using actual shadow rendering now

    // === FUEL SENSOR ASSEMBLY (Exact colors from original) ===
    const tankGroup = new THREE.Group();
    tankGroup.position.set(3.1, 0.6, -5);
    truck.add(tankGroup);

    // --- SENSOR HEAD GROUP (RED) ---
    const sensorHeadGroup = new THREE.Group();
    sensorHeadGroup.position.set(0, 0.70, 0); // Adjusted height for smaller head
    tankGroup.add(sensorHeadGroup);

    // 1. Sensor Head Housing - RED octagonal shape (REDUCED SIZE)
    const headShape = new THREE.Shape();
    const hw = 0.15, hd = 0.15, ch = 0.03; // Reduced from 0.38 to 0.15
    headShape.moveTo(-hw + ch, -hd);
    headShape.lineTo(hw - ch, -hd);
    headShape.lineTo(hw, -hd + ch);
    headShape.lineTo(hw, hd - ch);
    headShape.lineTo(hw - ch, hd);
    headShape.lineTo(-hw + ch, hd);
    headShape.lineTo(-hw, hd - ch);
    headShape.lineTo(-hw, -hd + ch);
    headShape.closePath();

    const extrudeSettings = { 
      depth: 0.10, // Reduced from 0.25 to 0.10
      bevelEnabled: true, 
      bevelThickness: 0.008, // Reduced from 0.02
      bevelSize: 0.008, // Reduced from 0.02
      bevelSegments: 2 
    };
    const headGeo = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
    const head = new THREE.Mesh(
      headGeo,
      new THREE.MeshStandardMaterial({ 
        color: 0xFF0000, // RED sensor head
        roughness: 0.5,
        metalness: 0.2
      })
    );
    head.rotation.x = Math.PI / 2;
    head.castShadow = true;
    head.receiveShadow = true;
    sensorHeadGroup.add(head);

    // Edge lines
    const headEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(headGeo, 20),
      new THREE.LineBasicMaterial({ color: 0xb0b0b0, transparent: true, opacity: 0.6 })
    );
    headEdges.rotation.x = Math.PI / 2;
    sensorHeadGroup.add(headEdges);

    // 2. Mounting Flange (Light gray) - REDUCED SIZE
    const flangeGeo = new THREE.CylinderGeometry(0.05, 0.06, 0.04, 16); // Reduced proportionally
    const flange = new THREE.Mesh(
      flangeGeo,
      new THREE.MeshStandardMaterial({ 
        color: 0xe8e8e8,
        roughness: 0.7,
        metalness: 0.3
      })
    );
    flange.position.y = -0.02; // Adjusted position
    flange.castShadow = true;
    flange.receiveShadow = true;
    sensorHeadGroup.add(flange);

    // 3. Logo Plane - REDUCED SIZE
    const logoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.24, 0.06), // Reduced from 0.6x0.15 to 0.24x0.06
      new THREE.MeshBasicMaterial({
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    logoPlane.rotation.x = -Math.PI / 2;
    logoPlane.rotation.z = Math.PI / 2;
    logoPlane.position.y = 0.013; // Adjusted position
    sensorHeadGroup.add(logoPlane);

    // Load logo texture
    const logoLoader = new THREE.TextureLoader();
    logoLoader.load('/Logo-white.png', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      (logoPlane.material as THREE.MeshBasicMaterial).map = texture;
      logoPlane.material.needsUpdate = true;
    });

    // --- PROBE ASSEMBLY (WHITE metallic) ---
    const probeGroup = new THREE.Group();
    tankGroup.add(probeGroup);

    // Probe tube - bright metallic WHITE
    const probeTubeGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.3, 20);
    const probeTube = new THREE.Mesh(
      probeTubeGeo,
      new THREE.MeshStandardMaterial({ 
        color: 0xffffff, // Pure WHITE for maximum brightness
        roughness: 0.3,
        metalness: 0.7
      })
    );
    probeTube.position.set(0, 0.05, 0);
    probeTube.castShadow = true;
    probeTube.receiveShadow = true;
    probeGroup.add(probeTube);

    // --- CAGE/FILTER GROUP (GREEN) ---
    const cageGroup = new THREE.Group();
    cageGroup.position.set(0, -0.5, 0);
    probeGroup.add(cageGroup);

    // Cage body - GREEN
    const cageBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 0.25, 12),
      new THREE.MeshStandardMaterial({ 
        color: 0x22c55e, // GREEN cage
        transparent: true, 
        opacity: 0.8,
        roughness: 0.6,
        metalness: 0.2
      })
    );
    cageBody.castShadow = true;
    cageBody.receiveShadow = true;
    cageGroup.add(cageBody);

    // Cage rings - Darker GREEN
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.055, 0.006, 8, 16),
        new THREE.MeshStandardMaterial({ 
          color: 0x16a34a, // Darker GREEN for rings
          roughness: 0.4,
          metalness: 0.3
        })
      );
      ring.position.y = -0.08 + i * 0.06;
      ring.rotation.x = Math.PI / 2;
      ring.castShadow = true;
      ring.receiveShadow = true;
      cageGroup.add(ring);
    }

    // Load GLB Model
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
      '/model/Main_truck_updated_compressed.glb',
      (gltf) => {
        const model = gltf.scene;
        model.rotation.y = Math.PI;
        model.position.set(1.1, -1.1, -5.3);
        model.scale.set(1.50, 1.50, 1.50);
        
        // === DEBUG: LIST ALL MESHES IN GLB ===
        console.log('📦 GLB MODEL LOADED - Listing all meshes:');
        console.log('═══════════════════════════════════════════');
        const allMeshes: string[] = [];
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            allMeshes.push(child.name);
            console.log(`  🔹 ${child.name} (type: ${child.type}, children: ${child.children.length})`);
          }
        });
        console.log('═══════════════════════════════════════════');
        console.log(`📊 Total meshes found: ${allMeshes.length}`);
        console.log('📋 All mesh names:', allMeshes.join(', '));
        console.log('═══════════════════════════════════════════\n');
        
        // Apply white/light gray materials
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const nameLower = child.name.toLowerCase();
            
            // CENTER ALL WHEEL MESHES for proper rotation
            if (nameLower.includes('wheel')) {
              child.geometry.computeBoundingBox();
              const bbox = child.geometry.boundingBox;
              if (bbox) {
                const center = new THREE.Vector3();
                bbox.getCenter(center);
                
                // Translate geometry to center it at origin
                child.geometry.translate(-center.x, -center.y, -center.z);
                
                // Adjust mesh position to compensate
                child.position.add(center);
                
                // Add to wheels array for rotation
                wheelsRef.current.push(child);
              }
            }
            
            // Dispose old materials
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
            
            // Check for logo mesh
            const isLogo = nameLower.includes('logo');
            
            // Check for glass meshes (windows, windshield)
            const isGlass = nameLower.includes('glass') || 
                           nameLower.includes('window') ||
                           nameLower.includes('windshield') ||
                           nameLower.includes('windscreen');
            
            // Check if this is the fuel tank mesh
            const isFuelTank = nameLower.includes('tank') || 
                               nameLower.includes('fuel') ||
                               nameLower.includes('cylinder');
            
            if (isLogo) {
              // Make the circular face invisible
              child.material = new THREE.MeshBasicMaterial({
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide
              });
              
              // Create a plane with the logo PNG in front of the circular face
              const textureLoader = new THREE.TextureLoader();
              textureLoader.load(
                '/logo-front-truck.png',
                (texture) => {
                  texture.colorSpace = THREE.SRGBColorSpace;
                  
                  // Get the size of the circular face
                  child.geometry.computeBoundingBox();
                  const bbox = child.geometry.boundingBox;
                  if (bbox) {
                    const width = bbox.max.x - bbox.min.x;
                    const height = bbox.max.y - bbox.min.y;
                    
                    // Create a plane geometry matching the circular face size
                    const planeGeometry = new THREE.PlaneGeometry(width, height);
                    const planeMaterial = new THREE.MeshBasicMaterial({
                      map: texture,
                      transparent: true,
                      alphaTest: 0.1,
                      side: THREE.DoubleSide,
                      toneMapped: false
                    });
                    
                    const logoPlane = new THREE.Mesh(planeGeometry, planeMaterial);
                    
                    // Position the plane in front of the circular face
                    // Copy position and rotation from the circular face
                    logoPlane.position.copy(child.position);
                    logoPlane.rotation.copy(child.rotation);
                    logoPlane.quaternion.copy(child.quaternion);
                    
                    // Move forward in front of the mesh (increased offset)
                    logoPlane.position.z += 0.5;
                    
                    // Add to the same parent as the circular face
                    if (child.parent) {
                      child.parent.add(logoPlane);
                    }
                    
                    console.log('✓ Logo plane created in front of circular face:', child.name);
                  }
                },
                undefined,
                (error) => console.error('Error loading logo texture:', error)
              );
              
              child.castShadow = false;
              child.receiveShadow = false;
            } else if (isGlass) {
              // Create transparent glass material
              child.material = new THREE.MeshStandardMaterial({ 
                color: 0xccddff, // Light blue tint
                transparent: true,
                opacity: 0.25, // Very transparent
                side: THREE.DoubleSide,
                depthWrite: false, // Better transparency rendering
                roughness: 0.1,
                metalness: 0.1,
                envMapIntensity: 1.0
              });
              child.castShadow = false;
              child.receiveShadow = true;
              console.log('✓ Glass mesh found and made transparent:', child.name);
            } else if (isFuelTank) {
              // Create dark blue glass transparent material for fuel tank
              const fuelTankMaterial = new THREE.MeshStandardMaterial({ 
                color: 0x1e3a8a, // Dark blue glass color
                transparent: true,
                opacity: 0.35, // More transparent for glass effect
                side: THREE.DoubleSide,
                depthWrite: false, // Better transparency rendering
                roughness: 0.2,
                metalness: 0.1
              });
              
              child.material = fuelTankMaterial;
              child.castShadow = false;
              child.receiveShadow = false;
              console.log('✓ Fuel tank mesh found and made dark blue glass:', child.name);
              console.log('  📍 Fuel tank position:', child.position);
              console.log('  👶 Fuel tank children count:', child.children.length);
              
              // Apply same material to all children (like fuel level sensor)
              // The sensor is a child of the tank, so it will move with the tank automatically
              child.traverse((subChild) => {
                if (subChild instanceof THREE.Mesh && subChild !== child) {
                  // Dispose old material
                  if (subChild.material) {
                    if (Array.isArray(subChild.material)) {
                      subChild.material.forEach(mat => mat.dispose());
                    } else {
                      subChild.material.dispose();
                    }
                  }
                  
                  // Check if this is the sensor (usually has 'sensor' or 'probe' in name)
                  const isSensor = subChild.name.toLowerCase().includes('sensor') || 
                                   subChild.name.toLowerCase().includes('probe') ||
                                   subChild.name.toLowerCase().includes('head');
                  
                  if (isSensor) {
                    // Apply red material to sensor head/box
                    subChild.material = new THREE.MeshStandardMaterial({
                      color: 0xdc2626, // Brand red for sensor
                      transparent: false,
                      roughness: 0.3,
                      metalness: 0.7
                    });
                    console.log('  ↳ 🔴 Sensor found and made RED:', subChild.name);
                  } else {
                    // Apply blue transparent material to other children
                    subChild.material = fuelTankMaterial.clone();
                    console.log('  ↳ 🔵 Child mesh made transparent:', subChild.name);
                  }
                  
                  subChild.castShadow = false;
                  subChild.receiveShadow = false;
                }
              });
              
              console.log('✅ Fuel tank and sensor hierarchy preserved - they will move together');
            } else {
              // Apply light gray material to other parts
              child.material = lightGrayMat;
              child.castShadow = true; // Enable shadow casting
              child.receiveShadow = true;
            }
            
            // Add subtle blended edges
            const edges = new THREE.EdgesGeometry(child.geometry, 15); // Balanced threshold
            const line = new THREE.LineSegments(edges, edgeMat);
            child.add(line);
          }
        });
        
        console.log(`🎡 ${wheelsRef.current.length} wheels captured and ready for rotation`);
        if (wheelsRef.current.length === 0) {
          console.warn('⚠️ NO WHEELS FOUND! Check mesh names in GLB file');
        } else {
          console.log('✅ Wheel names:', wheelsRef.current.map(w => w.name).join(', '));
        }
        
        glbModelRef.current = model;
        truck.add(model);
        console.log('✓ GLB Truck loaded');
      },
      undefined,
      (error) => console.error('Error loading GLB:', error)
    );

    // === ENHANCED PARTICLES (More dynamic) ===
    const particleCount = 400;
    const particleGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pSizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 60;
      pPos[i + 1] = Math.random() * 20;
      pPos[i + 2] = (Math.random() - 0.5) * 300;
      pSizes[i / 3] = Math.random() * 0.08 + 0.02;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    particleGeo.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({ 
        color: 0xc0c0c0, 
        size: 0.06, 
        transparent: true, 
        opacity: 0.4,
        sizeAttenuation: true
      })
    );
    scene.add(particles);

    // === TRANSLINK TELEMATICS DISPLAY - Card Style ===
    const telematicsGroup = new THREE.Group();
    
    const telematicsTex = createTelematicsTexture();
    const telematicsMat = new THREE.MeshBasicMaterial({ 
      map: telematicsTex,
      transparent: true,
      opacity: 1.0,
      side: THREE.DoubleSide
    });

    const displayScreen = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 5),
      telematicsMat
    );
    telematicsGroup.add(displayScreen);

    // No frame borders - clean display only

    // Position display lower to the ground, to the left of truck
    telematicsGroup.position.set(-3.5, 1.5, 7); // Positioned near truck body, near 3rd axle wheel
    telematicsGroup.rotation.y = -Math.PI / 2; // Flip to face opposite direction for readability
    truck.add(telematicsGroup);

    // === ANIMATION LOOP ===
    const clock = new THREE.Clock();
    let animationFrameId: number;
    const scrollRef = { current: 0 };
    let currentPhase = 0;

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Animate road
      roadTex.offset.y += delta * 1.6;

      // Animate particles with varying speeds
      const pPos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 2; i < pPos.length; i += 3) {
        const speedVariation = 1 + (i % 3) * 0.3;
        pPos[i] += delta * 160 * speedVariation;
        if (pPos[i] > 100) {
          pPos[i] = -300;
          pPos[i - 2] = (Math.random() - 0.5) * 60;
          pPos[i - 1] = Math.random() * 20;
        }
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Truck subtle movement
      truck.position.y = Math.sin(time * 15) * 0.015;

      // ===== REAL-WORLD WHEEL PHYSICS =====
      const SCALE_FACTOR = 1.25; // meters per Three.js unit
      const WHEEL_DIAMETER_UNITS = 0.8; // Three.js units
      const WHEEL_RADIUS_UNITS = WHEEL_DIAMETER_UNITS / 2; // 0.4 units
      const WHEEL_RADIUS_METERS = WHEEL_RADIUS_UNITS * SCALE_FACTOR; // 0.5m real-world
      
      const roadSpeedUnitsPerSec = 1.6; // Three.js units/sec (matches road texture scroll)
      const truckVelocityMetersPerSec = roadSpeedUnitsPerSec * SCALE_FACTOR; // ~2.0 m/s
      const wheelAngularVelocity = truckVelocityMetersPerSec / WHEEL_RADIUS_METERS; // rad/s
      
      // Apply rotation to all wheels
      if (wheelsRef.current.length > 0) {
        wheelsRef.current.forEach(mesh => {
          mesh.rotation.x += wheelAngularVelocity * delta;
        });
      }

      // === UPDATE TELEMATICS DISPLAY ===
      // Update every 0.5 seconds for performance
      if (Math.floor(time * 2) !== Math.floor((time - delta) * 2)) {
        const baseSpeed = 96;
        const speedVariation = Math.sin(time * 0.5) * 10;
        const currentSpeed = baseSpeed + speedVariation;
        
        const fuelConsumption = time * 0.002;
        const currentFuel = Math.max(0.15, 0.65 - fuelConsumption);
        
        const newTex = createTelematicsTexture(currentSpeed, currentFuel);
        telematicsMat.map = newTex;
        telematicsMat.needsUpdate = true;
      }

      // === SCROLL-BASED CAMERA SYSTEM ===
      const t = scrollRef.current;
      
      // Camera positions for different phases
      const pIntro = { pos: new THREE.Vector3(0, 3, -20), look: new THREE.Vector3(0, 2, 0) };
      const pChase = { pos: new THREE.Vector3(-15, 7, 25), look: new THREE.Vector3(0, 2, -5) };
      const pScan  = { pos: new THREE.Vector3(12, 4, -5), look: new THREE.Vector3(0, 1.5, -5) };
      const pTop   = { pos: new THREE.Vector3(0, 12, -5), look: new THREE.Vector3(0, 0, -5) };

      const currentPos = new THREE.Vector3();
      const currentLook = new THREE.Vector3();
      let nextPhase = 0;

      if (t < 0.15) {
        // INTRO: Slow dolly forward
        const localT = t / 0.15;
        const easeT = localT * localT * (3 - 2 * localT);
        currentPos.lerpVectors(pIntro.pos, pChase.pos, easeT);
        currentLook.lerpVectors(pIntro.look, pChase.look, easeT);
        nextPhase = 0;
      } else if (t < 0.35) {
        // VELOCITY: Hold hero angle
        const localT = (t - 0.15) / 0.20;
        currentPos.lerpVectors(pChase.pos, pScan.pos, localT * 0.3);
        currentLook.lerpVectors(pChase.look, pScan.look, localT * 0.3);
        nextPhase = 0;
      } else if (t < 0.65) {
        // SIDE VIEW: Move to side
        const localT = (t - 0.35) / 0.30;
        const easeT = localT * localT * (3 - 2 * localT);
        currentPos.lerpVectors(pScan.pos, pScan.pos, easeT);
        currentLook.lerpVectors(pScan.look, pScan.look, easeT);
        nextPhase = 1;
      } else {
        // TOP VIEW: Final reveal
        const localT = (t - 0.65) / 0.35;
        const easeT = localT * localT * (3 - 2 * localT);
        currentPos.lerpVectors(pScan.pos, pTop.pos, easeT);
        currentLook.lerpVectors(pScan.look, pTop.look, easeT);
        nextPhase = 2;
      }

      if (nextPhase !== currentPhase) {
        setActivePhase(nextPhase);
        currentPhase = nextPhase;
      }

      // Smooth camera interpolation with breathing
      const breathe = Math.sin(time * 0.5) * 0.15;
      currentPos.y += breathe;
      camera.position.lerp(currentPos, 0.08);
      camera.lookAt(currentLook);

      // === UPDATE SVG PATHS (Phase 1 only) ===
      if (currentPhase === 1) {
        const tempV = new THREE.Vector3();
        
        const updatePath = (object: THREE.Object3D, pathEl: SVGPathElement | null, dotEl: SVGCircleElement | null, cardYRatio: number, isLeftSide: boolean = false) => {
          if (!pathEl || !dotEl) return;
          
          object.getWorldPosition(tempV);
          tempV.project(camera);
          
          const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
          const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
          
          // Different card position for left vs right side
          const cardX = isLeftSide ? window.innerWidth * 0.30 : window.innerWidth * 0.70;
          const cardY = window.innerHeight * cardYRatio;
          const midX = x + (cardX - x) * 0.5;
          
          const d = `M ${x} ${y} L ${midX} ${y} L ${midX} ${cardY} L ${cardX} ${cardY}`;
          pathEl.setAttribute('d', d);
          dotEl.setAttribute('cx', String(x));
          dotEl.setAttribute('cy', String(y));
        };

        updatePath(sensorHeadGroup, headPathRef.current, headDotRef.current, 0.25, true); // Left side
        updatePath(probeTube, probePathRef.current, probeDotRef.current, 0.50, false); // Right side
        updatePath(cageGroup, filterPathRef.current, filterDotRef.current, 0.75, false); // Right side
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    let hornTriggered = false;
    let prevScroll = 0;

    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = Math.min(Math.max(window.scrollY / total, 0), 1);
      
      // Trigger horn on first scroll (when user starts scrolling from 0)
      // Check if audio is enabled by checking masterGain value instead of isMuted state
      if (!hornTriggered && prevScroll === 0 && scrollRef.current > 0) {
        if (audioSysRef.current?.masterGain && audioSysRef.current.masterGain.gain.value > 0) {
          audioSysRef.current.triggerHorn();
          hornTriggered = true;
          console.log('🎺 Horn triggered on first scroll!');
        }
      }
      
      prevScroll = scrollRef.current;
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);

    // Enable audio on first click anywhere on the page
    let audioActivated = false;
    const handleViewportClick = () => {
        if (!audioActivated && audioSysRef.current) {
            // Initialize audio if not already initialized
            if (!audioSysRef.current.initialized) {
                audioSysRef.current.init();
            }
            
            // Check if audio is currently off by checking masterGain
            if (audioSysRef.current.masterGain && audioSysRef.current.masterGain.gain.value === 0) {
                audioSysRef.current.toggleMute(false);
                setIsMuted(false);
                audioActivated = true;
                console.log('🔊 Audio activated by click');
            }
        }
    };
    // Attach to document to catch clicks anywhere (including through overlays)
    document.addEventListener('click', handleViewportClick);

    animate();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleViewportClick);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      if (audioSysRef.current && audioSysRef.current.ctx) {
        audioSysRef.current.ctx.close();
      }
    };
  }, []);

  return (
    <div className="bg-[#0d1117] min-h-[500vh] text-gray-100 font-mono overflow-x-hidden">
      <style>{`
        .clip-path-slant {
          clip-path: polygon(0 0, 100% 0, 90% 100%, 0% 100%);
        }
        .clip-path-button {
          clip-path: polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%);
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes expandWidth {
          from { width: 0; }
          to { width: 8rem; }
        }
      `}</style>
      {/* Intro Screen */}
      {showIntroScreen && (
        <div 
          className={`fixed inset-0 z-[100] bg-white flex items-center justify-center transition-opacity duration-1000 cursor-pointer ${
            introFadingOut ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={dismissIntroScreen}
        >
          <div className="text-center space-y-8">
            <img src="/logo.png" alt="Translink" className="h-32 mx-auto" />
            <h1 className="text-8xl font-black text-gray-900">TRANSLINK</h1>
            <p className="text-2xl tracking-widest text-gray-600">FLEET TELEMATICS</p>
            <div className="text-sm text-gray-400 animate-pulse pt-8">CLICK TO CONTINUE</div>
          </div>
        </div>
      )}

      <div ref={mountRef} className="fixed top-0 left-0 w-full h-screen z-0" />

      {/* Top Bar - Logo Only */}
      <div className="fixed top-0 left-0 w-full z-20 p-8 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <img 
            src="/logo.png" 
            alt="Translink Logo" 
            className="h-16 w-auto object-contain"
          />
        </div>
        
        <div className="flex flex-col gap-3 pointer-events-auto">
          <button 
            onClick={toggleAudio}
            className="bg-gray-900/90 backdrop-blur px-4 py-2 border border-red-500/30 hover:border-red-500 hover:bg-red-500 hover:text-black transition-all flex items-center gap-2 group"
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="animate-pulse" />}
            <span className="text-xs font-bold tracking-wider text-white group-hover:text-black">AUDIO {isMuted ? 'OFF' : 'ON'}</span>
          </button>
          
          {/* Phase Indicator */}
          <div className="bg-gray-900/90 backdrop-blur px-4 py-2 border border-gray-700">
            <div className="flex gap-2">
              <div className={`w-2 h-2 rounded-full transition-colors ${activePhase === 0 ? 'bg-red-500' : 'bg-gray-600'}`}></div>
              <div className={`w-2 h-2 rounded-full transition-colors ${activePhase === 1 ? 'bg-red-500' : 'bg-gray-600'}`}></div>
              <div className={`w-2 h-2 rounded-full transition-colors ${activePhase === 2 ? 'bg-red-500' : 'bg-gray-600'}`}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Left Card - FUEL LEVEL SENSOR PRO */}
      <div className="fixed bottom-6 left-6 z-20 pointer-events-none">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 backdrop-blur px-8 py-4 border-l-4 border-red-500 shadow-lg clip-path-slant pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">FUEL LEVEL <span className="text-red-500">SENSOR PRO</span></h1>
              <p className="text-[10px] text-gray-400 tracking-[0.3em] mt-1">TRANSLINK FUEL TELEMATICS</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="relative z-10 pointer-events-none">
        {/* Phase 0: Intro - Enhanced */}
        <section className={`h-screen flex items-center justify-start pl-20 transition-all duration-700 ${activePhase === 0 ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
          <div className="max-w-4xl">
            <div className="flex items-center gap-4 mb-8 animate-[fadeInUp_1s_ease-out]">
              <div className="w-12 h-12 border-2 border-red-500 flex items-center justify-center rotate-45">
                <Radio className="text-red-500 -rotate-45" size={24} />
              </div>
              <span className="text-sm tracking-[0.3em] text-gray-600 font-bold">TRANSLINK SOLUTIONS</span>
            </div>
            
            <h2 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-4 leading-none animate-[fadeInUp_1.2s_ease-out]">
              REAL-TIME
            </h2>
            <h3 className="text-7xl font-black text-red-500 mb-8 leading-none animate-[fadeInUp_1.4s_ease-out]">
              FUEL MONITORING
            </h3>
            
            <div className="w-32 h-1 bg-gradient-to-r from-red-500 to-transparent mb-8 animate-[expandWidth_1.6s_ease-out]"></div>
            
            <div className="border-l-4 border-red-500 pl-6 bg-gray-900/5 backdrop-blur p-6 animate-[fadeInUp_1.8s_ease-out]">
              <p className="text-xl text-gray-800 leading-relaxed mb-4 font-medium">
                High-precision fuel level monitoring with <span className="text-red-500 font-bold">±1% static accuracy</span>.
              </p>
              <p className="text-lg text-gray-600 leading-relaxed">
                Real-time tracking, theft detection, and seamless fleet integration for comprehensive fuel management.
              </p>
            </div>
            
            <div className="flex gap-4 mt-8 animate-[fadeInUp_2s_ease-out]">
              <div className="border border-gray-300 px-4 py-2">
                <div className="text-xs text-gray-500 uppercase">Accuracy</div>
                <div className="text-lg font-bold text-gray-900">±1%</div>
              </div>
              <div className="border border-gray-300 px-4 py-2">
                <div className="text-xs text-gray-500 uppercase">Resolution</div>
                <div className="text-lg font-bold text-gray-900">&lt;0.5mm</div>
              </div>
              <div className="border border-gray-300 px-4 py-2">
                <div className="text-xs text-gray-500 uppercase">Rating</div>
                <div className="text-lg font-bold text-gray-900">IP67</div>
              </div>
            </div>
          </div>
        </section>

        {/* Phase 1: EXPLODED VIEW / COMPONENT BREAKDOWN (SVG OVERLAY) - Exact copy from original */}
        <div className={`fixed inset-0 z-30 pointer-events-none transition-opacity duration-500 ${activePhase === 1 ? 'opacity-100' : 'opacity-0'}`}>
          
          {/* DYNAMIC SVG LAYER */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
              <defs>
                  <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4">
                      <circle cx="4" cy="4" r="2" fill="#ff5555" />
                  </marker>
                  <filter id="glow">
                      <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                      <feMerge>
                          <feMergeNode in="coloredBlur"/>
                          <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                  </filter>
              </defs>

              {/* Connector to Head */}
              <path ref={headPathRef} fill="none" stroke="#ff5555" strokeWidth="2" strokeDasharray="6 3" filter="url(#glow)" />
              <circle ref={headDotRef} r="5" fill="#ff5555" className="animate-pulse" />
              
              {/* Connector to Probe */}
              <path ref={probePathRef} fill="none" stroke="#ff5555" strokeWidth="2" strokeDasharray="6 3" filter="url(#glow)" />
              <circle ref={probeDotRef} r="5" fill="#ff5555" className="animate-pulse" />

              {/* Connector to Filter */}
              <path ref={filterPathRef} fill="none" stroke="#ff5555" strokeWidth="2" strokeDasharray="6 3" filter="url(#glow)" />
              <circle ref={filterDotRef} r="5" fill="#ff5555" className="animate-pulse" />
          </svg>

          {/* INFO CARDS - MODERN REDESIGN */}
          
          {/* 1. SENSOR HEAD Card - Advanced HUD Style (LEFT SIDE) */}
          <div className="absolute left-[10%] top-[25%] w-[380px] -translate-y-1/2 transform transition-all duration-300">
              <div className="relative bg-[#0d1117] backdrop-blur-sm border-2 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.3)]" style={{clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)'}}>
                  {/* Top Red Bar */}
                  <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
                  
                  {/* Scan Lines Effect */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)'}}></div>
                  
                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-red-500"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-red-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-red-500"></div>
                  
                  <div className="p-5 relative z-10">
                      {/* Header with Icon */}
                      <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-red-600/20 border border-red-600 flex items-center justify-center">
                                  <Cpu size={24} className="text-red-500"/>
                              </div>
                              <div>
                                  <div className="text-[9px] text-red-500 tracking-[0.3em] uppercase font-bold mb-0.5">COMPONENT 01</div>
                                  <h3 className="font-black text-2xl text-white tracking-tight leading-none">SENSOR HEAD</h3>
                              </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                              <div className="w-2 h-2 bg-red-500 animate-pulse"></div>
                              <div className="text-[8px] text-red-500 font-mono">ACTIVE</div>
                          </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-xs text-gray-300 leading-relaxed mb-4 font-mono">
                          Advanced MCU with remote calibration, self-diagnostics, and real-time data feed. Supports CAN, RS232, and Modbus interfaces.
                      </p>
                      
                      {/* Tags */}
                      <div className="flex gap-2">
                          <span className="text-[10px] px-2.5 py-1 bg-red-600/20 border border-red-600 text-red-400 font-mono tracking-wider">REMOTE CAL</span>
                          <span className="text-[10px] px-2.5 py-1 bg-red-600/20 border border-red-600 text-red-400 font-mono tracking-wider">MULTI-IF</span>
                      </div>
                  </div>
                  
                  {/* Bottom Red Line */}
                  <div className="h-0.5 bg-red-600"></div>
              </div>
          </div>

          {/* 2. FUEL PROBE Card - Advanced HUD Style */}
          <div className="absolute left-[66%] top-[50%] w-[380px] -translate-y-1/2 transform transition-all duration-300">
              <div className="relative bg-[#0d1117] backdrop-blur-sm border-2 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.3)]" style={{clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)'}}>
                  {/* Top Red Bar */}
                  <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
                  
                  {/* Scan Lines Effect */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)'}}></div>
                  
                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-red-500"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-red-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-red-500"></div>
                  
                  <div className="p-5 relative z-10">
                      {/* Header with Icon */}
                      <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-red-600/20 border border-red-600 flex items-center justify-center">
                                  <BarChart3 size={24} className="text-red-500"/>
                              </div>
                              <div>
                                  <div className="text-[9px] text-red-500 tracking-[0.3em] uppercase font-bold mb-0.5">COMPONENT 02</div>
                                  <h3 className="font-black text-2xl text-white tracking-tight leading-none">FUEL PROBE</h3>
                              </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                              <div className="w-2 h-2 bg-red-500 animate-pulse"></div>
                              <div className="text-[8px] text-red-500 font-mono">ACTIVE</div>
                          </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-xs text-gray-300 leading-relaxed mb-4 font-mono">
                          High-precision capacitive probe with &lt;0.5mm resolution. Features inclinometer for tilt compensation and anti-slosh technology for stable readings.
                      </p>
                      
                      {/* Tags */}
                      <div className="flex gap-2">
                          <span className="text-[10px] px-2.5 py-1 bg-red-600/20 border border-red-600 text-red-400 font-mono tracking-wider">±1% ACCURACY</span>
                          <span className="text-[10px] px-2.5 py-1 bg-red-600/20 border border-red-600 text-red-400 font-mono tracking-wider">ANTI-SLOSH</span>
                      </div>
                  </div>
                  
                  {/* Bottom Red Line */}
                  <div className="h-0.5 bg-red-600"></div>
              </div>
          </div>

          {/* 3. PROTECTION CAGE Card - Advanced HUD Style */}
          <div className="absolute left-[66%] top-[75%] w-[380px] -translate-y-1/2 transform transition-all duration-300">
              <div className="relative bg-[#0d1117] backdrop-blur-sm border-2 border-red-600 overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.3)]" style={{clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)'}}>
                  {/* Top Red Bar */}
                  <div className="h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
                  
                  {/* Scan Lines Effect */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, #fff 2px, #fff 4px)'}}></div>
                  
                  {/* Corner Brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-l-2 border-t-2 border-red-500"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-l-2 border-b-2 border-red-500"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-r-2 border-b-2 border-red-500"></div>
                  
                  <div className="p-5 relative z-10">
                      {/* Header with Icon */}
                      <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-red-600/20 border border-red-600 flex items-center justify-center">
                                  <Layers size={24} className="text-red-500"/>
                              </div>
                              <div>
                                  <div className="text-[9px] text-red-500 tracking-[0.3em] uppercase font-bold mb-0.5">COMPONENT 03</div>
                                  <h3 className="font-black text-2xl text-white tracking-tight leading-none">PROTECTION CAGE</h3>
                              </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                              <div className="w-2 h-2 bg-red-500 animate-pulse"></div>
                              <div className="text-[8px] text-red-500 font-mono">ACTIVE</div>
                          </div>
                      </div>
                      
                      {/* Description */}
                      <p className="text-xs text-gray-300 leading-relaxed mb-4 font-mono">
                          Corrosion-resistant protective cage with chemical-resistant materials. Shock-resistant design ensures durability in harsh environments.
                      </p>
                      
                      {/* Tags */}
                      <div className="flex gap-2">
                          <span className="text-[10px] px-2.5 py-1 bg-red-600/20 border border-red-600 text-red-400 font-mono tracking-wider">IP67</span>
                          <span className="text-[10px] px-2.5 py-1 bg-red-600/20 border border-red-600 text-red-400 font-mono tracking-wider">SHOCK-PROOF</span>
                      </div>
                  </div>
                  
                  {/* Bottom Red Line */}
                  <div className="h-0.5 bg-red-600"></div>
              </div>
          </div>

      </div>

        {/* Phase 2: Top View - Enhanced */}
        <section className={`h-screen flex items-center justify-center transition-all duration-700 ${activePhase === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
          <div className="text-center max-w-3xl">
            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="w-16 h-16 border-2 border-red-500 flex items-center justify-center rotate-45 animate-pulse">
                <Zap className="text-red-500 -rotate-45" size={32} />
              </div>
            </div>
            
            <h3 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-6">
              FLEET READY
            </h3>
            
            <p className="text-2xl text-gray-700 mb-8 leading-relaxed">
              Seamless integration with your existing fleet management system
            </p>
            
            <div className="flex justify-center gap-6 mb-12">
              <div className="text-center">
                <div className="text-4xl font-black text-red-500 mb-2">24/7</div>
                <div className="text-sm text-gray-600 uppercase tracking-wider">Monitoring</div>
              </div>
              <div className="w-px bg-gray-300"></div>
              <div className="text-center">
                <div className="text-4xl font-black text-red-500 mb-2">±1%</div>
                <div className="text-sm text-gray-600 uppercase tracking-wider">Accuracy</div>
              </div>
              <div className="w-px bg-gray-300"></div>
              <div className="text-center">
                <div className="text-4xl font-black text-red-500 mb-2">IP67</div>
                <div className="text-sm text-gray-600 uppercase tracking-wider">Rated</div>
              </div>
            </div>
            
            <button className="pointer-events-auto bg-gradient-to-r from-red-600 to-red-500 text-white px-16 py-5 text-xl font-bold uppercase tracking-wider hover:from-red-500 hover:to-red-400 transition-all shadow-[0_0_30px_rgba(239,68,68,0.3)] hover:shadow-[0_0_50px_rgba(239,68,68,0.5)] clip-path-button group">
              <span className="flex items-center gap-3">
                Request Demo
                <ChevronDown className="group-hover:translate-y-1 transition-transform rotate-[-90deg]" size={20} />
              </span>
            </button>
            
            <p className="text-xs text-gray-500 mt-6 tracking-[0.2em] uppercase">Fleet Integration Ready</p>
          </div>
        </section>

        <section className="h-screen"></section>
        <section className="h-screen"></section>
      </div>

      {/* Scroll Indicator - Enhanced */}
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center transition-opacity duration-300 ${activePhase === 2 ? 'opacity-0' : 'opacity-100'}`}>
        <div className="border border-gray-400 rounded-full p-3 mb-2">
          <ChevronDown className="text-gray-600 animate-bounce" size={20} />
        </div>
        <span className="text-[10px] tracking-[0.3em] text-gray-500 uppercase">Scroll to Explore</span>
      </div>
    </div>
  );
}


