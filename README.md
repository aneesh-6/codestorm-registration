# ⚡ CODESTORM – Official Registration Portal

> **A Technical Coding Program**  
> Department of CSE – Data Science  
> Malla Reddy Engineering College and Management Sciences (An UGC Autonomous Institution)  
> Kistapur Village, Medchal Road, Medchal, Hyderabad – 501401, Telangana, India

---

## 📋 Project Overview

A full-stack, production-ready event registration portal for **CODESTORM**, featuring:

- 🎨 **Premium academic design** – Navy, Orange, Teal palette on clean white background
- 📱 **Mobile-first responsive** design
- 📝 **Full registration form** with 11 fields + inline validation
- 💳 **Payment flow** with QR code placeholder and UPI ID slot
- ✅ **Success screen** with downloadable Registration ID (`CS-2026-XXXX`)
- 📊 **Master Google Sheets Database** – Direct integration via Google Apps Script Web App API with Google Drive screenshot storage
- 🆔 **Sequential Registration IDs** – Auto-generated format: `CODESTORM-2026-0001`, `CODESTORM-2026-0002`
- 🛡️ **Duplicate Submission Protection** – Backend check preventing multiple registrations with same Roll Number or Email
- 📖 **Complete Setup Guide** – Detailed in [GOOGLE_SHEETS_SETUP.md](./GOOGLE_SHEETS_SETUP.md)
- ♿ **Accessible** – ARIA labels, keyboard navigation, good contrast

---

## 🏗️ Project Structure

```
codestorm/
├── src/                    # React + Vite frontend
│   ├── components/
│   │   ├── Navbar.jsx / .css
│   │   ├── HeroSection.jsx / .css
│   │   ├── AboutSection.jsx / .css
│   │   ├── RoundsSection.jsx / .css
│   │   ├── HighlightsSection.jsx / .css
│   │   ├── RegistrationSection.jsx / .css
│   │   ├── SuccessScreen.jsx / .css
│   │   ├── CoordinatorsSection.jsx / .css
│   │   ├── ContactSection.jsx / .css
│   │   └── Footer.jsx / .css
│   ├── utils/
│   │   └── validation.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── server/                 # Node.js + Express backend
│   ├── models/
│   │   └── Registration.js
│   ├── routes/
│   │   └── registration.js
│   ├── middleware/
│   │   └── upload.js
│   ├── utils/
│   │   └── generateId.js
│   └── server.js
├── uploads/                # Payment screenshots (auto-created, gitignored)
├── .env.example            # Environment variables template
├── .gitignore
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites

- Node.js v18+ (https://nodejs.org)
- MongoDB Atlas account (free) or local MongoDB
- npm or yarn

### Step 1: Clone / Open the Project

```bash
cd codestorm
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

### Step 3: Install Backend Dependencies

```bash
cd server
npm install
cd ..
```

### Step 4: Configure Environment Variables

```bash
# Copy the example file
copy .env.example server\.env   # Windows
# cp .env.example server/.env   # Mac/Linux
```

Open `server/.env` and fill in your values:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/codestorm
ADMIN_SECRET=your_super_secret_admin_key
CLIENT_URL=http://localhost:5173
```

### Step 5: Start the Backend

```bash
cd server
node server.js
```

You should see:
```
✅  Connected to MongoDB
🚀  CODESTORM server running on http://localhost:5000
```

### Step 6: Start the Frontend (in a new terminal)

```bash
# From the codestorm/ root
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔧 Before Going Live

### Add Payment Details

In `src/components/RegistrationSection.jsx`, find the payment panel section and replace:

```
[PAYMENT QR CODE]   →  <img src="/qr-code.png" alt="Payment QR code" />
[ADD UPI ID]        →  your-upi-id@upi
```

Upload your QR code image to `public/` as `qr-code.png`.

### Add Event Email

In `src/components/ContactSection.jsx`, replace:
```
[ ADD EVENT EMAIL ]  →  codestorm@mrem.ac.in  (or your actual email)
```

---

## 📊 Admin API

Retrieve all registrations (requires admin secret header):

```bash
curl -H "x-admin-secret: your_admin_secret" http://localhost:5000/api/admin/registrations
```

Query parameters:
| Param | Type | Description |
|-------|------|-------------|
| `search` | string | Search by name, email, roll number, reg ID |
| `branch` | string | Filter by branch |
| `year` | string | Filter by year |
| `page` | number | Page number (default: 1) |
| `limit` | number | Results per page (default: 50) |

Example:
```
GET /api/admin/registrations?search=aneesh&branch=CSE&year=2nd Year&page=1&limit=20
```

---

## 🌐 Production Deployment

### Frontend (Vercel)

```bash
# Build the frontend
npm run build

# Deploy to Vercel
npx vercel --prod
```

Set environment variable in Vercel dashboard:
- No env vars needed for the frontend itself (API is proxied via Vite)

### Backend (Railway / Render)

1. Create a new service on [Railway](https://railway.app) or [Render](https://render.com)
2. Point it to the `server/` directory
3. Set environment variables:
   - `MONGODB_URI` = your MongoDB Atlas connection string
   - `ADMIN_SECRET` = your admin secret
   - `CLIENT_URL` = your Vercel frontend URL
   - `PORT` = 5000

### Update Vite Proxy for Production

In `vite.config.js`, the proxy only works in dev. For production builds, update the `fetch('/api/register')` call in `RegistrationSection.jsx` to use the full backend URL:

```js
const API_URL = import.meta.env.VITE_API_URL || '';
const res = await fetch(`${API_URL}/api/register`, { ... });
```

Then add `VITE_API_URL=https://your-backend.railway.app` to Vercel environment variables.

---

## 🔐 Security Notes

- `.env` is **gitignored** – never commit real credentials
- Admin endpoint requires `x-admin-secret` header
- Duplicate registrations blocked by: email, roll number, and transaction ID
- Payment screenshots stored server-side, not exposed in API responses
- All data is validated on both client and server

---

## 👥 Coordinators

**Student Coordinators:**  
Aneesh – 7036648459  
Tijil – 8500624035  
Lavanya  
Siri

**Faculty Coordinators:**  
Dr. Jagat Jeeta Mohanty  
Dr. Zaheer Sultana

---

## 📄 License

© 2026 CODESTORM | MREM CSE – Data Science  
All rights reserved.
