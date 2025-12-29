# Firebase Hosting Setup - Step by Step

## Step 1: Login to Firebase

Run this command (it will open your browser):

```bash
firebase login
```

This will:
- Open your browser
- Ask you to authenticate with Google
- Grant Firebase CLI access to your account

## Step 2: Initialize Hosting

Run this command:

```bash
firebase init hosting
```

**When prompted, select:**

1. **"Use an existing project"** → Select `intelligence-exchange-8281f`
2. **"What do you want to use as your public directory?"** → Type: `dist`
3. **"Configure as a single-page app (rewrite all urls to /index.html)?"** → Type: `Yes`
4. **"Set up automatic builds and deploys with GitHub?"** → Type: `No`
5. **"File dist/index.html already exists. Overwrite?"** → Type: `No`

This creates:
- `firebase.json` - Hosting configuration
- `.firebaserc` - Project reference

## Step 3: Build Your App

```bash
npm run build
```

This creates the `dist/` folder with your production-ready app.

## Step 4: Deploy

```bash
firebase deploy --only hosting
```

This will:
- Upload your `dist/` folder to Firebase Hosting
- Give you a URL like: `https://intelligence-exchange-8281f.web.app`

## Step 5: Add Domain to Firebase Auth

**IMPORTANT:** After deployment, add your hosting URL to Firebase Auth:

1. Go to Firebase Console → **Authentication** → **Settings**
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Add: `intelligence-exchange-8281f.web.app`
5. Click **"Add"**

## Future Deployments

After making changes:

```bash
npm run build
firebase deploy --only hosting
```

That's it! Your app will be live! 🚀
