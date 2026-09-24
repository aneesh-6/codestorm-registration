/**
 * ============================================================================
 * CODESTORM 2026 - GOOGLE SHEETS & DRIVE REGISTRATION BACKEND
 * ============================================================================
 *
 * This Google Apps Script acts as the secure backend API for the CODESTORM
 * website registration form.
 *
 * It handles:
 * 1. Concurrency-safe submission handling via LockService
 * 2. Duplicate checking for Roll Number, Email, and Registration ID
 * 3. Dynamic header detection and mapping (never hardcoded column positions)
 * 4. Automatic header column creation for Participant ID and Password if missing
 * 5. In-place credential updates on existing rows (preventing duplicate rows)
 * 6. Writing Participant ID and Password to the SAME ROW as the participant's registration
 * 7. Decoding and saving payment screenshots directly to Google Drive
 * 8. Returning credentials atomically to the caller
 */

// ============================================================================
// CONFIGURATION - PASTE YOUR GOOGLE SHEET & GOOGLE DRIVE FOLDER IDS HERE
// ============================================================================

/**
 * 1. GOOGLE SPREADSHEET ID:
 * Paste the spreadsheet ID from your browser URL:
 */
const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID";

/**
 * 2. GOOGLE DRIVE FOLDER ID:
 * Paste the folder ID from your Google Drive URL:
 */
const DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";

/**
 * 3. SHEET / TAB NAME:
 * The tab inside your spreadsheet where registrations will be stored.
 */
const SHEET_NAME = "Registrations";

/**
 * 4. REGISTRATION ID CONFIGURATION:
 */
const ID_PREFIX = "CODESTORM-2026-";

/**
 * 5. PARTICIPANT ID CONFIGURATION:
 */
const PARTICIPANT_ID_PREFIX = "CS26-";

/**
 * 6. TIMEZONE:
 */
const TIMEZONE = "Asia/Kolkata";

/**
 * 7. REQUIRED SHEET COLUMNS (Canonical specification)
 */
const REQUIRED_HEADERS = [
  "Registration ID",
  "Participant ID",
  "Password",
  "Name",
  "Roll Number",
  "Email",
  "Mobile Number",
  "Year",
  "Branch",
  "Section",
  "Payment Status",
  "Registration Status",
  "Registered Date"
];


// ============================================================================
// WEB APP API ENDPOINTS (doPost & doGet)
// ============================================================================

/**
 * Handles incoming POST requests from the website registration form.
 */
function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const hasLock = lock.tryLock(30000);
    if (!hasLock) {
      return createJsonResponse({
        success: false,
        message: "Server is busy processing concurrent registrations. Please try again in a few moments."
      }, 429);
    }

    // 1. Verify Configuration
    if (!SPREADSHEET_ID || SPREADSHEET_ID === "YOUR_GOOGLE_SHEET_ID") {
      return createJsonResponse({
        success: false,
        message: "Backend Error: SPREADSHEET_ID is not configured in Google Apps Script."
      });
    }

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

    // 3. Open Spreadsheet and Sheet Tab
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet) {
      const allSheets = ss.getSheets();
      if (allSheets.length > 0 && (allSheets[0].getName() === "Sheet1" || allSheets[0].getLastRow() === 0)) {
        sheet = allSheets[0];
        sheet.setName(SHEET_NAME);
      } else {
        sheet = ss.insertSheet(SHEET_NAME);
      }
      initSheetFormatting(sheet);
    }

    // 4. Dynamic Column Mapping and Auto-Header Correction
    const { headers, colMap } = getHeaderMapping(sheet);

    // 5. Check for Dedicated Credential Update Action
    if (data.action === "updateCredentials" && data.registrationId) {
      const regId = String(data.registrationId).trim().toUpperCase();
      const existingRow = findRowByRegistrationId(sheet, regId, colMap.registrationId);

      if (existingRow !== -1) {
        if (data.participantId && colMap.participantId) {
          sheet.getRange(existingRow, colMap.participantId).setValue(String(data.participantId).trim());
          sheet.getRange(existingRow, colMap.participantId).setHorizontalAlignment("center");
        }
        if (data.temporaryPassword && colMap.password) {
          sheet.getRange(existingRow, colMap.password).setValue(String(data.temporaryPassword).trim());
          sheet.getRange(existingRow, colMap.password).setHorizontalAlignment("center");
        }
        return createJsonResponse({
          success: true,
          action: "updated",
          registrationId: regId,
          participantId: data.participantId || "",
          temporaryPassword: data.temporaryPassword || "",
          message: "Participant credentials updated successfully in existing row."
        });
      }
    }

    // 6. Backend Validation of Registration Fields
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

    // 7. Duplicate Check & In-Place Row Update Protection
    // If registrationId is provided, check if that row already exists
    if (data.registrationId) {
      const providedRegId = String(data.registrationId).trim().toUpperCase();
      const existingRowById = findRowByRegistrationId(sheet, providedRegId, colMap.registrationId);

      if (existingRowById !== -1) {
        // Update credentials on SAME ROW instead of appending duplicate
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
      // If client supplied credentials for an existing row, update it in place
      if (data.participantId || data.temporaryPassword) {
        const existingRegId = colMap.registrationId ? String(sheet.getRange(existingRowByRollOrEmail, colMap.registrationId).getValue()).trim() : "";
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

    // 8. Generate Unique Sequential Registration ID
    const registrationId = data.registrationId || generateNextRegistrationId(sheet, colMap.registrationId);

    // 8b. Generate Corresponding Participant ID (e.g. CS26-0001)
    const participantId = data.participantId || generateParticipantId(registrationId);

    // 8c. Generate Secure Temporary Password (e.g. K7mP4xQ9)
    const temporaryPassword = data.temporaryPassword || generateTemporaryPassword(8);

    // 9. Store Payment Screenshot in Google Drive (if folder configured and screenshot provided)
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

    // 10. Record Timestamp
    const formattedTimestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    // 11. Build Dynamic Row Array Mapped Strictly to Headers
    const maxCols = Math.max(sheet.getLastColumn(), Object.values(colMap).reduce((a, b) => Math.max(a, b), 0));
    const newRow = new Array(maxCols).fill("");

    if (colMap.registrationId)     newRow[colMap.registrationId - 1]     = registrationId;
    if (colMap.participantId)      newRow[colMap.participantId - 1]      = participantId;
    if (colMap.password)           newRow[colMap.password - 1]           = temporaryPassword;
    if (colMap.name)               newRow[colMap.name - 1]               = name;
    if (colMap.rollNumber)         newRow[colMap.rollNumber - 1]         = rollNumber;
    if (colMap.email)              newRow[colMap.email - 1]              = email;
    if (colMap.mobile)             newRow[colMap.mobile - 1]             = mobile;
    if (colMap.year)               newRow[colMap.year - 1]               = year;
    if (colMap.branch)             newRow[colMap.branch - 1]             = branch;
    if (colMap.section)            newRow[colMap.section - 1]            = section;
    if (colMap.paymentStatus)      newRow[colMap.paymentStatus - 1]      = screenshotFormula || "Paid";
    if (colMap.registrationStatus) newRow[colMap.registrationStatus - 1] = "Registered";
    if (colMap.registeredDate)     newRow[colMap.registeredDate - 1]     = formattedTimestamp;
    if (colMap.yearAndBranch)      newRow[colMap.yearAndBranch - 1]      = (year && branch) ? `${year} - ${branch}` : (year || branch || "");

    // 12. Append Registration Row (Participant ID & Password on SAME ROW)
    sheet.appendRow(newRow);

    const targetRowIndex = sheet.getLastRow();
    const newRange = sheet.getRange(targetRowIndex, 1, 1, newRow.length);
    newRange.setVerticalAlignment("middle");

    // Center identifiers, credentials, codes, and statuses
    if (colMap.registrationId)     sheet.getRange(targetRowIndex, colMap.registrationId).setHorizontalAlignment("center");
    if (colMap.participantId)      sheet.getRange(targetRowIndex, colMap.participantId).setHorizontalAlignment("center");
    if (colMap.password)           sheet.getRange(targetRowIndex, colMap.password).setHorizontalAlignment("center");
    if (colMap.rollNumber)         sheet.getRange(targetRowIndex, colMap.rollNumber).setHorizontalAlignment("center");
    if (colMap.mobile)             sheet.getRange(targetRowIndex, colMap.mobile).setHorizontalAlignment("center");
    if (colMap.year)               sheet.getRange(targetRowIndex, colMap.year).setHorizontalAlignment("center");
    if (colMap.branch)             sheet.getRange(targetRowIndex, colMap.branch).setHorizontalAlignment("center");
    if (colMap.section)            sheet.getRange(targetRowIndex, colMap.section).setHorizontalAlignment("center");
    if (colMap.paymentStatus)      sheet.getRange(targetRowIndex, colMap.paymentStatus).setHorizontalAlignment("center");
    if (colMap.registrationStatus) sheet.getRange(targetRowIndex, colMap.registrationStatus).setHorizontalAlignment("center");
    if (colMap.registeredDate)     sheet.getRange(targetRowIndex, colMap.registeredDate).setHorizontalAlignment("center");

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
    Logger.log("Google Sheets credential column update failed: " + globalError.toString());
    return createJsonResponse({
      success: false,
      message: "Server error processing registration: " + globalError.message
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Handles GET requests - useful for health checking the endpoint in a browser.
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
// DYNAMIC HEADER MAPPING & ROW LOOKUP UTILITIES
// ============================================================================

/**
 * Scans row 1 headers, adds any missing required columns (Participant ID, Password, etc.),
 * and returns dynamic column index mappings.
 */
function getHeaderMapping(sheet) {
  let lastCol = Math.max(1, sheet.getLastColumn());
  let headerValues = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  let headers = headerValues.map(h => String(h || "").trim());

  // If sheet has zero rows or empty headers, initialize default header row
  if (sheet.getLastRow() === 0 || (headers.length === 1 && !headers[0])) {
    sheet.getRange(1, 1, 1, REQUIRED_HEADERS.length).setValues([REQUIRED_HEADERS]);
    formatHeaderRow(sheet, REQUIRED_HEADERS.length);
    lastCol = REQUIRED_HEADERS.length;
    headers = [...REQUIRED_HEADERS];
  }

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
    registrationId:     findCol(["Registration ID", "RegistrationID", "Reg ID", "RegID"]),
    participantId:      findCol(["Participant ID", "ParticipantID", "Part ID", "Participant"]),
    password:           findCol(["Password", "Temporary Password", "Temp Password", "Password Hash"]),
    name:               findCol(["Name", "Full Name", "Participant Name", "Student Name"]),
    rollNumber:         findCol(["Roll Number", "Roll No", "Roll", "Student ID", "RollNumber"]),
    email:              findCol(["Email", "Email Address", "Email ID"]),
    mobile:             findCol(["Mobile Number", "Mobile", "Phone Number", "Phone"]),
    year:               findCol(["Year", "Academic Year"]),
    branch:             findCol(["Branch", "Department"]),
    section:            findCol(["Section", "Sec"]),
    paymentStatus:      findCol(["Payment Status", "Payment Screenshot", "Screenshot", "Payment", "PaymentStatus"]),
    registrationStatus: findCol(["Registration Status", "Status", "RegistrationStatus"]),
    registeredDate:     findCol(["Registered Date", "Timestamp", "Date", "RegisteredDate", "Created At"]),
    yearAndBranch:      findCol(["Year & Branch", "Year and Branch"]),
  };

  // If Participant ID column does not exist, add it to headers
  if (!colMap.participantId) {
    const newCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, newCol).setValue("Participant ID");
    styleHeaderCell(sheet, newCol);
    sheet.setColumnWidth(newCol, 160);
    headers.push("Participant ID");
    colMap.participantId = newCol;
  }

  // If Password column does not exist, add it to headers
  if (!colMap.password) {
    const newCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, newCol).setValue("Password");
    styleHeaderCell(sheet, newCol);
    sheet.setColumnWidth(newCol, 160);
    headers.push("Password");
    colMap.password = newCol;
  }

  // If Registration ID column does not exist, add it to headers
  if (!colMap.registrationId) {
    const newCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, newCol).setValue("Registration ID");
    styleHeaderCell(sheet, newCol);
    sheet.setColumnWidth(newCol, 200);
    headers.push("Registration ID");
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

  // Default widths
  for (let c = 1; c <= totalCols; c++) {
    sheet.setColumnWidth(c, 160);
  }
}

/**
 * Searches column for Registration ID and returns 1-based sheet row index.
 */
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

/**
 * Searches for existing Roll Number or Email.
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
 * Generates the next sequential Registration ID (e.g. CODESTORM-2026-0001).
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
 * Generates the Participant ID (e.g. CS26-0001) matching the registration sequence.
 */
function generateParticipantId(registrationId) {
  if (registrationId && registrationId.startsWith(ID_PREFIX)) {
    const numPart = registrationId.substring(ID_PREFIX.length);
    return PARTICIPANT_ID_PREFIX + numPart;
  }
  const randNum = String(Math.floor(1000 + Math.random() * 9000));
  return PARTICIPANT_ID_PREFIX + randNum;
}

/**
 * Generates an unpredictable 8-character temporary password containing uppercase, lowercase, and numbers.
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
 * Securely hashes the password with SHA-256 for reference storage if needed.
 */
function hashPassword(password) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password, Utilities.Charset.UTF_8);
  let hexString = "";
  for (let i = 0; i < digest.length; i++) {
    let byteVal = digest[i];
    if (byteVal < 0) byteVal += 256;
    let byteHex = byteVal.toString(16);
    if (byteHex.length === 1) byteHex = "0" + byteHex;
    hexString += byteHex;
  }
  return hexString;
}

/**
 * Initializes and formats the Google Sheet header row and styling.
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

/**
 * Creates a CORS-enabled JSON text output.
 */
function createJsonResponse(obj, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}


// ============================================================================
// ADMIN SETUP & VERIFICATION UTILITIES
// ============================================================================

function setupSheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === "YOUR_GOOGLE_SHEET_ID") {
    throw new Error("Please replace SPREADSHEET_ID at the top of the script first!");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
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

  initSheetFormatting(sheet);
  Logger.log("✅ Google Sheet initialized and formatted successfully on tab: '" + sheet.getName() + "'!");
}
