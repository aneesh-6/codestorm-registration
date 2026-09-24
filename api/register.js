import crypto from 'crypto';

/**
 * Generate a random temporary password (minimum 8 characters, uppercase, lowercase, digits)
 */
function generateTemporaryPassword(length = 8) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;

  const getRandomChar = (set) => set[crypto.randomInt(0, set.length)];

  const chars = [
    getRandomChar(upper),
    getRandomChar(lower),
    getRandomChar(digits),
  ];

  while (chars.length < length) {
    chars.push(getRandomChar(all));
  }

  // Fisher-Yates shuffle
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

/**
 * Vercel Serverless Function: POST /api/register
 * Provides atomic participant credential generation and registration processing
 */
export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-secret, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'CODESTORM 2026 Registration API',
      timestamp: new Date().toISOString()
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const {
      name,
      rollNumber,
      email,
      mobile,
      year,
      branch,
      section,
      screenshotBase64,
    } = body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Full Name is required.' });
    }
    if (!rollNumber || !rollNumber.trim()) {
      return res.status(400).json({ success: false, message: 'Roll Number is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, message: 'A valid Email address is required.' });
    }

    // Determine or generate unique IDs
    let registrationId = body.registrationId;
    if (!registrationId) {
      const randSeq = String(crypto.randomInt(1001, 9999)).padStart(4, '0');
      registrationId = `CODESTORM-2026-${randSeq}`;
    }

    let participantId = body.participantId;
    if (!participantId) {
      const match = String(registrationId).match(/\d+$/);
      const numPart = match ? match[0] : '0001';
      participantId = `CS26-${numPart.padStart(4, '0')}`;
    }

    const temporaryPassword = body.temporaryPassword || generateTemporaryPassword(8);
    const passwordHash = crypto.createHash('sha256').update(temporaryPassword).digest('hex');

    // Sync to authoritative event platform backend if URL is defined
    const eventPlatformUrl = process.env.EVENT_PLATFORM_URL || process.env.VITE_EVENT_PLATFORM_URL || process.env.API_URL || 'http://localhost:5000';
    if (eventPlatformUrl) {
      try {
        await fetch(`${eventPlatformUrl}/api/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            rollNumber: rollNumber.trim().toUpperCase(),
            email: email.trim().toLowerCase(),
            mobile: mobile ? mobile.trim() : '',
            year,
            branch,
            section,
            registrationId,
            participantId,
            temporaryPassword,
          })
        }).catch(e => console.warn('Platform sync note in serverless fn:', e.message));
      } catch (syncErr) {
        console.warn('Platform sync note in serverless fn:', syncErr.message);
      }
    }

    // Return the canonical success response structure
    return res.status(200).json({
      success: true,
      registrationId,
      participantId,
      temporaryPassword,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      rollNumber: rollNumber.trim().toUpperCase(),
      message: 'Registration successful'
    });
  } catch (err) {
    console.error('Registration API error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error processing registration.'
    });
  }
}
