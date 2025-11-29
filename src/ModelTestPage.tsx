import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Box, RotateCcw, ZoomIn, ZoomOut, Grid3x3, Eye, EyeOff } from 'lucide-react';

export default function ModelTestPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modelInfo, setModelInfo] = useState<any>(null);
  const [showWireframe, setShowWireframe] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isDriving, setIsDriving] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [texturesEnabled, setTexturesEnabled] = useState(true);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [modelSource, setModelSource] = useState<'default' | 'uploaded'>('default');
  const [selectedModel, setSelectedModel] = useState<string>('truck');
  const [showWireframeOverlay, setShowWireframeOverlay] = useState(false);
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0, z: 0 });
  const [overlayScale, setOverlayScale] = useState(1);
  const [wireframeThreshold, setWireframeThreshold] = useState(15);
  const [modelParts, setModelParts] = useState<ModelPart[]>([]);
  const [showPartsList, setShowPartsList] = useState(false);

  interface ModelPart {
    id: number;
    name: string;
    mesh: THREE.Mesh;
    visible: boolean;
  }
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const wheelsRef = useRef<THREE.Object3D[]>([]);
  const originalMaterialsRef = useRef<Map<THREE.Mesh, THREE.Material | THREE.Material[]>>(new Map());
  const wireframeOverlayRef = useRef<THREE.Group | null>(null);
  const wireframeEdgesRef = useRef<Map<THREE.Mesh, THREE.LineSegments>>(new Map());

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    sceneRef.current = scene;
    
    const camera = new THREE.PerspectiveCamera(
      60, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.set(20, 15, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 100;

    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xff4444, 0.3);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0x4444ff, 0.2);
    backLight.position.set(0, 5, -20);
    scene.add(backLight);

    // Grid
    const gridHelper = new THREE.GridHelper(100, 50, 0xff0000, 0x330000);
    gridHelper.position.y = -3;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(10);
    scene.add(axesHelper);

    // Create wireframe overlay (cargo body/trailer from main app)
    const createWireframeOverlay = () => {
      const overlayGroup = new THREE.Group();
      overlayGroup.visible = false; // Hidden by default
      
      const neonRed = 0xff0000;
      const wireLineMat = new THREE.LineBasicMaterial({
        color: neonRed,
        linewidth: 2,
        transparent: true,
        opacity: 0.8
      });

      const createWireMesh = (geo: THREE.BufferGeometry) => {
        const edges = new THREE.EdgesGeometry(geo, 15);
        const wireframe = new THREE.LineSegments(edges, wireLineMat);
        return wireframe;
      };

      // Trailer/Cargo body (from App.tsx)
      const trailer = new THREE.Group();
      trailer.position.set(0, 0, 7); // Same position as in App.tsx
      
      const trailerBody = createWireMesh(new THREE.BoxGeometry(5.2, 7.8, 26));
      trailerBody.position.set(0, 4.8, 0);
      trailer.add(trailerBody);
      
      const skirtL = createWireMesh(new THREE.BoxGeometry(0.2, 1, 16));
      skirtL.position.set(-2.6, 0.5, -2);
      trailer.add(skirtL);
      
      const skirtR = createWireMesh(new THREE.BoxGeometry(0.2, 1, 16));
      skirtR.position.set(2.6, 0.5, -2);
      trailer.add(skirtR);

      // Add marker lights (optional - for reference)
      const markerMat = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,
        transparent: true,
        opacity: 0.6
      });
      
      for(let i=0; i<8; i++) {
        const z = -12 + i * 3.4;
        const markerSize = 0.1;
        
        const ml1 = new THREE.Mesh(new THREE.BoxGeometry(markerSize, markerSize, 0.05), markerMat);
        ml1.position.set(-2.65, 8.5, z);
        trailer.add(ml1);
        
        const ml2 = new THREE.Mesh(new THREE.BoxGeometry(markerSize, markerSize, 0.05), markerMat);
        ml2.position.set(2.65, 8.5, z);
        trailer.add(ml2);
        
        const ml3 = new THREE.Mesh(new THREE.BoxGeometry(markerSize, markerSize, 0.05), markerMat);
        ml3.position.set(-2.65, 1.5, z);
        trailer.add(ml3);
        
        const ml4 = new THREE.Mesh(new THREE.BoxGeometry(markerSize, markerSize, 0.05), markerMat);
        ml4.position.set(2.65, 1.5, z);
        trailer.add(ml4);
      }

      overlayGroup.add(trailer);
      return overlayGroup;
    };

    const wireframeOverlay = createWireframeOverlay();
    scene.add(wireframeOverlay);
    wireframeOverlayRef.current = wireframeOverlay;

    // Load Model (GLB, FBX, or OBJ)
    const loadModel = () => {
      let modelUrl = `/model/${selectedModel}.glb`;
      let fileType = 'glb';
      
      if (uploadedFile) {
        modelUrl = URL.createObjectURL(uploadedFile);
        const fileName = uploadedFile.name.toLowerCase();
        if (fileName.endsWith('.fbx')) {
          fileType = 'fbx';
        } else if (fileName.endsWith('.obj')) {
          fileType = 'obj';
        } else if (fileName.endsWith('.gltf')) {
          fileType = 'gltf';
        }
      }
      
      const onModelLoaded = (model: THREE.Group | THREE.Object3D) => {
        modelRef.current = model as THREE.Group;
        
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        model.position.x = -center.x;
        model.position.y = -box.min.y; // Place on ground
        model.position.z = -center.z;
        
        // Enable shadows, detect wheels, and store original materials
        const wheels: THREE.Object3D[] = [];
        const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
        
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            
            // Store original material for texture toggle
            if (child.material) {
              originalMaterials.set(child, child.material);
            }
          }
          
          // Detect wheels by name (common naming patterns)
          const name = child.name.toLowerCase();
          if (name.includes('wheel') || 
              name.includes('tire') || 
              name.includes('rim') ||
              name.includes('roue')) { // French for wheel
            wheels.push(child);
            console.log('Found wheel:', child.name);
          }
        });
        
        wheelsRef.current = wheels;
        originalMaterialsRef.current = originalMaterials;
        console.log(`Total wheels detected: ${wheels.length}`);
        
        scene.add(model);
        
        // Adjust camera to fit model
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // Add some padding
        
        camera.position.set(cameraZ, cameraZ * 0.6, cameraZ);
        camera.lookAt(0, size.y / 2, 0);
        controls.target.set(0, size.y / 2, 0);
        controls.update();
        
        // Store model info
        setModelInfo({
          vertices: 0,
          triangles: 0,
          meshes: 0,
          materials: 0,
          size: {
            x: size.x.toFixed(2),
            y: size.y.toFixed(2),
            z: size.z.toFixed(2)
          }
        });
        
        // Count geometry info
        let vertexCount = 0;
        let triangleCount = 0;
        let meshCount = 0;
        const materials = new Set();
        
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshCount++;
            if (child.geometry) {
              const positions = child.geometry.attributes.position;
              if (positions) {
                vertexCount += positions.count;
                if (child.geometry.index) {
                  triangleCount += child.geometry.index.count / 3;
                } else {
                  triangleCount += positions.count / 3;
                }
              }
            }
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(mat => materials.add(mat.uuid));
              } else {
                materials.add(child.material.uuid);
              }
            }
          }
        });
        
        setModelInfo({
          vertices: vertexCount,
          triangles: Math.floor(triangleCount),
          meshes: meshCount,
          materials: materials.size,
          size: {
            x: size.x.toFixed(2),
            y: size.y.toFixed(2),
            z: size.z.toFixed(2)
          }
        });
        
        // Extract model parts list
        const parts: ModelPart[] = [];
        let partIndex = 0;
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            parts.push({
              id: partIndex++,
              name: child.name || `Part ${partIndex}`,
              mesh: child,
              visible: true
            });
          }
        });
        setModelParts(parts);
        
        setLoading(false);
      };
      
      const onProgress = (progress: ProgressEvent) => {
        if (progress.lengthComputable) {
          const percent = (progress.loaded / progress.total) * 100;
          console.log(`Loading: ${percent.toFixed(0)}%`);
        }
      };
      
      const onError = (error: any) => {
        console.error('Error loading model:', error);
        setError(`Failed to load ${fileType.toUpperCase()} model. Check console for details.`);
        setLoading(false);
      };
      
      // Load based on file type
      if (fileType === 'fbx') {
        const fbxLoader = new FBXLoader();
        fbxLoader.load(modelUrl, onModelLoaded, onProgress, onError);
      } else if (fileType === 'obj') {
        const objLoader = new OBJLoader();
        objLoader.load(modelUrl, onModelLoaded, onProgress, onError);
      } else {
        // GLB/GLTF
        const gltfLoader = new GLTFLoader();
        gltfLoader.load(
          modelUrl,
          (gltf) => onModelLoaded(gltf.scene),
          onProgress,
          onError
        );
      }
    };
    
    loadModel();

    // Animation loop
    let animationFrameId: number;
    const clock = new THREE.Clock();
    
    const animate = () => {
      const delta = clock.getDelta();
      
      // Rotate wheels if driving
      if (isDriving && wheelsRef.current.length > 0) {
        const rotationSpeed = speed * delta * 2;
        wheelsRef.current.forEach((wheel) => {
          // Rotate around X axis (forward motion)
          wheel.rotation.x += rotationSpeed;
        });
      }
      
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!cameraRef.current) return;
      cameraRef.current.aspect = window.innerWidth / window.innerHeight;
      cameraRef.current.updateProjectionMatrix();
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
      controls.dispose();
    };
  }, [isDriving, speed, uploadedFile, selectedModel]);



  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current || !modelRef.current) return;
    
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
    cameraZ *= 1.5;
    
    cameraRef.current.position.set(cameraZ, cameraZ * 0.6, cameraZ);
    cameraRef.current.lookAt(0, size.y / 2, 0);
    controlsRef.current.target.set(0, size.y / 2, 0);
    controlsRef.current.update();
  };

  const toggleWireframe = () => {
    if (!modelRef.current) return;
    
    const newState = !showWireframe;
    
    if (newState) {
      // Create clean edge-based wireframe
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff0000,
        linewidth: 2
      });
      
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          // Hide the original mesh
          child.visible = false;
          
          // Create edges geometry with threshold
          const edges = new THREE.EdgesGeometry(child.geometry, wireframeThreshold);
          const lineSegments = new THREE.LineSegments(edges, edgeMaterial);
          
          // Copy transform from original mesh
          lineSegments.position.copy(child.position);
          lineSegments.rotation.copy(child.rotation);
          lineSegments.scale.copy(child.scale);
          
          // Add to parent
          if (child.parent) {
            child.parent.add(lineSegments);
          }
          
          // Store reference
          wireframeEdgesRef.current.set(child, lineSegments);
        }
      });
    } else {
      // Remove wireframe and show original meshes
      wireframeEdgesRef.current.forEach((lineSegments, mesh) => {
        if (lineSegments.parent) {
          lineSegments.parent.remove(lineSegments);
        }
        lineSegments.geometry.dispose();
        mesh.visible = true;
      });
      wireframeEdgesRef.current.clear();
    }
    
    setShowWireframe(newState);
  };

  const updateWireframeThreshold = (newThreshold: number) => {
    setWireframeThreshold(newThreshold);
    
    // If wireframe is currently active, update it in real-time
    if (showWireframe && modelRef.current) {
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0xff0000,
        linewidth: 2
      });
      
      // Remove old wireframe edges
      wireframeEdgesRef.current.forEach((lineSegments) => {
        if (lineSegments.parent) {
          lineSegments.parent.remove(lineSegments);
        }
        lineSegments.geometry.dispose();
      });
      wireframeEdgesRef.current.clear();
      
      // Create new wireframe with updated threshold
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry && !child.visible) {
          // Create edges geometry with new threshold
          const edges = new THREE.EdgesGeometry(child.geometry, newThreshold);
          const lineSegments = new THREE.LineSegments(edges, edgeMaterial);
          
          // Copy transform from original mesh
          lineSegments.position.copy(child.position);
          lineSegments.rotation.copy(child.rotation);
          lineSegments.scale.copy(child.scale);
          
          // Add to parent
          if (child.parent) {
            child.parent.add(lineSegments);
          }
          
          // Store reference
          wireframeEdgesRef.current.set(child, lineSegments);
        }
      });
    }
  };

  const toggleGrid = () => {
    if (!gridRef.current) return;
    gridRef.current.visible = !showGrid;
    setShowGrid(!showGrid);
  };

  const toggleDriving = () => {
    setIsDriving(!isDriving);
  };

  const increaseSpeed = () => {
    setSpeed(prev => Math.min(prev + 0.5, 10));
  };

  const decreaseSpeed = () => {
    setSpeed(prev => Math.max(prev - 0.5, 0.5));
  };

  const toggleTextures = () => {
    if (!modelRef.current) return;
    
    const newState = !texturesEnabled;
    
    modelRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        if (newState) {
          // Enable textures - restore original materials
          const originalMaterial = originalMaterialsRef.current.get(child);
          if (originalMaterial) {
            child.material = originalMaterial;
          }
        } else {
          // Disable textures - use simple colored materials
          const originalMaterial = child.material;
          
          if (Array.isArray(originalMaterial)) {
            // Handle multi-material meshes
            child.material = originalMaterial.map(mat => {
              const simpleMat = new THREE.MeshStandardMaterial({
                color: mat.color || new THREE.Color(0x808080),
                roughness: 0.8,
                metalness: 0.2
              });
              return simpleMat;
            });
          } else {
            // Single material
            const simpleMat = new THREE.MeshStandardMaterial({
              color: originalMaterial.color || new THREE.Color(0x808080),
              roughness: 0.8,
              metalness: 0.2
            });
            child.material = simpleMat;
          }
        }
      }
    });
    
    setTexturesEnabled(newState);
  };

  const toggleWireframeOverlay = () => {
    if (!wireframeOverlayRef.current) return;
    const newState = !showWireframeOverlay;
    wireframeOverlayRef.current.visible = newState;
    setShowWireframeOverlay(newState);
  };

  const adjustOverlay = (axis: 'x' | 'y' | 'z', direction: number) => {
    if (!wireframeOverlayRef.current) return;
    
    const step = 0.5;
    const newPosition = { ...overlayPosition };
    newPosition[axis] += direction * step;
    
    wireframeOverlayRef.current.position[axis] = newPosition[axis];
    setOverlayPosition(newPosition);
  };

  const adjustOverlayScale = (delta: number) => {
    if (!wireframeOverlayRef.current) return;
    
    const newScale = Math.max(0.1, Math.min(5, overlayScale + delta));
    wireframeOverlayRef.current.scale.set(newScale, newScale, newScale);
    setOverlayScale(newScale);
  };

  const resetOverlay = () => {
    if (!wireframeOverlayRef.current) return;
    
    wireframeOverlayRef.current.position.set(0, 0, 0);
    wireframeOverlayRef.current.scale.set(1, 1, 1);
    setOverlayPosition({ x: 0, y: 0, z: 0 });
    setOverlayScale(1);
  };

  const togglePartVisibility = (partId: number) => {
    setModelParts(prevParts => 
      prevParts.map(part => {
        if (part.id === partId) {
          part.mesh.visible = !part.visible;
          return { ...part, visible: !part.visible };
        }
        return part;
      })
    );
  };

  const toggleAllParts = (visible: boolean) => {
    setModelParts(prevParts => 
      prevParts.map(part => {
        part.mesh.visible = visible;
        return { ...part, visible };
      })
    );
  };

  const autoAlignOverlay = () => {
    if (!wireframeOverlayRef.current || !modelRef.current) return;
    
    // Get model bounding box
    const box = new THREE.Box3().setFromObject(modelRef.current);
    const modelSize = box.getSize(new THREE.Vector3());
    const modelCenter = box.getCenter(new THREE.Vector3());
    
    // Wireframe trailer dimensions (from App.tsx)
    const trailerWidth = 5.2;
    const trailerHeight = 7.8;
    const trailerLength = 26;
    
    // Calculate scale to match model
    const scaleX = modelSize.x / trailerWidth;
    const scaleY = modelSize.y / trailerHeight;
    const scaleZ = modelSize.z / trailerLength;
    
    // Use average scale or the one that fits best
    const avgScale = (scaleX + scaleY + scaleZ) / 3;
    
    // Position overlay to match model center
    wireframeOverlayRef.current.position.set(
      modelCenter.x,
      box.min.y, // Align to ground
      modelCenter.z
    );
    
    wireframeOverlayRef.current.scale.set(avgScale, avgScale, avgScale);
    
    setOverlayPosition({ 
      x: modelCenter.x, 
      y: box.min.y, 
      z: modelCenter.z 
    });
    setOverlayScale(avgScale);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.glb') || fileName.endsWith('.gltf') || 
          fileName.endsWith('.fbx') || fileName.endsWith('.obj')) {
        setUploadedFile(file);
        setModelSource('uploaded');
        setLoading(true);
        setError('');
      } else {
        setError('Please upload a .glb, .gltf, .fbx, or .obj file');
      }
    }
  };

  const resetToDefaultModel = () => {
    setUploadedFile(null);
    setModelSource('default');
    setLoading(true);
    setError('');
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    const file = event.dataTransfer.files[0];
    if (file) {
      const fileName = file.name.toLowerCase();
      if (fileName.endsWith('.glb') || fileName.endsWith('.gltf') || 
          fileName.endsWith('.fbx') || fileName.endsWith('.obj')) {
        setUploadedFile(file);
        setModelSource('uploaded');
        setLoading(true);
        setError('');
      } else {
        setError('Please drop a .glb, .gltf, .fbx, or .obj file');
      }
    }
  };

  const zoomIn = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const direction = new THREE.Vector3();
    cameraRef.current.getWorldDirection(direction);
    cameraRef.current.position.addScaledVector(direction, 5);
    controlsRef.current.update();
  };

  const zoomOut = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    const direction = new THREE.Vector3();
    cameraRef.current.getWorldDirection(direction);
    cameraRef.current.position.addScaledVector(direction, -5);
    controlsRef.current.update();
  };

  return (
    <div 
      className="bg-black min-h-screen text-white font-mono"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div ref={mountRef} className="fixed top-0 left-0 w-full h-screen z-0" />
      
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-red-500 text-xl tracking-widest">LOADING MODEL...</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-red-900/90 border-2 border-red-600 p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4">ERROR</h2>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Header */}
      <div className="fixed top-0 left-0 w-full z-10 bg-gradient-to-b from-black/90 to-transparent p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Box className="text-red-500" size={32} />
            <div>
              <h1 className="text-2xl font-black text-white">GLB MODEL VIEWER</h1>
              <p className="text-xs text-red-500 tracking-widest">
                {modelSource === 'uploaded' && uploadedFile 
                  ? uploadedFile.name.toUpperCase()
                  : 'TRUCK.GLB TEST'}
              </p>
            </div>
          </div>
          
          {/* File Upload Button */}
          <div className="flex items-center gap-3">
            <label className="cursor-pointer bg-red-600 hover:bg-red-700 text-white font-bold 
                            py-2 px-4 border-2 border-red-600 transition-colors flex items-center gap-2">
              <span>📁 UPLOAD MODEL</span>
              <input
                type="file"
                accept=".glb,.gltf,.fbx,.obj"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
            
            {modelSource === 'uploaded' && (
              <button
                onClick={resetToDefaultModel}
                className="bg-gray-700 hover:bg-gray-600 text-white font-bold 
                         py-2 px-4 border-2 border-gray-600 transition-colors"
              >
                🔄 DEFAULT
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="fixed top-24 right-6 z-10 bg-black/90 backdrop-blur-md border-2 border-red-600 p-4 min-w-[200px]">
        <h3 className="text-red-500 text-xs tracking-widest mb-4">CONTROLS</h3>
        
        <div className="space-y-2">
          <button
            onClick={resetCamera}
            className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-600 
                     text-white text-sm py-2 px-3 flex items-center gap-2 transition-colors"
          >
            <RotateCcw size={16} />
            Reset View
          </button>
          
          <button
            onClick={zoomIn}
            className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-600 
                     text-white text-sm py-2 px-3 flex items-center gap-2 transition-colors"
          >
            <ZoomIn size={16} />
            Zoom In
          </button>
          
          <button
            onClick={zoomOut}
            className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-600 
                     text-white text-sm py-2 px-3 flex items-center gap-2 transition-colors"
          >
            <ZoomOut size={16} />
            Zoom Out
          </button>
          
          <button
            onClick={toggleWireframe}
            className={`w-full border text-white text-sm py-2 px-3 flex items-center gap-2 transition-colors ${
              showWireframe 
                ? 'bg-red-600 border-red-600' 
                : 'bg-red-900/30 hover:bg-red-900/50 border-red-600'
            }`}
          >
            {showWireframe ? <Eye size={16} /> : <EyeOff size={16} />}
            Wireframe
          </button>
          
          {showWireframe && (
            <div className="mt-2 space-y-2">
              <div className="text-[10px] text-gray-400">Edge Threshold: {wireframeThreshold}°</div>
              <input
                type="range"
                min="1"
                max="90"
                value={wireframeThreshold}
                onChange={(e) => updateWireframeThreshold(Number(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #ff0000 0%, #ff0000 ${(wireframeThreshold / 90) * 100}%, #374151 ${(wireframeThreshold / 90) * 100}%, #374151 100%)`
                }}
              />
              <div className="flex justify-between text-[9px] text-gray-500">
                <span>More edges</span>
                <span>Fewer edges</span>
              </div>
            </div>
          )}
          
          <button
            onClick={toggleGrid}
            className={`w-full border text-white text-sm py-2 px-3 flex items-center gap-2 transition-colors ${
              showGrid 
                ? 'bg-red-600 border-red-600' 
                : 'bg-red-900/30 hover:bg-red-900/50 border-red-600'
            }`}
          >
            <Grid3x3 size={16} />
            Grid
          </button>
        </div>
        
        {/* Performance Controls */}
        <div className="mt-4 pt-4 border-t border-red-900">
          <h3 className="text-red-500 text-xs tracking-widest mb-3">PERFORMANCE</h3>
          
          <button
            onClick={toggleTextures}
            className={`w-full border text-white text-sm py-2 px-3 flex items-center gap-2 transition-colors ${
              texturesEnabled 
                ? 'bg-red-600 border-red-600' 
                : 'bg-yellow-600 border-yellow-600'
            }`}
          >
            {texturesEnabled ? '🎨' : '⚡'}
            <span>{texturesEnabled ? 'Textures ON' : 'Textures OFF'}</span>
          </button>
          
          <div className="mt-2 text-[10px] text-gray-500 text-center">
            {texturesEnabled 
              ? 'Full quality with textures' 
              : 'Performance mode - solid colors'}
          </div>
        </div>
        
        {/* Wireframe Overlay Toggle */}
        <div className="mt-4 pt-4 border-t border-red-900">
          <h3 className="text-red-500 text-xs tracking-widest mb-3">COMPARISON</h3>
          
          <button
            onClick={toggleWireframeOverlay}
            className={`w-full border text-white text-sm py-2 px-3 flex items-center gap-2 transition-colors ${
              showWireframeOverlay 
                ? 'bg-green-600 border-green-600' 
                : 'bg-red-900/30 hover:bg-red-900/50 border-red-600'
            }`}
          >
            {showWireframeOverlay ? '✓' : '○'}
            <span>Wireframe Cargo</span>
          </button>
          
          <div className="mt-2 text-[10px] text-gray-500 text-center">
            {showWireframeOverlay 
              ? 'Overlay visible - compare sizes' 
              : 'Show reference wireframe trailer'}
          </div>
          
          {showWireframeOverlay && (
            <div className="mt-3 space-y-2">
              <button
                onClick={autoAlignOverlay}
                className="w-full bg-blue-600 hover:bg-blue-700 border border-blue-600 
                         text-white text-xs py-2 px-3 transition-colors"
              >
                🎯 AUTO-ALIGN
              </button>
              
              <div className="text-[10px] text-gray-400 mb-1">Position Adjust:</div>
              
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => adjustOverlay('x', -1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-1"
                >
                  ← X
                </button>
                <button
                  onClick={() => adjustOverlay('y', 1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-1"
                >
                  ↑ Y
                </button>
                <button
                  onClick={() => adjustOverlay('x', 1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-1"
                >
                  X →
                </button>
                <button
                  onClick={() => adjustOverlay('z', -1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-1"
                >
                  ↓ Z
                </button>
                <button
                  onClick={() => adjustOverlay('y', -1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-1"
                >
                  ↓ Y
                </button>
                <button
                  onClick={() => adjustOverlay('z', 1)}
                  className="bg-gray-700 hover:bg-gray-600 text-white text-xs py-1"
                >
                  Z ↑
                </button>
              </div>
              
              <div className="text-[10px] text-gray-400 mb-1 mt-2">Scale:</div>
              <div className="flex gap-1">
                <button
                  onClick={() => adjustOverlayScale(-0.1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1"
                >
                  −
                </button>
                <div className="flex-1 bg-gray-900 text-white text-xs py-1 text-center">
                  {overlayScale.toFixed(1)}x
                </div>
                <button
                  onClick={() => adjustOverlayScale(0.1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1"
                >
                  +
                </button>
              </div>
              
              <button
                onClick={resetOverlay}
                className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 
                         text-white text-xs py-1 px-3 transition-colors mt-2"
              >
                RESET
              </button>
            </div>
          )}
        </div>
        
        {/* Wheel Animation Controls */}
        <div className="mt-4 pt-4 border-t border-red-900">
          <h3 className="text-red-500 text-xs tracking-widest mb-3">WHEEL TEST</h3>
          
          <button
            onClick={toggleDriving}
            disabled={wheelsRef.current.length === 0}
            className={`w-full border text-white text-sm py-3 px-3 flex items-center justify-center gap-2 transition-colors font-bold ${
              isDriving 
                ? 'bg-green-600 border-green-600 animate-pulse' 
                : 'bg-red-900/30 hover:bg-red-900/50 border-red-600 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {isDriving ? '⏸ STOP' : '▶ DRIVE'}
          </button>
          
          {wheelsRef.current.length > 0 && (
            <>
              <div className="mt-3 text-center">
                <div className="text-[10px] text-gray-400 mb-1">SPEED</div>
                <div className="text-2xl font-bold text-white">{speed.toFixed(1)}x</div>
              </div>
              
              <div className="flex gap-2 mt-2">
                <button
                  onClick={decreaseSpeed}
                  className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-600 
                           text-white text-sm py-2 transition-colors"
                >
                  −
                </button>
                <button
                  onClick={increaseSpeed}
                  className="flex-1 bg-red-900/30 hover:bg-red-900/50 border border-red-600 
                           text-white text-sm py-2 transition-colors"
                >
                  +
                </button>
              </div>
              
              <div className="mt-2 text-[10px] text-gray-500 text-center">
                {wheelsRef.current.length} wheels detected
              </div>
            </>
          )}
          
          {wheelsRef.current.length === 0 && (
            <div className="mt-2 text-[10px] text-yellow-500 text-center">
              No wheels detected in model
            </div>
          )}
        </div>
      </div>

      {/* Model Info Panel */}
      {modelInfo && (
        <div className="fixed bottom-6 left-6 z-10 bg-black/90 backdrop-blur-md border-l-2 border-red-600 p-4 max-w-sm">
          <h3 className="text-red-500 text-xs tracking-widest mb-3">MODEL INFO</h3>
          
          {modelSource === 'uploaded' && uploadedFile && (
            <div className="mb-3 pb-3 border-b border-gray-800">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">File:</span>
                <span className="text-white font-bold truncate ml-2 max-w-[200px]">
                  {uploadedFile.name}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-400">Size:</span>
                <span className="text-white font-bold">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
          )}
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-400">Vertices:</span>
              <span className="text-white font-bold">{modelInfo.vertices.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Triangles:</span>
              <span className="text-white font-bold">{modelInfo.triangles.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Meshes:</span>
              <span className="text-white font-bold">{modelInfo.meshes}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Materials:</span>
              <span className="text-white font-bold">{modelInfo.materials}</span>
            </div>
            
            <div className="border-t border-gray-800 pt-2 mt-2">
              <div className="text-gray-400 mb-1">Dimensions:</div>
              <div className="flex justify-between">
                <span className="text-gray-400">Width (X):</span>
                <span className="text-white">{modelInfo.size.x}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Height (Y):</span>
                <span className="text-white">{modelInfo.size.y}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Depth (Z):</span>
                <span className="text-white">{modelInfo.size.z}</span>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Model Parts List Panel */}
      {showPartsList && modelParts.length > 0 && (
        <div className="fixed top-24 left-6 z-20 bg-black/95 backdrop-blur-md border-2 border-red-600 
                      max-h-[calc(100vh-200px)] overflow-hidden flex flex-col" style={{ width: '320px' }}>
          <div className="bg-red-600 px-3 py-2 flex items-center justify-between">
            <span className="text-sm font-bold text-white">MODEL PARTS ({modelParts.length})</span>
            <button
              onClick={() => setShowPartsList(false)}
              className="text-white hover:text-black text-xl leading-none font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="p-3 border-b border-red-900">
            <div className="flex gap-2">
              <button
                onClick={() => toggleAllParts(true)}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-1 px-2 transition-colors"
              >
                ✓ Show All
              </button>
              <button
                onClick={() => toggleAllParts(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-xs py-1 px-2 transition-colors"
              >
                ✗ Hide All
              </button>
            </div>
          </div>
          
          <div className="overflow-y-auto flex-1 p-2" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            {modelParts.map((part) => (
              <div
                key={part.id}
                className={`flex items-center justify-between p-2 mb-1 border transition-colors cursor-pointer ${
                  part.visible 
                    ? 'bg-red-900/20 border-red-900/50 hover:bg-red-900/30' 
                    : 'bg-gray-900/50 border-gray-800 hover:bg-gray-900/70'
                }`}
                onClick={() => togglePartVisibility(part.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={`w-3 h-3 rounded-sm flex-shrink-0 ${
                    part.visible ? 'bg-green-500' : 'bg-gray-600'
                  }`} />
                  <span className="text-xs text-white truncate" title={part.name}>
                    {part.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePartVisibility(part.id);
                  }}
                  className={`text-xs px-2 py-1 ml-2 flex-shrink-0 ${
                    part.visible 
                      ? 'bg-green-600 hover:bg-green-700 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                >
                  {part.visible ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Parts List Toggle Button */}
      {!showPartsList && modelParts.length > 0 && (
        <button
          onClick={() => setShowPartsList(true)}
          className="fixed top-24 left-6 z-20 bg-red-600 hover:bg-red-700 text-white 
                   font-bold py-2 px-4 border-2 border-red-600 transition-colors text-sm flex items-center gap-2"
        >
          <span>📋 PARTS ({modelParts.length})</span>
        </button>
      )}

      {/* Instructions */}
      <div className="fixed bottom-6 right-6 z-10 bg-black/80 backdrop-blur-sm border border-gray-800 p-3 max-w-xs">
        <p className="text-[10px] text-gray-500 leading-relaxed">
          <strong className="text-red-500">MOUSE:</strong> Left-drag to rotate • Right-drag to pan • Scroll to zoom
        </p>
        <p className="text-[10px] text-gray-500 leading-relaxed mt-2">
          <strong className="text-red-500">UPLOAD:</strong> Click button or drag & drop .glb/.gltf/.fbx/.obj file
        </p>
      </div>
    </div>
  );
}
