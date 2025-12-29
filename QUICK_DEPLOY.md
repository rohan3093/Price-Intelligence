# Quick Firebase Hosting Deploy

## Run These Commands in Your Terminal

### Step 1: Login to Firebase
```bash
cd "/Users/rohanagarwal/Intelligence Exchange"
firebase login
```
- This will open your browser
- Sign in with your Google account (the one you used for Firebase)
- Grant permissions
- Come back to terminal when it says "Success! Logged in as..."

### Step 2: Initialize Hosting
```bash
firebase init hosting
```

**Answer the prompts:**
1. **"Use an existing project"** → Select `intelligence-exchange-8281f` (use arrow keys, press Enter)
2. **"What do you want to use as your public directory?"** → Type: `dist` (press Enter)
3. **"Configure as a single-page app?"** → Type: `Yes` (press Enter)
4. **"Set up automatic builds with GitHub?"** → Type: `No` (press Enter)
5. **"File dist/index.html already exists. Overwrite?"** → Type: `No` (press Enter)

### Step 3: Build Your App
```bash
npm run build
```

### Step 4: Deploy!
```bash
firebase deploy --only hosting
```

You'll see output like:
```
✔ Deploy complete!

Hosting URL: https://intelligence-exchange-8281f.web.app
```

### Step 5: Add Domain to Firebase Auth (IMPORTANT!)

1. Go to: https://console.firebase.google.com/project/intelligence-exchange-8281f/authentication/settings
2. Scroll to **"Authorized domains"**
3. Click **"Add domain"**
4. Enter: `intelligence-exchange-8281f.web.app`
5. Click **"Add"**

## That's It! 🎉

Your app is now live at: **https://intelligence-exchange-8281f.web.app**

## Future Updates

When you make changes:
```bash
npm run build
firebase deploy --only hosting
```

---

**Need help?** Let me know if you get stuck on any step!

