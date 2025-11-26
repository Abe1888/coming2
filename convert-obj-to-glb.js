// Convert OBJ to GLB with preserved names
import { readFileSync, writeFileSync } from 'fs';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import * as THREE from 'three';

console.log('🔄 Converting OBJ to GLB...\n');

// Read OBJ file
const objData = readFileSync('./public/model/Main_truck_Obj.obj', 'utf8');

// Load OBJ
const loader = new OBJLoader();
const object = loader.parse(objData);

console.log('✅ OBJ loaded successfully!');
console.log(`📦 Found ${object.children.length} objects\n`);

// List all object names
console.log('📋 Object names:');
object.traverse((child) => {
  if (child.isMesh) {
    console.log(`  - ${child.name || '(unnamed)'}`);
  }
});

// Export to GLB
const exporter = new GLTFExporter();

exporter.parse(
  object,
  (gltf) => {
    const buffer = Buffer.from(gltf);
    writeFileSync('./public/model/Main_truck_from_obj.glb', buffer);
    
    const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
    console.log(`\n✅ GLB exported successfully!`);
    console.log(`📊 File size: ${sizeMB} MB`);
    console.log(`📁 Saved to: public/model/Main_truck_from_obj.glb`);
  },
  (error) => {
    console.error('❌ Export error:', error);
  },
  { binary: true }
);
