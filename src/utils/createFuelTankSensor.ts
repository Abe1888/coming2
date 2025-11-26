import * as THREE from 'three';

interface FuelTankSensorOptions {
  tankHeight?: number;
  position?: [number, number, number];
  scale?: number;
}

/**
 * Creates a fuel tank sensor assembly matching the FuelTankSensor component design
 * This is a vanilla Three.js implementation for integration with existing scenes
 */
export function createFuelTankSensor(options: FuelTankSensorOptions = {}) {
  const {
    tankHeight = 0.6,
    position = [0, 0, 0],
    scale = 0.025 // Default scale to match demo-truck size
  } = options;

  // Main sensor group
  const tankGroup = new THREE.Group();
  tankGroup.scale.set(scale, scale, scale);
  tankGroup.position.set(...position);

  // Calculate probe length based on tank height
  const probeLength = tankHeight * 0.85;

  // --- SENSOR HEAD GROUP ---
  const sensorHeadGroup = new THREE.Group();
  sensorHeadGroup.position.set(0, 0, 0);
  tankGroup.add(sensorHeadGroup);

  // 1. Sensor Head Housing - RED octagonal shape
  const headShape = new THREE.Shape();
  const hw = 0.08;
  const hd = 0.08;
  const ch = 0.015;
  headShape.moveTo(-hw + ch, -hd);
  headShape.lineTo(hw - ch, -hd);
  headShape.lineTo(hw, -hd + ch);
  headShape.lineTo(hw, hd - ch);
  headShape.lineTo(hw - ch, hd);
  headShape.lineTo(-hw + ch, hd);
  headShape.lineTo(-hw, hd - ch);
  headShape.lineTo(-hw, -hd + ch);
  headShape.closePath();

  const extrudeSettings = {
    depth: 0.05,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2
  };
  const headGeo = new THREE.ExtrudeGeometry(headShape, extrudeSettings);
  const head = new THREE.Mesh(
    headGeo,
    new THREE.MeshStandardMaterial({
      color: 0xFF0000,
      roughness: 0.5,
      metalness: 0.2
    })
  );
  head.rotation.x = Math.PI / 2;
  head.castShadow = true;
  sensorHeadGroup.add(head);

  // Edge lines
  const headEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(headGeo, 20),
    new THREE.LineBasicMaterial({ color: 0xb0b0b0, transparent: true, opacity: 0.6 })
  );
  headEdges.rotation.x = Math.PI / 2;
  sensorHeadGroup.add(headEdges);

  // 2. Mounting Flange
  const flangeGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.02, 16);
  const flange = new THREE.Mesh(
    flangeGeo,
    new THREE.MeshStandardMaterial({
      color: 0xe8e8e8,
      roughness: 0.7,
      metalness: 0.3
    })
  );
  flange.position.y = -0.05;
  flange.castShadow = true;
  sensorHeadGroup.add(flange);

  // 3. Logo Plane (texture loaded separately with correct aspect ratio)
  const logoPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(0.12, 0.12), // Will be resized based on actual image aspect ratio
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  // Rotate to lie flat on sensor head, then flip 180° on Y to correct orientation
  logoPlane.rotation.set(-Math.PI / 2, Math.PI, 0);
  logoPlane.position.y = 0.01;
  sensorHeadGroup.add(logoPlane);

  // Load logo texture and preserve aspect ratio
  const logoLoader = new THREE.TextureLoader();
  logoLoader.load('/Logo-white.png', (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;
    
    // Calculate correct aspect ratio from image
    const imageAspect = texture.image.width / texture.image.height;
    const logoWidth = 0.12;
    const logoHeight = logoWidth / imageAspect; // Preserve aspect ratio
    
    // Update geometry to match image aspect ratio
    logoPlane.geometry.dispose();
    logoPlane.geometry = new THREE.PlaneGeometry(logoWidth, logoHeight);
    
    (logoPlane.material as THREE.MeshBasicMaterial).map = texture;
    logoPlane.material.needsUpdate = true;
  });

  // --- PROBE ASSEMBLY ---
  const probeGroup = new THREE.Group();
  probeGroup.position.set(0, -0.05, 0);
  tankGroup.add(probeGroup);

  // Probe tube - bright metallic
  const probeTubeGeo = new THREE.CylinderGeometry(0.02, 0.02, probeLength, 16);
  const probeTube = new THREE.Mesh(
    probeTubeGeo,
    new THREE.MeshStandardMaterial({
      color: 0xffffff, // Pure white for maximum brightness
      metalness: 0.95,
      roughness: 0.05, // Highly reflective
      emissive: 0x888888, // Stronger glow
      emissiveIntensity: 0.4
    })
  );
  probeTube.position.set(0, -probeLength / 2, 0);
  probeTube.castShadow = true;
  probeGroup.add(probeTube);

  // --- CAGE/FILTER GROUP (GREEN) ---
  const cageGroup = new THREE.Group();
  cageGroup.position.set(0, -probeLength, 0);
  probeGroup.add(cageGroup);

  // Cage body
  const cageBodyGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.08, 12);
  const cageBody = new THREE.Mesh(
    cageBodyGeo,
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      roughness: 0.6,
      metalness: 0.2
    })
  );
  cageBody.castShadow = true;
  cageGroup.add(cageBody);

  // Cage rings
  const cageRingGeo = new THREE.TorusGeometry(0.025, 0.003, 8, 16);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      cageRingGeo,
      new THREE.MeshStandardMaterial({
        color: 0x16a34a,
        roughness: 0.4,
        metalness: 0.3
      })
    );
    ring.position.y = -0.03 + i * 0.025;
    ring.rotation.x = Math.PI / 2;
    ring.castShadow = true;
    cageGroup.add(ring);
  }

  // Return the group and references for dynamic updates
  return {
    group: tankGroup,
    probeTube,
    cageGroup,
    updateProbeLength: (newTankHeight: number) => {
      const newProbeLength = newTankHeight * 0.85;
      probeTube.geometry.dispose();
      probeTube.geometry = new THREE.CylinderGeometry(0.02, 0.02, newProbeLength, 16);
      probeTube.position.y = -newProbeLength / 2;
      cageGroup.position.y = -newProbeLength;
    }
  };
}
