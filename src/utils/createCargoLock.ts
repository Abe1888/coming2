import * as THREE from 'three';

interface CargoLockConfig {
  position?: [number, number, number];
  rotation?: [number, number, number];
  isLocked?: boolean;
  signalStrength?: number;
}

export function createCargoLock(config: CargoLockConfig = {}) {
  const {
    position = [0, 0, 0],
    rotation = [0, -Math.PI / 2, 0],
    isLocked = true,
    signalStrength = 85
  } = config;

  const group = new THREE.Group();
  group.position.set(...position);
  group.rotation.set(...rotation);

  // Main lock body (black housing)
  const bodyGeo = new THREE.BoxGeometry(0.16, 0.38, 0.08);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a,
    roughness: 0.3,
    metalness: 0.1,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    reflectivity: 0.5
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(0, 0, -0.005);
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Blue LCD display screen (top section)
  const screenGeo = new THREE.BoxGeometry(0.13, 0.08, 0.02);
  const screenMat = new THREE.MeshPhysicalMaterial({
    color: 0x2563eb,
    emissive: 0x1e40af,
    emissiveIntensity: 0.4,
    roughness: 0.1,
    metalness: 0.05,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    transmission: 0.1,
    thickness: 0.5,
    ior: 1.5
  });
  const screen = new THREE.Mesh(screenGeo, screenMat);
  screen.position.set(0, 0.14, 0.045);
  screen.castShadow = true;
  group.add(screen);

  // Lower panel (blue with logo area)
  const panelGeo = new THREE.BoxGeometry(0.13, 0.25, 0.02);
  const panelMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b82f6,
    emissive: 0x2563eb,
    emissiveIntensity: 0.25,
    roughness: 0.4,
    metalness: 0.05,
    clearcoat: 0.5,
    clearcoatRoughness: 0.3
  });
  const panel = new THREE.Mesh(panelGeo, panelMat);
  panel.position.set(0, -0.08, 0.045);
  panel.castShadow = true;
  group.add(panel);

  // Steel cable shackle (U-shaped security cable)
  const shackleCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.05, 0, 0),
    new THREE.Vector3(-0.05, 0.1, 0),
    new THREE.Vector3(-0.05, 0.25, 0.02),
    new THREE.Vector3(-0.04, 0.4, 0.05),
    new THREE.Vector3(-0.02, 0.55, 0.08),
    new THREE.Vector3(0, 0.7, 0.1),
    new THREE.Vector3(0.02, 0.55, 0.08),
    new THREE.Vector3(0.04, 0.4, 0.05),
    new THREE.Vector3(0.05, 0.25, 0.02),
    new THREE.Vector3(0.05, 0.1, 0),
    new THREE.Vector3(0.05, 0, 0)
  ]);
  const shackleGeo = new THREE.TubeGeometry(shackleCurve, 32, 0.015, 8, false);
  const shackleMat = new THREE.MeshPhysicalMaterial({
    color: 0xd0d0d0,
    roughness: 0.2,
    metalness: 0.9,
    clearcoat: 0.3,
    clearcoatRoughness: 0.2,
    reflectivity: 0.8
  });
  const shackle = new THREE.Mesh(shackleGeo, shackleMat);
  shackle.position.set(0, 0.225, 0);
  shackle.castShadow = true;
  shackle.receiveShadow = true;
  group.add(shackle);

  // Shackle anchor points
  const anchorGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.05, 8);
  const anchorMat = new THREE.MeshPhysicalMaterial({
    color: 0x909090,
    roughness: 0.3,
    metalness: 0.85,
    clearcoat: 0.2,
    reflectivity: 0.7
  });
  [-0.05, 0.05].forEach((xPos) => {
    const anchor = new THREE.Mesh(anchorGeo, anchorMat);
    anchor.position.set(xPos, 0.225, 0);
    anchor.rotation.set(0, 0, Math.PI / 2);
    anchor.castShadow = true;
    group.add(anchor);
  });

  // Status LED indicators
  const ledGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.008, 8);
  
  // Red LED - LOCK status
  const redLEDMat = new THREE.MeshStandardMaterial({
    color: 0xff4444,
    emissive: 0xff0000,
    emissiveIntensity: isLocked ? 1.2 : 0.1,
    roughness: 0.2,
    metalness: 0.3
  });
  const redLED = new THREE.Mesh(ledGeo, redLEDMat);
  redLED.position.set(0.04, -0.17, 0.058);
  redLED.rotation.set(Math.PI / 2, 0, 0);
  group.add(redLED);

  const redLight = new THREE.PointLight(0xff4444, isLocked ? 0.5 : 0.05, 0.3, 2);
  redLight.position.set(0.04, -0.17, 0.08);
  group.add(redLight);

  // Green LED - UNLOCK status
  const greenLEDMat = new THREE.MeshStandardMaterial({
    color: 0x44ff44,
    emissive: 0x00ff00,
    emissiveIntensity: !isLocked ? 1.2 : 0.1,
    roughness: 0.2,
    metalness: 0.3
  });
  const greenLED = new THREE.Mesh(ledGeo, greenLEDMat);
  greenLED.position.set(0, -0.17, 0.058);
  greenLED.rotation.set(Math.PI / 2, 0, 0);
  group.add(greenLED);

  const greenLight = new THREE.PointLight(0x44ff44, !isLocked ? 0.5 : 0.05, 0.3, 2);
  greenLight.position.set(0, -0.17, 0.08);
  group.add(greenLight);

  // Blue LED - GSM ACTIVE
  const blueLEDMat = new THREE.MeshStandardMaterial({
    color: 0x4488ff,
    emissive: 0x0066ff,
    emissiveIntensity: 0.6 + (signalStrength / 100) * 0.4,
    roughness: 0.2,
    metalness: 0.3
  });
  const blueLED = new THREE.Mesh(ledGeo, blueLEDMat);
  blueLED.position.set(-0.04, -0.17, 0.058);
  blueLED.rotation.set(Math.PI / 2, 0, 0);
  group.add(blueLED);

  const blueLight = new THREE.PointLight(0x4488ff, 0.5, 0.3, 2);
  blueLight.position.set(-0.04, -0.17, 0.08);
  group.add(blueLight);

  // Lock bezel/frame
  const bezelGeo = new THREE.BoxGeometry(0.19, 0.46, 0.065);
  const bezelMat = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    roughness: 0.6,
    metalness: 0.3
  });
  const bezel = new THREE.Mesh(bezelGeo, bezelMat);
  bezel.position.set(0, 0, -0.008);
  group.add(bezel);

  // QR Code area
  const qrCodeGeo = new THREE.BoxGeometry(0.05, 0.05, 0.005);
  const qrCodeMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.7,
    metalness: 0.05
  });
  const qrCode = new THREE.Mesh(qrCodeGeo, qrCodeMat);
  qrCode.position.set(-0.04, -0.14, 0.058);
  qrCode.castShadow = true;
  group.add(qrCode);

  // QR code pattern (dark squares)
  const qrPatternGeo = new THREE.BoxGeometry(0.045, 0.045, 0.002);
  const qrPatternMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.8
  });
  const qrPattern = new THREE.Mesh(qrPatternGeo, qrPatternMat);
  qrPattern.position.set(-0.04, -0.14, 0.061);
  qrPattern.castShadow = true;
  group.add(qrPattern);

  // USB/Charging port
  const usbPortGeo = new THREE.BoxGeometry(0.015, 0.008, 0.01);
  const usbPortMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.3,
    metalness: 0.5
  });
  const usbPort = new THREE.Mesh(usbPortGeo, usbPortMat);
  usbPort.position.set(0, -0.22, 0.03);
  group.add(usbPort);

  // Store references for animation
  return {
    group,
    leds: { red: redLED, green: greenLED, blue: blueLED },
    lights: { red: redLight, green: greenLight, blue: blueLight },
    shackle,
    isLocked,
    signalStrength
  };
}
