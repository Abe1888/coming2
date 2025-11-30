import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import type { ObjectTransforms } from '../hooks/useObjectTransforms';

interface Preview3DProps {
  transforms: ObjectTransforms;
  activeObject: 'truck' | 'fuelSensor' | 'telematicsDisplay' | 'logo';
}

export const Preview3D: React.FC<Preview3DProps> = ({ transforms, activeObject }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const objectsRef = useRef<{
    truck?: THREE.Group;
    fuelSensor?: THREE.Group;
    telematicsDisplay?: THREE.Group;
    logo?: THREE.Group;
  }>({});

  // Initialize scene
  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1d2635);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(15, 10, 15);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    scene.add(directionalLight);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight2.position.set(-10, 5, -5);
    scene.add(directionalLight2);

    // Grid
    const gridHelper = new THREE.GridHelper(30, 30, 0x6c6c6c, 0x3a3a3a);
    scene.add(gridHelper);

    // Axes Helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Load GLB Truck Model
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);

    // Truck Group (will contain GLB model)
    const truckGroup = new THREE.Group();
    scene.add(truckGroup);
    objectsRef.current.truck = truckGroup;

    // Load truck GLB
    loader.load(
      '/model/Main_truck_updated_compressed.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Find and store the LOGO mesh
        let logoMesh: THREE.Mesh | undefined = undefined;
        
        // Apply light gray material to all meshes
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // Check if this is the logo mesh
            if (child.name.toUpperCase().includes('LOGO')) {
              logoMesh = child;
              console.log('✓ Found LOGO mesh:', child.name);
            }
            
            child.material = new THREE.MeshStandardMaterial({
              color: 0xe0e0e0,
              roughness: 0.7,
              metalness: 0.08
            });
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        
        truckGroup.add(model);
        
        // If logo mesh found, use it instead of the placeholder
        if (logoMesh) {
          // Remove placeholder logo
          if (objectsRef.current.logo) {
            truckGroup.remove(objectsRef.current.logo);
          }
          // Use the actual logo mesh from GLB - create a new group for it
          const logoGroupFromGLB = new THREE.Group();
          const meshParent = (logoMesh as THREE.Mesh).parent;
          if (meshParent) {
            meshParent.remove(logoMesh as THREE.Mesh);
          }
          logoGroupFromGLB.add(logoMesh as THREE.Mesh);
          truckGroup.add(logoGroupFromGLB);
          objectsRef.current.logo = logoGroupFromGLB;
        }
        
        console.log('✓ Truck GLB loaded in preview');
      },
      undefined,
      (error) => {
        console.error('Error loading truck GLB:', error);
        // Fallback to box if GLB fails
        const fallbackGeometry = new THREE.BoxGeometry(4, 2, 8);
        const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xe0e0e0 });
        const fallback = new THREE.Mesh(fallbackGeometry, fallbackMaterial);
        truckGroup.add(fallback);
      }
    );

    // Fuel Sensor (red cylinder with probe)
    const fuelSensorGroup = new THREE.Group();
    const sensorHeadGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.5, 16);
    const sensorHeadMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xbe202e,
      emissive: 0x000000,
      metalness: 0.3,
      roughness: 0.7
    });
    const sensorHead = new THREE.Mesh(sensorHeadGeometry, sensorHeadMaterial);
    sensorHead.position.y = 0.25;
    
    const probeGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8);
    const probeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x6c6c6c,
      metalness: 0.8,
      roughness: 0.2
    });
    const probe = new THREE.Mesh(probeGeometry, probeMaterial);
    probe.position.y = -0.65;
    
    fuelSensorGroup.add(sensorHead);
    fuelSensorGroup.add(probe);
    scene.add(fuelSensorGroup);
    objectsRef.current.fuelSensor = fuelSensorGroup;

    // Telematics Display (green plane with frame)
    const displayGroup = new THREE.Group();
    const displayGeometry = new THREE.PlaneGeometry(6, 3);
    const displayMaterial = new THREE.MeshStandardMaterial({
      color: 0x209771,
      side: THREE.DoubleSide,
      emissive: 0x000000,
      metalness: 0.1,
      roughness: 0.8
    });
    const displayScreen = new THREE.Mesh(displayGeometry, displayMaterial);
    
    // Frame around display
    const frameGeometry = new THREE.BoxGeometry(6.2, 3.2, 0.1);
    const frameMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1d2635,
      metalness: 0.5,
      roughness: 0.5
    });
    const frame = new THREE.Mesh(frameGeometry, frameMaterial);
    frame.position.z = -0.05;
    
    displayGroup.add(frame);
    displayGroup.add(displayScreen);
    scene.add(displayGroup);
    objectsRef.current.telematicsDisplay = displayGroup;

    // Logo (with actual PNG texture) - will be added to truck group later
    const logoGroup = new THREE.Group();
    const logoGeometry = new THREE.PlaneGeometry(2, 2);
    
    // Load logo texture
    const textureLoader = new THREE.TextureLoader();
    const logoTexture = textureLoader.load('/logo-front-truck.png');
    
    const logoMaterial = new THREE.MeshBasicMaterial({
      map: logoTexture,
      transparent: true,
      side: THREE.DoubleSide
    });
    const logoPlane = new THREE.Mesh(logoGeometry, logoMaterial);
    
    logoGroup.add(logoPlane);
    
    // Add logo to truck group (not scene) - logo position is relative to truck
    truckGroup.add(logoGroup);
    objectsRef.current.logo = logoGroup;

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  // Update object transforms
  useEffect(() => {
    const { truck, fuelSensor, telematicsDisplay, logo } = objectsRef.current;

    if (truck) {
      truck.position.set(...transforms.truck.position);
      truck.rotation.set(...transforms.truck.rotation);
      truck.scale.set(...transforms.truck.scale);
    }

    if (fuelSensor) {
      fuelSensor.position.set(...transforms.fuelSensor.position);
      fuelSensor.rotation.set(...transforms.fuelSensor.rotation);
      fuelSensor.scale.setScalar(transforms.fuelSensor.scale);
    }

    if (telematicsDisplay) {
      telematicsDisplay.position.set(...transforms.telematicsDisplay.position);
      telematicsDisplay.rotation.set(...transforms.telematicsDisplay.rotation);
      
      // Update display size
      const screen = telematicsDisplay.children[1] as THREE.Mesh;
      const frame = telematicsDisplay.children[0] as THREE.Mesh;
      if (screen && screen.geometry) {
        screen.geometry.dispose();
        screen.geometry = new THREE.PlaneGeometry(
          transforms.telematicsDisplay.size[0],
          transforms.telematicsDisplay.size[1]
        );
      }
      if (frame && frame.geometry) {
        frame.geometry.dispose();
        frame.geometry = new THREE.BoxGeometry(
          transforms.telematicsDisplay.size[0] + 0.2,
          transforms.telematicsDisplay.size[1] + 0.2,
          0.1
        );
      }
    }

    if (logo) {
      // Reset position to base first
      logo.position.set(...transforms.logo.position);
      logo.rotation.set(...transforms.logo.rotation);
      
      // Apply forward/backward offset in local space (same as main app)
      const forwardOffset = new THREE.Vector3(0, 0, transforms.logo.offsetZ);
      forwardOffset.applyQuaternion(logo.quaternion);
      logo.position.add(forwardOffset);
      
      // Apply scale and visibility
      logo.scale.set(transforms.logo.scale[0], transforms.logo.scale[1], 1);
      logo.visible = transforms.logo.visible;
      
      console.log('Preview3D: Logo updated', {
        position: transforms.logo.position,
        rotation: transforms.logo.rotation,
        scale: transforms.logo.scale,
        offsetZ: transforms.logo.offsetZ,
        visible: transforms.logo.visible
      });
    }
  }, [transforms]);

  // Highlight active object
  useEffect(() => {
    const objects = objectsRef.current;
    
    // Reset all emissive colors (only for truck - logo uses MeshBasicMaterial)
    if (objects.truck) {
      objects.truck.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissive.setHex(0x000000);
        }
      });
    }

    // Highlight truck if active
    if (activeObject === 'truck' && objects.truck) {
      objects.truck.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissive.setHex(0x333333);
        }
      });
    }
    
    // For logo, add a subtle outline when active
    if (objects.logo) {
      const logoMesh = objects.logo.children[0] as THREE.Mesh;
      if (logoMesh && logoMesh.material instanceof THREE.MeshBasicMaterial) {
        logoMesh.material.opacity = activeObject === 'logo' ? 1.0 : 0.8;
      }
    }
  }, [activeObject]);

  return (
    <div style={{
      position: 'relative',
      background: '#1d2635',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)'
    }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Controls hint */}
      <div style={{
        position: 'absolute',
        bottom: '16px',
        left: '16px',
        background: 'rgba(0,0,0,0.7)',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#b8b8b8',
        backdropFilter: 'blur(10px)'
      }}>
        🖱️ Left: Rotate • Right: Pan • Scroll: Zoom
      </div>
    </div>
  );
};
