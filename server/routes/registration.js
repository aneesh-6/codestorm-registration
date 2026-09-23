const express  = require('express');
const router   = express.Router();
const Registration = require('../models/Registration');
const User = require('../models/User');
const upload   = require('../middleware/upload');
const {
  generateUniqueRegistrationId,
  generateUniqueParticipantId,
  generateTemporaryPassword,
} = require('../utils/generateId');

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch {
  try {
    bcrypt = require('../../../codestorm-platform/server/node_modules/bcryptjs');
  } catch {
    bcrypt = null;
  }
}

/**
 * POST /api/register
// Conditional middleware to handle both multipart/form-data and application/json
const handleUpload = (req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  if (contentType.includes('multipart/form-data')) {
    upload.single('paymentScreenshot')(req, res, next);
  } else {
    next();
  }
};

/**
 * POST /api/register
 * Register a new participant for CODESTORM and generate credentials atomically
 */
router.post('/register', handleUpload, async (req, res) => {
  try {
    const {
      name, college, rollNumber, branch, year, section,
      email, mobile, language, transactionId, declaration,
      registrationId: providedRegId,
      participantId: providedPartId,
      temporaryPassword: providedTempPassword,
      screenshotBase64,
    } = req.body;

    // --- Server-side validation ---
    const errors = [];
    if (!name || name.trim().length < 2) errors.push('Valid full name is required.');
    if (!rollNumber || rollNumber.trim().length < 2) errors.push('Roll number is required.');
    if (!branch) errors.push('Branch is required.');
    if (!year) errors.push('Year is required.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('Valid email is required.');
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile.trim())) errors.push('Valid 10-digit mobile number is required.');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRoll = rollNumber.trim().toUpperCase();

    // --- Duplicate check ---
    const dupEmail = await Registration.findOne({ email: cleanEmail });
    if (dupEmail) return res.status(409).json({ success: false, message: 'This email address is already registered.' });

    const dupRoll = await Registration.findOne({ rollNumber: cleanRoll });
    if (dupRoll) return res.status(409).json({ success: false, message: 'This roll number is already registered.' });

    if (transactionId && transactionId.trim()) {
      const dupTxn = await Registration.findOne({ transactionId: transactionId.trim() });
      if (dupTxn) return res.status(409).json({ success: false, message: 'This transaction ID has already been used.' });
    }

    // --- Generate or reuse unique Registration ID ---
    const registrationId = providedRegId || await generateUniqueRegistrationId(Registration);

    // --- Generate or reuse unique Participant ID (CS26-0001, CS26-0002...) ---
    const participantId = providedPartId || await generateUniqueParticipantId(Registration, User, registrationId);

    // --- Generate or reuse secure random temporary password & hash ---
    const temporaryPassword = providedTempPassword || generateTemporaryPassword(10);
    const salt = bcrypt ? bcrypt.genSaltSync(10) : '$2b$10$abcdefghijklmnopqrstuu';
    const passwordHash = bcrypt ? bcrypt.hashSync(temporaryPassword, salt) : temporaryPassword;

    // --- Save registration ---
    const reg = new Registration({
      registrationId,
      participantId,
      passwordHash,
      role: 'participant',
      mustChangePassword: true,
      name: name.trim(),
      college: (college || 'Malla Reddy Engineering College and Management Sciences').trim(),
      rollNumber: cleanRoll,
      branch: branch.trim(),
      year: year.trim(),
      section: (section || 'A').trim(),
      email: cleanEmail,
      mobile: mobile.trim(),
      language: language || 'Python',
      transactionId: (transactionId || `TXN-${Date.now()}`).trim(),
      paymentScreenshotPath: req.file ? req.file.path : (screenshotBase64 ? 'base64-stored' : ''),
      declaration: true,
    });

    await reg.save();

    // --- Save corresponding User account ---
    try {
      const user = new User({
        participantId,
        registrationId,
        name: reg.name,
        email: reg.email,
        passwordHash,
        role: 'participant',
        mustChangePassword: true,
      });
      await user.save();
    } catch (userErr) {
      console.error('[User Creation Warning]', userErr.message);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      registrationId: reg.registrationId,
      participantId: reg.participantId,
      temporaryPassword,
      name: reg.name,
      email: reg.email,
    });
  } catch (err) {
    console.error('[Register Error]', err.message);
    res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
  }
});

/**
 * GET /api/admin/registrations
 * Retrieve all registrations (admin only)
 */
router.get('/admin/registrations', async (req, res) => {
  // Simple secret key check
  const secret = req.headers['x-admin-secret'];
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  try {
    const { search, branch, year, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      query.$or = [
        { name:           { $regex: search, $options: 'i' } },
        { email:          { $regex: search, $options: 'i' } },
        { rollNumber:     { $regex: search, $options: 'i' } },
        { registrationId: { $regex: search, $options: 'i' } },
        { transactionId:  { $regex: search, $options: 'i' } },
      ];
    }
    if (branch) query.branch = branch;
    if (year)   query.year   = year;

    const total = await Registration.countDocuments(query);
    const registrations = await Registration
      .find(query)
      .select('-paymentScreenshotPath -__v')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      data: registrations,
    });
  } catch (err) {
    console.error('[Admin Error]', err.message);
    res.status(500).json({ success: false, message: 'Server error.' });
  }
});

module.exports = router;
