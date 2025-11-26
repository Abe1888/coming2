# 🚀 Deployment Guide

## Project: 3D Truck Visualization

This guide covers deployment to GitHub and Netlify.

---

## 📋 Pre-Deployment Checklist

- ✅ All temporary documentation files ignored in `.gitignore`
- ✅ Backup folder preserved locally but ignored in deployment
- ✅ Build configuration optimized
- ✅ Environment variables configured
- ✅ Performance optimizations applied

---

## 🐙 GitHub Deployment

### 1. Initialize Git Repository (if not already done)

```bash
git init
git add .
git commit -m "Initial commit: 3D Truck Visualization"
```

### 2. Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `3d-truck-visualization`)
3. **Do NOT** initialize with README (we already have one)

### 3. Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/3d-truck-visualization.git
git branch -M main
git push -u origin main
```

---

## 🌐 Netlify Deployment

### Method 1: Deploy via Netlify CLI (Recommended)

#### Install Netlify CLI
```bash
npm install -g netlify-cli
```

#### Login to Netlify
```bash
netlify login
```

#### Build and Deploy
```bash
# Build the project
npm run build

# Deploy to Netlify
netlify deploy --prod
```

#### Follow the prompts:
- **Site name:** Choose a unique name (e.g., `translink-3d-truck`)
- **Publish directory:** `dist`

---

### Method 2: Deploy via Netlify Dashboard

1. **Login to Netlify:** [https://app.netlify.com](https://app.netlify.com)

2. **Import from Git:**
   - Click "Add new site" → "Import an existing project"
   - Choose "GitHub"
   - Select your repository

3. **Build Settings:**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 18

4. **Deploy:**
   - Click "Deploy site"
   - Wait for build to complete (~2-3 minutes)

---

### Method 3: Drag & Drop (Quick Test)

```bash
# Build locally
npm run build

# Drag the 'dist' folder to Netlify dashboard
```

1. Go to [https://app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the `dist` folder
3. Get instant deployment URL

---

## 🔧 Build Commands

### Development
```bash
npm run dev
```
- Main page: `http://localhost:5173/`
- Controller: `http://localhost:5173/controller.html`

### Production Build
```bash
npm run build
```
- Output: `dist/` folder
- Optimized and minified

### Preview Production Build
```bash
npm run preview
```
- Test production build locally

---

## 📦 What Gets Deployed

### Included:
- ✅ `index.html` - Main 3D visualization
- ✅ `controller.html` - Controller interface
- ✅ `src/` - All source code
- ✅ `public/model/` - Optimized truck model
- ✅ `public/Logo-white.png` - Logo asset
- ✅ `README.md` - Project documentation
- ✅ `CONTROLLER_PAGE.md` - Controller guide
- ✅ `CONTROLLER_TEST_GUIDE.md` - Testing guide
- ✅ `package.json` - Dependencies

### Excluded (via .gitignore):
- ❌ `node_modules/` - Dependencies (installed during build)
- ❌ `dist/` - Build output (generated during deployment)
- ❌ `BACKUP/` - Local backup folder
- ❌ Temporary documentation files
- ❌ Build tool scripts (.bat files)
- ❌ Development logs

---

## 🌍 Environment Variables

No environment variables required for this project. All configuration is in the code.

---

## 🎯 Post-Deployment

### Test Your Deployment

1. **Main Page:**
   - Visit: `https://your-site.netlify.app/`
   - Test scroll-based camera animation
   - Test audio controls
   - Verify 3D model loads

2. **Controller Page:**
   - Visit: `https://your-site.netlify.app/controller.html`
   - Test all control tabs
   - Verify real-time sync with main page

### Performance Checks

- ✅ 60 FPS rendering
- ✅ Model loads in <3 seconds
- ✅ Smooth scroll animation
- ✅ Audio system works
- ✅ Controller sync works

---

## 🔄 Continuous Deployment

Once connected to GitHub, Netlify will automatically:
- Build on every push to `main` branch
- Deploy preview for pull requests
- Rollback to previous versions if needed

---

## 📊 Monitoring

### Netlify Dashboard
- Build logs
- Deploy history
- Performance analytics
- Error tracking

### Browser DevTools
- Check console for errors
- Monitor FPS (Performance tab)
- Check network requests

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Model Not Loading
- Check `public/model/Main_truck_FINAL_opt2.glb` exists
- Verify file path in code: `/model/Main_truck_FINAL_opt2.glb`
- Check browser console for 404 errors

### Controller Not Syncing
- Open both pages in same browser
- Check localStorage is enabled
- Verify both pages are from same domain

---

## 📝 Custom Domain (Optional)

### Add Custom Domain in Netlify:
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS records
4. Enable HTTPS (automatic)

---

## 🎉 Success!

Your 3D Truck Visualization is now live!

**Share your deployment:**
- Main page: `https://your-site.netlify.app/`
- Controller: `https://your-site.netlify.app/controller.html`

---

## 📞 Support

For issues or questions:
- Check browser console for errors
- Review Netlify build logs
- Verify all files are committed to Git
- Test locally with `npm run build && npm run preview`

---

**Last Updated:** November 26, 2025
