# Natural Daylight Lighting Setup

## Overview
Implemented realistic natural daylight lighting to simulate outdoor daytime conditions with sun, sky, and ambient light.

## Lighting Configuration

### 1. Sun (Main Directional Light) ☀️
```typescript
const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(50, 100, 50); // High in the sky, angled
sunLight.castShadow = true;
```

**Properties:**
- **Color:** Pure white (`0xffffff`)
- **Intensity:** 1.5 (bright daylight)
- **Position:** High and angled (50, 100, 50) - simulates afternoon sun
- **Shadows:** Enabled with soft PCF shadows
- **Shadow map:** 2048x2048 resolution
- **Coverage:** 100m x 100m area

**Purpose:** Primary light source simulating the sun

### 2. Sky Light (Hemisphere Light) 🌤️
```typescript
const skyLight = new THREE.HemisphereLight(
  0x87ceeb, // Sky blue
  0x8b7355, // Ground brown/tan
  0.6
);
```

**Properties:**
- **Sky Color:** Sky blue (`0x87ceeb`)
- **Ground Color:** Brown/tan (`0x8b7355`)
- **Intensity:** 0.6
- **No shadows:** Ambient fill light

**Purpose:** Simulates light from the sky dome and ground reflection

### 3. Ambient Fill Light 💡
```typescript
const ambientFill = new THREE.AmbientLight(0xffffff, 0.4);
```

**Properties:**
- **Color:** Pure white (`0xffffff`)
- **Intensity:** 0.4 (subtle fill)
- **No shadows:** Uniform illumination

**Purpose:** Simulates scattered daylight and prevents pure black shadows

## Shadow System

### Renderer Configuration
```typescript
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft natural shadows
renderer.toneMappingExposure = 1.0; // Natural daylight exposure
```

**Shadow Type:** PCFSoftShadowMap
- Soft, natural-looking shadows
- Better performance than VSM
- Realistic outdoor shadow quality

### Shadow Casting Objects
- ✅ Truck model (all meshes)
- ✅ Highway signs
- ✅ Gantry structures

### Shadow Receiving Surfaces
- ✅ Ground plane
- ✅ Road surface
- ✅ Truck model (self-shadowing)
- ✅ Highway signs

## Visual Characteristics

### Lighting Quality
- **Natural color temperature:** Pure white sunlight
- **Realistic shadows:** Soft edges, natural falloff
- **Sky ambient:** Blue tint from above, warm tint from ground
- **Depth perception:** Strong directional shadows
- **Time of day:** Mid-afternoon (sun at ~45° angle)

### Shadow Behavior
- **Direction:** Consistent with sun position (NE to SW)
- **Softness:** PCF filtering for natural edges
- **Intensity:** Visible but not harsh
- **Coverage:** 100m radius from origin

## Performance Optimization

### Shadow Map Settings
- **Resolution:** 2048x2048 (high quality)
- **Update:** Every frame (dynamic)
- **Type:** PCF (good balance of quality/performance)
- **Bias:** -0.0001 (prevents shadow acne)

### Light Count
- **Total lights:** 3 (optimal for performance)
- **Shadow casting:** 1 (sun only)
- **Ambient:** 2 (no shadow overhead)

## Comparison

### Before (No Lights)
- Flat, unlit appearance
- No depth perception
- Materials appeared dull
- No shadows

### After (Natural Daylight)
- Realistic outdoor lighting
- Strong depth perception
- Natural color temperature
- Soft, realistic shadows
- Sky/ground ambient color

## Time of Day Simulation

Current setup simulates **mid-afternoon** conditions:
- Sun position: High and angled (50, 100, 50)
- Shadow direction: Northeast to Southwest
- Light intensity: Bright daylight (1.5)
- Sky color: Clear blue

### To Adjust Time of Day:

**Morning (sunrise):**
```typescript
sunLight.position.set(100, 30, 0); // Low angle from east
sunLight.color.setHex(0xfff4e6); // Warm orange tint
sunLight.intensity = 1.2;
```

**Noon (overhead):**
```typescript
sunLight.position.set(0, 150, 0); // Directly overhead
sunLight.intensity = 2.0; // Brightest
```

**Evening (sunset):**
```typescript
sunLight.position.set(-100, 20, 0); // Low angle from west
sunLight.color.setHex(0xff8844); // Orange/red tint
sunLight.intensity = 0.8;
```

**Overcast:**
```typescript
sunLight.intensity = 0.8; // Dimmer
skyLight.intensity = 0.9; // More ambient
ambientFill.intensity = 0.6; // Softer shadows
```

## Material Compatibility

All materials now properly respond to natural daylight:
- **MeshStandardMaterial:** Full PBR lighting
- **MeshBasicMaterial:** Unaffected (self-illuminated)
- **Emissive properties:** Still visible
- **Textures:** Properly lit and shaded

## Testing Checklist
- [x] Sun casts shadows
- [x] Sky provides ambient blue tint
- [x] Ground provides warm ambient tint
- [x] Shadows are soft and natural
- [x] Truck model properly lit
- [x] Highway signs visible
- [x] No harsh black shadows
- [x] Realistic outdoor appearance

## Files Modified
- `src/App.tsx` - Natural daylight lighting added

## Performance Impact
- ✅ **Optimized:** Only 1 shadow-casting light
- ✅ **Efficient:** PCF shadows (good quality/performance)
- ✅ **Balanced:** 3 total lights (industry standard)
- ⚠️ **Trade-off:** Shadow map updates every frame

## Recommendations

### For Better Performance:
- Reduce shadow map size to 1024x1024
- Use `THREE.BasicShadowMap` instead of PCF
- Disable shadows on small objects

### For Better Quality:
- Increase shadow map to 4096x4096
- Use `THREE.VSMShadowMap` for softer shadows
- Add subtle rim light for edge definition

### For Different Moods:
- Adjust sun color for warm/cool tones
- Change sky color for weather conditions
- Modify intensity for different times of day
