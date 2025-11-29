import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

interface TruckModelProps {
  scene: THREE.Scene;
  onLoad?: (model: THREE.Group) => void;
  position?: [number, number, number];
  scale?: number;
}

export const TruckModel = ({ scene, onLoad, position = [0, 0, 0], scale = 1 }: TruckModelProps) => {
  const modelRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    // Setup DRACO loader for compressed geometry
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    dracoLoader.setDecoderConfig({ type: 'js' });

    // Setup GLTF loader
    const gltfLoader = new GLTFLoader();
    gltfLoader.setDRACOLoader(dracoLoader);

    // Load the truck model
    gltfLoader.load(
      '/model/Main_truck_updated_compressed.glb',
      (gltf) => {
        const model = gltf.scene;
        
        // Set position and scale
        model.position.set(...position);
        model.scale.set(scale, scale, scale);
        
        // Store reference
        modelRef.current = model;
        
        // Add to scene
        scene.add(model);
        
        // Callback
        if (onLoad) {
          onLoad(model);
        }
        
        console.log('✓ Truck model loaded successfully');
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log(`Loading truck model: ${percent.toFixed(0)}%`);
      },
      (error) => {
        console.error('Error loading truck model:', error);
      }
    );

    // Cleanup
    return () => {
      if (modelRef.current) {
        scene.remove(modelRef.current);
        
        // Dispose of geometries and materials
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
  }, [scene, position, scale, onLoad]);

  return null;
};

