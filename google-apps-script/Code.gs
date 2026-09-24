/**
 * ============================================================================
 * CODESTORM 2026 - GOOGLE SHEETS & DRIVE REGISTRATION BACKEND
 * ============================================================================
 *
 * Registration Columns (Columns A through H):
 * A: Timestamp
 * B: Name
 * C: Roll Number
 * D: Email
 * E: Mobile Number
 * F: Year & Branch
 * G: Payment Screenshot
 * H: Registration ID
 *
 * Authentication Note:
 * Registration ID itself serves as the participant's Login ID and Password.
 * No Participant ID or Password columns are generated or stored in Google Sheets.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID"; // Leave as is if script is opened via Extensions > Apps Script in Sheet
const DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";
const SHEET_NAME = "Registrations";
const ID_PREFIX = "CODESTORM-2026-";
const TIMEZONE = "Asia/Kolkata";

/**
 * Production Sheet Columns (Columns A through H):
 */
const REQUIRED_HEADERS = [
  "Timestamp",          // A (1)
  "Name",               // B (2)
  "Roll Number",        // C (3)
  "Email",              // D (4)
  "Mobile Number",      // E (5)
  "Year & Branch",      // F (6)
  "Payment Screenshot", // G (7)
  "Registration ID"     // H (8)
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
  // 1. Check if configured SHEET_NAME tab exists
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
        return clean.includes('registrationid') || clean.includes('rollnumber');
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

    // 3. Ensure Columns A..H exist and get dynamic column mappings
    const { headers, colMap } = ensureAndMapHeaders(sheet);

    // 4. Validate Required Registration Fields
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

    // 5. Duplicate Check
    // If registrationId already exists, do not duplicate
    if (data.registrationId) {
      const providedRegId = String(data.registrationId).trim().toUpperCase();
      const existingRowById = findRowByRegistrationId(sheet, providedRegId, colMap.registrationId);
      if (existingRowById !== -1) {
        Logger.log("registrationId=" + providedRegId + ", sheet=" + sheet.getName() + ", targetRow=" + existingRowById + ", status=EXISTING");
        return createJsonResponse({
          success: true,
          registrationId: providedRegId,
          message: "Registration already recorded."
        });
      }
    }

    // Check if Roll Number or Email already exists
    const existingRowByRollOrEmail = findRowByRollOrEmail(sheet, rollNumber, email, colMap.rollNumber, colMap.email);
    if (existingRowByRollOrEmail !== -1) {
      const existingRegId = colMap.registrationId
        ? String(sheet.getRange(existingRowByRollOrEmail, colMap.registrationId).getValue()).trim()
        : "";
      return createJsonResponse({
        success: false,
        registrationId: existingRegId,
        message: "This roll number or email is already registered for CODESTORM."
      });
    }

    // 6. Generate or use sequential Registration ID
    const registrationId = data.registrationId || generateNextRegistrationId(sheet, colMap.registrationId);

    // 7. Store Payment Screenshot in Google Drive (if folder configured and base64 provided)
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
          `CODESTORM 2026 Payment Screenshot\nRegistration ID: ${registrationId}\nParticipant: ${name}\nRoll: ${rollNumber}\nEmail: ${email}\nMobile: ${mobile}`
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

    // 8. Record Timestamp and Academic Info
    const formattedTimestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");
    const yearAndBranch = (year && branch)
      ? (section ? `${year} - ${branch} (${section})` : `${year} - ${branch}`)
      : (data.yearAndBranch || year || branch || "CSE");

    // 9. Build Row Array strictly matching Columns A through H (Length 8)
    const maxCols = Math.max(sheet.getLastColumn(), 8);
    const newRow = new Array(maxCols).fill("");

    if (colMap.timestamp)         newRow[colMap.timestamp - 1]         = formattedTimestamp;
    if (colMap.name)              newRow[colMap.name - 1]              = name;
    if (colMap.rollNumber)         newRow[colMap.rollNumber - 1]         = rollNumber;
    if (colMap.email)              newRow[colMap.email - 1]              = email;
    if (colMap.mobile)             newRow[colMap.mobile - 1]             = mobile;
    if (colMap.yearAndBranch)      newRow[colMap.yearAndBranch - 1]      = yearAndBranch;
    if (colMap.paymentScreenshot)  newRow[colMap.paymentScreenshot - 1]  = screenshotFormula || "Paid";
    if (colMap.registrationId)     newRow[colMap.registrationId - 1]     = registrationId;

    // Guaranteed positional fallbacks for standard columns A..H (indices 0..7)
    if (!colMap.timestamp && newRow[0] === "")         newRow[0] = formattedTimestamp;
    if (!colMap.name && newRow[1] === "")              newRow[1] = name;
    if (!colMap.rollNumber && newRow[2] === "")        newRow[2] = rollNumber;
    if (!colMap.email && newRow[3] === "")             newRow[3] = email;
    if (!colMap.mobile && newRow[4] === "")            newRow[4] = mobile;
    if (!colMap.yearAndBranch && newRow[5] === "")     newRow[5] = yearAndBranch;
    if (!colMap.paymentScreenshot && newRow[6] === "") newRow[6] = screenshotFormula || "Paid";
    if (!colMap.registrationId && newRow[7] === "")    newRow[7] = registrationId;

    // 10. Append Registration Row (Stops strictly at Registration ID / Col H)
    sheet.appendRow(newRow);

    const targetRowIndex = sheet.getLastRow();
    const newRange = sheet.getRange(targetRowIndex, 1, 1, 8);
    newRange.setVerticalAlignment("middle");

    // Center identifiers, codes, and links
    if (colMap.timestamp)         sheet.getRange(targetRowIndex, colMap.timestamp).setHorizontalAlignment("center");
    if (colMap.rollNumber)         sheet.getRange(targetRowIndex, colMap.rollNumber).setHorizontalAlignment("center");
    if (colMap.mobile)             sheet.getRange(targetRowIndex, colMap.mobile).setHorizontalAlignment("center");
    if (colMap.paymentScreenshot)  sheet.getRange(targetRowIndex, colMap.paymentScreenshot).setHorizontalAlignment("center");
    if (colMap.registrationId)     sheet.getRange(targetRowIndex, colMap.registrationId).setHorizontalAlignment("center");

    // Server-side debug log containing ONLY registrationId, sheet, targetRow, status
    Logger.log("registrationId=" + registrationId + ", sheet=" + sheet.getName() + ", targetRow=" + targetRowIndex + ", status=SUCCESS");

    // 11. Return JSON Success Response with Registration ID ONLY
    return createJsonResponse({
      success: true,
      registrationId: registrationId,
      name: name,
      email: email,
      rollNumber: rollNumber,
      message: "Registration successful"
    });

  } catch (globalError) {
    const safeRegId = (data && data.registrationId) ? data.registrationId : "UNKNOWN";
    const safeSheet = (typeof sheet !== "undefined" && sheet) ? sheet.getName() : SHEET_NAME;
    Logger.log("registrationId=" + safeRegId + ", sheet=" + safeSheet + ", targetRow=UNKNOWN, status=FAILED, error=" + globalError.message);
    return createJsonResponse({
      success: false,
      message: "Google Sheets registration failed: " + globalError.message
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handles GET requests - health checking and registration lookup (Columns A through H only)
 */
function doGet(e) {
  if (e && e.parameter && (e.parameter.action === "getRegistrations" || e.parameter.action === "lookup")) {
    try {
      const ss = getSpreadsheet();
      const sheet = getRegistrationSheet(ss);
      const lastRow = sheet.getLastRow();
      if (lastRow <= 1) {
        return createJsonResponse({ success: true, count: 0, registrations: [] });
      }
      const { headers, colMap } = ensureAndMapHeaders(sheet);
      // Strictly read Columns A through H (first 8 columns maximum)
      const maxCol = Math.min(8, sheet.getLastColumn());
      const data = sheet.getRange(2, 1, lastRow - 1, maxCol).getValues();

      const targetRegId = (e.parameter.registrationId || "").trim().toUpperCase();
      const registrations = [];

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const regId = colMap.registrationId ? String(row[colMap.registrationId - 1] || "").trim() : "";
        if (!regId) continue;
        if (targetRegId && regId.toUpperCase() !== targetRegId) continue;

        registrations.push({
          row: i + 2,
          timestamp: colMap.timestamp ? row[colMap.timestamp - 1] : "",
          name: colMap.name ? row[colMap.name - 1] : "",
          rollNumber: colMap.rollNumber ? row[colMap.rollNumber - 1] : "",
          email: colMap.email ? row[colMap.email - 1] : "",
          mobile: colMap.mobile ? row[colMap.mobile - 1] : "",
          yearAndBranch: colMap.yearAndBranch ? row[colMap.yearAndBranch - 1] : "",
          registrationId: regId,
        });
      }

      return createJsonResponse({
        success: true,
        count: registrations.length,
        registrations: registrations
      });
    } catch (err) {
      return createJsonResponse({ success: false, error: err.message });
    }
  }

  return createJsonResponse({
    status: "online",
    service: "CODESTORM 2026 Google Sheets Registration API",
    timestamp: new Date().toISOString(),
    spreadsheetConfigured: SPREADSHEET_ID !== "YOUR_GOOGLE_SHEET_ID",
    driveFolderConfigured: DRIVE_FOLDER_ID !== "YOUR_GOOGLE_DRIVE_FOLDER_ID"
  });
}

// ============================================================================
// DYNAMIC HEADER MAPPING UTILITIES
// ============================================================================

function ensureAndMapHeaders(sheet) {
  const lastRow = sheet.getLastRow();
  let lastCol = Math.max(1, sheet.getLastColumn());

  // If sheet is completely empty, initialize default columns A..H
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
    registrationId:     findCol(["Registration ID", "RegistrationID", "Reg ID", "RegID"])
  };

  // If Registration ID column is missing, add it (Column H / 8)
  if (!colMap.registrationId) {
    const newCol = Math.max(8, sheet.getLastColumn() + 1);
    sheet.getRange(1, newCol).setValue("Registration ID");
    styleHeaderCell(sheet, newCol);
    sheet.setColumnWidth(newCol, 200);
    headers[newCol - 1] = "Registration ID";
    colMap.registrationId = newCol;
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
  sheet.setColumnWidth(5, 140); // Mobile Number (E)
  sheet.setColumnWidth(6, 200); // Year & Branch (F)
  sheet.setColumnWidth(7, 180); // Payment Screenshot (G)
  sheet.setColumnWidth(8, 200); // Registration ID (H)
}

function findRowByRegistrationId(sheet, registrationId, regCol) {
  if (!registrationId || !regCol) return -1;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return -1;

  const target = String(registrationId).trim().toUpperCase();
  const values = sheet.getRange(2, regCol, lastRow - 1, 1).getValues();

  for (let i = 0; i < values.length; i++) {
    if (String(values[i][0]).trim().toUpperCase() === target) {
      return i + 2;
    }
  }
  return -1;
}

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
  return ID_PREFIX + String(nextNumber).padStart(4, "0");
}

function createJsonResponse(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

// ============================================================================
// ADMIN SETUP & VERIFICATION UTILITIES
// ============================================================================

function setupSheet() {
  const ss = getSpreadsheet();
  const sheet = getRegistrationSheet(ss);
  ensureAndMapHeaders(sheet);
  formatHeaderRow(sheet, REQUIRED_HEADERS.length);
  Logger.log("✅ Google Sheet initialized and formatted successfully on tab: '" + sheet.getName() + "' with Columns A through H!");
}
