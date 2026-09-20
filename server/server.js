require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const fs         = require('fs');

const registrationRoutes = require('./routes/registration');

const app  = express();
const PORT = process.env.PORT || 5000;

// ---- Middleware ----
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-admin-secret'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Serve uploaded screenshots (protected in production) ----
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
app.use('/uploads', express.static(uploadDir));

// ---- API Routes ----
app.use('/api', registrationRoutes);

// ---- Health check ----
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---- Global error handler ----
app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ success: false, message: 'File too large. Maximum size is 5MB.' });
  }
  res.status(500).json({ success: false, message: err.message || 'Internal server error.' });
});

// ---- Connect to MongoDB & start server ----
const MONGO_URI = process.env.MONGODB_URI;
if (!MONGO_URI) {
  console.error('❌  MONGODB_URI is not set. Please create a .env file. See .env.example');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅  Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀  CODESTORM server running on http://localhost:${PORT}`);
      console.log(`📋  Admin API:    GET  /api/admin/registrations  (requires x-admin-secret header)`);
      console.log(`📝  Register API: POST /api/register`);
    });
  })
  .catch((err) => {
    console.error('❌  MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = app;
