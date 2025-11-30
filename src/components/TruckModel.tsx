import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface TruckModelProps {
  scene: THREE.Scene;
  truckGroup: THREE.Group;
  modelPath?: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  lightGrayMaterial: THREE.MeshStandardMaterial;
  edgeMaterial: THREE.LineBasicMaterial;
  onLoad?: (model: THREE.Group, wheels: THREE.Mesh[]) => void;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
  onLogoCreated?: (logoPlane: THREE.Mesh) => void;
}

/**
 * TruckModel Component
 * 
 * Loads and processes a GLB truck model with:
 * - DRACO compression support
 * - Automatic wheel detection and centering
 * - Material application (glass, logo, fuel tank, etc.)
 * - Edge line rendering
 * - Shadow casting/receiving
 * 
 * @param scene - Three.js scene
 * @param truckGroup - Parent truck group to attach model to
 * @param modelPath - Path to GLB model (default: '/model/Main_truck_updated_compressed.glb')
 * @param position - Model position [x, y, z] (default: [1.1, -1.1, -5.3])
 * @param rotation - Model rotation [x, y, z] (default: [0, Math.PI, 0])
 * @param scale - Model scale (default: 1.50)
 * @param lightGrayMaterial - Material for truck body
 * @param edgeMaterial - Material for edge lines
 * @param onLoad - Callback when model loads (receives model and wheels array)
 * @param onError - Callback on loading error
 */
export const TruckModel = ({
  scene,
  truckGroup,
  modelPath = '/model/Main_truck_updated_compressed.glb',
  position = [1.1, -1.1, -5.3],
  rotation = [0, Math.PI, 0],
  scale = 1.50,
  lightGrayMaterial,
  edgeMaterial,
  onLoad,
  onProgress,
  onError,
  onLogoCreated
}: TruckModelProps) => {
  const modelRef = useRef<THREE.Group | null>(null);
  const wheelsRef = useRef<THREE.Mesh[]>([]);
  const loadedRef = useRef(false); // Prevent double-loading in React Strict Mode
  const logoPlaneRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!scene || !truckGroup) return;
    if (loadedRef.current) return; // Already loaded, skip
    loadedRef.current = true;

    // Setup DRACO loader for compressed geometry
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    
    // Setup GLTF loader
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Load the GLB model
    gltfLoader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;
        
        // Apply transformations
        model.rotation.set(...rotation);
        model.position.set(...position);
        model.scale.set(scale, scale, scale);
        
        // Debug: List all meshes
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
        
        // Process all meshes
        const wheels: THREE.Mesh[] = [];
        
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
                wheels.push(child);
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
            
            // Apply materials based on mesh type
            applyMaterialToMesh(child, lightGrayMaterial, edgeMaterial, (logoPlane) => {
              logoPlaneRef.current = logoPlane;
              if (onLogoCreated) {
                onLogoCreated(logoPlane);
              }
            });
          }
        });
        
        // Store wheels reference
        wheelsRef.current = wheels;
        
        console.log(`🎡 ${wheels.length} wheels captured and ready for rotation`);
        if (wheels.length === 0) {
          console.warn('⚠️ NO WHEELS FOUND! Check mesh names in GLB file');
        } else {
          console.log('✅ Wheel names:', wheels.map(w => w.name).join(', '));
        }
        
        // Store model reference
        modelRef.current = model;
        
        // Add to truck group
        truckGroup.add(model);
        
        console.log('✓ GLB Truck loaded');
        
        // Callback
        if (onLoad) {
          onLoad(model, wheels);
        }
      },
      (xhr) => {
        // Progress callback
        if (onProgress && xhr.lengthComputable) {
          const percentComplete = (xhr.loaded / xhr.total) * 100;
          onProgress(percentComplete);
        }
      },
      (error) => {
        console.error('Error loading GLB:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    );

    // Cleanup
    return () => {
      if (modelRef.current) {
        truckGroup.remove(modelRef.current);
        
        // Dispose geometries and materials
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.geometry?.dispose();
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => mat.dispose());
            } else {
              child.material?.dispose();
            }
          }
        });
      }
      
      dracoLoader.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene, truckGroup, modelPath]);

  return null; // This is a Three.js component, no DOM rendering
};

/**
 * Apply material to mesh based on its type
 * @private
 */
function applyMaterialToMesh(
  child: THREE.Mesh,
  lightGrayMat: THREE.MeshStandardMaterial,
  edgeMat: THREE.LineBasicMaterial,
  onLogoCreated?: (logoPlane: THREE.Mesh) => void
): void {
  const nameLower = child.name.toLowerCase();
  
  // Check for wheel meshes (make them very dark)
  const isWheel = nameLower.includes('wheel') || 
                  nameLower.includes('tire') ||
                  nameLower.includes('rim');
  
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
  
  if (isWheel) {
    // Apply very dark material to wheels
    child.material = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a, // Very dark gray (almost black)
      roughness: 0.9,
      metalness: 0.1
    });
    child.castShadow = true;
    child.receiveShadow = true;
  } else if (isLogo) {
    applyLogoMaterial(child, onLogoCreated);
  } else if (isGlass) {
    applyGlassMaterial(child);
  } else if (isFuelTank) {
    applyFuelTankMaterial(child);
  } else {
    // Apply light gray material to other parts
    child.material = lightGrayMat;
    child.castShadow = true;
    child.receiveShadow = true;
  }
  
  // Add subtle blended edges
  const edges = new THREE.EdgesGeometry(child.geometry, 15);
  const line = new THREE.LineSegments(edges, edgeMat);
  child.add(line);
}

/**
 * Apply logo material (invisible face with PNG plane)
 * @private
 */
function applyLogoMaterial(child: THREE.Mesh, onLogoCreated?: (logoPlane: THREE.Mesh) => void): void {
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
        logoPlane.name = 'LogoPlane'; // Name for easy identification
        
        // Position the plane in front of the circular face
        logoPlane.position.copy(child.position);
        logoPlane.rotation.copy(child.rotation);
        logoPlane.quaternion.copy(child.quaternion);
        
        // Move forward in LOCAL space (front of truck)
        // Since truck is rotated 180° (Math.PI), -Z is forward
        const forwardOffset = new THREE.Vector3(0, 0, -0.5);
        forwardOffset.applyQuaternion(logoPlane.quaternion);
        logoPlane.position.add(forwardOffset);
        
        // Add to the same parent as the circular face
        if (child.parent) {
          child.parent.add(logoPlane);
        }
        
        console.log('✓ Logo plane created in FRONT of truck (near front wheels):', child.name);
        console.log('  📍 Logo position:', logoPlane.position);
        console.log('  📏 Logo scale:', logoPlane.scale);
        
        // Notify parent component
        if (onLogoCreated) {
          onLogoCreated(logoPlane);
        }
      }
    },
    undefined,
    (error) => console.error('Error loading logo texture:', error)
  );
  
  child.castShadow = false;
  child.receiveShadow = false;
}

/**
 * Apply glass material (transparent with blue tint)
 * @private
 */
function applyGlassMaterial(child: THREE.Mesh): void {
  child.material = new THREE.MeshStandardMaterial({ 
    color: 0xccddff, // Light blue tint
    transparent: true,
    opacity: 0.25,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0.1,
    envMapIntensity: 1.0
  });
  child.castShadow = false;
  child.receiveShadow = true;
  console.log('✓ Glass mesh found and made transparent:', child.name);
}

/**
 * Apply fuel tank material (neutral gray transparent glass)
 * @private
 */
function applyFuelTankMaterial(child: THREE.Mesh): void {
  const fuelTankMaterial = new THREE.MeshStandardMaterial({ 
    color: 0x808080, // Neutral gray (no blue tint)
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.1,
    metalness: 0.2
  });
  
  child.material = fuelTankMaterial;
  child.castShadow = false;
  child.receiveShadow = true;
  console.log('✓ Fuel tank mesh found and styled with neutral gray (transparent):', child.name);
  console.log('  📍 Fuel tank position:', child.position);
  console.log('  👶 Fuel tank children count:', child.children.length);
  
  // Apply same material to all children (like fuel level sensor)
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
      
      // Check if this is the sensor
      const isSensor = subChild.name.toLowerCase().includes('sensor') || 
                       subChild.name.toLowerCase().includes('probe') ||
                       subChild.name.toLowerCase().includes('head');
      
      if (isSensor) {
        // Apply crimson red material to sensor head/box
        subChild.material = new THREE.MeshStandardMaterial({
          color: 0xbe202e, // Brand crimson red for sensor
          transparent: false,
          roughness: 0.3,
          metalness: 0.7
        });
        console.log('  ↳ 🔴 Sensor found and styled with brand crimson red:', subChild.name);
      } else {
        // Apply neutral gray transparent material to other children
        subChild.material = fuelTankMaterial.clone();
        console.log('  ↳ ⚫ Child mesh styled with neutral gray transparent:', subChild.name);
      }
      
      subChild.castShadow = false;
      subChild.receiveShadow = false;
    }
  });
  
  console.log('✅ Fuel tank and sensor hierarchy preserved - they will move together');
}
