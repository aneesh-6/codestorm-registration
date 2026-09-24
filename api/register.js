import crypto from 'crypto';
import { writeCredentialsToGoogleSheet } from './googleSheets.js';

/**
 * Vercel Serverless Function: POST /api/register
 * Provides participant registration processing using Registration ID as login credential
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

    // Determine or generate unique Registration ID (CODESTORM-2026-XXXX)
    let registrationId = body.registrationId;
    if (!registrationId) {
      const randSeq = String(crypto.randomInt(1001, 9999)).padStart(4, '0');
      registrationId = `CODESTORM-2026-${randSeq}`;
    }

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
          })
        }).catch(e => console.warn('Platform sync note in serverless fn:', e.message));
      } catch (syncErr) {
        console.warn('Platform sync note in serverless fn:', syncErr.message);
      }
    }

    // Sync participant registration to Google Sheet (Columns A through H strictly)
    const yearAndBranch = (year && branch)
      ? (section ? `${year} - ${branch} (${section})` : `${year} - ${branch}`)
      : (body.yearAndBranch || year || branch || 'CSE');

    try {
      const sheetResult = await writeCredentialsToGoogleSheet({
        registrationId,
        name: name.trim(),
        rollNumber: rollNumber.trim().toUpperCase(),
        email: email.trim().toLowerCase(),
        mobile: mobile ? mobile.trim() : '',
        year,
        branch,
        section,
        yearAndBranch,
        paymentScreenshot: 'Paid',
        screenshotBase64: body.screenshotBase64 || body.paymentScreenshot || '',
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      });

      console.log('[api/register.js Google Sheets Sync]', {
        registrationId,
        googleSheetsResult: sheetResult ? (sheetResult.success ? 'SUCCESS' : (sheetResult.error || 'FAILED')) : 'UNKNOWN',
        success: sheetResult ? sheetResult.success : false,
      });

      if (sheetResult && sheetResult.success === false) {
        const errorDetail = sheetResult.error || sheetResult.note || 'Unable to write registration to Google Sheet.';
        console.error('Google Sheets update failed:', errorDetail);
        return res.status(500).json({
          success: false,
          message: `Google Sheets update failed: ${errorDetail}`
        });
      }
    } catch (sheetErr) {
      console.error('Google Sheets update failed:', sheetErr.message);
      return res.status(500).json({
        success: false,
        message: `Google Sheets update failed: ${sheetErr.message}`
      });
    }

    // Return the simplified success response structure
    return res.status(200).json({
      success: true,
      registrationId,
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
