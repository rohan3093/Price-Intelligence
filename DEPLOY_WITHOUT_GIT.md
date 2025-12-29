# Deploy Without Git/GitHub

If you don't want to use Git, here are alternative deployment methods:

## Option 1: Vercel CLI (No Git Required)

### Step 1: Install Vercel CLI
```bash
npm install -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
This will open a browser to authenticate.

### Step 3: Deploy
```bash
cd "/Users/rohanagarwal/Intelligence Exchange"
vercel
```

Follow the prompts:
- Set up and deploy? **Yes**
- Which scope? (select your account)
- Link to existing project? **No**
- Project name? (press Enter for default)
- Directory? (press Enter for `./`)
- Override settings? **No**

### Step 4: Add Environment Variables
After first deploy, add your Firebase config:
```bash
vercel env add VITE_FIREBASE_API_KEY
vercel env add VITE_FIREBASE_AUTH_DOMAIN
vercel env add VITE_FIREBASE_PROJECT_ID
vercel env add VITE_FIREBASE_STORAGE_BUCKET
vercel env add VITE_FIREBASE_MESSAGING_SENDER_ID
vercel env add VITE_FIREBASE_APP_ID
```

Enter the values when prompted (copy from your `.env` file).

### Step 5: Redeploy
```bash
vercel --prod
```

Your app will be live! 🎉

---

## Option 2: Netlify CLI (No Git Required)

### Step 1: Install Netlify CLI
```bash
npm install -g netlify-cli
```

### Step 2: Login
```bash
netlify login
```

### Step 3: Deploy
```bash
cd "/Users/rohanagarwal/Intelligence Exchange"
npm run build
netlify deploy --prod
```

Follow prompts to create a new site.

### Step 4: Add Environment Variables
Go to Netlify dashboard → Your site → Site settings → Environment variables
Add all `VITE_FIREBASE_*` variables.

---

## Option 3: Firebase Hosting (No Git Required)

### Step 1: Install Firebase CLI
```bash
npm install -g firebase-tools
```

### Step 2: Login
```bash
firebase login
```

### Step 3: Initialize Hosting
```bash
cd "/Users/rohanagarwal/Intelligence Exchange"
firebase init hosting
```

Select:
- Use existing project: **Yes**
- Select project: **intelligence-exchange-8281f**
- Public directory: **dist**
- Single-page app: **Yes**
- Auto-build: **No**

### Step 4: Build and Deploy
```bash
npm run build
firebase deploy --only hosting
```

Your app will be at: `https://intelligence-exchange-8281f.web.app`

**Note:** Firebase Hosting uses the same project, so environment variables are automatically available!

---

## Option 4: Manual Upload (Any Static Host)

1. **Build your app:**
   ```bash
   npm run build
   ```

2. **Upload the `dist/` folder** to any static hosting:
   - GitHub Pages (via web interface)
   - AWS S3 + CloudFront
   - Any web hosting service

3. **Set environment variables** (if the platform supports it)

---

## Recommended: Vercel CLI (Option 1)

Easiest and fastest way to deploy without Git!

