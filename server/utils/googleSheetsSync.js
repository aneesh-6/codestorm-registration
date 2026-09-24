const crypto = require('crypto');

/**
 * Production Sheet Columns (Columns A through H):
 * A: Timestamp
 * B: Name
 * C: Roll Number
 * D: Email
 * E: Mobile Number
 * F: Year / Branch / Section
 * G: Payment Screenshot
 * H: Registration ID
 *
 * Registration ID serves as both Login ID and Password.
 * No Participant ID or Password columns are written to Google Sheets.
 */
const REQUIRED_HEADERS = [
  'Timestamp',                  // A (0-based: 0)
  'Name',                       // B (0-based: 1)
  'Roll Number',                // C (0-based: 2)
  'Email',                      // D (0-based: 3)
  'Mobile Number',              // E (0-based: 4)
  'Year / Branch / Section',    // F (0-based: 5)
  'Payment Screenshot',         // G (0-based: 6)
  'Registration ID'             // H (0-based: 7)
];

function createServiceAccountJwt(clientEmail, privateKey) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };

  const b64url = (str) => Buffer.from(str).toString('base64url');
  const unsignedToken = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsignedToken);

  let cleanKey = String(privateKey || '').trim();
  if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) || (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
    cleanKey = cleanKey.slice(1, -1);
  }
  cleanKey = cleanKey.replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();

  const signature = signer.sign(cleanKey, 'base64url');
  return `${unsignedToken}.${signature}`;
}

async function getAccessToken(clientEmail, privateKey) {
  const jwt = createServiceAccountJwt(clientEmail, privateKey);
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Google Auth token exchange failed (${tokenRes.status}): ${errorText}`);
  }

  const tokenJson = await tokenRes.json();
  return tokenJson.access_token;
}

function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumnIndex(headers, aliases) {
  for (let i = 0; i < headers.length; i++) {
    const norm = normalizeHeader(headers[i]);
    for (const alias of aliases) {
      if (norm === normalizeHeader(alias)) {
        return i;
      }
    }
  }
  return -1;
}

function columnIndexToLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

async function syncToGoogleSheetsApi({
  spreadsheetId,
  clientEmail,
  privateKey,
  sheetName = 'Registrations',
  registrationData,
}) {
  const regId = registrationData.registrationId || 'UNKNOWN';

  const accessToken = await getAccessToken(clientEmail, privateKey);
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Verify access & dynamically discover the exact sheet tab name
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const metaRes = await fetch(metaUrl, { headers: authHeaders });

  if (!metaRes.ok) {
    const metaErr = await metaRes.text();
    if (metaRes.status === 403) {
      console.error(`[Google Sheets API] registrationId=${regId}, sheet=${sheetName}, targetRow=UNKNOWN, status=FAILED, error=Service Account ${clientEmail} lacks Editor access to spreadsheet ${spreadsheetId}`);
      throw new Error(`Google Service Account (${clientEmail}) does not have Editor access to spreadsheet (${spreadsheetId}). Please grant Editor access to this service account in Google Sheets Share settings.`);
    }
    console.error(`[Google Sheets API] registrationId=${regId}, sheet=${sheetName}, targetRow=UNKNOWN, status=FAILED, error=${metaErr}`);
    throw new Error(`Google Sheets fetch failed (${metaRes.status}): ${metaErr}`);
  }

  const metaData = await metaRes.json();
  const availableSheets = (metaData.sheets || []).map(s => s.properties?.title).filter(Boolean);

  let targetSheetName = sheetName;
  if (!availableSheets.includes(targetSheetName)) {
    const matched = availableSheets.find(t => t.toLowerCase() === targetSheetName.toLowerCase())
      || availableSheets.find(t => t.toLowerCase().includes('reg'))
      || availableSheets[0]
      || 'Registrations';
    targetSheetName = matched;
  }

  // 2. Fetch current sheet values
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheetName)}!A1:Z1000`;
  const getRes = await fetch(getUrl, { headers: authHeaders });

  if (!getRes.ok) {
    const errText = await getRes.text();
    console.error(`[Google Sheets API] registrationId=${regId}, sheet=${targetSheetName}, targetRow=UNKNOWN, status=FAILED, error=${errText}`);
    throw new Error(`Google Sheets fetch failed for range ${targetSheetName}!A1:Z1000 (${getRes.status}): ${errText}`);
  }

  const data = await getRes.json();
  let rows = data.values || [];
  let headers = rows.length > 0 ? rows[0] : [];

  if (headers.length === 0) {
    headers = [...REQUIRED_HEADERS];
    const initUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheetName)}!A1:H1?valueInputOption=USER_ENTERED`;
    await fetch(initUrl, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ values: [headers] }),
    });
    rows = [headers];
  }

  // 3. Identify column mappings dynamically
  let timeCol       = findColumnIndex(headers, ['Timestamp', 'Registered Date', 'Date', 'Created At', 'Time']);
  let nameCol       = findColumnIndex(headers, ['Name', 'Full Name', 'Participant Name', 'Student Name']);
  let rollCol       = findColumnIndex(headers, ['Roll Number', 'Roll No', 'Roll', 'Student ID', 'RollNumber', 'HT No']);
  let emailCol      = findColumnIndex(headers, ['Email', 'Email Address', 'Email ID']);
  let mobileCol     = findColumnIndex(headers, ['Mobile Number', 'Mobile', 'Phone Number', 'Phone', 'Contact Number']);
  let ynbCol        = findColumnIndex(headers, ['Year / Branch / Section', 'Year / Branch', 'Mobile Number / Year-Branch information', 'Year-Branch information', 'Year & Branch', 'Year and Branch', 'Year-Branch', 'Year/Branch', 'Academic Info', 'Branch', 'Year']);
  let screenshotCol = findColumnIndex(headers, ['Payment Screenshot', 'Screenshot', 'Payment', 'Payment Status', 'Screenshot Link', 'UTR']);
  let regIdCol      = findColumnIndex(headers, ['Registration ID', 'RegistrationID', 'Reg ID', 'RegID']);

  // Ensure Registration ID exists (Column H)
  let headersUpdated = false;
  if (regIdCol === -1) {
    regIdCol = headers.length >= 8 ? 7 : headers.length;
    headers[regIdCol] = 'Registration ID';
    headersUpdated = true;
  }

  if (headersUpdated) {
    const lastColLetter = columnIndexToLetter(headers.length - 1);
    const updateHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheetName)}!A1:${lastColLetter}1?valueInputOption=USER_ENTERED`;
    await fetch(updateHeaderUrl, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ values: [headers] }),
    });
  }

  const {
    registrationId = regId,
    name,
    rollNumber,
    email,
    mobile,
    year,
    branch,
    section,
    yearAndBranch = (year && branch) ? (section ? `${year} - ${branch} (${section})` : `${year} - ${branch}`) : (year || branch || 'CSE'),
    paymentScreenshot = 'Paid',
    timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19),
  } = registrationData;

  // 4. Search for existing row by Registration ID (Column H / regIdCol)
  let targetRowIndex = -1;
  const searchRegId = String(registrationId || '').trim().toUpperCase();

  if (searchRegId && regIdCol !== -1) {
    for (let r = 1; r < rows.length; r++) {
      const rowVal = String(rows[r][regIdCol] || '').trim().toUpperCase();
      if (rowVal === searchRegId) {
        targetRowIndex = r + 1; // 1-based sheet row
        break;
      }
    }
  }

  // Fallback search by Roll Number or Email
  if (targetRowIndex === -1 && (rollNumber || email)) {
    const searchRoll = String(rollNumber || '').trim().toUpperCase();
    const searchEmail = String(email || '').trim().toLowerCase();

    for (let r = 1; r < rows.length; r++) {
      const rowRoll = rollCol !== -1 ? String(rows[r][rollCol] || '').trim().toUpperCase() : '';
      const rowEmail = emailCol !== -1 ? String(rows[r][emailCol] || '').trim().toLowerCase() : '';

      if ((searchRoll && rowRoll === searchRoll) || (searchEmail && rowEmail === searchEmail)) {
        targetRowIndex = r + 1;
        break;
      }
    }
  }

  // 5. Existing row or append new row strictly ending at Column H (Length 8)
  if (targetRowIndex !== -1) {
    console.log(`[Google Sheets API] registrationId=${registrationId}, sheet=${targetSheetName}, targetRow=${targetRowIndex}, status=EXISTING`);
    return {
      success: true,
      action: 'existing',
      row: targetRowIndex,
      sheet: targetSheetName,
      registrationId,
    };
  } else {
    // Assemble new row strictly aligned to Columns A..H (Length 8)
    const maxCols = Math.max(headers.length, 8);
    const newRow = new Array(maxCols).fill('');
    if (timeCol !== -1)        newRow[timeCol]        = timestamp;
    if (nameCol !== -1)        newRow[nameCol]        = name || '';
    if (rollCol !== -1)        newRow[rollCol]        = rollNumber || '';
    if (emailCol !== -1)       newRow[emailCol]       = email || '';
    if (mobileCol !== -1)      newRow[mobileCol]      = mobile || '';
    if (ynbCol !== -1)         newRow[ynbCol]         = yearAndBranch || '';
    if (screenshotCol !== -1)  newRow[screenshotCol]  = paymentScreenshot || 'Paid';
    if (regIdCol !== -1)       newRow[regIdCol]       = registrationId || '';

    // Positional fallback for indices 0..7 if unmapped
    if (timeCol === -1)        newRow[0] = timestamp;
    if (nameCol === -1)        newRow[1] = name || '';
    if (rollCol === -1)        newRow[2] = rollNumber || '';
    if (emailCol === -1)       newRow[3] = email || '';
    if (mobileCol === -1)      newRow[4] = mobile || '';
    if (ynbCol === -1)         newRow[5] = yearAndBranch || '';
    if (screenshotCol === -1)  newRow[6] = paymentScreenshot || 'Paid';
    if (regIdCol === -1)       newRow[7] = registrationId || '';

    // Strictly ensure columns after H (index 7) remain empty
    for (let c = 8; c < newRow.length; c++) {
      newRow[c] = '';
    }

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(targetSheetName)}!A1:append?valueInputOption=USER_ENTERED`;
    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ values: [newRow] }),
    });

    if (!appendRes.ok) {
      const appendErr = await appendRes.text();
      console.error(`[Google Sheets API] registrationId=${registrationId}, sheet=${targetSheetName}, targetRow=NEW, status=FAILED, error=${appendErr}`);
      throw new Error(`Google Sheets append failed (${appendRes.status}): ${appendErr}`);
    }

    const appendJson = await appendRes.json();
    let appendedRow = 'NEW';
    const updatedRange = appendJson.updates?.updatedRange || '';
    const matchRow = updatedRange.match(/(\d+)$/);
    if (matchRow) appendedRow = matchRow[1];

    console.log(`[Google Sheets API] registrationId=${registrationId}, sheet=${targetSheetName}, targetRow=${appendedRow}, status=SUCCESS`);

    return {
      success: true,
      action: 'appended',
      row: appendedRow,
      sheet: targetSheetName,
      registrationId,
    };
  }
}

async function writeCredentialsToGoogleSheet(registrationData) {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
  const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL ||
                    process.env.GOOGLE_SCRIPT_URL ||
                    'https://script.google.com/macros/s/AKfycbzimvHGfplmvIIrU9D7AZJHKXXYARvhP4H5IRRXmavv339DtXs2OnjQhXJcBh1Ub8By/exec';

  // Option 1: Direct Google Sheets API with Service Account
  if (serviceAccountEmail && privateKey && sheetId) {
    try {
      return await syncToGoogleSheetsApi({
        spreadsheetId: sheetId,
        clientEmail: serviceAccountEmail,
        privateKey: privateKey,
        sheetName: process.env.GOOGLE_SHEET_NAME || 'Registrations',
        registrationData,
      });
    } catch (err) {
      console.error('Google Sheets API direct sync failed:', err.message);
      if (!scriptUrl) {
        return { success: false, error: err.message };
      }
    }
  }

  // Option 2: Google Apps Script Web App sync
  if (scriptUrl && scriptUrl.startsWith('https://script.google.com/macros/s/')) {
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          registrationId: registrationData.registrationId,
          name: registrationData.name,
          rollNumber: registrationData.rollNumber,
          email: registrationData.email,
          mobile: registrationData.mobile,
          year: registrationData.year,
          branch: registrationData.branch,
          section: registrationData.section,
          yearAndBranch: registrationData.yearAndBranch,
          paymentScreenshot: registrationData.paymentScreenshot || 'Paid',
          screenshotBase64: registrationData.screenshotBase64 || '',
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        console.log(`[Google Sheets Apps Script] registrationId=${registrationData.registrationId}, sheet=Registrations, targetRow=${json.row || json.action || 'appended'}, status=SUCCESS`);
        return { success: true, via: 'appsScript', ...json };
      } else {
        const errorMsg = json?.message || `Google Apps Script returned status ${res.status}`;
        console.error(`[Google Sheets Apps Script] registrationId=${registrationData.registrationId}, sheet=Registrations, targetRow=UNKNOWN, status=FAILED, error=${errorMsg}`);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      console.error(`[Google Sheets Apps Script] registrationId=${registrationData.registrationId}, sheet=Registrations, targetRow=UNKNOWN, status=FAILED, error=${err.message}`);
      return { success: false, error: err.message };
    }
  }

  return { success: false, note: 'No Google Sheets API credentials configured' };
}

module.exports = {
  REQUIRED_HEADERS,
  writeCredentialsToGoogleSheet,
  syncToGoogleSheetsApi,
};
