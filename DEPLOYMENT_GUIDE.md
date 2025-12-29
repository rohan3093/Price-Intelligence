# Deployment Guide - Publish Your App to the Web

## Pre-Deployment Checklist

✅ **Completed:**
- Firebase Firestore configured
- Firebase Authentication enabled
- Security rules deployed
- Code builds successfully

## Step 1: Build Your App Locally (Test)

First, make sure your app builds correctly:

```bash
npm run build
```

This creates a `dist/` folder with your production-ready app. If this works, you're ready to deploy!

## Step 2: Choose a Hosting Platform

### Option A: Vercel (Recommended - Easiest)

**Why Vercel?**
- ✅ Free tier
- ✅ Automatic deployments from Git
- ✅ Easy environment variable setup
- ✅ Great for React/Vite apps

**Steps:**

1. **Push your code to GitHub** (if not already):
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Go to [Vercel](https://vercel.com)**
   - Sign up/login with GitHub
   - Click **"Add New Project"**
   - Import your GitHub repository

3. **Configure Project:**
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

4. **Add Environment Variables:**
   - Click **"Environment Variables"**
   - Add all your Firebase config variables:
     ```
     VITE_FIREBASE_API_KEY=your_api_key
     VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
     VITE_FIREBASE_PROJECT_ID=your_project_id
     VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
     VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     VITE_FIREBASE_APP_ID=your_app_id
     ```
   - Copy these from your `.env` file

5. **Deploy:**
   - Click **"Deploy"**
   - Wait 2-3 minutes
   - Your app will be live at `your-project.vercel.app`

6. **Custom Domain (Optional):**
   - Go to Project Settings → Domains
   - Add your custom domain

---

### Option B: Netlify (Alternative)

**Steps:**

1. **Push code to GitHub** (same as above)

2. **Go to [Netlify](https://netlify.com)**
   - Sign up/login with GitHub
   - Click **"Add new site"** → **"Import an existing project"**
   - Select your repository

3. **Configure Build Settings:**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`

4. **Add Environment Variables:**
   - Go to Site Settings → Environment Variables
   - Add all `VITE_FIREBASE_*` variables

5. **Deploy:**
   - Click **"Deploy site"**
   - Your app will be live at `your-project.netlify.app`

---

### Option C: Firebase Hosting (Google's Own)

**Steps:**

1. **Install Firebase CLI:**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Initialize Firebase Hosting:**
   ```bash
   firebase init hosting
   ```
   - Select your project: `intelligence-exchange-8281f`
   - Public directory: `dist`
   - Single-page app: Yes
   - Auto-build: No (we'll build manually)

4. **Build and Deploy:**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

5. **Your app will be live at:**
   - `https://intelligence-exchange-8281f.web.app`
   - Or your custom domain if configured

---

## Step 3: Environment Variables Setup

**IMPORTANT:** You must add your Firebase config to your hosting platform!

Copy these from your `.env` file:

```bash
VITE_FIREBASE_API_KEY=AIzaSyAO1upDeT8-oTcGlA4G_d_es9dRha1LIBs
VITE_FIREBASE_AUTH_DOMAIN=intelligence-exchange-8281f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=intelligence-exchange-8281f
VITE_FIREBASE_STORAGE_BUCKET=intelligence-exchange-8281f.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=957550637988
VITE_FIREBASE_APP_ID=1:957550637988:web:e6d26e43ff4f9169d5c731
```

**Where to add:**
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- **Firebase Hosting**: Not needed (uses same project)

---

## Step 4: Post-Deployment Checklist

After deploying, test these:

1. ✅ **App loads** - Visit your live URL
2. ✅ **Assets load** - Check if market data appears
3. ✅ **Analyst login works** - Try logging in
4. ✅ **Can create assets** - Test creating a new asset
5. ✅ **Can add B2B listings** - Test adding a listing
6. ✅ **Public can read** - Open in incognito, verify you can see assets

---

## Step 5: Update Firebase Auth Authorized Domains

**IMPORTANT:** Add your deployment URL to Firebase Auth:

1. Go to Firebase Console → **Authentication** → **Settings**
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Add your deployment URL (e.g., `your-project.vercel.app`)
5. Click **"Add"**

This allows Firebase Auth to work on your deployed site.

---

## Step 6: Custom Domain (Optional)

### For Vercel:
1. Go to Project Settings → Domains
2. Add your domain
3. Follow DNS setup instructions

### For Netlify:
1. Go to Site Settings → Domain Management
2. Add custom domain
3. Follow DNS setup instructions

### For Firebase Hosting:
1. Go to Firebase Console → Hosting
2. Click "Add custom domain"
3. Follow verification steps

---

## Troubleshooting

### "Firebase not configured" error
- ✅ Check environment variables are set in hosting platform
- ✅ Make sure variable names start with `VITE_`
- ✅ Redeploy after adding variables

### "Permission denied" errors
- ✅ Check Firestore security rules are published
- ✅ Verify Firebase Auth is enabled
- ✅ Check authorized domains in Firebase Auth settings

### Assets not loading
- ✅ Check Firebase Console → Firestore → Data
- ✅ Verify assets exist in the database
- ✅ Check browser console for errors

### Build fails
- ✅ Run `npm run build` locally first to catch errors
- ✅ Check for TypeScript errors
- ✅ Verify all dependencies are in `package.json`

---

## Recommended: Vercel

I recommend **Vercel** because:
- ✅ Easiest setup
- ✅ Automatic deployments on git push
- ✅ Free SSL certificate
- ✅ Great performance
- ✅ Perfect for React/Vite apps

**Quick Start with Vercel:**
1. Push code to GitHub
2. Go to vercel.com
3. Import repository
4. Add environment variables
5. Deploy!

---

## Next Steps After Deployment

1. **Share with analysts** - Give them the URL and login credentials
2. **Monitor usage** - Check Firebase Console for usage stats
3. **Set up custom domain** - Make it look professional
4. **Enable analytics** - Track user engagement
5. **Set up backups** - Export Firestore data regularly

---

**Ready to deploy?** Choose Vercel (easiest) or follow the steps for your preferred platform!

