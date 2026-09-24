/**
 * ============================================================================
 * CODESTORM 2026 - GOOGLE SHEETS & DRIVE REGISTRATION BACKEND
 * ============================================================================
 *
 * Column Structure (Matching Production Google Sheet):
 * A: Timestamp
 * B: Name
 * C: Roll Number
 * D: Email
 * E: Mobile Number
 * F: Year & Branch
 * G: Payment Screenshot
 * H: Registration ID
 * I: Participant ID
 * J: Password
 *
 * This Google Apps Script:
 * 1. Checks and automatically creates columns I (Participant ID) and J (Password)
 *    after Registration ID (H) if they do not exist.
 * 2. Generates Participant ID (CS26-0001, CS26-0002...) and temporary password.
 * 3. Writes Participant ID & Password into the SAME Google Sheets row.
 * 4. Never creates duplicate rows: if Registration ID already exists, it updates
 *    that exact row's Participant ID and Password in place.
 * 5. Returns Registration ID, Participant ID, and temporary password to caller.
 */

// ============================================================================
// CONFIGURATION - PASTE YOUR GOOGLE SHEET & GOOGLE DRIVE FOLDER IDS HERE
// ============================================================================

const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID"; // Leave as is if script is opened via Extensions > Apps Script in your Sheet
const DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";
const SHEET_NAME = "Registrations";
const ID_PREFIX = "CODESTORM-2026-";
const PARTICIPANT_ID_PREFIX = "CS26-";
const TIMEZONE = "Asia/Kolkata";

/**
 * Production Sheet Columns (Columns A through J):
 */
const REQUIRED_HEADERS = [
  "Timestamp",          // A (1)
  "Name",               // B (2)
  "Roll Number",        // C (3)
  "Email",              // D (4)
  "Mobile Number",      // E (5)
  "Year & Branch",      // F (6)
  "Payment Screenshot", // G (7)
  "Registration ID",    // H (8)
  "Participant ID",     // I (9)
  "Password"            // J (10)
];

/**
 * Safely resolves the Google Spreadsheet whether bound to sheet or standalone
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== "YOUR_GOOGLE_SHEET_ID") {
    try {
      let cleanId = SPREADSHEET_ID.trim();
      const urlMatch = cleanId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (urlMatch) cleanId = urlMatch[1];
      return SpreadsheetApp.openById(cleanId);
    } catch (e) {
      Logger.log("openById note: " + e.message);
    }
  }

  try {
    const active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (e) {
    Logger.log("getActiveSpreadsheet note: " + e.message);
  }

  throw new Error("Unable to open Google Sheet. Please specify SPREADSHEET_ID at top of script or run within the bound Sheet.");
}

function getRegistrationSheet(ss) {
  // 1. Direct tab by configured SHEET_NAME ('Registrations')
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;

  // 2. Search for any sheet whose first row contains 'Registration ID' or 'Roll Number'
  const allSheets = ss.getSheets();
  for (let i = 0; i < allSheets.length; i++) {
    const s = allSheets[i];
    if (s.getLastColumn() > 0) {
      const firstRow = s.getRange(1, 1, 1, Math.min(s.getLastColumn(), 20)).getValues()[0];
      const hasRegId = firstRow.some(val => {
        const clean = String(val).toLowerCase().replace(/[^a-z0-9]/g, '');
        return clean.includes('registrationid') || clean.includes('participantid') || clean.includes('rollnumber');
      });
      if (hasRegId) return s;
    }
  }

  // 3. Fallback: Active sheet
  try {
    const active = ss.getActiveSheet();
    if (active) return active;
  } catch (e) {}

  // 4. Fallback: First sheet if available
  if (allSheets.length > 0) return allSheets[0];

  const newSheet = ss.insertSheet(SHEET_NAME);
  initSheetFormatting(newSheet);
  return newSheet;
}

// ============================================================================
// WEB APP API ENDPOINTS (doPost & doGet)
// ============================================================================

function doPost(e) {
  const lock = LockService.getScriptLock();
  let sheet;

  try {
    const hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return createJsonResponse({
        success: false,
        message: "Server is busy processing concurrent registrations. Please try again in a few moments."
      }, 429);
    }

    // 1. Open Spreadsheet and Sheet Tab dynamically
    const ss = getSpreadsheet();
    sheet = getRegistrationSheet(ss);

    // 2. Parse Request Data
    let data;
    try {
      if (!e || !e.postData || !e.postData.contents) {
        return createJsonResponse({
          success: false,
          message: "No registration payload received."
        });
      }
      data = JSON.parse(e.postData.contents);
    } catch (parseError) {
      return createJsonResponse({
        success: false,
        message: "Invalid JSON format: " + parseError.message
      });
    }

    // 3. Ensure Columns A..J exist and get dynamic column mappings
    const { headers, colMap } = ensureAndMapHeaders(sheet);

    // 4. Handle Dedicated Credential Update Action (In-Place Row Update)
    if (data.action === "updateCredentials") {
      const regId = data.registrationId ? String(data.registrationId).trim().toUpperCase() : "";
      let existingRow = regId ? findRowByRegistrationId(sheet, regId, colMap.registrationId) : -1;

      // Fallback search by Roll Number or Email if not found by Registration ID
      if (existingRow === -1 && (data.rollNumber || data.email)) {
        existingRow = findRowByRollOrEmail(sheet, data.rollNumber, data.email, colMap.rollNumber, colMap.email);
      }

      if (existingRow !== -1) {
        const foundRegId = regId || (colMap.registrationId ? String(sheet.getRange(existingRow, colMap.registrationId).getValue()).trim() : "");
        const pId = data.participantId || generateParticipantId(foundRegId || "CODESTORM-2026-0001");
        const pPwd = data.temporaryPassword || generateTemporaryPassword(8);

        if (colMap.participantId) {
          sheet.getRange(existingRow, colMap.participantId).setValue(String(pId).trim()).setHorizontalAlignment("center");
        }
        if (colMap.password) {
          sheet.getRange(existingRow, colMap.password).setValue(String(pPwd).trim()).setHorizontalAlignment("center");
        }

        // Server-side debug log
        Logger.log("registrationId=" + foundRegId + ", participantId=" + pId + ", sheet=" + sheet.getName() + ", targetRow=" + existingRow + ", status=SUCCESS");

        return createJsonResponse({
          success: true,
          action: "updated",
          registrationId: foundRegId,
          participantId: pId,
          temporaryPassword: pPwd,
          message: "Participant credentials updated successfully in existing row."
        });
      } else {
        Logger.log("registrationId=" + regId + ", participantId=" + (data.participantId || "UNKNOWN") + ", sheet=" + sheet.getName() + ", targetRow=UNKNOWN, status=FAILED, error=Row not found");
        return createJsonResponse({
          success: false,
          message: "Existing registration row not found for credentials update."
        });
      }
    }

    // 6. Validate Required Registration Fields
    const name          = (data.name || "").trim();
    const rollNumber    = (data.rollNumber || "").trim().toUpperCase();
    const email         = (data.email || "").trim().toLowerCase();
    const mobile        = (data.mobile || "").trim();
    const year          = (data.year || "").trim();
    const branch        = (data.branch || "").trim();
    const section       = (data.section || "").trim();
    const screenshotB64 = data.screenshotBase64;

    if (!name) {
      return createJsonResponse({ success: false, message: "Full Name is required." });
    }
    if (!rollNumber) {
      return createJsonResponse({ success: false, message: "Roll Number / Student ID is required." });
    }
    if (!email || !email.includes("@")) {
      return createJsonResponse({ success: false, message: "A valid Email address is required." });
    }

    // 7. Duplicate Check & In-Place Row Update
    // Check if Registration ID already exists
    if (data.registrationId) {
      const providedRegId = String(data.registrationId).trim().toUpperCase();
      const existingRowById = findRowByRegistrationId(sheet, providedRegId, colMap.registrationId);

      if (existingRowById !== -1) {
        const pId = data.participantId || generateParticipantId(providedRegId);
        const pPwd = data.temporaryPassword || generateTemporaryPassword(8);

        if (colMap.participantId) {
          sheet.getRange(existingRowById, colMap.participantId).setValue(pId);
          sheet.getRange(existingRowById, colMap.participantId).setHorizontalAlignment("center");
        }
        if (colMap.password) {
          sheet.getRange(existingRowById, colMap.password).setValue(pPwd);
          sheet.getRange(existingRowById, colMap.password).setHorizontalAlignment("center");
        }

        // Server-side debug log
        Logger.log("registrationId=" + providedRegId + ", participantId=" + pId + ", sheet=" + sheet.getName() + ", targetRow=" + existingRowById + ", status=SUCCESS");

        return createJsonResponse({
          success: true,
          action: "updated",
          registrationId: providedRegId,
          participantId: pId,
          temporaryPassword: pPwd,
          name: name,
          email: email,
          message: "Registration credentials successfully updated on existing row."
        });
      }
    }

    // Check if Roll Number or Email already exists
    const existingRowByRollOrEmail = findRowByRollOrEmail(sheet, rollNumber, email, colMap.rollNumber, colMap.email);
    if (existingRowByRollOrEmail !== -1) {
      if (data.participantId || data.temporaryPassword) {
        const existingRegId = colMap.registrationId
          ? String(sheet.getRange(existingRowByRollOrEmail, colMap.registrationId).getValue()).trim()
          : "";
        const pId = data.participantId || generateParticipantId(existingRegId || "CODESTORM-2026-0001");
        const pPwd = data.temporaryPassword || generateTemporaryPassword(8);

        if (colMap.participantId) {
          sheet.getRange(existingRowByRollOrEmail, colMap.participantId).setValue(pId);
          sheet.getRange(existingRowByRollOrEmail, colMap.participantId).setHorizontalAlignment("center");
        }
        if (colMap.password) {
          sheet.getRange(existingRowByRollOrEmail, colMap.password).setValue(pPwd);
          sheet.getRange(existingRowByRollOrEmail, colMap.password).setHorizontalAlignment("center");
        }

        // Server-side debug log
        Logger.log("registrationId=" + existingRegId + ", participantId=" + pId + ", sheet=" + sheet.getName() + ", targetRow=" + existingRowByRollOrEmail + ", status=SUCCESS");

        return createJsonResponse({
          success: true,
          action: "updated",
          registrationId: existingRegId,
          participantId: pId,
          temporaryPassword: pPwd,
          name: name,
          email: email,
          message: "Existing registration credentials updated."
        });
      }

      return createJsonResponse({
        success: false,
        message: "This roll number or email is already registered for CODESTORM."
      });
    }

    // 8. Generate Registration ID, Participant ID, and Temporary Password BEFORE sheet write
    const registrationId = data.registrationId || generateNextRegistrationId(sheet, colMap.registrationId);
    const participantId = data.participantId || generateParticipantId(registrationId);
    const temporaryPassword = data.temporaryPassword || generateTemporaryPassword(8);

    // 9. Store Payment Screenshot in Google Drive (if folder configured and base64 provided)
    let screenshotUrl = "";
    let screenshotFormula = "";
    if (screenshotB64 && DRIVE_FOLDER_ID && DRIVE_FOLDER_ID !== "YOUR_GOOGLE_DRIVE_FOLDER_ID") {
      try {
        const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        let cleanB64 = screenshotB64;
        let mimeType = data.screenshotType || "image/jpeg";
        if (cleanB64.indexOf(",") !== -1) {
          const parts = cleanB64.split(",");
          cleanB64 = parts[1];
          const match = parts[0].match(/:(.*?);/);
          if (match) mimeType = match[1];
        }

        const decodedBytes = Utilities.base64Decode(cleanB64);
        let fileExt = "jpg";
        if (mimeType.includes("png")) fileExt = "png";
        else if (mimeType.includes("webp")) fileExt = "webp";
        else if (mimeType.includes("jpeg") || mimeType.includes("jpg")) fileExt = "jpg";

        const sanitizedRoll = rollNumber.replace(/[^a-zA-Z0-9]/g, "_");
        const fileName = `PAYMENT_${registrationId}_${sanitizedRoll}.${fileExt}`;
        const blob = Utilities.newBlob(decodedBytes, mimeType, fileName);
        const driveFile = folder.createFile(blob);

        driveFile.setDescription(
          `CODESTORM 2026 Payment Screenshot\nRegistration ID: ${registrationId}\nParticipant ID: ${participantId}\nParticipant: ${name}\nRoll: ${rollNumber}\nEmail: ${email}\nMobile: ${mobile}`
        );

        try {
          driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        } catch (permError) {
          Logger.log("Permission note: " + permError.toString());
        }

        screenshotUrl = driveFile.getUrl();
        screenshotFormula = `=HYPERLINK("${screenshotUrl}", "View Screenshot")`;
      } catch (driveErr) {
        Logger.log("Drive upload note: " + driveErr.toString());
      }
    }

    // 10. Record Timestamp and Academic Info
    const formattedTimestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
    const yearAndBranch = (year && branch)
      ? (section ? `${year} - ${branch} (${section})` : `${year} - ${branch}`)
      : (data.yearAndBranch || year || branch || "CSE");

    // 11. Build Dynamic Row Array strictly matching Columns A through J
    const maxCols = Math.max(sheet.getLastColumn(), 10);
    const newRow = new Array(maxCols).fill("");

    if (colMap.timestamp)         newRow[colMap.timestamp - 1]         = formattedTimestamp;
    if (colMap.name)              newRow[colMap.name - 1]              = name;
    if (colMap.rollNumber)         newRow[colMap.rollNumber - 1]         = rollNumber;
    if (colMap.email)              newRow[colMap.email - 1]              = email;
    if (colMap.mobile)             newRow[colMap.mobile - 1]             = mobile;
    if (colMap.yearAndBranch)      newRow[colMap.yearAndBranch - 1]      = yearAndBranch;
    if (colMap.paymentScreenshot)  newRow[colMap.paymentScreenshot - 1]  = screenshotFormula || "Paid";
    if (colMap.registrationId)     newRow[colMap.registrationId - 1]     = registrationId;
    if (colMap.participantId)      newRow[colMap.participantId - 1]      = participantId;
    if (colMap.password)           newRow[colMap.password - 1]           = temporaryPassword;

    // Guaranteed positional fallbacks for standard columns A..J (indices 0..9)
    if (!colMap.timestamp && newRow[0] === "")         newRow[0] = formattedTimestamp;
    if (!colMap.name && newRow[1] === "")              newRow[1] = name;
    if (!colMap.rollNumber && newRow[2] === "")        newRow[2] = rollNumber;
    if (!colMap.email && newRow[3] === "")             newRow[3] = email;
    if (!colMap.mobile && newRow[4] === "")            newRow[4] = mobile;
    if (!colMap.yearAndBranch && newRow[5] === "")     newRow[5] = yearAndBranch;
    if (!colMap.paymentScreenshot && newRow[6] === "") newRow[6] = screenshotFormula || "Paid";
    if (!colMap.registrationId && newRow[7] === "")    newRow[7] = registrationId;
    if (!colMap.participantId && newRow[8] === "")     newRow[8] = participantId;
    if (!colMap.password && newRow[9] === "")          newRow[9] = temporaryPassword;

    // 12. Append Registration Row (Participant ID & Password on SAME ROW)
    sheet.appendRow(newRow);

    const targetRowIndex = sheet.getLastRow();
    const newRange = sheet.getRange(targetRowIndex, 1, 1, newRow.length);
    newRange.setVerticalAlignment("middle");

    // Explicitly guarantee Columns I (Participant ID) and J (Password) are populated on the same row
    const partCol = colMap.participantId || 9;
    const pwdCol = colMap.password || 10;
    sheet.getRange(targetRowIndex, partCol).setValue(participantId).setHorizontalAlignment("center");
    sheet.getRange(targetRowIndex, pwdCol).setValue(temporaryPassword).setHorizontalAlignment("center");

    // Center identifiers, credentials, and links
    if (colMap.timestamp)         sheet.getRange(targetRowIndex, colMap.timestamp).setHorizontalAlignment("center");
    if (colMap.rollNumber)         sheet.getRange(targetRowIndex, colMap.rollNumber).setHorizontalAlignment("center");
    if (colMap.mobile)             sheet.getRange(targetRowIndex, colMap.mobile).setHorizontalAlignment("center");
    if (colMap.paymentScreenshot)  sheet.getRange(targetRowIndex, colMap.paymentScreenshot).setHorizontalAlignment("center");
    if (colMap.registrationId)     sheet.getRange(targetRowIndex, colMap.registrationId).setHorizontalAlignment("center");

    // Server-side debug log containing ONLY registrationId, participantId, sheet, targetRow, status
    Logger.log("registrationId=" + registrationId + ", participantId=" + participantId + ", sheet=" + sheet.getName() + ", targetRow=" + targetRowIndex + ", status=SUCCESS");

    // 13. Return JSON Success Response with credentials
    return createJsonResponse({
      success: true,
      registrationId: registrationId,
      participantId: participantId,
      temporaryPassword: temporaryPassword,
      name: name,
      email: email,
      message: "Registration successful"
    });

  } catch (globalError) {
    const safeRegId = (data && data.registrationId) ? data.registrationId : "UNKNOWN";
    const safePartId = (data && data.participantId) ? data.participantId : "UNKNOWN";
    const safeSheet = (typeof sheet !== "undefined" && sheet) ? sheet.getName() : SHEET_NAME;
    Logger.log("registrationId=" + safeRegId + ", participantId=" + safePartId + ", sheet=" + safeSheet + ", targetRow=UNKNOWN, status=FAILED, error=" + globalError.message);
    return createJsonResponse({
      success: false,
      message: "Google Sheets credential column update failed: " + globalError.message
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handles GET requests - health checking
 */
function doGet(e) {
  return createJsonResponse({
    status: "online",
    service: "CODESTORM 2026 Google Sheets Registration API",
    timestamp: new Date().toISOString(),
    spreadsheetConfigured: SPREADSHEET_ID !== "YOUR_GOOGLE_SHEET_ID",
    driveFolderConfigured: DRIVE_FOLDER_ID !== "YOUR_GOOGLE_DRIVE_FOLDER_ID"
  });
}


// ============================================================================
// DYNAMIC HEADER MAPPING & AUTO-COLUMN CREATION
// ============================================================================

/**
 * Scans row 1 headers. If columns I (Participant ID) and J (Password) do not exist,
 * automatically appends them after Registration ID (H) and returns dynamic mappings.
 */
function ensureAndMapHeaders(sheet) {
  const lastRow = sheet.getLastRow();
  let lastCol = Math.max(1, sheet.getLastColumn());

  // If sheet is completely empty, initialize default columns A..J
  if (lastRow === 0) {
    sheet.appendRow(REQUIRED_HEADERS);
    formatHeaderRow(sheet, REQUIRED_HEADERS.length);
    lastCol = REQUIRED_HEADERS.length;
  }

  let headerValues = sheet.getRange(1, 1, 1, Math.max(lastCol, sheet.getLastColumn())).getValues()[0];
  let headers = headerValues.map(h => String(h || "").trim());

  function findCol(aliases) {
    for (let i = 0; i < headers.length; i++) {
      const cleanHeader = headers[i].toLowerCase().replace(/[^a-z0-9]/g, "");
      for (let alias of aliases) {
        if (cleanHeader === alias.toLowerCase().replace(/[^a-z0-9]/g, "")) {
          return i + 1; // 1-based index
        }
      }
    }
    return 0;
  }

  let colMap = {
    timestamp:          findCol(["Timestamp", "Registered Date", "Date", "Created At", "Time"]),
    name:               findCol(["Name", "Full Name", "Participant Name", "Student Name"]),
    rollNumber:         findCol(["Roll Number", "Roll No", "Roll", "Student ID", "RollNumber", "HT No"]),
    email:              findCol(["Email", "Email Address", "Email ID"]),
    mobile:             findCol(["Mobile Number", "Mobile", "Phone Number", "Phone", "Contact Number"]),
    yearAndBranch:      findCol(["Mobile Number / Year-Branch information", "Year-Branch information", "Year & Branch", "Year and Branch", "Year-Branch", "Year/Branch", "Academic Info", "Branch", "Year"]),
    paymentScreenshot:  findCol(["Payment Screenshot", "Screenshot", "Payment", "Payment Status", "Screenshot Link", "UTR"]),
    registrationId:     findCol(["Registration ID", "RegistrationID", "Reg ID", "RegID"]),
    participantId:      findCol(["Participant ID", "ParticipantID", "Part ID", "Participant"]),
    password:           findCol(["Password", "Temporary Password", "Temp Password", "Password Hash"])
  };

  // If Registration ID column is missing, add it (Column H / 8)
  if (!colMap.registrationId) {
    const newCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, newCol).setValue("Registration ID");
    styleHeaderCell(sheet, newCol);
    sheet.setColumnWidth(newCol, 200);
    headers.push("Registration ID");
    colMap.registrationId = newCol;
  }

  // Column I (9): Participant ID - place immediately after Registration ID
  if (!colMap.participantId) {
    const targetCol = colMap.registrationId ? colMap.registrationId + 1 : sheet.getLastColumn() + 1;
    sheet.getRange(1, targetCol).setValue("Participant ID");
    styleHeaderCell(sheet, targetCol);
    sheet.setColumnWidth(targetCol, 160);
    headers[targetCol - 1] = "Participant ID";
    colMap.participantId = targetCol;
  }

  // Column J (10): Password - place immediately after Participant ID
  if (!colMap.password) {
    const targetCol = colMap.participantId ? colMap.participantId + 1 : sheet.getLastColumn() + 1;
    sheet.getRange(1, targetCol).setValue("Password");
    styleHeaderCell(sheet, targetCol);
    sheet.setColumnWidth(targetCol, 160);
    headers[targetCol - 1] = "Password";
    colMap.password = targetCol;
  }

  return { headers, colMap };
}

function styleHeaderCell(sheet, colIndex) {
  const cell = sheet.getRange(1, colIndex);
  cell.setFontWeight("bold");
  cell.setFontColor("#FFFFFF");
  cell.setBackground("#0f172a");
  cell.setHorizontalAlignment("center");
  cell.setVerticalAlignment("middle");
}

function formatHeaderRow(sheet, totalCols) {
  sheet.setFrozenRows(1);
  const headerRange = sheet.getRange(1, 1, 1, totalCols);
  headerRange.setFontWeight("bold");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setBackground("#0f172a");
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);

  // Column width formatting
  sheet.setColumnWidth(1, 170); // Timestamp (A)
  sheet.setColumnWidth(2, 200); // Name (B)
  sheet.setColumnWidth(3, 140); // Roll Number (C)
  sheet.setColumnWidth(4, 220); // Email (D)
  sheet.setColumnWidth(5, 140); // Mobile (E)
  sheet.setColumnWidth(6, 180); // Year & Branch (F)
  sheet.setColumnWidth(7, 160); // Payment Screenshot (G)
  sheet.setColumnWidth(8, 200); // Registration ID (H)
  sheet.setColumnWidth(9, 160); // Participant ID (I)
  sheet.setColumnWidth(10, 160); // Password (J)
}

/**
 * Searches Column H (or mapped Registration ID column) for registrationId
 */
function findRowByRegistrationId(sheet, registrationId, regCol) {
  if (!registrationId || !regCol) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const target = String(registrationId).trim().toUpperCase();
  const values = sheet.getRange(2, regCol, lastRow - 1, 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toUpperCase() === target) {
      return i + 2; // 1-based row index
    }
  }
  return -1;
}

/**
 * Searches for existing Roll Number or Email
 */
function findRowByRollOrEmail(sheet, rollNumber, email, rollCol, emailCol) {
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const targetRoll = rollNumber ? String(rollNumber).trim().toUpperCase() : null;
  const targetEmail = email ? String(email).trim().toLowerCase() : null;

  if (rollCol > 0 && targetRoll) {
    const rollValues = sheet.getRange(2, rollCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < rollValues.length; i++) {
      if (String(rollValues[i][0]).trim().toUpperCase() === targetRoll) {
        return i + 2;
      }
    }
  }

  if (emailCol > 0 && targetEmail) {
    const emailValues = sheet.getRange(2, emailCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < emailValues.length; i++) {
      if (String(emailValues[i][0]).trim().toLowerCase() === targetEmail) {
        return i + 2;
      }
    }
  }

  return -1;
}

/**
 * Generates the next sequential Registration ID (e.g. CODESTORM-2026-0001)
 */
function generateNextRegistrationId(sheet, regCol) {
  const lastRow = sheet.getLastRow();
  let maxNumber = 0;

  if (lastRow > 1 && regCol > 0) {
    const idValues = sheet.getRange(2, regCol, lastRow - 1, 1).getValues();
    for (let i = 0; i < idValues.length; i++) {
      const val = String(idValues[i][0]).trim();
      if (val.startsWith(ID_PREFIX)) {
        const numPart = parseInt(val.substring(ID_PREFIX.length), 10);
        if (!isNaN(numPart) && numPart > maxNumber) {
          maxNumber = numPart;
        }
      }
    }
  }

  const nextNumber = maxNumber + 1;
  const paddedNumber = String(nextNumber).padStart(4, "0");
  return ID_PREFIX + paddedNumber;
}

/**
 * Generates the Participant ID (e.g. CS26-0001) matching registration number
 */
function generateParticipantId(registrationId) {
  if (registrationId && registrationId.startsWith(ID_PREFIX)) {
    const numPart = registrationId.substring(ID_PREFIX.length);
    return PARTICIPANT_ID_PREFIX + numPart;
  }
  const match = String(registrationId).match(/\d+$/);
  const numPart = match ? match[0] : String(Math.floor(1000 + Math.random() * 9000));
  return PARTICIPANT_ID_PREFIX + numPart.padStart(4, "0");
}

/**
 * Generates an unpredictable 8-character temporary password
 */
function generateTemporaryPassword(length) {
  length = length || 8;
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const numbers = "23456789";
  const all = upper + lower + numbers;

  let pwd = "";
  pwd += upper.charAt(Math.floor(Math.random() * upper.length));
  pwd += lower.charAt(Math.floor(Math.random() * lower.length));
  pwd += numbers.charAt(Math.floor(Math.random() * numbers.length));

  for (let i = 3; i < length; i++) {
    pwd += all.charAt(Math.floor(Math.random() * all.length));
  }

  const arr = pwd.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr.join("");
}

/**
 * Initializes and formats the Google Sheet header row
 */
function initSheetFormatting(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(REQUIRED_HEADERS);
  } else {
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
  }
  formatHeaderRow(sheet, REQUIRED_HEADERS.length);

  try {
    const filter = sheet.getFilter();
    if (!filter) {
      sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), REQUIRED_HEADERS.length).createFilter();
    }
  } catch (err) {
    Logger.log("Filter setup notice: " + err.toString());
  }
}

function createJsonResponse(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============================================================================
// ADMIN SETUP & VERIFICATION UTILITIES
// ============================================================================

/**
 * Run this function once from Apps Script editor to ensure Columns I and J exist
 * and all headers A through J are properly styled.
 */
function setupSheet() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    const allSheets = ss.getSheets();
    if (allSheets.length > 0 && (allSheets[0].getName() === "Sheet1" || allSheets[0].getLastRow() === 0)) {
      sheet = allSheets[0];
      sheet.setName(SHEET_NAME);
    } else {
      sheet = ss.insertSheet(SHEET_NAME);
    }
  }

  ensureAndMapHeaders(sheet);
  initSheetFormatting(sheet);
  Logger.log("Google Sheet verified and formatted with Columns A through J (including I: Participant ID and J: Password)!");
}

/**
 * Utility to backfill Participant ID and Temporary Password for any existing rows
 * that were registered before Columns I and J were added.
 * Select 'populateMissingCredentialsForExistingRows' in Apps Script and click Run.
 */
function populateMissingCredentialsForExistingRows() {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    const allSheets = ss.getSheets();
    sheet = allSheets[0];
  }

  const { colMap } = ensureAndMapHeaders(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log("No data rows found to populate.");
    return;
  }

  let updatedCount = 0;
  for (let r = 2; r <= lastRow; r++) {
    const regId = colMap.registrationId ? String(sheet.getRange(r, colMap.registrationId).getValue()).trim() : "";
    const currentPartId = colMap.participantId ? String(sheet.getRange(r, colMap.participantId).getValue()).trim() : "";
    const currentPassword = colMap.password ? String(sheet.getRange(r, colMap.password).getValue()).trim() : "";

    if (!currentPartId || !currentPassword) {
      const pId = currentPartId || generateParticipantId(regId || ("CODESTORM-2026-" + String(r - 1).padStart(4, "0")));
      const pPwd = currentPassword || generateTemporaryPassword(8);

      if (colMap.participantId && !currentPartId) {
        sheet.getRange(r, colMap.participantId).setValue(pId);
        sheet.getRange(r, colMap.participantId).setHorizontalAlignment("center");
      }
      if (colMap.password && !currentPassword) {
        sheet.getRange(r, colMap.password).setValue(pPwd);
        sheet.getRange(r, colMap.password).setHorizontalAlignment("center");
      }
      updatedCount++;
    }
  }

  Logger.log("Successfully populated credentials on the SAME ROW for " + updatedCount + " existing registrations!");
}
