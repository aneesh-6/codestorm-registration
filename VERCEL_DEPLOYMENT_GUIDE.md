# Deploying CODESTORM to Vercel

This guide covers the two easiest ways to deploy CODESTORM to [Vercel](https://vercel.com).

---

## Method 1: Deploy via GitHub (Recommended)

This is the standard and easiest way to deploy and maintain your website with automatic continuous deployment.

### Step 1: Push Code to GitHub
1. Create a new repository on [GitHub](https://github.com/new) named `codestorm`.
2. Push your project files to the repository:
   ```bash
   git init
   git add .
   git commit -m "CODESTORM 2026 registration portal ready for deployment"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/codestorm.git
   git push -u origin main
   ```

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **"Add New..."** → **"Project"**.
3. Under **Import Git Repository**, find your `codestorm` repository and click **Import**.
4. Vercel will automatically detect the settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. *(Optional)* Expand **Environment Variables** and add:
   - **Key**: `VITE_GOOGLE_SCRIPT_URL`
   - **Value**: `https://script.google.com/macros/s/AKfycbzimvHGfplmvIIrU9D7AZJHKXXYARvhP4H5IRRXmavv339DtXs2OnjQhXJcBh1Ub8By/exec`
   *(Note: This is already configured as the default fallback in `src/config.js`, so deployment works even without adding this variable).*
6. Click **Deploy**.

---

## Method 2: Deploy directly via Vercel CLI

If you prefer deploying directly from your computer terminal without connecting GitHub:

### Step 1: Open Terminal in Project Directory
Open your terminal (PowerShell, Command Prompt, or VS Code terminal) in:
`c:\Users\anees\OneDrive\Documents\MY PROJECTS\codestorm`

### Step 2: Run Vercel CLI
```bash
npx vercel
```

### Step 3: Follow the On-Screen Prompts
1. **Set up and deploy?**: Press `Y` and Enter.
2. **Which scope?**: Select your personal Vercel account.
3. **Link to existing project?**: Press `N` (for first-time deploy).
4. **Project name**: Press Enter to accept `codestorm` (or type a custom name).
5. **In which directory is your code located?**: Press Enter for `./`.
6. **Want to modify these settings?**: Press `N` (defaults are correct).

Vercel will build and deploy your site in ~30 seconds and provide your live production URL (e.g., `https://codestorm-xxx.vercel.app`).

### Step 4: Deploy to Production
To make it your main production domain, run:
```bash
npx vercel --prod
```

---

## What is Already Configured for You

- ✅ **`vercel.json`**: Configured with SPA rewrite rules so client-side routing and page refresh on `/registration-success` works without 404 errors.
- ✅ **Tested Production Build**: `npm run build` has been verified and builds in < 1s with zero errors.
- ✅ **Google Sheets Web App**: Connected to your live Google Apps Script endpoint.
- ✅ **WhatsApp Group Link**: Connected to `https://chat.whatsapp.com/FYVIZ11zmBB50cX8yk0KIj`.
- ✅ **Payment QR Code**: Scannable UPI QR code bundled inside `public/`.
