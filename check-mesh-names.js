// Check mesh names in the compressed GLB
import { readFileSync } from 'fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as THREE from 'three';

console.log('🔍 Checking mesh names in compressed GLB...\n');

// Setup Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader);

// Read the file
const data = readFileSync('./public/model/Main_truck_final_compressed.glb');
const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);

loader.parse(arrayBuffer, '', (gltf) => {
  console.log('✅ GLB loaded successfully!\n');
  console.log('📋 ALL MESH NAMES:\n');
  console.log('═'.repeat(60));
  
  let meshCount = 0;
  const meshNames = new Set();
  
  gltf.scene.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      meshCount++;
      const name = node.name || '(unnamed)';
      meshNames.add(name);
      console.log(`${meshCount}. ${name}`);
    }
  });
  
  console.log('═'.repeat(60));
  console.log(`\n📊 Total meshes: ${meshCount}`);
  console.log(`📊 Unique names: ${meshNames.size}\n`);
  
  // Look for fuel tank
  console.log('🔍 Searching for "Fuel" or "Tank" in names:\n');
  let found = false;
  gltf.scene.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      const name = node.name.toLowerCase();
      if (name.includes('fuel') || name.includes('tank')) {
        console.log(`✅ FOUND: "${node.name}"`);
        found = true;
      }
    }
  });
  
  if (!found) {
    console.log('❌ No fuel tank mesh found by name');
    console.log('\n💡 Showing first 20 mesh names for reference:');
    let count = 0;
    gltf.scene.traverse((node) => {
      if (node instanceof THREE.Mesh && count < 20) {
        console.log(`   ${count + 1}. ${node.name}`);
        count++;
      }
    });
  }
  
  process.exit(0);
}, (error) => {
  console.error('❌ Error loading GLB:', error);
  process.exit(1);
});
