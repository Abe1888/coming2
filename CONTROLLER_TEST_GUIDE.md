# 🎮 Controller Page - Test Guide

## How to Test Real-Time Updates

### Setup

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Open TWO browser tabs:**
   - Tab 1: `http://localhost:5173/` (Main page)
   - Tab 2: `http://localhost:5173/controller.html` (Controller)

3. **Arrange tabs side-by-side** (or use two monitors)

### Test Scenarios

#### Test 1: Truck Position
1. Go to controller → 🚛 Truck tab
2. Move the X position slider
3. **Expected:** Truck moves left/right on main page instantly

#### Test 2: Fuel Sensor
1. Go to controller → ⛽ Fuel tab
2. Adjust position sliders
3. **Expected:** Fuel sensor moves on main page instantly

#### Test 3: Cargo Lock
1. Go to controller → 🔒 Lock tab
2. Adjust position sliders
3. **Expected:** Cargo lock moves on main page instantly

#### Test 4: Camera Keyframes
1. Go to controller → 📹 Camera tab
2. Select a phase (e.g., "Cab Approach")
3. Adjust position sliders
4. **Expected:** Camera keyframes update (scroll main page to see effect)

#### Test 5: Audio
1. Go to controller → 🎮 Demo tab
2. Click "🔇 Audio OFF" to turn ON
3. **Expected:** Audio starts on main page
4. Click "📯 Truck Horn"
5. **Expected:** Horn sounds on main page

#### Test 6: Grid & Mode
1. Go to controller → 🎮 Demo tab
2. Click "Show Grid"
3. **Expected:** Grid appears on main page
4. Click "Switch to Blueprint"
5. **Expected:** Mode changes on main page

### Connection Status

**Controller shows:**
- 🟢 Connected - Main page is open and active
- 🔴 Disconnected - Main page is closed

**To test:**
1. Open both pages → Should show "🟢 Connected"
2. Close main page → Should show "🔴 Disconnected" after 5 seconds
3. Reopen main page → Should show "🟢 Connected" again

### Troubleshooting

**If updates don't work:**

1. **Check console logs:**
   - Main page should log: "🚛 Truck updated from controller"
   - Controller should log: "Saved to storage"

2. **Check localStorage:**
   - Open DevTools → Application → Local Storage
   - Should see keys: `truck-config`, `fuel-sensor-config`, etc.

3. **Refresh both pages:**
   - Sometimes browser needs refresh to establish connection

4. **Check browser:**
   - localStorage must be enabled
   - No private/incognito mode restrictions

### Expected Behavior

✅ **Instant Updates** - Changes appear immediately (< 100ms)  
✅ **Smooth Animation** - No lag or stuttering  
✅ **Bidirectional** - Main page settings also update controller  
✅ **Persistent** - State survives page refresh  
✅ **Connection Aware** - Shows if main page is active  

### Debug Mode

**Enable verbose logging:**
1. Open browser console (F12)
2. Watch for messages:
   - "🚛 Truck updated from controller"
   - "⛽ Fuel sensor updated from controller"
   - "🔒 Cargo lock updated from controller"
   - "📹 Camera updated from controller"

### Performance

- Updates happen every 100ms (10 times per second)
- Smooth enough for real-time control
- No noticeable lag
- Efficient localStorage usage

🎮 **Controller is ready for testing!**
