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
 * Register a new participant for CODESTORM and generate credentials
 */
router.post('/register', upload.single('paymentScreenshot'), async (req, res) => {
  try {
    const {
      name, college, rollNumber, branch, year,
      email, mobile, language, transactionId, declaration,
    } = req.body;

    // --- Server-side validation ---
    const errors = [];
    if (!name || name.trim().length < 3)         errors.push('Valid full name is required.');
    if (!college || college.trim().length < 3)   errors.push('College name is required.');
    if (!rollNumber || rollNumber.trim().length < 3) errors.push('Roll number is required.');
    if (!branch)     errors.push('Branch is required.');
    if (!year)       errors.push('Year is required.');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errors.push('Valid email is required.');
    if (!mobile || !/^[6-9]\d{9}$/.test(mobile.trim()))              errors.push('Valid 10-digit mobile number is required.');
    if (!language)   errors.push('Programming language is required.');
    if (!transactionId || transactionId.trim().length < 4) errors.push('Transaction ID is required.');
    if (!req.file)   errors.push('Payment screenshot is required.');
    if (declaration !== 'true' && declaration !== true) errors.push('Declaration must be confirmed.');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors[0], errors });
    }

    // --- Duplicate check ---
    const dupEmail = await Registration.findOne({ email: email.trim().toLowerCase() });
    if (dupEmail) return res.status(409).json({ success: false, message: 'This email address is already registered.' });

    const dupRoll = await Registration.findOne({ rollNumber: rollNumber.trim().toUpperCase() });
    if (dupRoll)  return res.status(409).json({ success: false, message: 'This roll number is already registered.' });

    const dupTxn = await Registration.findOne({ transactionId: transactionId.trim() });
    if (dupTxn)   return res.status(409).json({ success: false, message: 'This transaction ID has already been used.' });

    // --- Generate unique Registration ID ---
    const registrationId = await generateUniqueRegistrationId(Registration);

    // --- Generate unique Participant ID (CS26-0001, CS26-0002...) ---
    const participantId = await generateUniqueParticipantId(Registration, User, registrationId);

    // --- Generate secure random temporary password & hash ---
    const temporaryPassword = generateTemporaryPassword(10);
    const salt = bcrypt ? bcrypt.genSaltSync(10) : '$2b$10$abcdefghijklmnopqrstuu';
    const passwordHash = bcrypt ? bcrypt.hashSync(temporaryPassword, salt) : temporaryPassword;

    // --- Save registration ---
    const reg = new Registration({
      registrationId,
      participantId,
      passwordHash,
      role: 'participant',
      mustChangePassword: true,
      name:        name.trim(),
      college:     college.trim(),
      rollNumber:  rollNumber.trim().toUpperCase(),
      branch,
      year,
      email:       email.trim().toLowerCase(),
      mobile:      mobile.trim(),
      language,
      transactionId: transactionId.trim(),
      paymentScreenshotPath: req.file.path,
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
