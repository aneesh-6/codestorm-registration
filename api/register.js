import crypto from 'crypto';
import { writeCredentialsToGoogleSheet } from './googleSheets.js';

export function generateParticipantId(regId) {
  if (!regId) return `CS26-${String(crypto.randomInt(1001, 9999)).padStart(4, '0')}`;
  const clean = String(regId).trim().toUpperCase();
  const match = clean.match(/^CODESTORM-2026-(\d+)$/i);
  if (match) {
    return `CS26-${match[1]}`;
  }
  return `CS26-${clean.replace(/[^a-zA-Z0-9]/g, '').slice(-4)}`;
}

/**
 * Generates a deterministic password from the registration number.
 * Format: PASS + 4-digit registration number
 * Example: 0001 → PASS0001, 0015 → PASS0015
 */
export function generateDeterministicPassword(registrationId) {
  const match = String(registrationId).trim().match(/^CODESTORM-2026-(\d+)$/i);
  if (match) {
    return `PASS${match[1]}`;
  }
  // Fallback: extract trailing digits
  const digits = String(registrationId).replace(/[^0-9]/g, '').slice(-4).padStart(4, '0');
  return `PASS${digits}`;
}

/**
 * Sends credential email via Google Apps Script MailApp endpoint.
 * This is fire-and-forget: email failure does not block registration.
 */
async function sendCredentialEmail({ name, email, registrationId, participantId, password, eventPlatformUrl }) {
  const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL ||
                    process.env.GOOGLE_SCRIPT_URL ||
                    'https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec';

  if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/macros/s/')) {
    console.warn('[Email] No valid Google Apps Script URL configured. Skipping email.');
    return { success: false, reason: 'No Apps Script URL configured' };
  }

  try {
    const res = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'sendCredentialEmail',
        name,
        email,
        registrationId,
        participantId,
        password,
        eventPlatformUrl: eventPlatformUrl || 'https://codestorm-event-platform.onrender.com',
      }),
    });

    const json = await res.json().catch(() => null);
    const emailSent = Boolean(res.ok && json?.success);
    console.log(`[Email] Credential email to ${email}: ${emailSent ? 'SENT' : 'FAILED'}`, json?.message || '');
    return { success: emailSent, message: json?.message || '' };
  } catch (err) {
    console.warn(`[Email] Failed to send credential email to ${email}:`, err.message);
    return { success: false, reason: err.message };
  }
}

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

    // Generate Participant ID based on registration sequence (CODESTORM-2026-XXXX -> CS26-XXXX)
    const participantId = body.participantId || generateParticipantId(registrationId);

    // Generate deterministic password: PASS + 4-digit registration number
    // Example: CODESTORM-2026-0001 → PASS0001
    const temporaryPassword = (body.temporaryPassword || body.password || generateDeterministicPassword(registrationId)).trim();

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

    // Sync participant registration to Google Sheet (Columns A through J on the SAME row)
    const yearAndBranch = (year && branch)
      ? (section ? `${year} - ${branch} (${section})` : `${year} - ${branch}`)
      : (body.yearAndBranch || year || branch || 'CSE');

    try {
      const sheetResult = await writeCredentialsToGoogleSheet({
        registrationId,
        participantId,
        temporaryPassword,
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
        participantId,
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

    // Send credential email via Google Apps Script (fire-and-forget, non-blocking)
    let emailStatus = { success: false, reason: 'not attempted' };
    try {
      const eventPlatformClientUrl = process.env.VITE_EVENT_PLATFORM_CLIENT_URL ||
        process.env.EVENT_PLATFORM_CLIENT_URL ||
        'https://codestorm-event-platform.onrender.com';

      emailStatus = await sendCredentialEmail({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        registrationId,
        participantId,
        password: temporaryPassword,
        eventPlatformUrl: eventPlatformClientUrl,
      });
    } catch (emailErr) {
      console.warn('[Email] Non-blocking email error:', emailErr.message);
      emailStatus = { success: false, reason: emailErr.message };
    }

    // Return the success response with Registration ID, Participant ID, and Password
    return res.status(200).json({
      success: true,
      registrationId,
      participantId,
      temporaryPassword,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      rollNumber: rollNumber.trim().toUpperCase(),
      message: 'Registration successful',
      emailSent: emailStatus.success,
      emailNote: emailStatus.success ? 'Credential email sent successfully.' : 'Registration succeeded but credential email could not be sent. Please save your credentials from this page.',
    });
  } catch (err) {
    console.error('Registration API error:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error processing registration.'
    });
  }
}
