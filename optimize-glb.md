# 🎯 GLB Optimization Guide

## Your GLB File Analysis

**Current File:** `public/model/Main_truck_FINAL_opt2.glb`  
**Size:** 9.46 MB  
**Status:** ❌ Too large for optimal web delivery

---

## Option 1: Online Tools (Easiest - No Installation)

### A. gltf.report (Recommended)
1. Visit: https://gltf.report/
2. Upload your GLB file
3. Review the analysis report
4. Download optimized version

### B. glTF-Transform Web UI
1. Visit: https://gltf-transform.donmccurdy.com/
2. Upload your GLB
3. Apply these optimizations:
   - ✅ Draco compression (Level 10)
   - ✅ Deduplicate
   - ✅ Weld vertices (0.0001)
   - ✅ Prune unused data
4. Download optimized file

---

## Option 2: Command Line Tools (Most Control)

### Install Tools

```powershell
# Install Node.js tools globally
npm install -g gltf-pipeline @gltf-transform/cli
```

### Method A: gltf-pipeline (Simple Draco Compression)

```powershell
# Navigate to your project
cd path\to\your\project

# Compress with Draco
gltf-pipeline -i public\model\Main_truck_FINAL_opt2.glb -o public\model\Main_truck_FINAL_draco.glb --draco.compressionLevel 10

# Expected output size: 2-4 MB (60-70% reduction)
```

### Method B: gltf-transform (Advanced Optimization)

```powershell
# Full optimization pipeline
gltf-transform optimize public\model\Main_truck_FINAL_opt2.glb public\model\Main_truck_FINAL_optimized.glb --compress draco --texture-compress webp --simplify 0.95 --weld 0.0001 --deduplicate

# Expected output size: 1.5-3 MB (70-85% reduction)
```

### Method C: Custom Script (Maximum Control)

Create a file `optimize-model.js`:

```javascript
const { NodeIO } = require('@gltf-transform/core');
const { ALL_EXTENSIONS } = require('@gltf-transform/extensions');
const { 
  dedup, 
  draco, 
  prune, 
  weld,
  textureCompress
} = require('@gltf-transform/functions');
const draco3d = require('draco3dgltf');

async function optimizeGLB() {
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({
      'draco3d.decoder': await draco3d.createDecoderModule(),
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  // Read GLB
  const document = await io.read('public/model/Main_truck_FINAL_opt2.glb');

  // Apply optimizations
  await document.transform(
    // Remove duplicate data
    dedup(),
    
    // Weld vertices (merge nearby vertices)
    weld({ tolerance: 0.0001 }),
    
    // Draco compression
    draco({
      quantizePosition: 14,
      quantizeNormal: 10,
      quantizeTexcoord: 12,
      quantizeColor: 8,
      quantizeGeneric: 12
    }),
    
    // Compress textures to WebP
    textureCompress({
      encoder: sharp,
      targetFormat: 'webp',
      quality: 85
    }),
    
    // Remove unused data
    prune()
  );

  // Write optimized GLB
  await io.write('public/model/Main_truck_FINAL_optimized.glb', document);
  
  console.log('✅ Optimization complete!');
}

optimizeGLB().catch(console.error);
```

Run it:
```powershell
npm install @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions draco3dgltf sharp
node optimize-model.js
```

---

## Option 3: Blender (If You Have Source Files)

If you have the original .blend file:

1. Open in Blender
2. Select truck model
3. **Decimate Modifier:**
   - Add Modifier → Decimate
   - Ratio: 0.5-0.7 (reduce polygon count)
   - Apply modifier
4. **Texture Optimization:**
   - UV Editing → Pack Islands
   - Reduce texture resolution (4K → 2K)
5. **Export Settings:**
   - File → Export → glTF 2.0
   - Format: GLB
   - ✅ Apply Modifiers
   - ✅ Compression: Draco
   - Compression Level: 10
   - ✅ Limit to Selected Objects

---

## After Optimization: Update Your Code

### Step 1: Add Draco Loader Support

In `src/main.tsx`, update the loader setup:

```typescript
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// Add before GLTFLoader setup
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
dracoLoader.setDecoderConfig({ type: 'js' }); // Use JS decoder (more compatible)

const loader = new GLTFLoader();
loader.setDRACOLoader(dracoLoader); // Add this line
loader.setMeshoptDecoder(MeshoptDecoder);
```

### Step 2: Update Model Path

```typescript
// Change the model path to your optimized file
loader.load(
  '/model/Main_truck_FINAL_draco.glb', // or Main_truck_FINAL_optimized.glb
  (gltf) => {
    // ... rest of your code
  }
);
```

### Step 3: Test Loading

```powershell
npm run dev
```

Open browser and check:
- ✅ Model loads faster
- ✅ No visual differences
- ✅ Wheels still rotate
- ✅ Camera animation works
- ✅ Console shows no errors

---

## Verification Checklist

After optimization, verify:

- [ ] File size reduced by at least 50%
- [ ] Model loads in browser without errors
- [ ] All materials/textures look correct
- [ ] Wheel rotation still works
- [ ] Camera keyframes still work
- [ ] Fuel sensor visible
- [ ] Cargo lock visible
- [ ] No console errors
- [ ] FPS improved (check with F12 → Performance)

---

## Troubleshooting

### Issue: Model doesn't load after compression

**Solution 1:** Check console for errors
```javascript
loader.load(
  '/model/Main_truck_FINAL_draco.glb',
  (gltf) => { console.log('✅ Loaded'); },
  (progress) => { console.log('Loading...', progress); },
  (error) => { console.error('❌ Error:', error); } // Check this
);
```

**Solution 2:** Verify Draco decoder path
```typescript
// Try CDN path
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

// Or local path
dracoLoader.setDecoderPath('/draco/');
```

**Solution 3:** Use lower compression level
```powershell
# Try compression level 7 instead of 10
gltf-pipeline -i input.glb -o output.glb --draco.compressionLevel 7
```

### Issue: Model looks different after compression

**Cause:** Aggressive geometry simplification

**Solution:** Disable simplification
```powershell
# Remove --simplify flag
gltf-transform optimize input.glb output.glb --compress draco --deduplicate
```

### Issue: Wheels don't rotate after optimization

**Cause:** Geometry centering might be affected

**Solution:** Re-center geometries in code
```typescript
wheelRefs.axle001_A.geometry.center(); // Already in your code
```

---

## Expected Results

### Before Optimization
- **File Size:** 9.46 MB
- **Load Time (3G):** 8-12 seconds
- **Parse Time:** 2-3 seconds
- **Total Time to Interactive:** 10-15 seconds

### After Optimization (Draco Level 10)
- **File Size:** 2-4 MB ⚡ **60-70% smaller**
- **Load Time (3G):** 2-4 seconds ⚡ **70% faster**
- **Parse Time:** 1-2 seconds ⚡ **40% faster**
- **Total Time to Interactive:** 3-6 seconds ⚡ **60% faster**

### After Full Optimization (gltf-transform)
- **File Size:** 1.5-3 MB ⚡ **70-85% smaller**
- **Load Time (3G):** 1.5-3 seconds ⚡ **80% faster**
- **Parse Time:** 0.5-1 second ⚡ **70% faster**
- **Total Time to Interactive:** 2-4 seconds ⚡ **75% faster**

---

## Recommended Workflow

1. **Backup original file** (already done - you have Main_truck_FINAL_opt2.glb)
2. **Try online tool first** (gltf.report) - easiest, no installation
3. **If satisfied, update code** with Draco loader
4. **Test thoroughly** - check all features work
5. **If not satisfied, try command-line tools** for more control
6. **Keep both files** during testing period
7. **Deploy optimized version** once verified

---

## Quick Start (Recommended Path)

```powershell
# 1. Install gltf-pipeline (one-time setup)
npm install -g gltf-pipeline

# 2. Compress your GLB
gltf-pipeline -i public\model\Main_truck_FINAL_opt2.glb -o public\model\Main_truck_FINAL_draco.glb --draco.compressionLevel 10

# 3. Check file size
Get-Item public\model\Main_truck_FINAL_draco.glb | Select-Object Name, Length

# 4. Update your code (see Step 1 & 2 above)

# 5. Test
npm run dev
```

**Estimated time:** 10-15 minutes  
**Expected improvement:** 60-70% smaller file, 70% faster loading

---

## Need Help?

If you encounter issues:
1. Check the Troubleshooting section above
2. Verify Draco decoder is loading (check Network tab in DevTools)
3. Try a lower compression level (7 instead of 10)
4. Ensure original file isn't corrupted (test loading original first)

**Ready to optimize? Start with the Quick Start section above!** 🚀
