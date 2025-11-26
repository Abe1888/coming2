import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { createFuelTankSensor } from './utils/createFuelTankSensor';
import { createCargoLock } from './utils/createCargoLock';

// --- AUDIO SYSTEM ---
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
        // Smooth fade for mute/unmute
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

// Audio Controls Component - Icon Only
interface AudioControlsProps {
  isMuted: boolean;
  onToggleAudio: () => void;
  onTriggerHorn: () => void;
}

function AudioControls({ isMuted, onToggleAudio, onTriggerHorn }: AudioControlsProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (isMuted) {
      onToggleAudio();
    } else {
      onTriggerHorn();
    }
  };

  return (
    <button 
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        position: 'fixed',
        top: '24px',
        right: '24px',
        zIndex: 150,
        backgroundColor: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'scale(1.15)' : 'scale(1)',
        filter: isHovered 
          ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2))' 
          : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))',
      }}
      title={isMuted ? 'Click to turn audio ON' : 'Click to trigger horn'}
    >
      <svg 
        width="32" 
        height="32" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transition: 'all 0.3s ease',
        }}
      >
        {isMuted ? (
          // Muted Icon - Speaker with X
          <>
            <path 
              d="M11 5L6 9H2V15H6L11 19V5Z" 
              fill="#ef4444"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path 
              d="M16 9L22 15M22 9L16 15" 
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        ) : (
          // Active Icon - Speaker with Sound Waves
          <>
            <path 
              d="M11 5L6 9H2V15H6L11 19V5Z" 
              fill="#10b981"
              stroke="#10b981"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path 
              d="M15.54 8.46C16.4774 9.39764 17.0039 10.6692 17.0039 11.995C17.0039 13.3208 16.4774 14.5924 15.54 15.53" 
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                opacity: isHovered ? 1 : 0.7,
              }}
            />
            <path 
              d="M18.07 5.93C19.9447 7.80528 20.9979 10.3462 20.9979 13C20.9979 15.6538 19.9447 18.1947 18.07 20.07" 
              stroke="#10b981"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                opacity: isHovered ? 1 : 0.5,
              }}
            />
          </>
        )}
      </svg>
    </button>
  );
}

function DemoVanilla() {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Audio system
  const audioSysRef = useRef<AudioSystem | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  
  // Initialize audio system
  if (!audioSysRef.current) {
    audioSysRef.current = new AudioSystem();
  }
  
  // Scroll-based camera state
  const scrollRef = useRef({ current: 0 });
  const isUserDraggingRef = useRef(false);
  
  // Update localStorage heartbeat for controller connection status
  useEffect(() => {
    const updateHeartbeat = () => {
      localStorage.setItem('last-main-page-update', Date.now().toString());
    };
    updateHeartbeat();
    const interval = setInterval(updateHeartbeat, 2000);
    return () => clearInterval(interval);
  }, []);
  
  // Truck position state
  const [truckConfig, setTruckConfig] = useState({
    position: [-3.4, -1.4, 0] as [number, number, number],
    rotation: [0, Math.PI / 2, 0] as [number, number, number],
    scale: [50, 50, 50] as [number, number, number]
  });
  
  // Fuel sensor state
  const [fuelSensorConfig, setFuelSensorConfig] = useState({
    position: [-1.18, 1.28, -0.01] as [number, number, number],
    rotation: [0, -4.71238898038469, 0] as [number, number, number],
    scale: 1.053,
    probeLength: 0.8
  });
  
  // Cargo lock state (positioned at container back door)
  const [cargoLockConfig, setCargoLockConfig] = useState({
    position: [0, 2.8, -16.3] as [number, number, number],
    rotation: [0.09, 3.13841, 0] as [number, number, number]
  });
  
  // Store truck group reference
  const truckGroupRef = useRef<THREE.Group | null>(null);
  
  // Store fuel sensor group reference
  const fuelSensorGroupRef = useRef<THREE.Group | null>(null);
  
  // Store cargo lock group reference
  const cargoLockGroupRef = useRef<THREE.Group | null>(null);
  
  // Camera keyframes state - START/END structure for each phase
  // Truck orientation: Front (cab) at negative X, Back (container) at positive X
  const [cameraKeyframes, setCameraKeyframes] = useState({
    // 0-5%: Wide establishing shot
    intro: {
      start: {
        position: [12.4, 0, 0] as [number, number, number],
        target: [0, 1.1, 0] as [number, number, number]
      },
      end: {
        position: [3.2, 4.8, 16.1] as [number, number, number],
        target: [0, 0, 0] as [number, number, number]
      }
    },
    // 5-15%: Cab approach
    cabApproach: {
      start: {
        position: [3.3, 4.9, 16.2] as [number, number, number],  // Continues from intro end
        target: [0, 0, 0] as [number, number, number]
      },
      end: {
        position: [-7.5, 1.1, 8.1] as [number, number, number],
        target: [0, 0, 0] as [number, number, number]
      }
    },
    // 15-25%: Cab interior
    cabInterior: {
      start: {
        position: [-4.8, 1.6, 4.3] as [number, number, number],  // Continues from cabApproach end
        target: [-3.8, 0, 0.5] as [number, number, number]
      },
      end: {
        position: [-3.8, 3.2, 5.4] as [number, number, number],
        target: [-3.8, 0, 0.5] as [number, number, number]
      }
    },
    // 25-35%: Trailer side
    trailerSide: {
      start: {
        position: [-4.3, 3.5, 5.6] as [number, number, number],  // Continues from cabInterior end
        target: [-3.8, 0, 0.5] as [number, number, number]
      },
      end: {
        position: [-2.7, 1.6, 2.2] as [number, number, number],
        target: [-9.1, -11.8, -4.3] as [number, number, number]
      }
    },
    // 35-50%: Fuel tank
    fuelTank: {
      start: {
        position: [-2.9, 1.8, 2.3] as [number, number, number],  // Continues from trailerSide end
        target: [-9, -11.2, -4.3] as [number, number, number]
      },
      end: {
        position: [14.5, 17.2, 0] as [number, number, number],
        target: [-9.7, -2.2, 0] as [number, number, number]
      }
    },
    // 50-70%: Container mid
    containerMid: {
      start: {
        position: [15.6, 16, 0.6] as [number, number, number],  // Continues from fuelTank end
        target: [-9.7, -2.2, 0] as [number, number, number]
      },
      end: {
        position: [12.4, 0.5, -8.1] as [number, number, number],
        target: [0.5, 1.1, -1.6] as [number, number, number]
      }
    },
    // 70-85%: Trailer back
    trailerBack: {
      start: {
        position: [11.3, 0.5, -10.2] as [number, number, number],  // Continues from containerMid end
        target: [-1.6, 1.1, -1.6] as [number, number, number]
      },
      end: {
        position: [-22.6, 4.3, -22.6] as [number, number, number],
        target: [-12.9, 0, 1.6] as [number, number, number]
      }
    },
    // 85-100%: Outro
    outro: {
      start: {
        position: [-30.1, 6.5, -16.1] as [number, number, number],  // Continues from trailerBack end
        target: [-12.9, 0, 1.6] as [number, number, number]
      },
      end: {
        position: [-32.8, 2.7, -4.8] as [number, number, number],
        target: [-2.7, 0, 1.6] as [number, number, number]
      }
    }
  });
  
  // Store camera keyframes ref for animation loop
  const cameraKeyframesRef = useRef(cameraKeyframes);
  
  // Store camera preview state
  const cameraPreviewRef = useRef<{ phase: keyof typeof cameraKeyframes; keyframe: 'start' | 'end' } | null>(null);
  
  // Update ref when state changes
  React.useEffect(() => {
    cameraKeyframesRef.current = cameraKeyframes;
  }, [cameraKeyframes]);

  // Update truck position when config changes
  useEffect(() => {
    if (truckGroupRef.current) {
      truckGroupRef.current.position.set(
        truckConfig.position[0],
        truckConfig.position[1],
        truckConfig.position[2]
      );
      truckGroupRef.current.rotation.set(
        truckConfig.rotation[0],
        truckConfig.rotation[1],
        truckConfig.rotation[2]
      );
      
      // Update model scale (first child of truckGroup)
      const model = truckGroupRef.current.children[0];
      if (model) {
        model.scale.set(
          truckConfig.scale[0],
          truckConfig.scale[1],
          truckConfig.scale[2]
        );
      }
      
      console.log('🚛 Truck position updated:', truckConfig);
    }
  }, [truckConfig]);
  


  // Toggle audio
  const toggleAudio = useCallback(() => {
    const newState = !isMuted;
    setIsMuted(newState);
    audioSysRef.current?.toggleMute(newState);
  }, [isMuted]);

  // Trigger horn
  const triggerHorn = useCallback(() => {
    if (!isMuted) {
      audioSysRef.current?.triggerHorn();
    }
  }, [isMuted]);

  // Listen for storage events from controller
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!e.key) return;
      
      try {
        const newValue = e.newValue ? JSON.parse(e.newValue) : null;
        
        switch (e.key) {
          case 'truck-config':
            if (newValue) {
              setTruckConfig(newValue);
              // Update truck in scene immediately
              if (truckGroupRef.current) {
                const pos = newValue.position as [number, number, number];
                const rot = newValue.rotation as [number, number, number];
                const scl = newValue.scale as [number, number, number];
                truckGroupRef.current.position.set(pos[0], pos[1], pos[2]);
                truckGroupRef.current.rotation.set(rot[0], rot[1], rot[2]);
                const model = truckGroupRef.current.children[0];
                if (model) {
                  model.scale.set(scl[0], scl[1], scl[2]);
                }
                console.log('🚛 Truck updated from controller:', newValue);
              }
            }
            break;
          case 'camera-config':
            if (newValue) {
              setCameraKeyframes(newValue);
              cameraKeyframesRef.current = newValue;
              console.log('📹 Camera updated from controller');
            }
            break;
          case 'fuel-sensor-config':
            if (newValue) {
              setFuelSensorConfig(newValue);
              // Update fuel sensor in scene immediately
              if (fuelSensorGroupRef.current) {
                const pos = newValue.position as [number, number, number];
                const rot = newValue.rotation as [number, number, number];
                fuelSensorGroupRef.current.position.set(pos[0], pos[1], pos[2]);
                fuelSensorGroupRef.current.rotation.set(rot[0], rot[1], rot[2]);
                fuelSensorGroupRef.current.scale.setScalar(newValue.scale);
                console.log('⛽ Fuel sensor updated from controller:', newValue);
              }
            }
            break;
          case 'cargo-lock-config':
            if (newValue) {
              setCargoLockConfig(newValue);
              // Update cargo lock in scene immediately
              if (cargoLockGroupRef.current) {
                const pos = newValue.position as [number, number, number];
                const rot = newValue.rotation as [number, number, number];
                cargoLockGroupRef.current.position.set(pos[0], pos[1], pos[2]);
                cargoLockGroupRef.current.rotation.set(rot[0], rot[1], rot[2]);
                console.log('🔒 Cargo lock updated from controller:', newValue);
              }
            }
            break;
          case 'audio-state':
            if (newValue) {
              setIsMuted(newValue.isMuted);
              audioSysRef.current?.toggleMute(newValue.isMuted);
              console.log('🔊 Audio updated from controller:', newValue.isMuted ? 'OFF' : 'ON');
            }
            break;
          case 'trigger-horn':
            if (newValue && !isMuted) {
              audioSysRef.current?.triggerHorn();
              console.log('📯 Horn triggered from controller');
            }
            break;
        }
      } catch (error) {
        console.error('Error parsing storage event:', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [isMuted]);

  useEffect(() => {
    if (!mountRef.current) return;

    // ===== STATE =====
    let mode = 'SCAN'; // 'SCAN' or 'BLUEPRINT'
    let gridVisible = false;
    let wheelRotation = 0;

    // ===== WHEEL CONFIGURATION =====
    const wheelConfig = {
      axle001_A_position: [0.028, -0.048, 0.014] as [number, number, number],
      axle001_B_position: [-0.028, -0.048, 0.014] as [number, number, number],
      axle003_position: [0, 0.039, 0.013] as [number, number, number],
      Obj_axle004_position: [0, 0.075, 0.012] as [number, number, number],
      axle004_position: [0, 0.189, 0.014] as [number, number, number],
      axle005_position: [0, 0.222, 0.014] as [number, number, number],
      axle006_position: [0, 0.256, 0.014] as [number, number, number],
      rotationSpeed: 7.9  // Custom wheel rotation speed
    };

    // Store original wheel positions
    const originalWheelPositions: {
      axle001_A?: THREE.Vector3;
      axle001_B?: THREE.Vector3;
      axle003?: THREE.Vector3;
      Obj_axle004?: THREE.Vector3;
      axle004?: THREE.Vector3;
      axle005?: THREE.Vector3;
      axle006?: THREE.Vector3;
    } = {};

    // ===== SCENE SETUP =====
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xebebeb);
    scene.fog = new THREE.FogExp2(0xe8e8e8, 0.022);
    console.log('✓ Scene created with background:', scene.background);

    // ===== CAMERA =====
    const camera = new THREE.PerspectiveCamera(32, window.innerWidth / window.innerHeight, 0.1, 2000);
    // Start at intro START position
    camera.position.set(12.4, 0, 0);
    camera.lookAt(0, 1.1, 0);

    // ===== RENDERER =====
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    
    // Allow wheel events to pass through canvas for page scrolling
    renderer.domElement.style.pointerEvents = 'auto';
    
    console.log('✓ Renderer created and mounted');

    // ===== ORBIT CONTROLS =====
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    
    // Disable zoom on OrbitControls so wheel scrolls the page instead
    controls.enableZoom = false;

    // Track when user manually controls camera
    controls.addEventListener('start', () => {
      isUserDraggingRef.current = true;
      console.log('🖱️ User took manual control');
    });

    controls.addEventListener('end', () => {
      isUserDraggingRef.current = false;
      console.log('📜 Scroll-based camera resumed');
    });

    // ===== CAMERA KEYFRAMES (Scroll-Based) =====
    // Use ref to get latest camera keyframes from controller
    const getCameraKeyframes = () => {
      const kf = cameraKeyframesRef.current;
      return {
        intro: {
          start: {
            position: new THREE.Vector3(...kf.intro.start.position),
            target: new THREE.Vector3(...kf.intro.start.target)
          },
          end: {
            position: new THREE.Vector3(...kf.intro.end.position),
            target: new THREE.Vector3(...kf.intro.end.target)
          }
        },
        cabApproach: {
          start: {
            position: new THREE.Vector3(...kf.cabApproach.start.position),
            target: new THREE.Vector3(...kf.cabApproach.start.target)
          },
          end: {
            position: new THREE.Vector3(...kf.cabApproach.end.position),
            target: new THREE.Vector3(...kf.cabApproach.end.target)
          }
        },
        cabInterior: {
          start: {
            position: new THREE.Vector3(...kf.cabInterior.start.position),
            target: new THREE.Vector3(...kf.cabInterior.start.target)
          },
          end: {
            position: new THREE.Vector3(...kf.cabInterior.end.position),
            target: new THREE.Vector3(...kf.cabInterior.end.target)
          }
        },
        trailerSide: {
          start: {
            position: new THREE.Vector3(...kf.trailerSide.start.position),
            target: new THREE.Vector3(...kf.trailerSide.start.target)
          },
          end: {
            position: new THREE.Vector3(...kf.trailerSide.end.position),
            target: new THREE.Vector3(...kf.trailerSide.end.target)
          }
        },
        fuelTank: {
          start: {
            position: new THREE.Vector3(...kf.fuelTank.start.position),
            target: new THREE.Vector3(...kf.fuelTank.start.target)
          },
          end: {
            position: new THREE.Vector3(...kf.fuelTank.end.position),
            target: new THREE.Vector3(...kf.fuelTank.end.target)
          }
        },
        containerMid: {
          start: {
            position: new THREE.Vector3(...kf.containerMid.start.position),
            target: new THREE.Vector3(...kf.containerMid.start.target)
          },
          end: {
            position: new THREE.Vector3(...kf.containerMid.end.position),
            target: new THREE.Vector3(...kf.containerMid.end.target)
          }
        },
        trailerBack: {
          start: {
            position: new THREE.Vector3(...kf.trailerBack.start.position),
            target: new THREE.Vector3(...kf.trailerBack.start.target)
          },
          end: {
            position: new THREE.Vector3(...kf.trailerBack.end.position),
            target: new THREE.Vector3(...kf.trailerBack.end.target)
          }
        },
        outro: {
          start: {
            position: new THREE.Vector3(...kf.outro.start.position),
            target: new THREE.Vector3(...kf.outro.start.target)
          },
          end: {
            position: new THREE.Vector3(...kf.outro.end.position),
            target: new THREE.Vector3(...kf.outro.end.target)
          }
        }
      };
    };

    // Smooth cubic ease-in-out function
    const smoothEase = (t: number) => {
      return t < 0.5 
        ? 4 * t * t * t 
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    // ===== LIGHTING =====
    // Main directional light
    const dirLight1 = new THREE.DirectionalLight(0xf0f0f0, 1.2);
    dirLight1.position.set(0, 15, 8);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    dirLight1.shadow.camera.left = -20;
    dirLight1.shadow.camera.right = 20;
    dirLight1.shadow.camera.top = 20;
    dirLight1.shadow.camera.bottom = -20;
    dirLight1.shadow.camera.near = 0.1;
    dirLight1.shadow.camera.far = 50;
    dirLight1.shadow.bias = -0.0001;
    dirLight1.shadow.radius = 4;
    scene.add(dirLight1);

    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xf5f5f5, 0.8);
    scene.add(ambientLight);

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(0xf8f8f8, 0xd8d8d8, 0.4);
    scene.add(hemiLight);

    // Back light
    const dirLight2 = new THREE.DirectionalLight(0xe8e8e8, 0.4);
    dirLight2.position.set(-8, 6, -12);
    scene.add(dirLight2);

    // ===== GROUND PLANE =====
    const groundPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 100),
      new THREE.ShadowMaterial({ opacity: 0.15 })
    );
    groundPlane.rotation.x = -Math.PI / 2;
    groundPlane.position.set(0, -1.46, 0);
    groundPlane.receiveShadow = true;
    scene.add(groundPlane);

    // ===== GRID =====
    const gridHelper = new THREE.GridHelper(60, 60, 0xc0c0c0, 0xd8d8d8);
    gridHelper.position.y = -1.45;
    gridHelper.visible = gridVisible;
    scene.add(gridHelper);

    // ===== ROAD =====
    function createRoadTexture() {
      const width = 1024;
      const height = 2048;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return new THREE.Texture();

      ctx.clearRect(0, 0, width, height);

      const lineColor = mode === 'SCAN' ? 'rgba(255, 0, 0, 0.75)' : 'rgba(0, 102, 255, 0.75)';
      
      // Edge lines
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 12;
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(80, 0);
      ctx.lineTo(80, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(width - 80, 0);
      ctx.lineTo(width - 80, height);
      ctx.stroke();

      // Center dashed line
      ctx.lineWidth = 16;
      ctx.setLineDash([150, 100]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.anisotropy = 16;
      tex.repeat.set(1, 3);
      return tex;
    }

    const roadTexture = createRoadTexture();
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 200),
      new THREE.MeshStandardMaterial({
        map: roadTexture,
        color: 0xffffff,
        roughness: 0.95,
        metalness: 0,
        side: THREE.DoubleSide,
        transparent: true,
        alphaTest: 0.1
      })
    );
    road.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    road.position.set(0, -1.45, 0);
    road.receiveShadow = true;
    scene.add(road);

    // ===== TRUCK =====
    const truckGroup = new THREE.Group();
    truckGroup.position.set(truckConfig.position[0], truckConfig.position[1], truckConfig.position[2]);
    truckGroup.rotation.set(truckConfig.rotation[0], truckConfig.rotation[1], truckConfig.rotation[2]);
    truckGroup.scale.set(1, 1, 1); // Scale will be applied to model inside
    scene.add(truckGroup);
    
    // Store reference for updates
    truckGroupRef.current = truckGroup;

    const wheelRefs: {
      axle001_A: THREE.Mesh | null;
      axle001_B: THREE.Mesh | null;
      axle003: THREE.Mesh | null;
      Obj_axle004: THREE.Mesh | null;
      axle004: THREE.Mesh | null;
      axle005: THREE.Mesh | null;
      axle006: THREE.Mesh | null;
    } = {
      axle001_A: null,
      axle001_B: null,
      axle003: null,
      Obj_axle004: null,
      axle004: null,
      axle005: null,
      axle006: null
    };

    let fuelTankMesh: THREE.Mesh | null = null;

    // Load truck model
    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    
    console.log('🚛 Loading truck model...');
    loader.load(
      '/model/Main_truck_FINAL_opt2.glb',
      (gltf) => {
        console.log('✅ Truck model loaded successfully!');
        const model = gltf.scene;
        
        // Apply materials and find wheels
        model.traverse((node) => {
          // Find wheel meshes
          if (node.name === 'axle001_A' && node instanceof THREE.Mesh) {
            wheelRefs.axle001_A = node;
            node.geometry = node.geometry.clone();
            node.geometry.center();
            // Store original position and apply offset
            originalWheelPositions.axle001_A = node.position.clone();
            node.position.x += wheelConfig.axle001_A_position[0];
            node.position.y += wheelConfig.axle001_A_position[1];
            node.position.z += wheelConfig.axle001_A_position[2];
            console.log('✓ Found axle001_A - position adjusted');
          }
          if (node.name === 'axle001_B' && node instanceof THREE.Mesh) {
            wheelRefs.axle001_B = node;
            node.geometry = node.geometry.clone();
            node.geometry.center();
            // Store original position and apply offset
            originalWheelPositions.axle001_B = node.position.clone();
            node.position.x += wheelConfig.axle001_B_position[0];
            node.position.y += wheelConfig.axle001_B_position[1];
            node.position.z += wheelConfig.axle001_B_position[2];
            console.log('✓ Found axle001_B - position adjusted');
          }
          if (node.name === 'axle003' && node instanceof THREE.Mesh) {
            wheelRefs.axle003 = node;
            node.geometry = node.geometry.clone();
            node.geometry.center();
            // Store original position and apply offset
            originalWheelPositions.axle003 = node.position.clone();
            node.position.x += wheelConfig.axle003_position[0];
            node.position.y += wheelConfig.axle003_position[1];
            node.position.z += wheelConfig.axle003_position[2];
            console.log('✓ Found axle003 - position adjusted');
          }
          if (node.name === 'Obj_axle004' && node instanceof THREE.Mesh) {
            wheelRefs.Obj_axle004 = node;
            node.geometry = node.geometry.clone();
            node.geometry.center();
            // Store original position and apply offset
            originalWheelPositions.Obj_axle004 = node.position.clone();
            node.position.x += wheelConfig.Obj_axle004_position[0];
            node.position.y += wheelConfig.Obj_axle004_position[1];
            node.position.z += wheelConfig.Obj_axle004_position[2];
            console.log('✓ Found Obj_axle004 - position adjusted');
          }
          if (node.name === 'axle004' && node instanceof THREE.Mesh) {
            wheelRefs.axle004 = node;
            node.geometry = node.geometry.clone();
            node.geometry.center();
            // Store original position and apply offset
            originalWheelPositions.axle004 = node.position.clone();
            node.position.x += wheelConfig.axle004_position[0];
            node.position.y += wheelConfig.axle004_position[1];
            node.position.z += wheelConfig.axle004_position[2];
            console.log('✓ Found axle004 - position adjusted');
          }
          if (node.name === 'axle005' && node instanceof THREE.Mesh) {
            wheelRefs.axle005 = node;
            node.geometry = node.geometry.clone();
            node.geometry.center();
            // Store original position and apply offset
            originalWheelPositions.axle005 = node.position.clone();
            node.position.x += wheelConfig.axle005_position[0];
            node.position.y += wheelConfig.axle005_position[1];
            node.position.z += wheelConfig.axle005_position[2];
            console.log('✓ Found axle005 - position adjusted');
          }
          if (node.name === 'axle006' && node instanceof THREE.Mesh) {
            wheelRefs.axle006 = node;
            node.geometry = node.geometry.clone();
            node.geometry.center();
            // Store original position and apply offset
            originalWheelPositions.axle006 = node.position.clone();
            node.position.x += wheelConfig.axle006_position[0];
            node.position.y += wheelConfig.axle006_position[1];
            node.position.z += wheelConfig.axle006_position[2];
            console.log('✓ Found axle006 - position adjusted');
          }

          if (node instanceof THREE.Mesh) {
            // Glass material
            if (node.name === 'Glass') {
              node.material = new THREE.MeshStandardMaterial({
                color: 0x333333,
                transparent: true,
                opacity: 0.5,
                roughness: 0.2,
                metalness: 0.1,
                side: THREE.DoubleSide
              });
              node.castShadow = true;
              node.receiveShadow = true;
              return;
            }

            // Fuel tank material
            if (node.name === 'Fuel_tank') {
              fuelTankMesh = node; // Store reference for sensor mounting
              node.material = new THREE.MeshStandardMaterial({
                color: 0x000000,
                transparent: true,
                opacity: 0.3,
                roughness: 0.7,
                metalness: 0.2,
                side: THREE.DoubleSide
              });
              node.castShadow = true;
              node.receiveShadow = true;
              console.log('✓ Found Fuel_tank - will mount sensor');
              return;
            }

            // Default material
            node.material = new THREE.MeshStandardMaterial({
              color: 0xf5f5f5,
              roughness: 0.6,
              metalness: 0.1,
              side: THREE.DoubleSide
            });

            // Add edges
            const edgesGeometry = new THREE.EdgesGeometry(node.geometry, 15);
            const edgesMaterial = new THREE.LineBasicMaterial({
              color: 0x808080,
              transparent: true,
              opacity: 0.85
            });
            const edgesLine = new THREE.LineSegments(edgesGeometry, edgesMaterial);
            node.add(edgesLine);

            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        model.scale.set(truckConfig.scale[0], truckConfig.scale[1], truckConfig.scale[2]);
        model.rotation.y = 0; // Rotation handled by truckGroup
        truckGroup.add(model);
        
        console.log('✓ Truck added to scene');

        // Add fuel tank sensor with manual position (from state)
        if (fuelTankMesh) {
          // Create fuel sensor using state config
          const fuelSensor = createFuelTankSensor({
            tankHeight: fuelSensorConfig.probeLength,
            position: fuelSensorConfig.position,
            scale: fuelSensorConfig.scale
          });

          // Apply rotation
          fuelSensor.group.rotation.set(...fuelSensorConfig.rotation);

          // Store reference for updates
          fuelSensorGroupRef.current = fuelSensor.group;

          // Add to truck group
          truckGroup.add(fuelSensor.group);
          console.log('✓ Fuel sensor mounted with manual position');
          console.log('  - Position:', fuelSensorConfig.position);
          console.log('  - Rotation:', fuelSensorConfig.rotation.map(r => (r * 180 / Math.PI).toFixed(1) + '°'));
          console.log('  - Scale:', fuelSensorConfig.scale);
          console.log('  - Probe length:', fuelSensorConfig.probeLength);
        }
        
        // Add cargo lock at container back door
        const cargoLock = createCargoLock({
          position: cargoLockConfig.position,
          rotation: cargoLockConfig.rotation,
          isLocked: true,
          signalStrength: 85
        });
        
        // Store reference for updates
        cargoLockGroupRef.current = cargoLock.group;
        
        // Add to truck group
        truckGroup.add(cargoLock.group);
        console.log('✓ Cargo lock mounted at container back door');
        console.log('  - Position:', cargoLockConfig.position);
        console.log('  - Rotation:', cargoLockConfig.rotation.map(r => (r * 180 / Math.PI).toFixed(1) + '°'));
      },
      (progress) => {
        const percent = (progress.loaded / progress.total * 100).toFixed(0);
        console.log(`📦 Loading: ${percent}%`);
      },
      (error) => {
        console.error('❌ Error loading truck model:', error);
      }
    );

    // ===== UI CONTROLS =====
    const toggleGridBtn = document.getElementById('toggleGrid');
    const toggleModeBtn = document.getElementById('toggleMode');

    if (toggleGridBtn) {
      toggleGridBtn.addEventListener('click', () => {
        gridVisible = !gridVisible;
        gridHelper.visible = gridVisible;
      });
    }

    if (toggleModeBtn) {
      toggleModeBtn.addEventListener('click', (e) => {
        mode = mode === 'SCAN' ? 'BLUEPRINT' : 'SCAN';
        (e.target as HTMLButtonElement).textContent = mode === 'SCAN' ? 'Switch to Blueprint' : 'Switch to Scan';
        
        // Update background
        if (scene.background instanceof THREE.Color) {
          scene.background.setHex(mode === 'SCAN' ? 0xebebeb : 0xf4f7fa);
        }
        
        // Update fog
        if (mode === 'SCAN') {
          scene.fog = new THREE.FogExp2(0xe8e8e8, 0.022);
        } else {
          scene.fog = new THREE.Fog(0xf4f7fa, 30, 90);
        }
        
        // Update road texture
        const newTexture = createRoadTexture();
        road.material.map = newTexture;
        road.material.needsUpdate = true;
      });
    }

    // ===== ANIMATION LOOP =====
    const clock = new THREE.Clock();
    
    function animate() {
      requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Update audio system
      if (audioSysRef.current) {
        audioSysRef.current.update(time);
      }

      // Always update controls (handles damping)
      controls.update();

      // ===== SCROLL-BASED CAMERA (only when not dragging) =====
      if (!isUserDraggingRef.current) {
        const t = scrollRef.current.current;
        const cameraKeyframes = getCameraKeyframes();
        
        // Debug: Log once per second
        if (Math.floor(Date.now() / 1000) % 5 === 0 && Math.random() < 0.02) {
          console.log('🎥 Camera scroll:', (t * 100).toFixed(1) + '%', 'Dragging:', isUserDraggingRef.current);
        }
        
        const currentPos = new THREE.Vector3();
        const currentTarget = new THREE.Vector3();
        
        // Check if we should preview a specific keyframe
        const preview = cameraPreviewRef.current;
        if (preview) {
          // Jump directly to the selected keyframe
          const keyframeData = cameraKeyframes[preview.phase][preview.keyframe];
          currentPos.copy(keyframeData.position);
          currentTarget.copy(keyframeData.target);
          
          // Apply directly without interpolation for instant preview
          camera.position.copy(currentPos);
          camera.lookAt(currentTarget);
          controls.target.copy(currentTarget);
          
          // Skip the rest of the scroll-based animation
          renderer.render(scene, camera);
          return;
        }
        
        // Phase 1: Intro - Wide establishing shot (0-5%)
        if (t < 0.05) {
          const localT = t / 0.05;
          const easeT = smoothEase(localT);
          currentPos.lerpVectors(
            cameraKeyframes.intro.start.position,
            cameraKeyframes.intro.end.position,
            easeT
          );
          currentTarget.lerpVectors(
            cameraKeyframes.intro.start.target,
            cameraKeyframes.intro.end.target,
            easeT
          );
        }
        // Phase 2: Cab Approach - Get closer to truck (5-15%)
        else if (t < 0.15) {
          const localT = (t - 0.05) / 0.10;
          const easeT = smoothEase(localT);
          currentPos.lerpVectors(
            cameraKeyframes.cabApproach.start.position,
            cameraKeyframes.cabApproach.end.position,
            easeT
          );
          currentTarget.lerpVectors(
            cameraKeyframes.cabApproach.start.target,
            cameraKeyframes.cabApproach.end.target,
            easeT
          );
        }
        // Phase 3: Cab Interior - GPS & ADAS focus (15-25%)
        else if (t < 0.25) {
          const localT = (t - 0.15) / 0.10;
          const easeT = smoothEase(localT);
          currentPos.lerpVectors(
            cameraKeyframes.cabInterior.start.position,
            cameraKeyframes.cabInterior.end.position,
            easeT
          );
          currentTarget.lerpVectors(
            cameraKeyframes.cabInterior.start.target,
            cameraKeyframes.cabInterior.end.target,
            easeT
          );
        }
        // Phase 4: Trailer Side - Moving along cargo (25-35%)
        else if (t < 0.35) {
          const localT = (t - 0.25) / 0.10;
          const easeT = smoothEase(localT);
          currentPos.lerpVectors(
            cameraKeyframes.trailerSide.start.position,
            cameraKeyframes.trailerSide.end.position,
            easeT
          );
          currentTarget.lerpVectors(
            cameraKeyframes.trailerSide.start.target,
            cameraKeyframes.trailerSide.end.target,
            easeT
          );
        }
        // Phase 5: Fuel Tank - Close-up + sensor (35-50%)
        else if (t < 0.50) {
          const localT = (t - 0.35) / 0.15;
          const easeT = smoothEase(localT);
          currentPos.lerpVectors(
            cameraKeyframes.fuelTank.start.position,
            cameraKeyframes.fuelTank.end.position,
            easeT
          );
          currentTarget.lerpVectors(
            cameraKeyframes.fuelTank.start.target,
            cameraKeyframes.fuelTank.end.target,
            easeT
          );
        }
        // Phase 6: Container Mid - Trailer focus (50-70%)
        else if (t < 0.70) {
          const localT = (t - 0.50) / 0.20;
          const easeT = smoothEase(localT);
          currentPos.lerpVectors(
            cameraKeyframes.containerMid.start.position,
            cameraKeyframes.containerMid.end.position,
            easeT
          );
          currentTarget.lerpVectors(
            cameraKeyframes.containerMid.start.target,
            cameraKeyframes.containerMid.end.target,
            easeT
          );
        }
        // Phase 7: Trailer Back - Lock close-up (70-85%)
        else if (t < 0.85) {
          const localT = (t - 0.70) / 0.15;
          const easeT = smoothEase(localT);
          currentPos.lerpVectors(
            cameraKeyframes.trailerBack.start.position,
            cameraKeyframes.trailerBack.end.position,
            easeT
          );
          currentTarget.lerpVectors(
            cameraKeyframes.trailerBack.start.target,
            cameraKeyframes.trailerBack.end.target,
            easeT
          );
        }
        // Phase 8: Outro - Pull back for full view (85-100%)
        else {
          const localT = (t - 0.85) / 0.15;
          const easeT = smoothEase(localT);
          currentPos.lerpVectors(
            cameraKeyframes.outro.start.position,
            cameraKeyframes.outro.end.position,
            easeT
          );
          currentTarget.lerpVectors(
            cameraKeyframes.outro.start.target,
            cameraKeyframes.outro.end.target,
            easeT
          );
        }
        
        // Add breathing effect (matching main app)
        const time = clock.getElapsedTime();
        const breathe = Math.sin(time * 0.3) * 0.08;
        currentPos.y += breathe;
        
        // Apply smooth camera movement
        camera.position.lerp(currentPos, 0.15);
        
        // Smooth look-at with interpolation (matching main app)
        const targetLook = currentTarget.clone();
        const currentCameraLook = new THREE.Vector3();
        camera.getWorldDirection(currentCameraLook);
        currentCameraLook.multiplyScalar(10).add(camera.position);
        currentCameraLook.lerp(targetLook, 0.15);
        camera.lookAt(currentCameraLook);
        
        // Sync OrbitControls target
        controls.target.lerp(currentTarget, 0.15);
      }

      // Rotate wheels
      wheelRotation += delta * wheelConfig.rotationSpeed;
      
      if (wheelRefs.axle001_A) {
        wheelRefs.axle001_A.rotation.x = wheelRotation;
      }
      if (wheelRefs.axle001_B) {
        wheelRefs.axle001_B.rotation.x = wheelRotation;
      }
      if (wheelRefs.axle003) {
        wheelRefs.axle003.rotation.x = wheelRotation;
      }
      if (wheelRefs.Obj_axle004) {
        wheelRefs.Obj_axle004.rotation.x = wheelRotation;
      }
      if (wheelRefs.axle004) {
        wheelRefs.axle004.rotation.x = wheelRotation;
      }
      if (wheelRefs.axle005) {
        wheelRefs.axle005.rotation.x = wheelRotation;
      }
      if (wheelRefs.axle006) {
        wheelRefs.axle006.rotation.x = wheelRotation;
      }

      // Animate road - 60 km/h speed
      // 60 km/h = 16.67 m/s
      // Road texture scale factor for realistic speed
      if (roadTexture) {
        roadTexture.offset.y += delta * 1.875; // Adjusted for ~60 km/h (75% of 80 km/h)
      }

      renderer.render(scene, camera);
    }

    // ===== WINDOW RESIZE =====
    // ===== SCROLL HANDLER =====
    let hornTriggered = false;
    let prevScroll = 0;
    
    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const rawScroll = Math.min(Math.max(window.scrollY / total, 0), 1);
      
      // Trigger horn on first scroll (when user starts scrolling from 0)
      if (!hornTriggered && prevScroll === 0 && rawScroll > 0) {
        if (audioSysRef.current?.masterGain && audioSysRef.current.masterGain.gain.value > 0) {
          audioSysRef.current.triggerHorn();
          hornTriggered = true;
          console.log('🎺 Horn triggered on first scroll');
        }
      }
      
      prevScroll = rawScroll;
      scrollRef.current.current = rawScroll;
      console.log('📜 Scroll:', (rawScroll * 100).toFixed(1) + '%', 'scrollY:', window.scrollY, 'Total:', total);
    };
    
    // Test if scroll event works
    window.addEventListener('scroll', () => {
      console.log('� iSCROLL EVENT FIRED! scrollY:', window.scrollY);
    }, { passive: true });
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Log initial scroll height
    console.log('📏 Initial scroll height:', document.documentElement.scrollHeight);
    console.log('📏 Viewport height:', window.innerHeight);
    console.log('📏 Can scroll?', document.documentElement.scrollHeight > window.innerHeight);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
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
          console.log('🔊 Audio activated by click');
        }
      }
    };
    // Attach to document to catch clicks anywhere
    document.addEventListener('click', handleViewportClick);

    // Start animation
    console.log('🎬 Starting animation loop...');
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('click', handleViewportClick);
      controls.removeEventListener('start', () => {});
      controls.removeEventListener('end', () => {});
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
      controls.dispose();
    };
  }, []);

  return (
    <>
      <div ref={mountRef} style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw', 
        height: '100vh',
        zIndex: 0
      }} />
      
      {/* Audio Controls */}
      <AudioControls
        isMuted={isMuted}
        onToggleAudio={toggleAudio}
        onTriggerHorn={triggerHorn}
      />


      

      

    </>
  );
}


// Mount React app
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <DemoVanilla />
    </React.StrictMode>
  );
}
