import crypto from 'crypto';

export const REQUIRED_HEADERS = [
  'Registration ID',
  'Participant ID',
  'Password',
  'Name',
  'Roll Number',
  'Email',
  'Mobile Number',
  'Year',
  'Branch',
  'Section',
  'Payment Status',
  'Registration Status',
  'Registered Date'
];

/**
 * Creates an RS256 signed JWT for Google Service Account authentication
 */
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
  
  // Format private key properly (handling escaped newlines from environment variables)
  let cleanKey = privateKey;
  if (cleanKey.startsWith('"') && cleanKey.endsWith('"')) {
    cleanKey = cleanKey.slice(1, -1);
  }
  cleanKey = cleanKey.replace(/\\n/g, '\n');

  const signature = signer.sign(cleanKey, 'base64url');
  return `${unsignedToken}.${signature}`;
}

/**
 * Obtains an OAuth 2.0 access token using Service Account JWT
 */
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
    throw new Error(`Google Auth token exchange failed with status ${tokenRes.status}: ${errorText}`);
  }

  const tokenJson = await tokenRes.json();
  return tokenJson.access_token;
}

/**
 * Normalizes a header string for alias matching
 */
function normalizeHeader(h) {
  return String(h || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds column index (0-based) by checking a list of aliases
 */
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

/**
 * Converts a 0-based column index to an A1-notation column letter (e.g. 0 -> A, 1 -> B, 26 -> AA)
 */
function columnIndexToLetter(colIndex) {
  let temp = colIndex;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

/**
 * Writes or updates a participant's registration row in Google Sheets via Google Sheets API v4
 */
export async function syncToGoogleSheetsApi({
  spreadsheetId,
  clientEmail,
  privateKey,
  sheetName = 'Registrations',
  registrationData,
}) {
  const accessToken = await getAccessToken(clientEmail, privateKey);
  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Fetch current sheet values to inspect headers and check for existing rows
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:Z1000`;
  const getRes = await fetch(getUrl, { headers: authHeaders });

  if (!getRes.ok) {
    const errText = await getRes.text();
    throw new Error(`Google Sheets fetch failed (${getRes.status}): ${errText}`);
  }

  const data = await getRes.json();
  let rows = data.values || [];
  let headers = rows.length > 0 ? rows[0] : [];

  // If sheet is completely empty, initialize headers
  if (headers.length === 0) {
    headers = [...REQUIRED_HEADERS];
    const initUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:M1?valueInputOption=USER_ENTERED`;
    await fetch(initUrl, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ values: [headers] }),
    });
    rows = [headers];
  }

  // 2. Identify column mappings dynamically
  let regIdCol       = findColumnIndex(headers, ['Registration ID', 'RegistrationID', 'Reg ID', 'RegID']);
  let partIdCol      = findColumnIndex(headers, ['Participant ID', 'ParticipantID', 'Part ID']);
  let passwordCol    = findColumnIndex(headers, ['Password', 'Temporary Password', 'Temp Password', 'Password Hash']);
  let nameCol        = findColumnIndex(headers, ['Name', 'Full Name', 'Participant Name', 'Student Name']);
  let rollCol        = findColumnIndex(headers, ['Roll Number', 'Roll No', 'Roll', 'Student ID']);
  let emailCol       = findColumnIndex(headers, ['Email', 'Email Address', 'Email ID']);
  let mobileCol      = findColumnIndex(headers, ['Mobile Number', 'Mobile', 'Phone Number', 'Phone']);
  let yearCol        = findColumnIndex(headers, ['Year', 'Academic Year']);
  let branchCol      = findColumnIndex(headers, ['Branch', 'Department']);
  let sectionCol     = findColumnIndex(headers, ['Section', 'Sec']);
  let paymentCol     = findColumnIndex(headers, ['Payment Status', 'Payment Screenshot', 'Screenshot', 'Payment']);
  let regStatusCol   = findColumnIndex(headers, ['Registration Status', 'Status', 'RegistrationStatus']);
  let regDateCol     = findColumnIndex(headers, ['Registered Date', 'Timestamp', 'Date', 'Created At']);

  // Ensure Participant ID and Password columns exist in header structure
  let headersUpdated = false;
  if (partIdCol === -1) {
    partIdCol = headers.length;
    headers.push('Participant ID');
    headersUpdated = true;
  }
  if (passwordCol === -1) {
    passwordCol = headers.length;
    headers.push('Password');
    headersUpdated = true;
  }
  if (regIdCol === -1) {
    regIdCol = headers.length;
    headers.push('Registration ID');
    headersUpdated = true;
  }

  if (headersUpdated) {
    const lastColLetter = columnIndexToLetter(headers.length - 1);
    const updateHeaderUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:${lastColLetter}1?valueInputOption=USER_ENTERED`;
    await fetch(updateHeaderUrl, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ values: [headers] }),
    });
  }

  const {
    registrationId,
    participantId,
    temporaryPassword,
    name,
    rollNumber,
    email,
    mobile,
    year,
    branch,
    section,
    paymentStatus = 'Paid',
    registrationStatus = 'Registered',
    registeredDate = new Date().toISOString().replace('T', ' ').substring(0, 19),
  } = registrationData;

  // 3. Search for existing row by Registration ID (DUPLICATE PROTECTION)
  let targetRowIndex = -1; // 1-based sheet row index
  const searchRegId = String(registrationId || '').trim().toUpperCase();

  if (searchRegId && regIdCol !== -1) {
    for (let r = 1; r < rows.length; r++) {
      const rowVal = String(rows[r][regIdCol] || '').trim().toUpperCase();
      if (rowVal === searchRegId) {
        targetRowIndex = r + 1; // Convert 0-based array index to 1-based spreadsheet row
        break;
      }
    }
  }

  // Also check by Roll Number or Email if Registration ID wasn't matched
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

  // 4. Update existing row OR append new row
  if (targetRowIndex !== -1) {
    // Update Participant ID and Password on the SAME existing row
    const updates = [];
    if (participantId && partIdCol !== -1) {
      const partColLetter = columnIndexToLetter(partIdCol);
      updates.push({
        range: `${sheetName}!${partColLetter}${targetRowIndex}`,
        values: [[participantId]],
      });
    }
    if (temporaryPassword && passwordCol !== -1) {
      const pwdColLetter = columnIndexToLetter(passwordCol);
      updates.push({
        range: `${sheetName}!${pwdColLetter}${targetRowIndex}`,
        values: [[temporaryPassword]],
      });
    }

    if (updates.length > 0) {
      const batchUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
      const batchRes = await fetch(batchUrl, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({
          valueInputOption: 'USER_ENTERED',
          data: updates,
        }),
      });

      if (!batchRes.ok) {
        const batchErr = await batchRes.text();
        throw new Error(`Google Sheets batchUpdate failed (${batchRes.status}): ${batchErr}`);
      }
    }

    return {
      success: true,
      action: 'updated',
      row: targetRowIndex,
      registrationId,
      participantId,
    };
  } else {
    // Assemble new row strictly aligned to dynamic column headers
    const newRow = new Array(headers.length).fill('');
    if (regIdCol !== -1)       newRow[regIdCol]       = registrationId || '';
    if (partIdCol !== -1)      newRow[partIdCol]      = participantId || '';
    if (passwordCol !== -1)    newRow[passwordCol]    = temporaryPassword || '';
    if (nameCol !== -1)        newRow[nameCol]        = name || '';
    if (rollCol !== -1)        newRow[rollCol]        = rollNumber || '';
    if (emailCol !== -1)       newRow[emailCol]       = email || '';
    if (mobileCol !== -1)      newRow[mobileCol]      = mobile || '';
    if (yearCol !== -1)        newRow[yearCol]        = year || '';
    if (branchCol !== -1)      newRow[branchCol]      = branch || '';
    if (sectionCol !== -1)     newRow[sectionCol]     = section || '';
    if (paymentCol !== -1)     newRow[paymentCol]     = paymentStatus || 'Paid';
    if (regStatusCol !== -1)   newRow[regStatusCol]   = registrationStatus || 'Registered';
    if (regDateCol !== -1)     newRow[regDateCol]     = registeredDate;

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}!A1:append?valueInputOption=USER_ENTERED`;
    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ values: [newRow] }),
    });

    if (!appendRes.ok) {
      const appendErr = await appendRes.text();
      throw new Error(`Google Sheets append failed (${appendRes.status}): ${appendErr}`);
    }

    return {
      success: true,
      action: 'appended',
      registrationId,
      participantId,
    };
  }
}

/**
 * Universal backend Google Sheet writer that routes to either Service Account Google Sheets API
 * or Google Apps Script Web App depending on what environment variables exist.
 */
export async function writeCredentialsToGoogleSheet(registrationData) {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const sheetId = process.env.GOOGLE_SHEET_ID || process.env.SPREADSHEET_ID;
  const scriptUrl = process.env.VITE_GOOGLE_SCRIPT_URL || process.env.GOOGLE_SCRIPT_URL;

  // Option 1: Direct Google Sheets API with Service Account (if configured in Vercel)
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
      // Safe logging without exposing sensitive keys or tokens
      console.error('Google Sheets credential column update failed:', err.message);
      // Fall through to try scriptUrl if available
    }
  }

  // Option 2: Google Apps Script Web App sync (if configured)
  if (scriptUrl && scriptUrl.startsWith('https://script.google.com/macros/s/')) {
    try {
      const res = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'updateCredentials',
          registrationId: registrationData.registrationId,
          participantId: registrationData.participantId,
          temporaryPassword: registrationData.temporaryPassword,
          name: registrationData.name,
          rollNumber: registrationData.rollNumber,
          email: registrationData.email,
          mobile: registrationData.mobile,
          year: registrationData.year,
          branch: registrationData.branch,
          section: registrationData.section,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        return { success: true, via: 'appsScript', ...json };
      }
    } catch (err) {
      console.error('Google Sheets credential column update failed via script URL:', err.message);
    }
  }

  return { success: false, note: 'No Google Sheets API or Apps Script credentials configured on server' };
}
