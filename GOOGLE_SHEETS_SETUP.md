# CODESTORM 2026 – Google Sheets Registration Database Setup Guide

This guide walks you through setting up **Google Sheets as the central registration database** for the CODESTORM website using **Google Apps Script** and **Google Drive** for secure payment screenshot storage.

---

## Architecture Overview

```
STUDENT REGISTRATION
        ↓
CODESTORM Website Form (React)
        ↓  (HTTPS POST with JSON + Base64 Screenshot)
Google Apps Script Web App API (doPost)
        ↓
Concurrency Lock (LockService prevents race conditions)
        ↓
Duplicate Check (Roll Number & Email)
        ↓
Google Drive (Stores Payment Screenshot & generates URL)
        ↓
Google Sheet (Appends new row with clickable '=HYPERLINK()' screenshot)
        ↓
Unique Sequential Registration ID (CODESTORM-2026-0001, 0002...)
        ↓
Website displays "🎉 REGISTRATION SUCCESSFUL!" with Registration ID
```

---

## Step-by-Step Setup Instructions

### Step 1: Create the Google Sheet
1. Open your web browser and go to [https://sheets.new](https://sheets.new) (or open Google Drive and create a new Google Sheet).
2. Title the spreadsheet at top-left: `CODESTORM 2026 Registrations`.
3. In the bottom tab bar, ensure the sheet tab name is `Registrations` (double-click the tab named `Sheet1` and rename it to `Registrations`).
4. Look at the browser address bar. The URL will look like:
   ```
   https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
   ```
5. Copy the long ID string between `/d/` and `/edit`.
   - In the example above, the ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
   - **Save this as your `SPREADSHEET_ID`.**

---

### Step 2: Create the Google Drive Folder for Payment Screenshots
1. Open [Google Drive](https://drive.google.com).
2. Click **+ New** > **New folder**.
3. Name the folder: `CODESTORM 2026 Payment Screenshots`.
4. Double-click to open this folder.
5. Look at the browser address bar. The URL will look like:
   ```
   https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0jklmnopqrstuv
   ```
6. Copy the folder ID string after `/folders/`.
   - In the example above, the ID is: `1a2b3c4d5e6f7g8h9i0jklmnopqrstuv`
   - **Save this as your `DRIVE_FOLDER_ID`.**

---

### Step 3: Create the Google Apps Script Project
1. Option A (Recommended): In your Google Sheet, click **Extensions** in the top menu bar > **Apps Script**.
2. Option B: Go directly to [https://script.google.com](https://script.google.com) and click **+ New project**.
3. Rename the project at top-left to `CODESTORM Registration Backend`.
4. Delete any default code inside `Code.gs`.
5. Open the file [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) from this repository, copy all of its code, and paste it into the Apps Script editor.

---

### Step 4: Add the Spreadsheet ID
1. In the Apps Script editor, locate the configuration section at the top:
   ```javascript
   const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID";
   ```
2. Replace `"YOUR_GOOGLE_SHEET_ID"` with the actual Spreadsheet ID you copied in **Step 1**:
   ```javascript
   const SPREADSHEET_ID = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
   ```

---

### Step 5: Add the Drive Folder ID
1. Right below `SPREADSHEET_ID`, locate:
   ```javascript
   const DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";
   ```
2. Replace `"YOUR_GOOGLE_DRIVE_FOLDER_ID"` with the Drive Folder ID you copied in **Step 2**:
   ```javascript
   const DRIVE_FOLDER_ID = "1a2b3c4d5e6f7g8h9i0jklmnopqrstuv";
   ```
3. Click the **Save** icon (disk symbol) or press `Ctrl + S`.

---

### ⚡ Bonus: One-Click Automatic Sheet Formatting
Before deploying, format your Google Sheet automatically with one click:
1. In the Apps Script toolbar, click the function dropdown (it might say `doPost` or `myFunction`).
2. Select **`setupSheet`**.
3. Click **▶ Run**.
4. If prompted with **Authorization required**:
   - Click **Review permissions**.
   - Select your Google account.
   - Click **Advanced** (at the bottom-left of the warning popup).
   - Click **Go to CODESTORM Registration Backend (unsafe)**.
   - Click **Allow**.
5. Switch to your Google Sheet tab. You will see:
   - Row 1 frozen and styled with a professional dark navy background, white bold text, and centered alignment.
   - All 8 columns created:
     `Timestamp | Name | Roll Number | Email | Mobile Number | Year & Branch | Payment Screenshot | Registration ID`
   - Filter controls enabled.
   - Column widths automatically formatted.

---

### Step 6: Deploy Apps Script as a Web App
1. In the top-right corner of Google Apps Script, click the blue **Deploy** button > select **New deployment**.
2. Click the gear icon (`⚙️`) next to "Select type" and choose **Web app**.
3. Fill in the deployment details:
   - **Description:** `CODESTORM 2026 Registration API v1`
   - **Execute as:** `Me (your_email@gmail.com)`
   - **Who has access:** `Anyone` *(CRITICAL: Must be "Anyone" so student submissions do not require Google login!)*
4. Click **Deploy**.

---

### Step 7: Set Correct Access Permissions
- **Execute as:** Must remain **`Me (your account)`**. This allows the script to write rows to your private Google Sheet and upload screenshots to your private Google Drive folder using your script credentials.
- **Who has access:** Must be set to **`Anyone`**.
- Do not choose "Only myself" or "Anyone within organization", or submissions from students outside will fail with 401/403 errors.

---

### Step 8: Copy the Web App URL
1. After clicking **Deploy**, a dialog will appear showing your **Web app URL**.
2. It looks like:
   ```
   https://script.google.com/macros/s/AKfycbx_ExampleDeploymentID123456789/exec
   ```
3. Click the **Copy** button next to the Web app URL.
4. *(Optional Verification)* Paste this URL in a new browser tab. You should see a JSON health check:
   ```json
   {
     "status": "online",
     "service": "CODESTORM 2026 Google Sheets Registration API",
     "spreadsheetConfigured": true,
     "driveFolderConfigured": true
   }
   ```

---

### Step 9: Add the Web App URL to the React Frontend
1. In your project root, locate the `.env` file (or copy `.env.example` to `.env`):
   ```bash
   cp .env.example .env
   ```
2. Paste your Web App URL into `VITE_GOOGLE_SCRIPT_URL`:
   ```env
   VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/AKfycbx_ExampleDeploymentID123456789/exec
   ```
   *(Alternatively, you can also paste it into `src/config.js` as the fallback value).*
3. Restart your development server so Vite loads the new environment variable:
   ```bash
   npm run dev
   ```

---

### Step 10: Test a Registration
1. Open the CODESTORM registration website in your browser (`http://localhost:5173/#registration`).
2. Fill out the registration form:
   - **Full Name:** e.g. `Ananya Sharma`
   - **College:** e.g. `Malla Reddy Engineering College`
   - **Roll Number:** e.g. `22WH1A0501`
   - **Branch:** `CSE`
   - **Year:** `3rd Year`
   - **Language:** `Python`
   - **Email:** `ananya.sharma@example.com`
   - **Mobile Number:** `9876543210`
   - **Transaction ID:** `UPI987654321`
   - **Upload Payment Screenshot:** Select any PNG/JPG image
   - Check the declaration box.
3. Click **Register for ₹50**.
4. The button displays `Submitting...` while:
   - Frontend encodes the screenshot to Base64.
   - Sends the JSON payload to Google Apps Script.
   - Apps Script acquires lock, checks for duplicates, uploads image to Drive, generates `CODESTORM-2026-0001`, and appends the row to Google Sheets.
5. The website displays the success screen:
   ```
   🎉 REGISTRATION SUCCESSFUL!

   Registration ID:
   CODESTORM-2026-0001

   Your registration has been recorded successfully.
   Please save your Registration ID.
   ```
6. **Test Duplicate Protection**:
   - Return to the form and try to register again with the **same Roll Number** (`22WH1A0501`) or the **same Email** (`ananya.sharma@example.com`).
   - The system displays the red error banner:
     `"This roll number or email is already registered for CODESTORM."`
   - All entered form fields and screenshot preview remain safely preserved.
   - Click **TRY AGAIN** to easily modify details and retry.

---

### Step 11: Check the Registration in Google Sheets & Google Drive
1. Open your **Google Sheet**:
   - You will see the new row with exact columns:
     `Timestamp | Name | Roll Number | Email | Mobile Number | Year & Branch | Payment Screenshot | Registration ID`
   - The **Payment Screenshot** cell contains a clickable blue link: `View Screenshot`.
   - Click `View Screenshot`—it opens the image directly in Google Drive!
   - The **Registration ID** column displays `CODESTORM-2026-0001`.
2. Open your **Google Drive Folder**:
   - You will see the file `PAYMENT_CODESTORM-2026-0001_22WH1A0501.jpg` safely stored.
3. Subsequent registrations will automatically increment:
   - `CODESTORM-2026-0002`
   - `CODESTORM-2026-0003`
   - and so on.

---

## Troubleshooting & FAQ

| Problem | Cause | Solution |
| :--- | :--- | :--- |
| **"Google Apps Script Web App URL is not configured yet"** | `VITE_GOOGLE_SCRIPT_URL` is empty in `.env` | Add your Web App URL to `.env` and restart `npm run dev`. |
| **"Failed to upload payment screenshot to Google Drive"** | `DRIVE_FOLDER_ID` is invalid or missing permissions | Re-check the folder ID in `Code.gs` and re-deploy a new version. |
| **"This roll number or email is already registered"** | Participant has already registered | Backend prevents duplicate submissions with matching Roll Number or Email. |
| **CORS / Preflight Error** | POST request using custom `application/json` headers | The frontend uses `Content-Type: text/plain;charset=utf-8` to bypass preflight while Google Apps Script parses `e.postData.contents`. |
| **Apps Script code changes not taking effect** | Web App deployment wasn't updated | In Apps Script, click **Deploy** > **Manage deployments** > click Edit (pencil) > choose **Version: New version** > click **Deploy**. |
