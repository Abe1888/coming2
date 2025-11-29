import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Activity, Wifi, Shield, Volume2, VolumeX } from 'lucide-react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Simple audio system (keeping from original)
class AudioSystem {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  initialized = false;

  init() {
    if (this.initialized) return;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AC();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);
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
}

// Clean white road texture
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

  // Light gray lane lines
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 20;
  ctx.setLineDash([]);
  
  // Center line
  ctx.beginPath();
  ctx.moveTo(size * 0.5, 0);
  ctx.lineTo(size * 0.5, size);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
};

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioSysRef = useRef<AudioSystem | null>(null);
  const glbModelRef = useRef<THREE.Group | null>(null);
  
  const [isMuted, setIsMuted] = useState(true);
  const [activePhase, setActivePhase] = useState(0);
  const [showIntroScreen, setShowIntroScreen] = useState(true);
  const [introFadingOut, setIntroFadingOut] = useState(false);

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
    
    // Camera
    const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.set(0, 8, 25);
    
    // Renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mountRef.current.appendChild(renderer.domElement);

    // === MATERIALS (White & Light Gray Only) ===
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const lightGrayMat = new THREE.MeshBasicMaterial({ color: 0xe8e8e8 });
    const mediumGrayMat = new THREE.MeshBasicMaterial({ color: 0xcccccc });
    const edgeMat = new THREE.LineBasicMaterial({ color: 0xd0d0d0, transparent: true, opacity: 0.5 });

    // === ROAD ===
    const roadTex = createRoadTexture();
    roadTex.repeat.set(1, 12);
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(100, 1200),
      new THREE.MeshBasicMaterial({ map: roadTex, color: 0xffffff })
    );
    road.rotation.x = -Math.PI / 2;
    road.position.y = -1.1;
    scene.add(road);

    // === TRUCK GROUP ===
    const truck = new THREE.Group();
    scene.add(truck);

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
        
        // Apply white/light gray materials
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Dispose old materials
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => mat.dispose());
              } else {
                child.material.dispose();
              }
            }
            
            // Apply light gray material
            child.material = lightGrayMat;
            
            // Add subtle edges
            const edges = new THREE.EdgesGeometry(child.geometry, 20);
            const line = new THREE.LineSegments(edges, edgeMat);
            child.add(line);
          }
        });
        
        glbModelRef.current = model;
        truck.add(model);
        console.log('✓ GLB Truck loaded');
      },
      undefined,
      (error) => console.error('Error loading GLB:', error)
    );

    // === SIMPLE PARTICLES ===
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      pPos[i] = (Math.random() - 0.5) * 50;
      pPos[i + 1] = Math.random() * 15;
      pPos[i + 2] = (Math.random() - 0.5) * 200;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const particles = new THREE.Points(
      particleGeo,
      new THREE.PointsMaterial({ color: 0xd0d0d0, size: 0.05, transparent: true, opacity: 0.3 })
    );
    scene.add(particles);

    // === ANIMATION LOOP ===
    const clock = new THREE.Clock();
    let animationFrameId: number;
    const scrollRef = { current: 0 };

    const animate = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Animate road
      roadTex.offset.y += delta * 1.6;

      // Animate particles
      const pPos = particles.geometry.attributes.position.array as Float32Array;
      for (let i = 2; i < pPos.length; i += 3) {
        pPos[i] += delta * 160;
        if (pPos[i] > 50) pPos[i] = -200;
      }
      particles.geometry.attributes.position.needsUpdate = true;

      // Truck subtle movement
      truck.position.y = Math.sin(time * 15) * 0.015;

      // Camera movement based on scroll
      const t = scrollRef.current;
      const cameraZ = 25 - (t * 30);
      const cameraY = 8 + (t * 5);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, cameraZ, 0.05);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, cameraY, 0.05);
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleScroll = () => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      scrollRef.current = Math.min(Math.max(window.scrollY / total, 0), 1);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className="bg-white min-h-[500vh] text-gray-900 font-mono overflow-x-hidden">
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

      {/* Top Bar */}
      <div className="fixed top-0 left-0 w-full z-20 p-6 flex justify-between items-start pointer-events-none">
        <div className="bg-white/90 backdrop-blur px-6 py-3 border-l-4 border-gray-900">
          <h1 className="text-2xl font-black text-gray-900">SENSOR PRO</h1>
          <p className="text-xs text-gray-600 tracking-widest">FUEL MONITORING</p>
        </div>
        
        <button 
          onClick={toggleAudio}
          className="pointer-events-auto bg-white/90 backdrop-blur px-4 py-2 border border-gray-300 hover:border-gray-900 transition-colors flex items-center gap-2"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          <span className="text-xs">{isMuted ? 'OFF' : 'ON'}</span>
        </button>
      </div>

      {/* Content Sections */}
      <div className="relative z-10 pointer-events-none">
        <section className="h-screen flex items-center justify-start pl-20">
          <div className="max-w-2xl">
            <h2 className="text-7xl font-black text-gray-900 mb-4">REAL-TIME</h2>
            <p className="text-xl text-gray-600">High-precision fuel level monitoring</p>
          </div>
        </section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
        <section className="h-screen"></section>
      </div>

      {/* Scroll Indicator */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 text-gray-400 flex flex-col items-center">
        <span className="text-xs tracking-widest mb-1">SCROLL</span>
        <ChevronDown className="animate-bounce" />
      </div>
    </div>
  );
}
