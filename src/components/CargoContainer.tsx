import * as THREE from 'three';

/**
 * Creates a realistic shipping container based on reference image
 * Features:
 * - Vertical corrugated panels
 * - Detailed door hardware (hinges, locking bars, handles)
 * - Corner posts and reinforcement beams
 * - Realistic proportions and industrial details
 */
export function createCargoContainer(
  wireMat: THREE.LineBasicMaterial,
  trailerGridMat: THREE.MeshBasicMaterial
): THREE.Group {
  const containerGroup = new THREE.Group();
  
  // Container dimensions (standard 40ft container proportions)
  const width = 6.5;
  const height = 9.5;
  const length = 26;
  const wallThickness = 0.08;
  const baseYPosition = 4.5; // Position higher above chassis
  
  // === MAIN BODY (Semi-transparent container body) ===
  // Note: No wireframe edges added to main body to avoid duplicate floating border
  const bodyGeo = new THREE.BoxGeometry(width, height, length);
  const body = new THREE.Mesh(bodyGeo, trailerGridMat);
  body.position.y = baseYPosition;
  containerGroup.add(body);
  
  // === VERTICAL CORRUGATED PANELS ===
  const corrugationMat = new THREE.MeshBasicMaterial({
    color: 0x550000,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });
  
  const corrugationDepth = 0.03;
  const corrugationWidth = 0.25;
  const numCorrugations = Math.floor(length / corrugationWidth);
  
  // Left side corrugations
  for (let i = 0; i < numCorrugations; i++) {
    const zPos = -length/2 + (i * corrugationWidth) + corrugationWidth/2;
    
    const corrugationGeo = new THREE.BoxGeometry(corrugationDepth, height - 0.5, corrugationWidth - 0.02);
    const leftCorrugation = new THREE.Mesh(corrugationGeo, corrugationMat);
    leftCorrugation.position.set(-width/2 - corrugationDepth/2, baseYPosition, zPos);
    containerGroup.add(leftCorrugation);
    
    // Right side corrugations
    const rightCorrugation = leftCorrugation.clone();
    rightCorrugation.position.x = width/2 + corrugationDepth/2;
    containerGroup.add(rightCorrugation);
  }
  
  // === CORNER POSTS (4 vertical structural posts) ===
  const cornerPostMat = new THREE.MeshBasicMaterial({
    color: 0xff3300,
    transparent: true,
    opacity: 0.9
  });
  
  const postWidth = 0.15;
  const postGeo = new THREE.BoxGeometry(postWidth, height, postWidth);
  
  const cornerPositions = [
    [-width/2 + postWidth/2, baseYPosition, -length/2 + postWidth/2],  // Front left
    [width/2 - postWidth/2, baseYPosition, -length/2 + postWidth/2],   // Front right
    [-width/2 + postWidth/2, baseYPosition, length/2 - postWidth/2],   // Back left
    [width/2 - postWidth/2, baseYPosition, length/2 - postWidth/2]     // Back right
  ];
  
  cornerPositions.forEach(([x, y, z]) => {
    const post = new THREE.Mesh(postGeo, cornerPostMat);
    post.position.set(x, y, z);
    containerGroup.add(post);
    
    // Add wireframe edges to posts
    const postEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(postGeo, 15),
      wireMat
    );
    postEdges.position.set(x, y, z);
    containerGroup.add(postEdges);
  });
  
  // === HORIZONTAL REINFORCEMENT BEAMS ===
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xff4400,
    transparent: true,
    opacity: 0.8
  });
  
  const beamHeight = 0.12;
  const beamDepth = 0.12;
  
  // Top, middle, and bottom beams
  const beamHeights = [
    // height - 1.5,  // Top - REMOVED: was creating floating orange frame at top
    height / 2,    // Middle
    -0.5           // Bottom
  ];
  
  beamHeights.forEach(yOffset => {
    // Front horizontal beam
    const frontBeamGeo = new THREE.BoxGeometry(width - postWidth * 2, beamHeight, beamDepth);
    const frontBeam = new THREE.Mesh(frontBeamGeo, beamMat);
    frontBeam.position.set(0, baseYPosition + yOffset, -length/2);
    containerGroup.add(frontBeam);
    
    // Back horizontal beam
    const backBeam = frontBeam.clone();
    backBeam.position.z = length/2;
    containerGroup.add(backBeam);
    
    // Left side beam
    const sideBeamGeo = new THREE.BoxGeometry(beamDepth, beamHeight, length - postWidth * 2);
    const leftBeam = new THREE.Mesh(sideBeamGeo, beamMat);
    leftBeam.position.set(-width/2, baseYPosition + yOffset, 0);
    containerGroup.add(leftBeam);
    
    // Right side beam
    const rightBeam = leftBeam.clone();
    rightBeam.position.x = width/2;
    containerGroup.add(rightBeam);
  });
  
  // === REAR DOOR ASSEMBLY ===
  const doorMat = new THREE.MeshBasicMaterial({
    color: 0x660000,
    transparent: true,
    opacity: 0.6,
    side: THREE.DoubleSide
  });
  
  // Door panels (split in middle)
  const doorWidth = (width - postWidth * 2) / 2 - 0.1;
  const doorHeight = height - 2;
  const doorGeo = new THREE.BoxGeometry(doorWidth, doorHeight, wallThickness);
  
  // Left door
  const leftDoor = new THREE.Mesh(doorGeo, doorMat);
  leftDoor.position.set(-doorWidth/2 - 0.05, baseYPosition, length/2 + wallThickness/2);
  containerGroup.add(leftDoor);
  
  // Right door
  const rightDoor = leftDoor.clone();
  rightDoor.position.x = doorWidth/2 + 0.05;
  containerGroup.add(rightDoor);
  
  // Door edges (bright orange outline)
  const doorEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(doorGeo, 10),
    new THREE.LineBasicMaterial({ color: 0xff5500, linewidth: 2 })
  );
  doorEdges.position.copy(leftDoor.position);
  containerGroup.add(doorEdges);
  
  const rightDoorEdges = doorEdges.clone();
  rightDoorEdges.position.copy(rightDoor.position);
  containerGroup.add(rightDoorEdges);
  
  // === DOOR VERTICAL CORRUGATIONS (matching side panels) ===
  const doorCorrugationMat = new THREE.MeshBasicMaterial({
    color: 0x550000,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide
  });
  
  const doorCorrugationWidth = 0.2;
  const numDoorCorrugations = Math.floor(doorWidth / doorCorrugationWidth);
  
  // Left door corrugations
  for (let i = 0; i < numDoorCorrugations; i++) {
    const xOffset = -doorWidth/2 + (i * doorCorrugationWidth) + doorCorrugationWidth/2;
    const corrGeo = new THREE.BoxGeometry(doorCorrugationWidth - 0.02, doorHeight - 0.3, 0.03);
    const corr = new THREE.Mesh(corrGeo, doorCorrugationMat);
    corr.position.set(-doorWidth/2 - 0.05 + xOffset, baseYPosition, length/2 + 0.1);
    containerGroup.add(corr);
  }
  
  // Right door corrugations
  for (let i = 0; i < numDoorCorrugations; i++) {
    const xOffset = -doorWidth/2 + (i * doorCorrugationWidth) + doorCorrugationWidth/2;
    const corrGeo = new THREE.BoxGeometry(doorCorrugationWidth - 0.02, doorHeight - 0.3, 0.03);
    const corr = new THREE.Mesh(corrGeo, doorCorrugationMat);
    corr.position.set(doorWidth/2 + 0.05 + xOffset, baseYPosition, length/2 + 0.1);
    containerGroup.add(corr);
  }
  
  // === DOOR HINGES (4 per door - evenly spaced) ===
  const hingeMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
  const hingeGeo = new THREE.BoxGeometry(0.1, 0.3, 0.15);
  
  for (let i = 0; i < 4; i++) {
    const hingeY = baseYPosition - doorHeight/2 + doorHeight * (0.15 + i * 0.25);
    
    // Left door hinges (on left edge)
    const leftHinge = new THREE.Mesh(hingeGeo, hingeMat);
    leftHinge.position.set(-width/2 + postWidth, hingeY, length/2 + 0.12);
    containerGroup.add(leftHinge);
    
    // Hinge pin (cylinder)
    const pinGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8);
    const pin = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: 0x666666 }));
    pin.position.set(-width/2 + postWidth, hingeY, length/2 + 0.12);
    containerGroup.add(pin);
    
    // Right door hinges (on right edge)
    const rightHinge = leftHinge.clone();
    rightHinge.position.x = width/2 - postWidth;
    containerGroup.add(rightHinge);
    
    const rightPin = pin.clone();
    rightPin.position.x = width/2 - postWidth;
    containerGroup.add(rightPin);
  }
  
  // === LOCKING BARS (Vertical bars on door edges) ===
  const lockBarMat = new THREE.MeshBasicMaterial({ color: 0xff6600 });
  const lockBarGeo = new THREE.BoxGeometry(0.08, doorHeight * 0.85, 0.08);
  
  // Left door vertical locking bars (2 bars)
  const leftLockBar1 = new THREE.Mesh(lockBarGeo, lockBarMat);
  leftLockBar1.position.set(-doorWidth - 0.1, baseYPosition, length/2 + 0.15);
  containerGroup.add(leftLockBar1);
  
  const leftLockBar2 = leftLockBar1.clone();
  leftLockBar2.position.x = -0.1;
  containerGroup.add(leftLockBar2);
  
  // Right door vertical locking bars (2 bars)
  const rightLockBar1 = new THREE.Mesh(lockBarGeo, lockBarMat);
  rightLockBar1.position.set(0.1, baseYPosition, length/2 + 0.15);
  containerGroup.add(rightLockBar1);
  
  const rightLockBar2 = rightLockBar1.clone();
  rightLockBar2.position.x = doorWidth + 0.1;
  containerGroup.add(rightLockBar2);
  
  // === HORIZONTAL LOCKING BARS (Top and bottom) ===
  const horizLockBarGeo = new THREE.BoxGeometry(doorWidth * 0.6, 0.08, 0.08);
  
  // Left door horizontal bars
  const leftTopBar = new THREE.Mesh(horizLockBarGeo, lockBarMat);
  leftTopBar.position.set(-doorWidth/2 - 0.05, baseYPosition + doorHeight/2 - 0.3, length/2 + 0.15);
  containerGroup.add(leftTopBar);
  
  const leftBottomBar = leftTopBar.clone();
  leftBottomBar.position.y = baseYPosition - doorHeight/2 + 0.3;
  containerGroup.add(leftBottomBar);
  
  // Right door horizontal bars
  const rightTopBar = new THREE.Mesh(horizLockBarGeo, lockBarMat);
  rightTopBar.position.set(doorWidth/2 + 0.05, baseYPosition + doorHeight/2 - 0.3, length/2 + 0.15);
  containerGroup.add(rightTopBar);
  
  const rightBottomBar = rightTopBar.clone();
  rightBottomBar.position.y = baseYPosition - doorHeight/2 + 0.3;
  containerGroup.add(rightBottomBar);
  
  // === DOOR HANDLES (Horizontal rotating handles) ===
  const handleMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
  
  // Left door handle assembly
  const handleGeo = new THREE.CylinderGeometry(0.05, 0.05, 1.0, 12);
  const leftHandle = new THREE.Mesh(handleGeo, handleMat);
  leftHandle.rotation.z = Math.PI / 2;
  leftHandle.position.set(-doorWidth/2 - 0.05, baseYPosition + doorHeight/2 - 0.6, length/2 + 0.18);
  containerGroup.add(leftHandle);
  
  // Handle mounting bracket (left)
  const bracketGeo = new THREE.BoxGeometry(0.15, 0.15, 0.08);
  const bracketMat = new THREE.MeshBasicMaterial({ color: 0x888888 });
  const leftBracket = new THREE.Mesh(bracketGeo, bracketMat);
  leftBracket.position.set(-doorWidth/2 - 0.05, baseYPosition + doorHeight/2 - 0.6, length/2 + 0.12);
  containerGroup.add(leftBracket);
  
  // Right door handle assembly
  const rightHandle = leftHandle.clone();
  rightHandle.position.x = doorWidth/2 + 0.05;
  containerGroup.add(rightHandle);
  
  const rightBracket = leftBracket.clone();
  rightBracket.position.x = doorWidth/2 + 0.05;
  containerGroup.add(rightBracket);
  
  // === LOCKING MECHANISM (Cam locks at top and bottom) ===
  const camLockGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.12, 8);
  const camLockMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
  
  // Top locks (left door)
  const topLockLeft = new THREE.Mesh(camLockGeo, camLockMat);
  topLockLeft.rotation.x = Math.PI / 2;
  topLockLeft.position.set(-doorWidth/2 - 0.05, baseYPosition + doorHeight/2 - 0.25, length/2 + 0.18);
  containerGroup.add(topLockLeft);
  
  // Top locks (right door)
  const topLockRight = topLockLeft.clone();
  topLockRight.position.x = doorWidth/2 + 0.05;
  containerGroup.add(topLockRight);
  
  // Bottom locks (left door)
  const bottomLockLeft = topLockLeft.clone();
  bottomLockLeft.position.y = baseYPosition - doorHeight/2 + 0.25;
  containerGroup.add(bottomLockLeft);
  
  // Bottom locks (right door)
  const bottomLockRight = topLockRight.clone();
  bottomLockRight.position.y = baseYPosition - doorHeight/2 + 0.25;
  containerGroup.add(bottomLockRight);
  
  // === CENTER LOCKING MECHANISM (where doors meet) ===
  // Vertical locking rod housing
  const centerLockGeo = new THREE.BoxGeometry(0.12, doorHeight * 0.4, 0.12);
  const centerLock = new THREE.Mesh(centerLockGeo, new THREE.MeshBasicMaterial({ color: 0xff6600 }));
  centerLock.position.set(0, baseYPosition, length/2 + 0.15);
  containerGroup.add(centerLock);
  
  // Center lock handle
  const centerHandleGeo = new THREE.BoxGeometry(0.3, 0.08, 0.08);
  const centerHandle = new THREE.Mesh(centerHandleGeo, handleMat);
  centerHandle.position.set(0, baseYPosition + doorHeight * 0.25, length/2 + 0.18);
  containerGroup.add(centerHandle);
  
  // === ROOF DETAILS ===
  // Roof cross beams
  const roofBeamGeo = new THREE.BoxGeometry(width, 0.08, 0.15);
  const roofBeamMat = new THREE.MeshBasicMaterial({ color: 0xff3300, transparent: true, opacity: 0.7 });
  
  for (let i = 0; i < 5; i++) {
    const zPos = -length/2 + (i + 1) * (length / 6);
    const roofBeam = new THREE.Mesh(roofBeamGeo, roofBeamMat);
    roofBeam.position.set(0, baseYPosition + height/2, zPos);
    containerGroup.add(roofBeam);
  }
  
  // === IDENTIFICATION MARKINGS ===
  // Container number plates (front)
  const plateMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
  const plateGeo = new THREE.BoxGeometry(2.0, 0.4, 0.05);
  
  const frontPlate = new THREE.Mesh(plateGeo, plateMat);
  frontPlate.position.set(0, baseYPosition + height/2 - 0.8, -length/2 + 0.05);
  containerGroup.add(frontPlate);
  
  // Side identification plates
  const sidePlateGeo = new THREE.BoxGeometry(0.05, 0.6, 3.0);
  const leftSidePlate = new THREE.Mesh(sidePlateGeo, plateMat);
  leftSidePlate.position.set(-width/2 + 0.05, baseYPosition + height/2 - 1.0, -length/2 + 3);
  containerGroup.add(leftSidePlate);
  
  const rightSidePlate = leftSidePlate.clone();
  rightSidePlate.position.x = width/2 - 0.05;
  containerGroup.add(rightSidePlate);
  
  return containerGroup;
}
