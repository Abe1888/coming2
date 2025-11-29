import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createCargoContainer } from './components/CargoContainer.tsx';

export default function CameraPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  
  const [cameraSettings, setCameraSettings] = useState({
    posX: 0,
    posY: 8,
    posZ: 25,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    fov: 55,
  });

  // Update camera when settings change AND save to localStorage
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.set(cameraSettings.posX, cameraSettings.posY, cameraSettings.posZ);
      cameraRef.current.rotation.set(cameraSettings.rotX, cameraSettings.rotY, cameraSettings.rotZ);
      cameraRef.current.fov = cameraSettings.fov;
      cameraRef.current.updateProjectionMatrix();
      
      // Save to localStorage for main page to read
      localStorage.setItem('cameraSettings', JSON.stringify(cameraSettings));
      
      // Dispatch storage event for same-page updates
      window.dispatchEvent(new Event('cameraSettingsChanged'));
    }
  }, [cameraSettings]);
  
  // Load initial settings from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cameraSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setCameraSettings(parsed);
      } catch (e) {
        console.error('Failed to parse saved camera settings');
      }
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0202);
    const fog = new THREE.FogExp2(0x0a0202, 0.018);
    scene.fog = fog;
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      cameraSettings.fov,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    camera.position.set(cameraSettings.posX, cameraSettings.posY, cameraSettings.posZ);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = 1.0;
    mountRef.current.appendChild(renderer.domElement);

    // Bloom post-processing
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.6,
      0.3,
      0.92
    );
    composer.addPass(bloomPass);
    composerRef.current = composer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xff6666, 0.6);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffaaaa, 0x440000, 0.5);
    scene.add(hemiLight);

    const dirLight1 = new THREE.DirectionalLight(0xff8888, 0.8);
    dirLight1.position.set(10, 15, 10);
    scene.add(dirLight1);

    // Materials
    const wireMat = new THREE.LineBasicMaterial({
      color: 0xff3300,
      linewidth: 1,
      transparent: true,
      opacity: 0.95,
    });

    const trailerGridMat = new THREE.MeshBasicMaterial({
      color: 0x330000,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });

    // Create truck group
    const truck = new THREE.Group();
    scene.add(truck);

    // Helper function to create wireframe mesh
    const createWireMesh = (geo: THREE.BufferGeometry, mat = wireMat) => {
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, 15), mat);
      return edges;
    };

    // Create wheels
    const wheels: THREE.Mesh[] = [];
    const createWheel = () => {
      const wg = new THREE.CylinderGeometry(1.55, 1.55, 1.2, 16);
      const w = new THREE.Mesh(wg, new THREE.MeshBasicMaterial({ color: 0x000000 }));
      w.rotation.z = Math.PI / 2;
      const we = createWireMesh(wg);
      we.rotation.z = Math.PI / 2;
      w.add(we);
      return w;
    };

    [-8, -5, -2, 1, 4, 7].forEach((zPos) => {
      const wL = createWheel();
      wL.position.set(-2.5, -0.8, zPos);
      wheels.push(wL);
      truck.add(wL);

      const wR = createWheel();
      wR.position.set(2.5, -0.8, zPos);
      wheels.push(wR);
      truck.add(wR);
    });

    // Create cab
    const cabGroup = new THREE.Group();
    cabGroup.position.set(0, 0, -8);
    truck.add(cabGroup);

    const mainCab = createWireMesh(new THREE.BoxGeometry(5.0, 5.0, 4.5));
    mainCab.position.set(0, 3.5, -2.0);
    cabGroup.add(mainCab);

    // Create trailer
    const trailer = new THREE.Group();
    trailer.position.set(0, 0, 7);
    truck.add(trailer);

    const cargoContainer = createCargoContainer(wireMat, trailerGridMat);
    trailer.add(cargoContainer);

    // Create road
    const roadGeo = new THREE.PlaneGeometry(20, 800);
    const roadMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const road = new THREE.Mesh(roadGeo, roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.y = -1.6;
    scene.add(road);

    // Grid helper
    const gridHelper = new THREE.GridHelper(100, 50, 0xff0000, 0x330000);
    gridHelper.position.y = -1.5;
    scene.add(gridHelper);

    // Animation loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // Rotate wheels
      wheels.forEach((w) => {
        w.rotation.x += delta * 2;
      });

      // Truck bounce
      truck.position.y = Math.sin(time * 15) * 0.015;

      composer.render();
    };

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-screen bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {/* Camera Controller Panel */}
      <div className="fixed top-6 right-6 w-96 bg-black/95 border-2 border-red-600 rounded-lg p-6 shadow-2xl">
        <h3 className="text-red-500 font-bold text-2xl mb-6 flex items-center gap-3">
          <span>🎥</span> Camera Controller
        </h3>

        <div className="space-y-4 text-white">
          {/* Position Controls */}
          <div className="border-b border-red-900 pb-4">
            <p className="text-red-400 font-bold text-lg mb-3">Position</p>

            <label className="block mb-3">
              <span className="text-sm">X: {cameraSettings.posX.toFixed(1)}</span>
              <input
                type="range"
                min="-50"
                max="50"
                step="0.5"
                value={cameraSettings.posX}
                onChange={(e) =>
                  setCameraSettings({ ...cameraSettings, posX: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm">Y: {cameraSettings.posY.toFixed(1)}</span>
              <input
                type="range"
                min="-20"
                max="50"
                step="0.5"
                value={cameraSettings.posY}
                onChange={(e) =>
                  setCameraSettings({ ...cameraSettings, posY: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </label>

            <label className="block">
              <span className="text-sm">Z: {cameraSettings.posZ.toFixed(1)}</span>
              <input
                type="range"
                min="-50"
                max="100"
                step="0.5"
                value={cameraSettings.posZ}
                onChange={(e) =>
                  setCameraSettings({ ...cameraSettings, posZ: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </label>
          </div>

          {/* Rotation Controls */}
          <div className="border-b border-red-900 pb-4">
            <p className="text-red-400 font-bold text-lg mb-3">Rotation</p>

            <label className="block mb-3">
              <span className="text-sm">X: {((cameraSettings.rotX * 180) / Math.PI).toFixed(1)}°</span>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.01"
                value={cameraSettings.rotX}
                onChange={(e) =>
                  setCameraSettings({ ...cameraSettings, rotX: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </label>

            <label className="block mb-3">
              <span className="text-sm">Y: {((cameraSettings.rotY * 180) / Math.PI).toFixed(1)}°</span>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.01"
                value={cameraSettings.rotY}
                onChange={(e) =>
                  setCameraSettings({ ...cameraSettings, rotY: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </label>

            <label className="block">
              <span className="text-sm">Z: {((cameraSettings.rotZ * 180) / Math.PI).toFixed(1)}°</span>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.01"
                value={cameraSettings.rotZ}
                onChange={(e) =>
                  setCameraSettings({ ...cameraSettings, rotZ: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </label>
          </div>

          {/* FOV Control */}
          <div className="border-b border-red-900 pb-4">
            <label className="block">
              <span className="text-red-400 font-bold text-lg">
                FOV: {cameraSettings.fov.toFixed(0)}°
              </span>
              <input
                type="range"
                min="20"
                max="120"
                step="1"
                value={cameraSettings.fov}
                onChange={(e) =>
                  setCameraSettings({ ...cameraSettings, fov: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
              />
            </label>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() =>
              setCameraSettings({
                posX: 0,
                posY: 8,
                posZ: 25,
                rotX: 0,
                rotY: 0,
                rotZ: 0,
                fov: 55,
              })
            }
            className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all text-lg"
          >
            Reset to Default
          </button>

          <button
            onClick={() => {
              const settings = JSON.stringify(cameraSettings, null, 2);
              navigator.clipboard.writeText(settings);
              alert('Camera settings copied to clipboard!');
            }}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
          >
            Copy Settings
          </button>
        </div>
      </div>

      {/* Info Badge */}
      <div className="fixed bottom-6 left-6 bg-black/90 border border-red-600 rounded px-4 py-2">
        <p className="text-red-500 font-bold text-sm">TRANSLINK CAMERA CONTROLLER</p>
      </div>
    </div>
  );
}
