# CODESTORM 2026 – Google Sheets Registration Database Setup Guide

This guide walks you through setting up **Google Sheets as the central registration database** for the CODESTORM website using **Google Apps Script** and **Google Drive** for secure payment screenshot storage.

---

## Google Sheet Required Columns (A through J)

The production Google Sheet uses the following 10 columns on tab `Registrations`:

| Column | Header | Description | Example |
| :---: | :--- | :--- | :--- |
| **A** | **Timestamp** | Submission timestamp | `2026-09-24 22:30:00` |
| **B** | **Name** | Participant Full Name | `Ananya Sharma` |
| **C** | **Roll Number** | Student Roll / ID Number | `22WH1A0501` |
| **D** | **Email** | Student Email Address | `ananya.sharma@example.com` |
| **E** | **Mobile Number** | 10-digit Mobile Number | `9876543210` |
| **F** | **Year & Branch** | Academic Year, Branch & Section | `3rd Year - CSE (A)` |
| **G** | **Payment Screenshot** | Clickable Drive link | `=HYPERLINK("...", "View Screenshot")` |
| **H** | **Registration ID** | Monotonic ID | `CODESTORM-2026-0019` |
| **I** | **Participant ID** | Login credential ID | `CS26-0019` |
| **J** | **Password** | Temporary organizer password | `K7mP4xQ9` |

> [!IMPORTANT]
> `Participant ID` (Column I) and `Password` (Column J) are written to the **SAME ROW** as the participant's registration.
> If a registration already exists, the system finds the row by `Registration ID` (Column H) and updates Columns I & J in place, never creating a duplicate row.

---

## Architecture Overview

```
STUDENT REGISTRATION
        ↓
CODESTORM Website Form (React)
        ↓  (HTTPS POST with JSON + Base64 Screenshot)
Google Apps Script Web App API (doPost) / Vercel Serverless Function (/api/register)
        ↓
Concurrency Lock (LockService prevents race conditions)
        ↓
Duplicate Check (Registration ID / Roll Number & Email)
        ↓
Google Drive (Stores Payment Screenshot & generates URL)
        ↓
Google Sheet (Writes Row A..J: Timestamp, Name, Roll, Email, Mobile, Year/Branch, Screenshot, Reg ID, Participant ID, Password)
        ↓
Event Conducting Platform (Auth database stores bcrypt hash for login)
        ↓
Website displays "🎉 REGISTRATION SUCCESSFUL!" with Participant ID & Temporary Password
```

---

## Step-by-Step Setup & Deployment Update Instructions

### Step 1: Open Google Apps Script
1. In your existing **Google Sheet**, click **Extensions** in the top menu bar > **Apps Script**.
2. Rename the project to `CODESTORM Registration Backend` (if not already named).

### Step 2: Update Code.gs
1. Open [`google-apps-script/Code.gs`](./google-apps-script/Code.gs) in this repository.
2. Copy the entire file content.
3. In the Apps Script code editor, delete everything and paste the copied code.
4. Ensure `SPREADSHEET_ID` and `DRIVE_FOLDER_ID` match your Google Sheet and Drive folder.
5. Click the **Save** icon (disk symbol) or press `Ctrl + S`.

### Step 3: Run One-Click Header & Column Initialization
1. In the Apps Script toolbar dropdown, select the function **`setupSheet`**.
2. Click **▶ Run**.
3. If prompted with **Authorization required**, click **Review permissions** > **Advanced** > **Go to CODESTORM Registration Backend (unsafe)** > **Allow**.
4. Check your Google Sheet tab: Columns A through J are now styled with dark navy headers (`#0f172a`), white bold text, and frozen top row.

### Step 4: Deploy a New Version (CRITICAL STEP)
> [!WARNING]
> Google Apps Script Web Apps DO NOT automatically update when code is saved. You MUST deploy a New Version for changes to take effect in production!

1. In the top-right corner, click the blue **Deploy** button > **Manage deployments**.
2. Click the **Edit (pencil)** icon on the active deployment.
3. In the **Version** dropdown, select **New version**.
4. Keep:
   - **Execute as:** `Me (your_email@gmail.com)`
   - **Who has access:** `Anyone`
5. Click **Deploy**.

---

## Vercel Production Environment Variables

For the Vercel backend (`api/register.js`), you can configure either option in **Vercel → Project → Settings → Environment Variables**:

### Option A: Google Apps Script Web App Endpoint (Recommended)
- **Key:** `VITE_GOOGLE_SCRIPT_URL`
- **Value:** `https://script.google.com/macros/s/YOUR_APPS_SCRIPT_DEPLOYMENT_ID/exec`

### Option B: Google Cloud Service Account (Direct Google Sheets API)
- **Key:** `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **Value:** `your-service-account@your-project.iam.gserviceaccount.com`
- **Key:** `GOOGLE_PRIVATE_KEY`
- **Value:** `-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
- **Key:** `GOOGLE_SHEET_ID`
- **Value:** `your_google_spreadsheet_id`
- **Key:** `GOOGLE_SHEET_NAME`
- **Value:** `Registrations`

---

## Testing & Verification

1. Submit a test registration from the website (`/#registration`).
2. Verify the Registration Success screen shows:
   - `Registration ID` (e.g. `CODESTORM-2026-0019`)
   - `Participant ID` (e.g. `CS26-0019`)
   - `Temporary Password` (e.g. `K7mP4xQ9`)
3. Open your Google Sheet:
   - Verify Column I contains `CS26-0019`
   - Verify Column J contains `K7mP4xQ9`
   - Both values are on the **SAME ROW** as that participant's registration.
4. Open the Event Platform login page:
   - Enter `CS26-0019` and `K7mP4xQ9`
   - Verify login succeeds immediately!
