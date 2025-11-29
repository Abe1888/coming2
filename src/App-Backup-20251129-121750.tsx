import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Activity, Wifi, Shield, Volume2, VolumeX, Radio, Cpu, BarChart3, Layers } from 'lucide-react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { Brush, Evaluator, SUBTRACTION } from 'three-bvh-csg';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { createCargoContainer } from './components/CargoContainer';
import { TruckControls } from './components/TruckControls';

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
        // Smooth fade for mute/unmute - reduced volume to prevent distortion
        this.masterGain.gain.setTargetAtTime(isMuted ? 0 : 0.25, now, 0.3);
    }
  }

  createNoiseBuffer(type: 'pink' | 'brown') {
    if (!this.ctx) return null;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds loop
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'pink') {
        // Pink Noise (1/f) - More natural sound
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
        // Brown Noise (1/f^2) - Deep rumble
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
      
      // 1. DEEP RUMBLE (Brown Noise)
      // Simulates the physical vibration of heavy diesel chassis
      const brownNoise = this.createNoiseBuffer('brown');
      if (brownNoise) {
          const src = this.ctx.createBufferSource();
          src.buffer = brownNoise;
          src.loop = true;
          
          const filter = this.ctx.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.value = 100; // Very low sub-bass

          const gain = this.ctx.createGain();
          gain.gain.value = 0.4; // Reduced to prevent distortion

          src.connect(filter);
          filter.connect(gain);
          gain.connect(this.masterGain);
          src.start();
          
          this.engineRefs.rumbleFilter = filter;
      }

      // 2. PISTON CHUG (Sawtooth + AM Synthesis)
      // Simulates rhythmic firing of cylinders
      const pistonOsc = this.ctx.createOscillator();
      pistonOsc.type = 'sawtooth';
      pistonOsc.frequency.value = 60; // Base Engine Tone

      const pistonGain = this.ctx.createGain();
      pistonGain.gain.value = 0; // Controlled by LFO

      const pistonLFO = this.ctx.createOscillator();
      pistonLFO.type = 'sine';
      pistonLFO.frequency.value = 12; // Firing rate (approx 12Hz)

      // Connect LFO to Gain (AM Synthesis for piston chug effect)
      const lfoScaler = this.ctx.createGain();
      lfoScaler.gain.value = 0.15; // Modulation depth
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

      // 1. ROAD NOISE (Constant Tire Roar)
      const roadSrc = this.ctx.createBufferSource();
      roadSrc.buffer = pinkNoise;
      roadSrc.loop = true;

      const roadFilter = this.ctx.createBiquadFilter();
      roadFilter.type = 'lowpass';
      roadFilter.frequency.value = 350;
      
      const roadGain = this.ctx.createGain();
      roadGain.gain.value = 0.2; // Reduced road noise

      roadSrc.connect(roadFilter);
      roadFilter.connect(roadGain);
      roadGain.connect(this.masterGain);
      roadSrc.start();
      
      this.windRefs.roadGain = roadGain;

      // 2. WIND GUSTS (High Air Rush)
      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = pinkNoise;
      windSrc.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 600; // Lowered from 800 Hz
      windFilter.Q.value = 0.3; // Further reduced to eliminate whistle

      const windGain = this.ctx.createGain();
      windGain.gain.value = 0.08; // Further reduced volume

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
    
    // Dual-tone truck horn (realistic frequencies)
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 185; // F#3
    
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 233; // A#3

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
    
    // Long blast
    this.hornGain.gain.linearRampToValueAtTime(0.8, now + 0.1);
    this.hornGain.gain.linearRampToValueAtTime(0.8, now + 0.8);
    this.hornGain.gain.linearRampToValueAtTime(0, now + 1.0);
    
    // Short blast
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
      
      // Modulate Engine Components - REDUCED for smoother sound
      if (this.engineRefs.pistonLFO) {
         // Very subtle rev variation
         this.engineRefs.pistonLFO.frequency.value = 12 + Math.sin(time * 0.3) * 0.5;
      }
      if (this.engineRefs.rumbleFilter) {
          // Minimal rumble variation
          this.engineRefs.rumbleFilter.frequency.value = 100 + Math.sin(time * 0.15) * 5;
      }

      // Minimal Wind/Road Noise modulation
      if (this.windRefs.windGain) {
          this.windRefs.windGain.gain.value = 0.10 + Math.sin(time * 0.2) * 0.02;
      }
  }
  
  updateScannerVolume(isScanning: boolean, time: number) {
      if (!this.ctx || !this.scannerGain) return;
      
      if (isScanning) {
          const flutter = 0.06 + Math.sin(time * 60) * 0.02; 
          this.scannerGain.gain.setTargetAtTime(flutter, this.ctx.currentTime, 0.05);
      } else {
          this.scannerGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
  }
}

// --- TEXTURE GENERATORS ---

const createRoadTexture = () => {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) return new THREE.Texture();
  
  // Pure white road surface
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);

  // Red road markings
  ctx.shadowBlur = 0;
  
  // Right lane line (solid red)
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 20;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(size * 0.58, 0);
  ctx.lineTo(size * 0.58, size);
  ctx.stroke();
  
  // Left lane line (dashed red)
  ctx.strokeStyle = '#ff0000';
  ctx.lineWidth = 20;
  ctx.setLineDash([100, 150]);
  ctx.beginPath();
  ctx.moveTo(size * 0.42, 0);
  ctx.lineTo(size * 0.42, size);
  ctx.stroke();
  
  // Shoulder lines (solid red)
  ctx.setLineDash([]);
  ctx.lineWidth = 14;
  ctx.strokeStyle = '#cc0000';
  
  ctx.beginPath();
  ctx.moveTo(size * 0.25, 0);
  ctx.lineTo(size * 0.25, size);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(size * 0.75, 0);
  ctx.lineTo(size * 0.75, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
};

const createGridTexture = () => {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if(!ctx) return new THREE.Texture();

    ctx.fillStyle = '#e8e8e8'; // Light gray background
    ctx.fillRect(0,0,size,size);

    ctx.strokeStyle = '#999999'; // Neutral gray grid
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0; i<=size; i+=64) {
        ctx.moveTo(i, 0); ctx.lineTo(i, size);
        ctx.moveTo(0, i); ctx.lineTo(size, i);
    }
    ctx.stroke();

    ctx.strokeStyle = '#cccccc'; // Lighter gray for fine grid
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=size; i+=16) {
        ctx.moveTo(i, 0); ctx.lineTo(i, size);
        ctx.moveTo(0, i); ctx.lineTo(size, i);
    }
    ctx.stroke();
    
    ctx.fillStyle = '#666666'; // Dark gray markers
    for(let i=0; i<=size; i+=64) {
        for(let j=0; j<=size; j+=64) {
             ctx.fillRect(i-2, j-2, 4, 4);
        }
    }

    return new THREE.CanvasTexture(canvas);
};

const createCabinTexture = () => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if(!ctx) return new THREE.Texture();
    
    ctx.fillStyle = '#f0f0f0'; // Very light gray
    ctx.fillRect(0,0,size,size);
    
    ctx.strokeStyle = '#d0d0d0'; // Light gray grid
    ctx.lineWidth = 1;
    ctx.beginPath();
    for(let i=0; i<=size; i+=16) {
        ctx.moveTo(i, 0); ctx.lineTo(i, size);
        ctx.moveTo(0, i); ctx.lineTo(size, i);
    }
    ctx.stroke();
    
    return new THREE.CanvasTexture(canvas);
};

const createSensorLabelTexture = async () => {
  const width = 512;
  const height = 256;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // 1. Industrial Background
  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, width, height);

  // 2. Orange Brand Strip (Left side)
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(0, 0, 140, height);

  // 3. Icon Area (Centered in orange strip)
  // Wireless/Sensor Icon
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  
  const iconX = 70;
  const iconY = 128;
  
  ctx.beginPath();
  ctx.arc(iconX, iconY + 20, 20, -Math.PI*0.8, -Math.PI*0.2);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(iconX, iconY + 20, 40, -Math.PI*0.8, -Math.PI*0.2);
  ctx.stroke();
  
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(iconX, iconY + 40, 10, 0, Math.PI*2);
  ctx.fill();

  // 4. Text Area (Logo is now loaded separately as 3D plane)
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = '#888888';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SENSOR MODULE // T-800', 160, 128);

  // 5. Technical Markings
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(460, 20, 32, 32); // QC Pass square
  
  // Barcode-ish lines
  ctx.fillStyle = '#333333';
  for(let i=0; i<20; i++) {
      const w = Math.random() * 5 + 2;
      ctx.fillRect(160 + i*15, 210, w, 20);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  tex.needsUpdate = true;
  return tex;
};

const createSignTexture = (text: string) => {
    const width = 512;
    const height = 160;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if(!ctx) return new THREE.Texture();
    
    // Dark green highway sign background
    ctx.fillStyle = '#006633';
    ctx.fillRect(0,0,width,height);
    
    // Subtle texture
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for(let y=0; y<height; y+=4) {
        for(let x=0; x<width; x+=4) {
            if (Math.random() > 0.5) {
                ctx.fillRect(x, y, 2, 2);
            }
        }
    }
    
    ctx.font = 'bold 60px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    ctx.shadowBlur = 3;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.fillStyle = '#ffffff'; // White text on green
    
    ctx.fillText(text, width/2, height/2);
    
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
};

const createTelematicsTexture = (speed: number = 85, fuelLevel: number = 0.65) => {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  // Dark background with 50% transparency
  const gradient = ctx.createRadialGradient(1024, 512, 100, 1024, 512, 800);
  gradient.addColorStop(0, 'rgba(20, 10, 10, 0.5)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 2048, 1024);

  const texture = new THREE.CanvasTexture(canvas);

  const centerX = 1024;
  const centerY = 550;
  const mainRadius = 380;

  // === TOP SEGMENTED ARC (Speed indicator) - BOLDER ===
  const segments = 12;
  const segmentAngle = (Math.PI * 1.2) / segments;
  const startAngle = Math.PI * 0.6;
  
  for (let i = 0; i < segments; i++) {
    const angle = startAngle + i * segmentAngle;
    const speedThreshold = (i + 1) / segments;
    
    // Color based on speed range
    let color = '#00ffaa'; // Cyan/green
    if (i > segments * 0.7) {
      color = '#ffff00'; // Yellow
    }
    if (i > segments * 0.85) {
      color = '#ff4444'; // Red
    }
    
    // Fill if speed exceeds this segment
    if (speed / 160 > speedThreshold - 0.08) {
      ctx.fillStyle = color;
    } else {
      ctx.fillStyle = '#1a1a1a';
    }
    
    // Thicker segments
    ctx.beginPath();
    ctx.arc(centerX, centerY, mainRadius + 10, angle, angle + segmentAngle * 0.85);
    ctx.arc(centerX, centerY, mainRadius - 50, angle + segmentAngle * 0.85, angle, true);
    ctx.closePath();
    ctx.fill();
  }

  // === CENTER: MAIN SPEED DISPLAY - BIGGER & BOLDER ===
  ctx.font = 'bold 280px Arial';
  ctx.fillStyle = '#ffee88';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(speed).toString(), centerX, centerY + 70);
  
  ctx.font = 'bold 56px monospace';
  ctx.fillStyle = '#ff9955';
  ctx.fillText('KM/H', centerX, centerY + 150);
  
  // ECO mode indicator - bolder
  ctx.font = 'bold 64px monospace';
  ctx.fillStyle = '#00ffcc';
  ctx.fillText('ECO', centerX, centerY + 230);
  
  // Distance indicator - larger
  ctx.font = 'bold 40px monospace';
  ctx.fillStyle = '#888888';
  ctx.fillText('443.0 km', centerX, centerY + 290);
  ctx.font = 'bold 24px monospace';
  ctx.fillText('DISTANCE', centerX, centerY + 325);

  // === LEFT SIDE: FUEL GAUGE - BIGGER & BOLDER ===
  const fuelCenterX = 300;
  const fuelCenterY = 550;
  const fuelRadius = 240;
  
  // Fuel arc background - thicker
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.arc(fuelCenterX, fuelCenterY, fuelRadius, Math.PI * 0.6, Math.PI * 1.4);
  ctx.stroke();
  
  // Fuel level arc (colored) - thicker
  const fuelAngle = Math.PI * 0.6 + (fuelLevel * Math.PI * 0.8);
  let fuelColor = '#ff4444'; // Red at bottom
  if (fuelLevel > 0.3) fuelColor = '#ffbb00'; // Orange
  if (fuelLevel > 0.6) fuelColor = '#00ff99'; // Green
  
  ctx.strokeStyle = fuelColor;
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.arc(fuelCenterX, fuelCenterY, fuelRadius, Math.PI * 0.6, fuelAngle);
  ctx.stroke();
  
  // Custom fuel droplet icon (better than emoji)
  ctx.fillStyle = fuelColor;
  ctx.beginPath();
  ctx.moveTo(fuelCenterX, fuelCenterY - 30);
  ctx.bezierCurveTo(fuelCenterX - 30, fuelCenterY - 10, fuelCenterX - 30, fuelCenterY + 20, fuelCenterX, fuelCenterY + 40);
  ctx.bezierCurveTo(fuelCenterX + 30, fuelCenterY + 20, fuelCenterX + 30, fuelCenterY - 10, fuelCenterX, fuelCenterY - 30);
  ctx.fill();
  
  // Fuel percentage
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText(Math.round(fuelLevel * 100) + '%', fuelCenterX, fuelCenterY + 120);
  
  // EMPTY label
  ctx.font = 'bold 28px monospace';
  ctx.fillStyle = '#777777';
  ctx.fillText('EMPTY', fuelCenterX - 120, fuelCenterY + 200);

  // === RIGHT SIDE: BATTERY/CHARGE GAUGE - BIGGER & BOLDER ===
  const battCenterX = 1748;
  const battCenterY = 550;
  const battRadius = 240;
  
  // Battery arc background - thicker
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.arc(battCenterX, battCenterY, battRadius, Math.PI * 1.6, Math.PI * 2.4);
  ctx.stroke();
  
  // Battery level arc - thicker
  const battLevel = 0.75;
  const battAngle = Math.PI * 1.6 + (battLevel * Math.PI * 0.8);
  ctx.strokeStyle = '#ffee00';
  ctx.lineWidth = 50;
  ctx.beginPath();
  ctx.arc(battCenterX, battCenterY, battRadius, Math.PI * 1.6, battAngle);
  ctx.stroke();
  
  // Custom battery icon (better design)
  ctx.fillStyle = '#ffee00';
  ctx.fillRect(battCenterX - 35, battCenterY - 20, 70, 40);
  ctx.fillRect(battCenterX + 35, battCenterY - 10, 10, 20);
  
  // Battery fill level indicator
  const battFillWidth = 60 * battLevel;
  ctx.fillStyle = '#ffee00';
  ctx.fillRect(battCenterX - 30, battCenterY - 15, battFillWidth, 30);
  
  // Lightning bolt inside battery
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(battCenterX + 5, battCenterY - 15);
  ctx.lineTo(battCenterX - 5, battCenterY);
  ctx.lineTo(battCenterX, battCenterY);
  ctx.lineTo(battCenterX - 10, battCenterY + 15);
  ctx.lineTo(battCenterX, battCenterY);
  ctx.lineTo(battCenterX - 5, battCenterY);
  ctx.closePath();
  ctx.fill();
  
  // Range display - bigger
  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#00ffcc';
  ctx.textAlign = 'center';
  ctx.fillText('75 KM', battCenterX, battCenterY + 100);
  
  ctx.font = 'bold 24px monospace';
  ctx.fillStyle = '#888888';
  ctx.fillText('RANGE', battCenterX, battCenterY + 135);

  // === TOP INFO BAR - BIGGER ===
  ctx.textAlign = 'left';
  ctx.font = 'bold 42px monospace';
  ctx.fillStyle = '#00ffcc';
  ctx.fillText('âš™ ECO', 120, 130);
  
  ctx.textAlign = 'center';
  ctx.font = 'bold 36px monospace';
  ctx.fillStyle = '#999999';
  ctx.fillText('18Â°C', centerX + 250, 130);
  ctx.fillText('12:45 pm', centerX + 450, 130);
  
  ctx.textAlign = 'right';
  ctx.font = 'bold 38px monospace';
  ctx.fillStyle = '#777777';
  ctx.fillText('TRANSLINK', 1920, 130);

  return texture;
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioSysRef = useRef<AudioSystem | null>(null);
  
  // SVG Path Refs for dynamic updates
  const headPathRef = useRef<SVGPathElement>(null);
  const probePathRef = useRef<SVGPathElement>(null);
  const filterPathRef = useRef<SVGPathElement>(null);

  // Refs for SVG Dot markers (start and end of lines)
  const headDotRef = useRef<SVGCircleElement>(null);
  const probeDotRef = useRef<SVGCircleElement>(null);
  const filterDotRef = useRef<SVGCircleElement>(null);
  
  const [, setLoading] = useState(true);
  const [activePhase, setActivePhase] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [scrollPast3, setScrollPast3] = useState(false);
  
  // Intro screen state
  const [showIntroScreen, setShowIntroScreen] = useState(true);
  const [introFadingOut, setIntroFadingOut] = useState(false);
  
  // Extended animation state
  const extendedModeRef = useRef(false);
  const extendedIntroStartTimeRef = useRef<number | null>(null);
  const extendedIntroFinishedRef = useRef(false);
  

  
  // 3D card positioning state (includes scale and rotation for perspective)
  const [cardPosition, setCardPosition] = useState({ 
    x: 0, 
    y: 0, 
    visible: false, 
    scale: 1, 
    rotateX: 0, 
    rotateY: 0 
  });

  // Truck control state
  const [showTruckControls, setShowTruckControls] = useState(false);
  const [truckPosition, setTruckPosition] = useState({ x: 0, y: 0, z: 0 });
  const [truckScale, setTruckScale] = useState(1.5625);
  const glbModelRef = useRef<THREE.Group | null>(null);



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
          // Re-enable scrolling
          document.body.style.overflow = 'auto';
      }, 1000); // Match fade-out duration
  };
  
  const handleTruckConfigChange = (config: { position: [number, number, number]; scale: number }) => {
    if (glbModelRef.current) {
      glbModelRef.current.position.set(config.position[0], config.position[1], config.position[2]);
      glbModelRef.current.scale.set(config.scale, config.scale, config.scale);
    }
  };

  // Disable scrolling when intro screen is visible
  useEffect(() => {
      if (showIntroScreen) {
          document.body.style.overflow = 'hidden';
      }
  return () => {
          document.body.style.overflow = 'auto';
      };
  }, [showIntroScreen]);

  // Update truck model when controls change
  useEffect(() => {
    if (glbModelRef.current) {
      glbModelRef.current.position.set(truckPosition.x, truckPosition.y, truckPosition.z);
      glbModelRef.current.scale.set(truckScale, truckScale, truckScale);
    }
  }, [truckPosition, truckScale]);

  useEffect(() => {
      if (audioSysRef.current && activePhase > 0 && !isMuted) {
        audioSysRef.current.triggerChirp();
      }
  }, [activePhase, isMuted]);


  useEffect(() => {
    if (!mountRef.current) return;

    // --- SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8f8); // Very light gray for brightness
    // Fog removed for clear visibility

    // Load camera settings from localStorage (set by camera controller page)
    let initialSettings = { posX: 0, posY: 8, posZ: 25, rotX: 0, rotY: 0, rotZ: 0, fov: 55 };
    const savedSettings = localStorage.getItem('cameraSettings');
    if (savedSettings) {
      try {
        initialSettings = JSON.parse(savedSettings);
      } catch (e) {
        console.error('Failed to parse camera settings');
      }
    }
    
    const camera = new THREE.PerspectiveCamera(initialSettings.fov, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(initialSettings.posX, initialSettings.posY, initialSettings.posZ);
    camera.rotation.set(initialSettings.rotX, initialSettings.rotY, initialSettings.rotZ);
    
    // Listen for camera settings changes from controller page
    const handleCameraUpdate = () => {
      const updated = localStorage.getItem('cameraSettings');
      if (updated) {
        try {
          const settings = JSON.parse(updated);
          camera.position.set(settings.posX, settings.posY, settings.posZ);
          camera.rotation.set(settings.rotX, settings.rotY, settings.rotZ);
          camera.fov = settings.fov;
          camera.updateProjectionMatrix();
        } catch (e) {
          console.error('Failed to update camera');
        }
      }
    };
    
    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleCameraUpdate);
    // Listen for custom events (from same page)
    window.addEventListener('cameraSettingsChanged', handleCameraUpdate);
    const renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        powerPreference: "high-performance",
        alpha: false,
        stencil: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    mountRef.current.appendChild(renderer.domElement);

    // --- BLOOM POST-PROCESSING FOR GLOWING LIGHTS ---
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,  // strength
      0.3,  // radius
      0.92  // threshold (higher = less bloom)
    );
    composer.addPass(bloomPass);

    // --- NO LIGHTS (Using unlit materials) ---
    // All lights removed - scene uses MeshBasicMaterial for visibility

    // --- MATERIALS ---
    // Updated to neutral colors (from BACKUP-FINAL_2)
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x808080, // Neutral gray instead of neon red
      linewidth: 1,
      transparent: true,
      opacity: 0.85
    });



    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0xe0e0e0,
      side: THREE.DoubleSide
    });

    // Unlit trailer material
    const trailerGridMat = new THREE.MeshBasicMaterial({
        color: 0xe8e8e8,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });

    const markerMat = new THREE.MeshBasicMaterial({ 
      color: 0xffaa00 // Orange markers
    });
    
    // Black tire material
    const tireMat = new THREE.MeshBasicMaterial({
      color: 0x1a1a1a // Dark gray (not pure black)
    });

    const railMat = new THREE.MeshBasicMaterial({
        color: 0xffffff
    });
    const railWireMat = new THREE.LineBasicMaterial({ 
      color: 0xffffff, // Pure white
      transparent: true, 
      opacity: 0.3 
    });

    const grayTankMat = new THREE.MeshBasicMaterial({
      color: 0xcccccc, // Lighter gray
      transparent: true,
      opacity: 0.7
    });

    // --- HELPER FUNCTIONS ---

    const createWireMesh = (geo: THREE.BufferGeometry, mat: THREE.Material = bodyMat) => {
        const group = new THREE.Group();
        const body = new THREE.Mesh(geo, mat);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 25), wireMat);
        group.add(body, edges);
        return group;
    };



    const createMarkerLight = (x: number, y: number, z: number) => {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.05), markerMat);
        light.position.set(x, y, z);
        return light;
    };

    const createWheel = () => {
        const group = new THREE.Group();
        
        // Create realistic tire profile using LatheGeometry
        // LatheGeometry: X = radius from center, Y = position along axis
        const tireProfile: THREE.Vector2[] = [];
        const outerRadius = 1.5;
        const innerRadius = 0.85;
        const tireWidth = 1.1; // Increased thickness for more substantial look
        const halfWidth = tireWidth / 2;
        
        // Build tire cross-section profile (will be rotated 360Â°)
        // Start from one side and go to the other
        
        // Left inner rim edge
        tireProfile.push(new THREE.Vector2(innerRadius, -halfWidth * 0.35));
        
        // Left sidewall curve (rim to tread)
        const sidewallSteps = 10;
        for (let i = 0; i <= sidewallSteps; i++) {
            const t = i / sidewallSteps;
            // Smooth curve from rim to outer tread
            const radius = innerRadius + (outerRadius - innerRadius) * (t * t * (3 - 2 * t)); // smoothstep
            // Sidewall bulge
            const widthFactor = Math.sin(t * Math.PI) * 0.15;
            const yPos = -halfWidth * (0.35 + widthFactor);
            tireProfile.push(new THREE.Vector2(radius, yPos));
        }
        
        // Tread surface (slightly rounded, mostly flat)
        const treadSteps = 8;
        for (let i = 0; i <= treadSteps; i++) {
            const t = i / treadSteps;
            const yPos = -halfWidth + (t * tireWidth);
            // Very slight crown on tread
            const radius = outerRadius - 0.03 * Math.sin(t * Math.PI);
            tireProfile.push(new THREE.Vector2(radius, yPos));
        }
        
        // Right sidewall curve (tread to rim)
        for (let i = sidewallSteps; i >= 0; i--) {
            const t = i / sidewallSteps;
            const radius = innerRadius + (outerRadius - innerRadius) * (t * t * (3 - 2 * t));
            const widthFactor = Math.sin(t * Math.PI) * 0.15;
            const yPos = halfWidth * (0.35 + widthFactor);
            tireProfile.push(new THREE.Vector2(radius, yPos));
        }
        
        // Right inner rim edge (close the profile)
        tireProfile.push(new THREE.Vector2(innerRadius, halfWidth * 0.35));
        
        // Create tire using lathe geometry (rotates profile 360Â° around Y axis)
        const tireGeo = new THREE.LatheGeometry(tireProfile, 48);
        tireGeo.rotateZ(Math.PI / 2); // Rotate to face forward (wheel faces X direction)
        const tire = new THREE.Mesh(tireGeo, tireMat);
        
        // Create wireframe for tire
        const tireWireframe = new THREE.WireframeGeometry(tireGeo);
        const tireWireframeMesh = new THREE.LineSegments(tireWireframe, wireMat);
        
        // Rim
        const rimGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.15, 24);
        rimGeo.rotateZ(Math.PI/2);
        const rimEdge = new THREE.LineSegments(new THREE.EdgesGeometry(rimGeo), wireMat);

        // Hub
        const hubGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.3, 16);
        hubGeo.rotateZ(Math.PI/2);
        const hub = new THREE.Mesh(hubGeo, bodyMat);
        const hubEdge = new THREE.LineSegments(new THREE.EdgesGeometry(hubGeo), wireMat);

        // Spokes
        const spokeGeo = new THREE.BoxGeometry(0.8, 0.1, 1.2);
        const s1 = new THREE.Mesh(spokeGeo, bodyMat);
        const s2 = s1.clone(); s2.rotation.x = Math.PI/3;
        const s3 = s1.clone(); s3.rotation.x = (Math.PI/3)*2;
        
        const s1e = new THREE.LineSegments(new THREE.EdgesGeometry(spokeGeo), wireMat);
        const s2e = s1e.clone(); s2e.rotation.x = Math.PI/3;
        const s3e = s1e.clone(); s3e.rotation.x = (Math.PI/3)*2;
        
        // Lug nuts
        const lugs = new THREE.Group();
        const lugCount = 8;
        for(let i=0; i<lugCount; i++) {
            const angle = (i / lugCount) * Math.PI * 2;
            const r = 0.7;
            const lug = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), markerMat);
            lug.position.set(0.58, Math.cos(angle)*r, Math.sin(angle)*r);
            lug.rotation.y = Math.PI/2;
            
            const lugIn = lug.clone();
            lugIn.position.set(-0.58, Math.cos(angle)*r, Math.sin(angle)*r);
            lugIn.rotation.y = -Math.PI/2;
            
            lugs.add(lug, lugIn);
        }

        group.add(tire, tireWireframeMesh, rimEdge, hub, hubEdge, s1e, s2e, s3e, lugs);
        return group;
    };

    // --- SCENE OBJECTS ---

    // Ground plane removed

    // 1. Road aligned with truck at Y=-1.1
    const roadTex = createRoadTexture();
    roadTex.repeat.set(1, 12);
    const road = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 1200),
        new THREE.MeshBasicMaterial({ 
            map: roadTex,
            color: 0xffffff,
            side: THREE.DoubleSide
        })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = -1.1; // Aligned with truck
    scene.add(road);

    // 2. GUARDRAILS
    const guardRails = new THREE.Group();
    scene.add(guardRails);
    const railSegments: THREE.Group[] = [];
    const railGeo = new THREE.BoxGeometry(0.5, 1.5, 20);
    for (let i = 0; i < 20; i++) {
        const seg = new THREE.Group();
        const lRail = new THREE.Mesh(railGeo, railMat); lRail.position.set(-18, -0.2, 0);
        const lEdges = new THREE.LineSegments(new THREE.EdgesGeometry(railGeo), railWireMat); lEdges.position.set(-18, -0.2, 0);
        const rRail = new THREE.Mesh(railGeo, railMat); rRail.position.set(18, -0.2, 0);
        const rEdges = new THREE.LineSegments(new THREE.EdgesGeometry(railGeo), railWireMat); rEdges.position.set(18, -0.2, 0);
        const postGeo = new THREE.BoxGeometry(0.3, 2, 0.3);
        const lPost = new THREE.Mesh(postGeo, railMat); lPost.position.set(-18, -1.2, 0);
        const rPost = new THREE.Mesh(postGeo, railMat); rPost.position.set(18, -1.2, 0);
        seg.add(lRail, lEdges, rRail, rEdges, lPost, rPost);
        seg.position.z = -i * 20; 
        railSegments.push(seg);
        guardRails.add(seg);
    }

    // 3. OVERHEAD GANTRIES
    const gantriesGroup = new THREE.Group();
    scene.add(gantriesGroup);
    const gantryInstances: THREE.Group[] = [];
    const signTex1 = createSignTexture('WELCOME TO');
    const signTex2 = createSignTexture('TRANSLINK');
    for(let i=0; i<3; i++) {
        const gantry = new THREE.Group();
        const pillarGeo = new THREE.BoxGeometry(1, 14, 1);
        const pL = createWireMesh(pillarGeo, railMat); pL.position.set(-20, 4, 0);
        const pR = createWireMesh(pillarGeo, railMat); pR.position.set(20, 4, 0);
        const trussGeo = new THREE.BoxGeometry(42, 1.5, 1.5);
        const truss = createWireMesh(trussGeo, railMat); truss.position.set(0, 10, 0);
        const signGeo = new THREE.BoxGeometry(8, 2.5, 0.2);
        // Highway sign materials (unlit)
        const signMatL = new THREE.MeshBasicMaterial({ 
            map: signTex1, 
            color: 0xffffff
        });
        const signL = new THREE.Mesh(signGeo, signMatL);
        signL.position.set(-8, 10, 0.8);
        const signLEdge = new THREE.LineSegments(new THREE.EdgesGeometry(signGeo), new THREE.LineBasicMaterial({ color: 0x666666 }));
        signLEdge.position.set(-8, 10, 0.8);
        
        const signMatR = new THREE.MeshBasicMaterial({ 
            map: signTex2, 
            color: 0xffffff
        });
        const signR = new THREE.Mesh(signGeo, signMatR);
        signR.position.set(8, 10, 0.8);
        const signREdge = signLEdge.clone();
        signREdge.position.set(8, 10, 0.8);
        gantry.add(pL, pR, truss, signL, signLEdge, signR, signREdge);
        gantry.position.z = -300 - (i * 300);
        gantryInstances.push(gantry);
        gantriesGroup.add(gantry);
    }

    // 4. PARTICLES (Neutral colors)
    const particleCount = 500;
    const particleGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for(let i=0; i<particleCount*3; i+=3) {
        pPos[i] = (Math.random() - 0.5) * 50;   
        pPos[i+1] = Math.random() * 15;         
        pPos[i+2] = (Math.random() - 0.5) * 200;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particleMat = new THREE.PointsMaterial({ 
      color: 0xaaaaaa, // Neutral gray particles
      size: 0.08, 
      transparent: true, 
      opacity: 0.4 
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 5. TRUCK - GLB MODEL ONLY
    const truck = new THREE.Group();
    scene.add(truck);

    // === LOAD GLB TRUCK MODEL ===
    const glbTruckGroup = new THREE.Group();
    truck.add(glbTruckGroup);
    
    // Setup DRACO loader for compressed geometry
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    dracoLoader.setDecoderConfig({ type: 'js' });

    // Setup GLTF loader
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Load the new truck model
    gltfLoader.load(
      '/model/Main_truck_updated_compressed.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Calculate bounding box to determine scale
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        
        // Wireframe truck dimensions (reference)
        const wireframeWidth = 5.2;
        const wireframeHeight = 8.0;
        const wireframeLength = 32.5;
        
        // Calculate scale factors
        const scaleX = wireframeWidth / size.x;
        const scaleY = wireframeHeight / size.y;
        const scaleZ = wireframeLength / size.z;
        const uniformScale = ((scaleX + scaleY + scaleZ) / 3) * 1.5625; // Increase by 56.25% total
        
        console.log(`GLB size: ${size.x.toFixed(2)}x${size.y.toFixed(2)}x${size.z.toFixed(2)}, scale: ${uniformScale.toFixed(3)}`);
        
        // Apply transformations
        model.rotation.y = Math.PI; // 180 degrees to face forward
        
        // Apply optimized position and scale
        model.position.set(1.1, -1.1, -5.3);
        model.scale.set(1.50, 1.50, 1.50);
        
        // Unlit material (no lighting needed)
        const plainMaterial = new THREE.MeshBasicMaterial({
          color: 0xe0e0e0,
          side: THREE.DoubleSide
        });
        
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Dispose old materials and textures
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                  if (mat.map) mat.map.dispose();
                  if (mat.normalMap) mat.normalMap.dispose();
                  if (mat.roughnessMap) mat.roughnessMap.dispose();
                  if (mat.metalnessMap) mat.metalnessMap.dispose();
                  mat.dispose();
                });
              } else {
                if (child.material.map) child.material.map.dispose();
                if (child.material.normalMap) child.material.normalMap.dispose();
                if (child.material.roughnessMap) child.material.roughnessMap.dispose();
                if (child.material.metalnessMap) child.material.metalnessMap.dispose();
                child.material.dispose();
              }
            }
            // Apply plain material
            child.material = plainMaterial;
            
            // Add wireframe edges
            const edges = new THREE.EdgesGeometry(child.geometry, 15);
            const line = new THREE.LineSegments(
              edges,
              new THREE.LineBasicMaterial({ 
                color: 0x404040, // Dark gray edges for visibility
                linewidth: 1,
                transparent: true,
                opacity: 0.6
              })
            );
            child.add(line);
          }
        });
        // Store reference for controls
        glbModelRef.current = model;
        
        // Add to truck group
        glbTruckGroup.add(model);
        
        console.log(' GLB Truck model loaded successfully');
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Loading GLB truck: ${percent.toFixed(0)}%`);
      },
      (error) => {
        console.error('Error loading GLB truck:', error);
      }
    );


    // Create empty groups for compatibility with existing animation code
    const chassisGroup = new THREE.Group();
    const cabGroup = new THREE.Group();
    const trailer = new THREE.Group();
    const wheels: THREE.Group[] = [];
    const headlights: THREE.Mesh[] = [];
    const tailLights: THREE.Mesh[] = [];
    const tailLightGlows: THREE.PointLight[] = [];
    
    // Add empty groups to truck (for animation compatibility)
    truck.add(chassisGroup);
    truck.add(cabGroup);
    truck.add(trailer);

    // --- STANDALONE 3D TELEMATICS DISPLAY ---
    const telematicsGroup = new THREE.Group();
    
    const telematicsTex = createTelematicsTexture();
    const telematicsMat = new THREE.MeshBasicMaterial({ 
      map: telematicsTex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    });

    const displayScreen = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), telematicsMat);
    telematicsGroup.add(displayScreen);

    const frameMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.8 });
    const cornerSize = 0.54;
    const frameThickness = 0.045;
    const frameOffsetX = 4.68;
    const frameOffsetY = 2.6;
    
    const cornerTL1 = new THREE.Mesh(new THREE.BoxGeometry(cornerSize, frameThickness, frameThickness), frameMat);
    cornerTL1.position.set(-frameOffsetX, frameOffsetY, 0.1);
    telematicsGroup.add(cornerTL1);
    const cornerTL2 = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, cornerSize, frameThickness), frameMat);
    cornerTL2.position.set(-frameOffsetX, frameOffsetY, 0.1);
    telematicsGroup.add(cornerTL2);
    const cornerTR1 = new THREE.Mesh(new THREE.BoxGeometry(cornerSize, frameThickness, frameThickness), frameMat);
    cornerTR1.position.set(frameOffsetX, frameOffsetY, 0.1);
    telematicsGroup.add(cornerTR1);
    const cornerTR2 = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, cornerSize, frameThickness), frameMat);
    cornerTR2.position.set(frameOffsetX, frameOffsetY, 0.1);
    telematicsGroup.add(cornerTR2);
    const cornerBL1 = new THREE.Mesh(new THREE.BoxGeometry(cornerSize, frameThickness, frameThickness), frameMat);
    cornerBL1.position.set(-frameOffsetX, -frameOffsetY, 0.1);
    telematicsGroup.add(cornerBL1);
    const cornerBL2 = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, cornerSize, frameThickness), frameMat);
    cornerBL2.position.set(-frameOffsetX, -frameOffsetY, 0.1);
    telematicsGroup.add(cornerBL2);
    const cornerBR1 = new THREE.Mesh(new THREE.BoxGeometry(cornerSize, frameThickness, frameThickness), frameMat);
    cornerBR1.position.set(frameOffsetX, -frameOffsetY, 0.1);
    telematicsGroup.add(cornerBR1);
    const cornerBR2 = new THREE.Mesh(new THREE.BoxGeometry(frameThickness, cornerSize, frameThickness), frameMat);
    cornerBR2.position.set(frameOffsetX, -frameOffsetY, 0.1);
    telematicsGroup.add(cornerBR2);

    // Corner lights removed

    telematicsGroup.position.set(-10, 4.5, 0);
    telematicsGroup.rotation.y = 0;
    trailer.add(telematicsGroup);

    // -- FUEL TANK & SENSOR --
    const tankGroup = new THREE.Group();
    tankGroup.position.set(3.1, 0.6, -5); 
    truck.add(tankGroup);



    // NEW CUSTOM SENSOR HEAD (Extruded Chamfered Shape)
    const sensorHeadGroup = new THREE.Group();
    sensorHeadGroup.position.set(0, 0.85, 0);
    tankGroup.add(sensorHeadGroup);

    // 1. Custom Octagonal Shape for Housing
    const headShape = new THREE.Shape();
    const hw = 0.38;
    const hd = 0.38;
    const ch = 0.08; 
    headShape.moveTo(-hw + ch, -hd);
    headShape.lineTo(hw - ch, -hd);
    headShape.lineTo(hw, -hd + ch);
    headShape.lineTo(hw, hd - ch);
    headShape.lineTo(hw - ch, hd);
    headShape.lineTo(-hw + ch, hd);
    headShape.lineTo(-hw, hd - ch);
    headShape.lineTo(-hw, -hd + ch);
    headShape.closePath();

    const extrudeSettings = { depth: 0.25, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 };
    const headGeo = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
    const headMat = new THREE.MeshBasicMaterial({ 
      color: 0x8B0000 // Dark red, no glossy effect
    });
    const head = new THREE.Mesh(headGeo, headMat);
    head.rotation.x = Math.PI / 2; // Align to XZ plane
    head.position.y = 0; 
    sensorHeadGroup.add(head);

    // Edge lines for the custom shape
    const headEdges = new THREE.LineSegments(new THREE.EdgesGeometry(headGeo, 20), new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 }));
    headEdges.rotation.x = Math.PI / 2;
    sensorHeadGroup.add(headEdges);

    // 2. Recessed Label Panel (removed - not needed with logo)

    // 2b. White Background removed - PNG has transparency

    // 2c. Company Logo Plane (centered on sensor head)
    const logoLoader = new THREE.TextureLoader();
    const logoTexture = logoLoader.load('/Logo-white.png', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    });
    const logoMat = new THREE.MeshBasicMaterial({ 
      map: logoTexture, 
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      depthTest: true
    });
    // Use proper aspect ratio for logo (approximately 4:1 for horizontal logo)
    const logoPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.15), logoMat);
    logoPlane.rotation.x = -Math.PI / 2;
    logoPlane.rotation.z = Math.PI / 2;
    logoPlane.position.y = 0.033; // Directly on sensor head
    logoPlane.position.x = 0; // Centered
    sensorHeadGroup.add(logoPlane);

    // Logo spotlight removed

    // 3. Mounting Flange (Cylinder)
    const flangeGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.1, 16);
    const flange = new THREE.Mesh(flangeGeo, new THREE.MeshBasicMaterial({ color: 0x222222 }));
    flange.position.y = -0.05;
    sensorHeadGroup.add(flange);

    // PROBE ASSEMBLY
    const probeGroup = new THREE.Group();
    tankGroup.add(probeGroup);

    const probeTubeGeo = new THREE.CylinderGeometry(0.045, 0.045, 1.3, 20);
    const probeTube = new THREE.Mesh(probeTubeGeo, new THREE.MeshBasicMaterial({ 
        color: 0xcccccc
    }));
    probeTube.position.set(0, 0.05, 0);
    probeGroup.add(probeTube);

    const cageGroup = new THREE.Group();
    cageGroup.position.set(0, -0.5, 0);
    probeGroup.add(cageGroup);
    const cageBody = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.25, 12), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.5 }));
    cageGroup.add(cageBody);
    for (let i = 0; i < 4; i++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.006, 8, 16), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        ring.position.y = -0.08 + i * 0.06; ring.rotation.x = Math.PI / 2; cageGroup.add(ring);
    }



    // --- ANIMATION LOOP ---
    const clock = new THREE.Clock();
    let animationFrameId: number;
    let currentPhase = 0;

    const TRUCK_SPEED = 160; // Increased for faster wheel rotation
    const WHEEL_RADIUS = 1.55;
    const ROAD_SEGMENT_HEIGHT = 100;

    const tempV = new THREE.Vector3();
    
    // --- INTRO FADE SYSTEM (Disabled - scene is bright from start) ---
    const INTRO_DURATION = 0; // No fade needed with bright environment
    let introProgress = INTRO_DURATION; // Start fully visible
    
    const updatePath = (object: THREE.Object3D, pathEl: SVGPathElement, dotEl: SVGCircleElement, cardYRatio: number) => {
        if (!pathEl || !dotEl) return;
        
        // Get 3D position projected to screen
        object.getWorldPosition(tempV);
        tempV.project(camera);
        
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
        
        // Calculate card attachment point (Right side of screen)
        const cardX = window.innerWidth * 0.65; // Slightly to the left of the card text area
        const cardY = window.innerHeight * cardYRatio;

        // Create a "Circuit" style path: Start -> Horizontal -> Vertical -> End
        // or Start -> Diagonal -> Horizontal?
        // Let's do: Start -> Elbow Horizontal -> Elbow Vertical -> End
        
        const midX = x + (cardX - x) * 0.5;
        
        // Simple 3-point Polyline: Origin -> (MidX, OriginY) -> (MidX, CardY) -> (CardX, CardY)
        const d = `M ${x} ${y} L ${midX} ${y} L ${midX} ${cardY} L ${cardX} ${cardY}`;
        
        pathEl.setAttribute('d', d);
        dotEl.setAttribute('cx', String(x));
        dotEl.setAttribute('cy', String(y));
    };

    const animate = () => {
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // Intro fade removed - scene is bright from start
        
        // --- EXTENDED INTRO ANIMATION (Triggered at 100% scroll) ---
        // This is the Intro Phase from SOUND.md (truck enters from behind)
        const EXTENDED_INTRO_DURATION = 3.5;
        let isExtendedIntro = false;
        
        if (extendedModeRef.current && !extendedIntroFinishedRef.current) {
            if (extendedIntroStartTimeRef.current === null) {
                extendedIntroStartTimeRef.current = time;
            }
            
            const extendedIntroElapsed = time - extendedIntroStartTimeRef.current;
            
            if (extendedIntroElapsed < EXTENDED_INTRO_DURATION) {
                isExtendedIntro = true;
                // Truck Entrance from behind camera (from SOUND.md)
                // Start Z: 120 (Behind Camera), End Z: 0
                const progress = Math.min(extendedIntroElapsed / 3.0, 1);
                const ease = 1 - Math.pow(1 - progress, 3); // Cubic Out
                truck.position.z = 120 * (1 - ease);
                
                // Horn Trigger at 2.0s (from SOUND.md)
                if (extendedIntroElapsed > 2.0 && extendedIntroElapsed < 2.02) {
                    if (audioSysRef.current?.masterGain && audioSysRef.current.masterGain.gain.value > 0) {
                        audioSysRef.current.triggerHorn();
                    }
                }
                
                // Camera shake effect during horn
                if (extendedIntroElapsed > 2.0 && extendedIntroElapsed < 2.5) {
                    const shake = (Math.random() - 0.5) * 0.2;
                    camera.position.y += shake;
                }
            } else {
                // Extended intro finished - lock truck at z=0
                if (!extendedIntroFinishedRef.current) {
                    truck.position.z = 0;
                    extendedIntroFinishedRef.current = true;
                }
            }
        }
        
        // Keep truck at z=0 after extended intro finishes
        if (extendedModeRef.current && extendedIntroFinishedRef.current) {
            truck.position.z = 0;
        }

        if (audioSysRef.current) {
            audioSysRef.current.update(time);
            audioSysRef.current.updateScannerVolume(currentPhase === 2, time);
        }

        roadTex.offset.y += delta * (TRUCK_SPEED / ROAD_SEGMENT_HEIGHT);
        railSegments.forEach(seg => { seg.position.z += delta * TRUCK_SPEED; if (seg.position.z > 20) seg.position.z -= 400; });
        gantryInstances.forEach(g => { g.position.z += delta * TRUCK_SPEED; if(g.position.z > 50) g.position.z = -850; });
        
        const pPos = particles.geometry.attributes.position.array as Float32Array;
        for(let i=2; i<pPos.length; i+=3) {
            pPos[i] += delta * (TRUCK_SPEED * 1.2);
            if(pPos[i] > 50) pPos[i] = -200 - Math.random() * 100;
            
            // Add subtle drift during intro
            if (introProgress < INTRO_DURATION) {
                pPos[i-2] += Math.sin(time * 0.5 + i) * 0.01; // X drift
                pPos[i-1] += Math.cos(time * 0.3 + i) * 0.01; // Y drift
            }
        }
        particles.geometry.attributes.position.needsUpdate = true;

        wheels.forEach(w => { w.rotation.x += delta * (TRUCK_SPEED / WHEEL_RADIUS); });

        // === UPDATE TELEMATICS DISPLAY ===
        // Update every 0.5 seconds for performance
        if (Math.floor(time * 2) !== Math.floor((time - delta) * 2)) {
            // Calculate speed (varies slightly for realism)
            const baseSpeed = TRUCK_SPEED * 0.6; // Convert to KPH (roughly)
            const speedVariation = Math.sin(time * 0.5) * 10; // Â±10 KPH variation
            const currentSpeed = baseSpeed + speedVariation;
            
            // Calculate fuel level (decreases slowly over time)
            const fuelConsumption = time * 0.002; // Slow consumption
            const currentFuel = Math.max(0.15, 0.65 - fuelConsumption); // Start at 65%, min 15%
            
            // Update texture
            const newTex = createTelematicsTexture(currentSpeed, currentFuel);
            telematicsMat.map = newTex;
            telematicsMat.needsUpdate = true;
        }

        truck.position.y = Math.sin(time * 15) * 0.015 + Math.sin(time * 80) * 0.005;
        cabGroup.rotation.x = Math.sin(time * 10) * 0.005 + (Math.random() - 0.5) * 0.002;
        
        // Intro pulse effect on wireframes
        if (introProgress < INTRO_DURATION) {
            const pulse = Math.sin(time * 3) * 0.1 + 0.9; // 0.8 to 1.0
            wireMat.opacity = (introProgress / INTRO_DURATION) * 0.95 * pulse;
        } 


        // Light animations removed - using basic materials without emissive propertiessh
        
        const t = scrollRef.current;
        
        // --- ENHANCED CAMERA PATHS WITH SMOOTH INTRO ---
        // Extended intro phase (0-15% scroll) with dramatic reveal
        const pIntro = { pos: new THREE.Vector3(0, 3, -20), look: new THREE.Vector3(0, 2, 0) }; // Far, centered
        const pChase = { pos: new THREE.Vector3(-15, 7, 25), look: new THREE.Vector3(0, 2, -5) }; // Hero angle
        const pExtendedIntroChase = { pos: new THREE.Vector3(-22, 8, 45), look: new THREE.Vector3(0, 2, -10) }; // Extended intro chase (from SOUND.md)
        const pScan  = { pos: new THREE.Vector3(12, 4, -5),   look: new THREE.Vector3(3.1, 1.5, -5) };
        const pXray  = { pos: new THREE.Vector3(7, 2.5, -5), look: new THREE.Vector3(3.1, 1.0, -5) };
        const pTop   = { pos: new THREE.Vector3(3.1, 8, -5), look: new THREE.Vector3(3.1, 0, -5) };

        const currentPos = new THREE.Vector3();
        const currentLook = new THREE.Vector3();
        let nextPhase = 0;

        if (isExtendedIntro) {
            // EXTENDED INTRO: Camera at chase position (from SOUND.md)
            currentPos.copy(pExtendedIntroChase.pos);
            currentLook.copy(pExtendedIntroChase.look);
            nextPhase = 0;
        } else if (extendedModeRef.current && extendedIntroFinishedRef.current && t < 0.15) {
            // TRANSITION FROM EXTENDED INTRO TO SECOND SEQUENCE
            // Smoothly transition from extended intro chase to regular intro
            const localT = t / 0.15;
            const easeT = localT * localT * (3 - 2 * localT); // Smoothstep
            currentPos.lerpVectors(pExtendedIntroChase.pos, pChase.pos, easeT);
            currentLook.lerpVectors(pExtendedIntroChase.look, pChase.look, easeT);
            nextPhase = 0;
        } else if(t < 0.15) {
            // INTRO: Slow dolly forward from darkness (first sequence only)
            const localT = t / 0.15;
            const easeT = localT * localT * (3 - 2 * localT); // Smoothstep
            currentPos.lerpVectors(pIntro.pos, pChase.pos, easeT);
            currentLook.lerpVectors(pIntro.look, pChase.look, easeT);
            nextPhase = 0;
        } else if(t < 0.35) {
            // VELOCITY: Hold hero angle
            const localT = (t - 0.15) / 0.20;
            currentPos.lerpVectors(pChase.pos, pScan.pos, localT * 0.3); // Subtle movement
            currentLook.lerpVectors(pChase.look, pScan.look, localT * 0.3);
            nextPhase = 0;
        } else if (t < 0.55) {
            // SENSOR HEAD: Move to side view
            const localT = (t - 0.35) / 0.20;
            const easeT = localT * localT * (3 - 2 * localT);
            currentPos.lerpVectors(pScan.pos, pXray.pos, easeT * 0.5);
            currentLook.lerpVectors(pScan.look, pXray.look, easeT * 0.5);
            nextPhase = 1;
        } else if (t < 0.75) {
            // EXPLODED VIEW: Close-up detail
            const localT = (t - 0.55) / 0.20;
            const easeT = localT * localT * (3 - 2 * localT);
            currentPos.lerpVectors(pXray.pos, pXray.pos, easeT);
            currentLook.lerpVectors(pXray.look, pXray.look, easeT);
            nextPhase = 2;
        } else {
            // TOP VIEW: Final reveal
            const localT = (t - 0.75) / 0.25;
            const easeT = localT * localT * (3 - 2 * localT);
            currentPos.lerpVectors(pXray.pos, pTop.pos, easeT);
            currentLook.lerpVectors(pXray.look, pTop.look, easeT);
            nextPhase = 3;
        }

        if (nextPhase !== currentPhase) {
            setActivePhase(nextPhase);
            currentPhase = nextPhase;
        }

        // Smooth camera interpolation with slight breathing
        const breathe = Math.sin(time * 0.5) * 0.15;
        currentPos.y += breathe;
        camera.position.lerp(currentPos, 0.08); // Slightly slower for cinematic feel
        camera.lookAt(currentLook);

        // Update bloom pass on window resize
        bloomPass.resolution.set(window.innerWidth, window.innerHeight);

        // --- UPDATE 3D CARD POSITION WITH TRUCK PHYSICS ---
        if (currentPhase === 1) {
            // Position card to the left of the fuel tank (not covering it)
            const tankPos = new THREE.Vector3();
            tankGroup.getWorldPosition(tankPos);
            
            // Get truck's world rotation
            const truckWorldQuat = new THREE.Quaternion();
            truck.getWorldQuaternion(truckWorldQuat);
            
            // Create offset - to the right side of the truck
            const offset = new THREE.Vector3(5.5, 1.5, 0); // Right side, slightly up
            
            // Apply truck's rotation to offset (so it moves with the truck)
            offset.applyQuaternion(truckWorldQuat);
            
            // Add offset to tank position
            tankPos.add(offset);
            
            // Convert quaternion to Euler angles for CSS transform
            const euler = new THREE.Euler().setFromQuaternion(truckWorldQuat);
            
            // Project to screen space
            const projected = tankPos.clone().project(camera);
            
            const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
            const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
            
            // Check if position is in front of camera and within viewport
            const isVisible = projected.z < 1 && 
                             x > 100 && x < window.innerWidth - 100 &&
                             y > 100 && y < window.innerHeight - 100;
            
            // Calculate scale based on distance
            const distance = camera.position.distanceTo(tankPos);
            const scale = Math.max(0.6, Math.min(1.0, 10 / distance));
            
            // Calculate perspective rotation (reduced for readability)
            const rotateY = euler.y * (180 / Math.PI) * 0.5;
            const rotateX = euler.x * (180 / Math.PI) * 0.5;
            
            setCardPosition({ 
                x, 
                y, 
                visible: isVisible, 
                scale,
                rotateX,
                rotateY
            });
        } else {
            setCardPosition(prev => ({ ...prev, visible: false }));
        }

        // --- DYNAMIC SVG UPDATE ---
        if (currentPhase === 2) {
            // Only update paths when in Exploded/Detail view
            if(headPathRef.current && headDotRef.current) updatePath(sensorHeadGroup, headPathRef.current, headDotRef.current, 0.25);
            if(probePathRef.current && probeDotRef.current) updatePath(probeTube, probePathRef.current, probeDotRef.current, 0.50);
            if(filterPathRef.current && filterDotRef.current) updatePath(cageGroup, filterPathRef.current, filterDotRef.current, 0.75);
        }
        
        composer.render();
        animationFrameId = requestAnimationFrame(animate);
    };

    const scrollRef = { current: 0 };
    let hornTriggered = false; // Track if horn has been played
    
    const handleScroll = () => {
        const total = document.documentElement.scrollHeight - window.innerHeight;
        const rawScroll = Math.min(Math.max(window.scrollY / total, 0), 1);
        
        // Track if scrolled past 3%
        setScrollPast3(rawScroll > 0.03);
        
        // Store previous scroll value BEFORE updating
        const prevScroll = scrollRef.current;
        
        // Check if we've reached 50% of page (trigger extended intro)
        if (rawScroll >= 0.5 && !extendedModeRef.current) {
            // Trigger extended mode (intro phase + cloned sequence)
            extendedModeRef.current = true;
            scrollRef.current = 0; // Reset scroll for extended intro
        } else if (!extendedModeRef.current) {
            // First half of scroll (0-50% = original sequence)
            scrollRef.current = rawScroll * 2; // Map 0-0.5 to 0-1
        } else if (extendedIntroFinishedRef.current) {
            // After extended intro, map second half (50-100%) to cloned sequence (0-1)
            scrollRef.current = (rawScroll - 0.5) * 2; // Map 0.5-1 to 0-1
        } else {
            // During extended intro, keep scroll at 0
            scrollRef.current = 0;
        }
        
        // Trigger horn on first scroll (when user starts scrolling from 0)
        // Check if audio is enabled by checking masterGain value instead of isMuted state
        if (!hornTriggered && prevScroll === 0 && scrollRef.current > 0) {
            if (audioSysRef.current?.masterGain && audioSysRef.current.masterGain.gain.value > 0) {
                audioSysRef.current.triggerHorn();
                hornTriggered = true;
            }
        }
    };
    window.addEventListener('scroll', handleScroll);
    
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        composer.setSize(window.innerWidth, window.innerHeight);
        bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    };
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
                console.log('Audio activated by click'); // Debug log
            }
        }
    };
    // Attach to document to catch clicks anywhere (including through overlays)
    document.addEventListener('click', handleViewportClick);

    animate();
    setLoading(false);

  return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('storage', handleCameraUpdate);
        window.removeEventListener('cameraSettingsChanged', handleCameraUpdate);
        document.removeEventListener('click', handleViewportClick);
        cancelAnimationFrame(animationFrameId);
        if(mountRef.current && renderer.domElement) {
            mountRef.current.removeChild(renderer.domElement);
        }
        renderer.dispose();
        if (audioSysRef.current && audioSysRef.current.ctx) {
            audioSysRef.current.ctx.close();
        }
    };
  }, []);

  return (
    <div className="bg-black min-h-[1000vh] text-white font-mono overflow-x-hidden selection:bg-red-500/30">
      {/* --- INTRO SCREEN --- */}
      {showIntroScreen && (
        <div 
          className={`fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center transition-opacity duration-1000 cursor-pointer ${
            introFadingOut ? 'opacity-0' : 'opacity-100'
          }`}
          onClick={dismissIntroScreen}
          style={{ pointerEvents: introFadingOut ? 'none' : 'auto' }}
        >
          {/* Corner Decorations */}
          <div className="absolute top-8 left-8 w-12 h-12 border-l-2 border-t-2 border-gray-300"></div>
          <div className="absolute top-8 right-8 w-12 h-12 border-r-2 border-t-2 border-gray-300"></div>
          <div className="absolute bottom-8 left-8 w-12 h-12 border-l-2 border-b-2 border-gray-300"></div>
          <div className="absolute bottom-8 right-8 w-12 h-12 border-r-2 border-b-2 border-red-600"></div>
          
          {/* Progress Indicators */}
          <div className="absolute top-10 left-1/4 flex gap-8">
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="w-16 h-1 bg-gray-300"></div>
            <div className="w-16 h-1 bg-red-600"></div>
            <div className="w-16 h-1 bg-gray-300"></div>
          </div>
          
          {/* Main Content */}
          <div className="text-center space-y-8 px-8">
            {/* Company Logo */}
            <div className="flex justify-center mb-8">
              <img 
                src="/logo.png" 
                alt="Translink Solutions PLC" 
                className="h-24 md:h-32 w-auto object-contain"
              />
            </div>
            
            {/* Main Title - Company Name */}
            <h1 className="text-7xl md:text-8xl font-black tracking-tight leading-none text-gray-900">
              TRANSLINK
            </h1>
            <h1 className="text-6xl md:text-7xl font-black tracking-tight leading-none text-gray-700">
              SOLUTIONS PLC
            </h1>
            
            {/* Category */}
            <div className="text-2xl md:text-3xl tracking-[0.3em] text-gray-600 font-light mt-8">
              ADVANCED FLEET TELEMATICS
            </div>
            
            {/* Divider */}
            <div className="flex items-center justify-center gap-4 py-4">
              <div className="w-32 h-px bg-gray-400"></div>
              <div className="w-2 h-2 bg-red-600"></div>
              <div className="w-32 h-px bg-gray-400"></div>
            </div>
            
            {/* Description */}
            <p className="text-sm md:text-base tracking-[0.2em] text-gray-500 uppercase">
              Comprehensive Fleet Management Solutions
            </p>
            
            {/* Status Indicators */}
            <div className="flex items-center justify-center gap-8 pt-8 text-xs tracking-wider">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                <span className="text-gray-600">SYSTEM ONLINE</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                <span className="text-gray-600">FLEET ACTIVE</span>
              </div>
              <div className="text-gray-400">|</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                <span className="text-gray-600">TELEMETRY READY</span>
              </div>
            </div>
            
            {/* Click to Continue */}
            <div className="pt-12 text-gray-500 text-sm tracking-widest animate-pulse">
              CLICK TO CONTINUE
            </div>
          </div>
          
          {/* Bottom Decorations */}
          <div className="absolute bottom-10 left-8 flex gap-2">
            <div className="w-3 h-3 border border-gray-300"></div>
            <div className="w-3 h-3 border border-gray-300"></div>
            <div className="w-3 h-3 border border-gray-300 bg-gray-300"></div>
          </div>
        </div>
      )}
      
      <div ref={mountRef} className="fixed top-0 left-0 w-full h-screen z-0" />
      
      {/* --- TOP BAR --- */}
      <div className="fixed top-0 left-0 w-full z-20 p-6 flex justify-between items-start pointer-events-none">
        <div className="border-l-4 border-red-600 pl-6 pr-20 py-3 clip-path-slant">
            <div className="flex items-center gap-3">
                <img 
                  src="/Logo-white.png" 
                  alt="Translink" 
                  className="h-10 w-auto object-contain"
                />
                <Activity className="text-red-500 animate-pulse" />
                <div>
                    <h1 className="text-3xl font-black tracking-tighter italic leading-none">
                        FUEL LEVEL <span className="text-red-600">SENSOR PRO</span>
                    </h1>
                    <div className="text-[10px] text-red-400 tracking-[0.3em] mt-1 flex items-center gap-2">
                        <Wifi size={10} /> TRANSLINK FUEL TELEMATICS
                    </div>
                </div>
            </div>
        </div>
        
        <div className="text-right hidden md:flex flex-col items-end gap-3 pointer-events-auto">
            <button 
                onClick={toggleAudio}
                className="group flex items-center gap-2 px-3 py-1 border border-red-600/30 bg-red-900/10 hover:bg-red-600 hover:text-black transition-all"
            >
                <span className="text-[10px] tracking-widest font-bold">
                    AUDIO {isMuted ? 'OFF' : 'ON'}
                </span>
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} className="animate-pulse" />}
            </button>

            <TruckControls
              initialPosition={{ x: 1.1, y: -1.1, z: -5.3 }}
              initialScale={1.50}
              onPositionChange={(pos) => {
                if (glbModelRef.current) {
                  glbModelRef.current.position.set(pos.x, pos.y, pos.z);
                }
              }}
              onScaleChange={(scale) => {
                if (glbModelRef.current) {
                  glbModelRef.current.scale.set(scale, scale, scale);
                }
              }}
            />
        </div>

      </div>

      {/* --- PHASE 0: INTRO/VELOCITY (Hidden after 3% scroll) --- */}
      <div className={`fixed bottom-20 left-10 md:left-20 transition-all duration-[1500ms] ease-out z-20 pointer-events-none
        ${activePhase === 0 && !scrollPast3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
         <h2 className="text-8xl font-black italic text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-800 mb-0 leading-none animate-[fadeInUp_1.2s_ease-out]">
            REAL-TIME
         </h2>
         <div className="text-red-500 text-lg font-bold tracking-[0.5em] mb-6 pl-2 animate-[fadeInUp_1.4s_ease-out]">FUEL MONITORING</div>
         <div className="w-32 h-2 bg-red-600 mb-6 animate-[expandWidth_1.6s_ease-out]"></div>
         <p className="max-w-md text-gray-300 p-6 border-l-2 border-red-600 text-sm leading-relaxed animate-[fadeInUp_1.8s_ease-out]">
            High-precision fuel level monitoring with Â±1% static accuracy. Translink Fuel provides real-time tracking, theft detection, and seamless fleet integration for comprehensive fuel management.
         </p>
      </div>

      {/* --- PHASE 1: SENSOR HEAD FOCUS --- */}
      <div 
        className={`fixed z-20 pointer-events-none
        ${activePhase === 1 && cardPosition.visible ? 'opacity-100' : 'opacity-0'}`}
        style={{
          left: `${cardPosition.x}px`,
          top: `${cardPosition.y}px`,
          transform: `translate(-50%, -50%) scale(${cardPosition.scale}) perspective(1000px) rotateY(${cardPosition.rotateY}deg) rotateX(${cardPosition.rotateX}deg)`,
          transformStyle: 'preserve-3d',
          transition: 'opacity 300ms ease-out'
        }}
      >
         <div className="border-t-2 border-red-600 p-8 w-[450px] relative">
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-red-500"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-red-500"></div>
            
            <div className="flex items-center gap-3 mb-4">
                <Radio className="text-red-500 animate-pulse" />
                <span className="text-red-500 text-xs tracking-[0.3em] font-mono">COMPONENT: SENSOR HEAD</span>
            </div>

            <h2 className="text-3xl font-black text-white mb-4 tracking-tight">FUEL LEVEL SENSOR PRO</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6 font-mono">
                IP67 certified sensor with advanced MCU and multi-interface support. Features remote calibration, self-diagnostics, and temperature compensation (-10Â°C to +50Â°C).
            </p>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-800 pt-4">
                <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Interfaces</div>
                    <div className="text-white font-bold">CAN / RS232 / MOD</div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Voltage</div>
                    <div className="text-white font-bold">9-36V DC</div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Accuracy</div>
                    <div className="text-white font-bold">Â±1% Static</div>
                </div>
                <div>
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Resolution</div>
                    <div className="text-white font-bold">&lt;0.5mm</div>
                </div>
            </div>
         </div>
      </div>

      {/* --- PHASE 2: EXPLODED VIEW / COMPONENT BREAKDOWN (SVG OVERLAY) --- */}
      <div className={`fixed inset-0 z-30 pointer-events-none transition-opacity duration-500 ${activePhase === 2 ? 'opacity-100' : 'opacity-0'}`}>
          
          {/* DYNAMIC SVG LAYER */}
          <svg className="absolute inset-0 w-full h-full overflow-visible">
              <defs>
                  <marker id="dot" markerWidth="8" markerHeight="8" refX="4" refY="4">
                      <circle cx="4" cy="4" r="2" fill="#ef4444" />
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
              <path ref={headPathRef} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3" filter="url(#glow)" />
              <circle ref={headDotRef} r="5" fill="#ef4444" className="animate-pulse" />
              
              {/* Connector to Probe */}
              <path ref={probePathRef} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3" filter="url(#glow)" />
              <circle ref={probeDotRef} r="5" fill="#ef4444" className="animate-pulse" />

              {/* Connector to Filter */}
              <path ref={filterPathRef} fill="none" stroke="#ef4444" strokeWidth="2" strokeDasharray="6 3" filter="url(#glow)" />
              <circle ref={filterDotRef} r="5" fill="#ef4444" className="animate-pulse" />
          </svg>

          {/* INFO CARDS ALIGNED WITH SVG ENDPOINTS */}
          {/* These are positioned absolutely at the target coordinates of the SVG paths (Window Width * 0.65) */}
          
          {/* 1. Head Card (Top) */}
          <div className="absolute left-[66%] top-[25%] w-96 -translate-y-1/2 border-l-4 border-red-500 p-6 bg-black/90 backdrop-blur-sm transform transition-all">
              <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-2xl text-white tracking-tight">SENSOR HEAD</h3>
                  <Cpu size={24} className="text-red-500"/>
              </div>
              <p className="text-base text-gray-300 mb-4 leading-relaxed">Advanced MCU with remote calibration, self-diagnostics, and real-time data feed. Supports CAN, RS232, and Modbus interfaces.</p>
              <div className="flex gap-3">
                  <span className="border border-red-900/50 text-sm px-3 py-2 text-red-300 rounded-sm">REMOTE CAL</span>
                  <span className="border border-red-900/50 text-sm px-3 py-2 text-red-300 rounded-sm">MULTI-IF</span>
              </div>
          </div>

          {/* 2. Probe Card (Middle) */}
          <div className="absolute left-[66%] top-[50%] w-96 -translate-y-1/2 border-l-4 border-red-500 p-6 bg-black/90 backdrop-blur-sm transform transition-all">
              <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-2xl text-white tracking-tight">FUEL PROBE</h3>
                  <BarChart3 size={24} className="text-red-500"/>
              </div>
              <p className="text-base text-gray-300 mb-4 leading-relaxed">High-precision capacitive probe with &lt;0.5mm resolution. Features inclinometer for tilt compensation and anti-slosh technology for stable readings.</p>
              <div className="flex gap-3">
                  <span className="border border-red-900/50 text-sm px-3 py-2 text-red-300 rounded-sm">Â±1% ACCURACY</span>
                  <span className="border border-red-900/50 text-sm px-3 py-2 text-red-300 rounded-sm">ANTI-SLOSH</span>
              </div>
          </div>

           {/* 3. Filter Card (Bottom) */}
           <div className="absolute left-[66%] top-[75%] w-96 -translate-y-1/2 border-l-4 border-red-500 p-6 bg-black/90 backdrop-blur-sm transform transition-all">
              <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-2xl text-white tracking-tight">PROTECTION CAGE</h3>
                  <Layers size={24} className="text-red-500"/>
              </div>
              <p className="text-base text-gray-300 mb-4 leading-relaxed">Corrosion-resistant protective cage with chemical-resistant materials. Shock-resistant design ensures durability in harsh environments.</p>
              <div className="flex gap-3">
                  <span className="border border-red-900/50 text-sm px-3 py-2 text-red-300 rounded-sm">IP67</span>
                  <span className="border border-red-900/50 text-sm px-3 py-2 text-red-300 rounded-sm">SHOCK-PROOF</span>
              </div>
          </div>
      </div>

      {/* --- PHASE 3: DEPLOYMENT --- */}
      <div className={`fixed bottom-24 w-full text-center transition-all duration-700 z-30 pointer-events-none
        ${activePhase === 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
         <div className="pointer-events-auto inline-block">
             <button className="bg-red-600 text-black font-bold px-12 py-5 text-xl uppercase tracking-widest hover:bg-white hover:text-red-600 transition-colors shadow-[0_0_40px_rgba(220,38,38,0.6)] clip-path-button flex items-center gap-4 group">
                <Shield className="group-hover:scale-110 transition-transform" />
                Request Demo
             </button>
             <p className="text-xs text-red-500 mt-4 animate-pulse font-mono tracking-[0.2em]">FLEET INTEGRATION READY</p>
         </div>
      </div>

      <div className="relative z-40 pointer-events-none">
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
      </div>

      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-red-500/50 flex flex-col items-center transition-opacity duration-300 ${activePhase === 3 ? 'opacity-0' : 'opacity-100'}`}>
        <span className="text-[10px] tracking-widest mb-1">SCROLL TO SCAN</span>
        <ChevronDown className="animate-bounce" />
      </div>

      <style>{`
        .clip-path-slant {
            clip-path: polygon(0 0, 100% 0, 85% 100%, 0% 100%);
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
            from {
                width: 0;
            }
            to {
                width: 8rem;
            }
        }
      `}</style>
    </div>
  );
}










































