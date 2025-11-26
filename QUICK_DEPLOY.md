# ⚡ Quick Deploy Guide

## 🚀 Deploy in 5 Minutes

### Step 1: Push to GitHub (2 minutes)

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: 3D Truck Visualization"

# Create GitHub repo at: https://github.com/new
# Then add remote and push:
git remote add origin https://github.com/YOUR_USERNAME/3d-truck-visualization.git
git branch -M main
git push -u origin main
```

---

### Step 2: Deploy to Netlify (3 minutes)

#### Option A: Via Dashboard (Easiest)
1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Choose "GitHub" → Select your repository
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click "Deploy site"
6. Done! 🎉

#### Option B: Via CLI (Fastest)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build and deploy
npm run build
netlify deploy --prod
```

---

### Step 3: Test Your Deployment

Visit your site:
- **Main:** `https://your-site.netlify.app/`
- **Controller:** `https://your-site.netlify.app/controller.html`

---

## ✅ Pre-Deploy Checklist

- [x] Code is clean and tested
- [x] Build works: `npm run build`
- [x] Preview works: `npm run preview`
- [x] No console errors
- [x] Documentation complete
- [x] .gitignore configured
- [x] netlify.toml configured

---

## 🎯 What Happens During Deployment

1. **GitHub receives your code**
2. **Netlify detects the push**
3. **Netlify runs:** `npm install && npm run build`
4. **Netlify publishes:** `dist/` folder
5. **Your site is live!** 🚀

---

## 📊 Expected Build Time

- **Install dependencies:** ~30 seconds
- **Build project:** ~20 seconds
- **Deploy to CDN:** ~10 seconds
- **Total:** ~1 minute

---

## 🐛 Troubleshooting

### Build Fails?
```bash
# Test locally first
npm install
npm run build
npm run preview
```

### Model Not Loading?
- Check: `public/model/Main_truck_FINAL_opt2.glb` exists
- Verify path in code: `/model/Main_truck_FINAL_opt2.glb`

### Controller Not Syncing?
- Open both pages in same browser
- Check localStorage is enabled

---

## 🎉 Success!

Your 3D Truck Visualization is now live and ready to share!

**Next Steps:**
- Share your URLs
- Monitor performance
- Add custom domain (optional)
- Enable analytics (optional)

---

**Deployment Time:** ~5 minutes  
**Status:** ✅ READY TO DEPLOY
