// Script to inspect GLB file and list all mesh names
import { readFileSync } from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';

// Setup Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

console.log('🔍 Inspecting GLB file: public/model/Main_truck_FINAL_draco.glb\n');

// Load the GLB file
loader.load(
  './public/model/Main_truck_FINAL_draco.glb',
  (gltf) => {
    console.log('✅ GLB file loaded successfully!\n');
    console.log('📋 ALL MESHES IN THE MODEL:\n');
    console.log('═'.repeat(60));
    
    let meshCount = 0;
    const meshNames = [];
    
    gltf.scene.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        meshCount++;
        const name = node.name || '(unnamed)';
        meshNames.push(name);
        console.log(`${meshCount}. ${name}`);
        console.log(`   Type: ${node.type}`);
        console.log(`   Geometry: ${node.geometry.type}`);
        console.log(`   Vertices: ${node.geometry.attributes.position?.count || 0}`);
        console.log('');
      }
    });
    
    console.log('═'.repeat(60));
    console.log(`\n📊 Total meshes found: ${meshCount}\n`);
    
    // Look for fuel tank related names
    console.log('🔍 Searching for fuel tank related meshes:\n');
    const fuelRelated = meshNames.filter(name => 
      name.toLowerCase().includes('fuel') || 
      name.toLowerCase().includes('tank') ||
      name.toLowerCase().includes('reservoir')
    );
    
    if (fuelRelated.length > 0) {
      console.log('✅ Found potential fuel tank meshes:');
      fuelRelated.forEach(name => console.log(`   - ${name}`));
    } else {
      console.log('❌ No obvious fuel tank mesh found by name');
      console.log('💡 The fuel tank might be merged or renamed during compression');
    }
    
    process.exit(0);
  },
  (progress) => {
    const percent = (progress.loaded / progress.total * 100).toFixed(0);
    console.log(`Loading: ${percent}%`);
  },
  (error) => {
    console.error('❌ Error loading GLB:', error);
    process.exit(1);
  }
);
