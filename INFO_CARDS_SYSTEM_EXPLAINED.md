# 📋 Info Cards System - Deep Understanding Guide

## 🎯 Overview
The info cards system displays technical information about the fuel sensor components. It uses **3D-to-2D projection** to position cards in screen space based on 3D object positions, creating an immersive AR-like experience.

---

## 🏗️ System Architecture

### **3 Types of Info Cards:**

1. **Phase 1 Card** - Main sensor overview (follows 3D sensor head)
2. **Phase 2 Cards** - Component breakdown (3 cards with SVG connectors)
3. **Phase 3 Card** - Call-to-action button

---

## 📍 Phase 1: Dynamic 3D-Positioned Card

### **Location in Code:** Lines 1620-1670

### **How It Works:**

```typescript
// 1. STATE MANAGEMENT (Line 594)
const [cardPosition, setCardPosition] = useState({ 
  x: 0,           // Screen X coordinate
  y: 0,           // Screen Y coordinate
  visible: false, // Show/hide based on viewport
  scale: 1,       // Distance-based scaling
  rotateX: 0,     // 3D perspective rotation
  rotateY: 0      // 3D perspective rotation
});
```

### **3D to 2D Projection Process (Lines 1340-1380):**

```typescript
// STEP 1: Get 3D world position of sensor head
const tankPos = new THREE.Vector3();
tankGroup.getWorldPosition(tankPos);

// STEP 2: Create offset (position card to the left of sensor)
const offset = new THREE.Vector3(-5.5, 1.5, 0);
offset.applyQuaternion(truckWorldQuat); // Rotate with truck
tankPos.add(offset);

// STEP 3: Project 3D position to 2D screen coordinates
const projected = tankPos.clone().project(camera);
const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

// STEP 4: Calculate visibility (is it in front of camera?)
const isVisible = projected.z < 1 && 
                 x > 100 && x < window.innerWidth - 100 &&
                 y > 100 && y < window.innerHeight - 100;

// STEP 5: Calculate scale based on distance
const distance = camera.position.distanceTo(tankPos);
const scale = Math.max(0.6, Math.min(1.0, 10 / distance));

// STEP 6: Calculate 3D rotation for perspective effect
const euler = new THREE.Euler().setFromQuaternion(truckWorldQuat);
const rotateY = euler.y * (180 / Math.PI) * 0.5;
const rotateX = euler.x * (180 / Math.PI) * 0.5;

// STEP 7: Update state
setCardPosition({ x, y, visible: isVisible, scale, rotateX, rotateY });
```

### **Card Rendering (Lines 1620-1670):**

```jsx
<div 
  className={`fixed z-20 pointer-events-none
  ${activePhase === 1 && cardPosition.visible ? 'opacity-100' : 'opacity-0'}`}
  style={{
    left: `${cardPosition.x}px`,
    top: `${cardPosition.y}px`,
    transform: `translate(-50%, -50%) 
                scale(${cardPosition.scale}) 
                perspective(1000px) 
                rotateY(${cardPosition.rotateY}deg) 
                rotateX(${cardPosition.rotateX}deg)`,
    transformStyle: 'preserve-3d',
    transition: 'opacity 300ms ease-out'
  }}
>
  <div className="bg-black/90 backdrop-blur-md border-t-2 border-red-600 p-8 w-[450px]">
    {/* Card Content */}
  </div>
</div>
```

---

## 🔗 Phase 2: SVG-Connected Component Cards

### **Location in Code:** Lines 1672-1760

### **How It Works:**

#### **1. SVG Path System (Lines 1672-1700)**

```jsx
<svg className="absolute inset-0 w-full h-full overflow-visible">
  {/* Connector to Head */}
  <path ref={headPathRef} fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 2" />
  <circle ref={headDotRef} r="3" fill="#ffffff" className="animate-pulse" />
  
  {/* Connector to Probe */}
  <path ref={probePathRef} fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 2" />
  <circle ref={probeDotRef} r="3" fill="#ffffff" className="animate-pulse" />
  
  {/* Connector to Filter */}
  <path ref={filterPathRef} fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 2" />
  <circle ref={filterDotRef} r="3" fill="#ffffff" className="animate-pulse" />
</svg>
```

#### **2. Dynamic Path Update Function (Lines 1120-1145)**

```typescript
const updatePath = (object: THREE.Object3D, pathEl: SVGPathElement, dotEl: SVGCircleElement, targetY: number) => {
  // Get 3D position
  const tempV = new THREE.Vector3();
  object.getWorldPosition(tempV);
  tempV.project(camera);
  
  // Convert to screen coordinates
  const startX = (tempV.x * 0.5 + 0.5) * window.innerWidth;
  const startY = (-tempV.y * 0.5 + 0.5) * window.innerHeight;
  
  // End point (fixed at 65% of screen width)
  const endX = window.innerWidth * 0.65;
  const endY = window.innerHeight * targetY;
  
  // Create curved path
  const midX = startX + (endX - startX) * 0.5;
  const pathData = `M ${startX} ${startY} Q ${midX} ${startY} ${endX} ${endY}`;
  
  // Update SVG elements
  pathEl.setAttribute('d', pathData);
  dotEl.setAttribute('cx', String(startX));
  dotEl.setAttribute('cy', String(startY));
};
```

#### **3. Three Info Cards (Lines 1705-1760)**

```jsx
{/* 1. SENSOR HEAD Card - Top (20% height) */}
<div className="absolute left-[66%] top-[20%] w-80 -translate-y-1/2 bg-black/80 backdrop-blur-sm border-l-2 border-red-500 p-4">
  <h3>SENSOR HEAD</h3>
  <p>Advanced MCU with remote calibration...</p>
  <span>REMOTE CAL</span>
  <span>MULTI-IF</span>
</div>

{/* 2. FUEL PROBE Card - Middle (50% height) */}
<div className="absolute left-[66%] top-[50%] w-80 -translate-y-1/2 bg-black/80 backdrop-blur-sm border-l-2 border-red-500 p-4">
  <h3>FUEL PROBE</h3>
  <p>High-precision capacitive probe...</p>
  <span>±1% ACCURACY</span>
  <span>ANTI-SLOSH</span>
</div>

{/* 3. PROTECTION CAGE Card - Bottom (75% height) */}
<div className="absolute left-[66%] top-[75%] w-80 -translate-y-1/2 bg-black/80 backdrop-blur-sm border-l-2 border-red-500 p-4">
  <h3>PROTECTION CAGE</h3>
  <p>Corrosion-resistant protective cage...</p>
  <span>IP67</span>
  <span>SHOCK-PROOF</span>
</div>
```

---

## 📊 Card Data Structure

### **Phase 1 Card Data:**
```typescript
{
  title: "FUEL LEVEL SENSOR PRO",
  component: "SENSOR HEAD",
  description: "IP67 certified sensor with advanced MCU...",
  specs: {
    interfaces: "CAN / RS232 / MOD",
    voltage: "9-36V DC",
    accuracy: "±1% Static",
    resolution: "<0.5mm"
  }
}
```

### **Phase 2 Cards Data:**
```typescript
[
  {
    title: "SENSOR HEAD",
    icon: Cpu,
    description: "Advanced MCU with remote calibration...",
    tags: ["REMOTE CAL", "MULTI-IF"],
    position: { left: "66%", top: "20%" }
  },
  {
    title: "FUEL PROBE",
    icon: BarChart3,
    description: "High-precision capacitive probe...",
    tags: ["±1% ACCURACY", "ANTI-SLOSH"],
    position: { left: "66%", top: "50%" }
  },
  {
    title: "PROTECTION CAGE",
    icon: Layers,
    description: "Corrosion-resistant protective cage...",
    tags: ["IP67", "SHOCK-PROOF"],
    position: { left: "66%", top: "75%" }
  }
]
```

---

## 🎨 How to Add New Cards

### **Option 1: Add to Phase 1 (Dynamic 3D Card)**

1. **Modify the card content** (Lines 1643-1668):
```jsx
<h2>YOUR NEW TITLE</h2>
<p>Your new description...</p>

{/* Add new specs */}
<div className="grid grid-cols-2 gap-4">
  <div>
    <div className="text-[10px] text-gray-500">NEW SPEC</div>
    <div className="text-white font-bold">VALUE</div>
  </div>
</div>
```

### **Option 2: Add to Phase 2 (Component Breakdown)**

1. **Add new SVG path** (Lines 1672-1700):
```jsx
<path ref={newComponentPathRef} fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="4 2" />
<circle ref={newComponentDotRef} r="3" fill="#ffffff" className="animate-pulse" />
```

2. **Create ref in component**:
```typescript
const newComponentPathRef = useRef<SVGPathElement>(null);
const newComponentDotRef = useRef<SVGCircleElement>(null);
```

3. **Update path in animation loop** (Line 1388):
```typescript
if(newComponentPathRef.current && newComponentDotRef.current) 
  updatePath(newComponent3DObject, newComponentPathRef.current, newComponentDotRef.current, 0.85);
```

4. **Add new info card** (after Line 1760):
```jsx
<div className="absolute left-[66%] top-[85%] w-80 -translate-y-1/2 bg-black/80 backdrop-blur-sm border-l-2 border-red-500 p-4">
  <div className="flex items-start justify-between mb-2">
    <h3 className="font-bold text-lg text-white">NEW COMPONENT</h3>
    <YourIcon size={16} className="text-red-500"/>
  </div>
  <p className="text-xs text-gray-400 mb-3">Your description...</p>
  <div className="flex gap-2">
    <span className="bg-red-900/30 border border-red-900/50 text-[10px] px-2 py-1 text-red-300 rounded-sm">TAG1</span>
    <span className="bg-red-900/30 border border-red-900/50 text-[10px] px-2 py-1 text-red-300 rounded-sm">TAG2</span>
  </div>
</div>
```

---

## 🔄 Animation Flow

```
Scroll Position → activePhase State → Card Visibility

Phase 0 (0-25%):   Intro - No cards
Phase 1 (25-50%):  Sensor Head Focus - Dynamic 3D card appears
Phase 2 (50-75%):  Component Breakdown - 3 cards + SVG connectors
Phase 3 (75-100%): Deployment - CTA button
```

---

## 🎯 Key Concepts

1. **3D-to-2D Projection**: Uses Three.js `project()` to convert 3D world coordinates to 2D screen pixels
2. **Dynamic Positioning**: Card follows 3D object as camera moves
3. **Perspective Transform**: CSS 3D transforms create depth effect
4. **SVG Connectors**: Curved paths dynamically connect 3D objects to 2D cards
5. **Scroll-Based Phases**: Different card layouts for different scroll positions

---

## 💡 Tips for Customization

- **Change card position offset**: Modify `new THREE.Vector3(-5.5, 1.5, 0)` (Line 1343)
- **Adjust card size**: Change `w-[450px]` or `w-80` classes
- **Modify colors**: Update `border-red-600`, `bg-black/90`, etc.
- **Add animations**: Use Tailwind `animate-` classes or CSS transitions
- **Change SVG endpoints**: Modify `window.innerWidth * 0.65` and `targetY` values

---

**This system creates an immersive, interactive experience by seamlessly blending 3D graphics with 2D UI elements!** 🚀
