import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Download, Box, FileJson } from 'lucide-react';

export default function ExportPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const truckRef = useRef<THREE.Group | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    
    const camera = new THREE.PerspectiveCamera(
      50, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(15, 10, 25);
    camera.lookAt(0, 2, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    // Materials
    const neonRed = 0xff0000;

    const wireMat = new THREE.MeshStandardMaterial({
      color: neonRed,
      emissive: neonRed,
      emissiveIntensity: 2,
      metalness: 0,
      roughness: 1
    });

    const wireLineMat = new THREE.LineBasicMaterial({
      color: neonRed,
      linewidth: 2
    });

    const bodyMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.0,
      visible: false
    });

    // Helper function to create wireframe
    const createWireMesh = (geo: THREE.BufferGeometry) => {
      const group = new THREE.Group();
      const edges = new THREE.EdgesGeometry(geo, 15);
      const wireframe = new THREE.LineSegments(edges, wireLineMat);
      group.add(wireframe);
      return group;
    };

    // Create wheel
    const createWheel = () => {
      const group = new THREE.Group();
      
      const tireGeo = new THREE.CylinderGeometry(1.55, 1.55, 1.1, 32);
      tireGeo.rotateZ(Math.PI/2);
      const tire = new THREE.Mesh(tireGeo, bodyMat);
      const tireEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(tireGeo, 24), 
        wireMat
      );
      
      const rimGeo = new THREE.CylinderGeometry(1.0, 1.0, 1.15, 24);
      rimGeo.rotateZ(Math.PI/2);
      const rimEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(rimGeo), 
        wireMat
      );

      const hubGeo = new THREE.CylinderGeometry(0.4, 0.4, 1.3, 16);
      hubGeo.rotateZ(Math.PI/2);
      const hub = new THREE.Mesh(hubGeo, bodyMat);
      const hubEdge = new THREE.LineSegments(
        new THREE.EdgesGeometry(hubGeo), 
        wireMat
      );

      group.add(tire, tireEdge, rimEdge, hub, hubEdge);
      return group;
    };

    // Build truck
    const truck = new THREE.Group();
    scene.add(truck);
    truckRef.current = truck;

    // Chassis
    const chassisGroup = new THREE.Group();
    truck.add(chassisGroup);
    const railL = createWireMesh(new THREE.BoxGeometry(0.4, 0.8, 28));
    railL.position.set(-1.5, 0.5, 1);
    const railR = createWireMesh(new THREE.BoxGeometry(0.4, 0.8, 28));
    railR.position.set(1.5, 0.5, 1);
    chassisGroup.add(railL, railR);

    // Wheels
    const wheelPositions = [
      [-2.5, 0, -9], [2.5, 0, -9],
      [-2.5, 0, -1.5], [2.5, 0, -1.5],
      [-2.5, 0, 8], [2.5, 0, 8],
      [-2.5, 0, 11], [2.5, 0, 11],
      [-2.5, 0, 14], [2.5, 0, 14]
    ];
    wheelPositions.forEach(pos => {
      const w = createWheel();
      w.position.set(pos[0], pos[1] - 1.4, pos[2]);
      truck.add(w);
    });

    // Cab
    const cabGroup = new THREE.Group();
    cabGroup.position.set(0, 0, -8);
    truck.add(cabGroup);
    
    const mainCab = createWireMesh(new THREE.BoxGeometry(5.2, 5.0, 4.5));
    mainCab.position.set(0, 3.5, -2.0);
    cabGroup.add(mainCab);
    
    const facadeGroup = new THREE.Group();
    facadeGroup.position.set(0, 0, -4.25);
    cabGroup.add(facadeGroup);
    
    for(let i=0; i<6; i++) {
      const y = 1.0 + i * 0.6;
      const bar = createWireMesh(new THREE.BoxGeometry(4.8 - (i * 0.1), 0.3, 0.2));
      bar.position.set(0, y, 0);
      facadeGroup.add(bar);
    }
    
    const cheekL = createWireMesh(new THREE.BoxGeometry(0.4, 2.5, 0.2));
    cheekL.position.set(-2.4, 2.5, 0);
    facadeGroup.add(cheekL);
    
    const cheekR = createWireMesh(new THREE.BoxGeometry(0.4, 2.5, 0.2));
    cheekR.position.set(2.4, 2.5, 0);
    facadeGroup.add(cheekR);
    
    const bumper = createWireMesh(new THREE.BoxGeometry(5.4, 1.2, 1.2));
    bumper.position.set(0, -0.4, -4.1);
    cabGroup.add(bumper);
    
    const windshield = createWireMesh(new THREE.BoxGeometry(5.0, 1.8, 0.1));
    windshield.position.set(0, 4.6, -4.26);
    windshield.rotation.x = -0.15;
    cabGroup.add(windshield);
    
    const visor = createWireMesh(new THREE.BoxGeometry(5.2, 0.4, 0.6));
    visor.position.set(0, 5.6, -4.5);
    visor.rotation.x = 0.2;
    cabGroup.add(visor);
    
    const roof = createWireMesh(new THREE.BoxGeometry(5.0, 1.2, 4.0));
    roof.position.set(0, 6.6, -2.0);
    cabGroup.add(roof);
    
    const aero = createWireMesh(new THREE.BoxGeometry(4.8, 1.0, 3.0));
    aero.position.set(0, 7.7, -2.5);
    aero.rotation.x = -0.2;
    cabGroup.add(aero);

    // Trailer
    const trailer = new THREE.Group();
    trailer.position.set(0, 0, 7);
    truck.add(trailer);
    
    const trailerBody = createWireMesh(new THREE.BoxGeometry(5.2, 7.8, 26));
    trailerBody.position.set(0, 4.8, 0);
    trailer.add(trailerBody);
    
    const skirtL = createWireMesh(new THREE.BoxGeometry(0.2, 1, 16));
    skirtL.position.set(-2.6, 0.5, -2);
    trailer.add(skirtL);
    
    const skirtR = createWireMesh(new THREE.BoxGeometry(0.2, 1, 16));
    skirtR.position.set(2.6, 0.5, -2);
    trailer.add(skirtR);

    // Animation
    let animationFrameId: number;
    const animate = () => {
      truck.rotation.y += 0.005;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if(mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  const exportAsGLTF = () => {
    if (!truckRef.current) return;
    
    setExporting(true);
    setExportStatus('Exporting as GLTF...');
    
    const exporter = new GLTFExporter();
    exporter.parse(
      truckRef.current,
      (gltf) => {
        const blob = new Blob([JSON.stringify(gltf)], { 
          type: 'application/json' 
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'truck-wireframe.gltf';
        link.click();
        
        setExportStatus('✓ GLTF exported successfully!');
        setExporting(false);
        setTimeout(() => setExportStatus(''), 3000);
      },
      (error) => {
        console.error('Export error:', error);
        setExportStatus('✗ Export failed');
        setExporting(false);
      },
      { binary: false }
    );
  };

  const exportAsGLB = () => {
    if (!truckRef.current) return;
    
    setExporting(true);
    setExportStatus('Exporting as GLB...');
    
    const exporter = new GLTFExporter();
    exporter.parse(
      truckRef.current,
      (gltf) => {
        const blob = new Blob([gltf as ArrayBuffer], { 
          type: 'application/octet-stream' 
        });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'truck-wireframe.glb';
        link.click();
        
        setExportStatus('✓ GLB exported successfully!');
        setExporting(false);
        setTimeout(() => setExportStatus(''), 3000);
      },
      (error) => {
        console.error('Export error:', error);
        setExportStatus('✗ Export failed');
        setExporting(false);
      },
      { binary: true }
    );
  };

  return (
    <div className="bg-black min-h-screen text-white font-mono">
      <div ref={mountRef} className="fixed top-0 left-0 w-full h-screen z-0" />
      
      {/* Export Controls */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-10">
        <div className="bg-black/90 backdrop-blur-md border-2 border-red-600 p-8 min-w-[400px]">
          <div className="flex items-center gap-3 mb-6">
            <Box className="text-red-500" size={32} />
            <div>
              <h1 className="text-2xl font-black text-white">TRUCK MODEL</h1>
              <p className="text-xs text-red-500 tracking-widest">EXPORT UTILITY</p>
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={exportAsGLB}
              disabled={exporting}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 
                       text-white font-bold py-4 px-6 flex items-center justify-center gap-3
                       transition-colors"
            >
              <Download size={20} />
              EXPORT AS GLB (Binary)
            </button>
            
            <button
              onClick={exportAsGLTF}
              disabled={exporting}
              className="w-full bg-red-900/50 hover:bg-red-900 disabled:bg-gray-600 
                       border border-red-600 text-white font-bold py-4 px-6 
                       flex items-center justify-center gap-3 transition-colors"
            >
              <FileJson size={20} />
              EXPORT AS GLTF (JSON)
            </button>
          </div>
          
          {exportStatus && (
            <div className={`mt-4 p-3 text-center text-sm ${
              exportStatus.includes('✓') ? 'bg-green-900/30 text-green-400' :
              exportStatus.includes('✗') ? 'bg-red-900/30 text-red-400' :
              'bg-gray-900/30 text-gray-400'
            }`}>
              {exportStatus}
            </div>
          )}
          
          <div className="mt-6 pt-6 border-t border-gray-800 text-xs text-gray-500">
            <p className="mb-2">• GLB: Compact binary format (recommended)</p>
            <p>• GLTF: Human-readable JSON format</p>
          </div>
        </div>
      </div>
      
      {/* Instructions */}
      <div className="fixed bottom-8 left-8 bg-black/80 backdrop-blur-sm border-l-2 border-red-600 p-4 max-w-md">
        <h3 className="text-red-500 text-xs tracking-widest mb-2">INSTRUCTIONS</h3>
        <p className="text-xs text-gray-400 leading-relaxed">
          This page displays the truck wireframe model. Click the export buttons above 
          to download the 3D model in GLB or GLTF format. The model can be imported 
          into Blender, Unity, Unreal Engine, or any 3D software that supports GLTF.
        </p>
      </div>
    </div>
  );
}
