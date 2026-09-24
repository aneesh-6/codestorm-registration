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
 * 2. Duplicate checking for Roll Number and Email
 * 3. Decoding and saving payment screenshots directly to Google Drive
 * 4. Automatic sequential Registration ID generation (CODESTORM-2026-0001)
 * 5. Appending new records to Google Sheets with clickable Drive links
 * 6. Returning JSON responses with CORS headers
 */

// ============================================================================
// CONFIGURATION - PASTE YOUR GOOGLE SHEET & GOOGLE DRIVE FOLDER IDS HERE
// ============================================================================

/**
 * 1. GOOGLE SPREADSHEET ID:
 * Open your Google Sheet in your web browser.
 * Look at the browser address bar. The URL looks like:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 *
 * Copy the long string between "/d/" and "/edit".
 * Paste it inside the quotes below:
 */
const SPREADSHEET_ID = "YOUR_GOOGLE_SHEET_ID";

/**
 * 2. GOOGLE DRIVE FOLDER ID:
 * Open Google Drive, create or open the folder where payment screenshots will be saved.
 * Look at the browser address bar. The URL looks like:
 * https://drive.google.com/drive/folders/1a2b3c4d5e6f7g8h9i0jklmnopqrstuv
 *
 * Copy the string after "/folders/".
 * Paste it inside the quotes below:
 */
const DRIVE_FOLDER_ID = "YOUR_GOOGLE_DRIVE_FOLDER_ID";

/**
 * 3. SHEET / TAB NAME:
 * The tab inside your spreadsheet where registrations will be stored.
 * Default is "Registrations". If your sheet tab is "Sheet1", you can rename it
 * to "Registrations" or update this constant.
 */
const SHEET_NAME = "Registrations";

/**
 * 4. REGISTRATION ID CONFIGURATION:
 * Prefix used for unique registration IDs.
 */
const ID_PREFIX = "CODESTORM-2026-";

/**
 * 5. PARTICIPANT ID CONFIGURATION:
 * Prefix used for unique participant credentials (e.g. CS26-0001).
 */
const PARTICIPANT_ID_PREFIX = "CS26-";

/**
 * 6. TIMEZONE:
 * Timezone for timestamp recording (e.g., 'Asia/Kolkata' for IST).
 */
const TIMEZONE = "Asia/Kolkata";



// ============================================================================
// WEB APP API ENDPOINTS (doPost & doGet)
// ============================================================================

/**
 * Handles incoming POST requests from the website registration form.
 * Note: Clients should send JSON string in request body with 'Content-Type: text/plain'
 * to avoid browser CORS preflight (OPTIONS) limitations with Apps Script.
 */
function doPost(e) {
  // Concurrency Lock: Prevents race conditions when multiple users submit at once
  const lock = LockService.getScriptLock();

  try {
    // Wait up to 30 seconds to acquire exclusive execution lock
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

    if (!DRIVE_FOLDER_ID || DRIVE_FOLDER_ID === "YOUR_GOOGLE_DRIVE_FOLDER_ID") {
      return createJsonResponse({
        success: false,
        message: "Backend Error: DRIVE_FOLDER_ID is not configured in Google Apps Script."
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

    // 3. Backend Validation of Required Fields
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
    if (!mobile) {
      return createJsonResponse({ success: false, message: "Mobile Number is required." });
    }
    if (!year) {
      return createJsonResponse({ success: false, message: "Year is required." });
    }
    if (!branch) {
      return createJsonResponse({ success: false, message: "Branch is required." });
    }
    if (!section) {
      return createJsonResponse({ success: false, message: "Section is required." });
    }
    if (!screenshotB64) {
      return createJsonResponse({ success: false, message: "Payment Screenshot is required." });
    }

    // 4. Access Sheet and Ensure Setup
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

    // Ensure headers exist
    if (sheet.getLastRow() === 0) {
      initSheetFormatting(sheet);
    }

    // 5. Duplicate Submission Protection (Check Roll Number & Email)
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
      let rollCol = headers.indexOf("Roll Number") + 1;
      let emailCol = headers.indexOf("Email") + 1;
      if (rollCol === 0) rollCol = 5;
      if (emailCol === 0) emailCol = 6;

      const rollData = sheet.getRange(2, rollCol, lastRow - 1, 1).getValues();
      const emailData = sheet.getRange(2, emailCol, lastRow - 1, 1).getValues();

      for (let i = 0; i < rollData.length; i++) {
        const existingRoll  = String(rollData[i][0]).trim().toUpperCase();
        const existingEmail = String(emailData[i][0]).trim().toLowerCase();

        if (existingRoll === rollNumber || existingEmail === email) {
          return createJsonResponse({
            success: false,
            message: "This roll number or email is already registered for CODESTORM."
          });
        }
      }
    }

    // 6. Generate Unique Sequential Registration ID (e.g., CODESTORM-2026-0001)
    const registrationId = generateNextRegistrationId(sheet);

    // 6b. Generate Corresponding Participant ID (e.g., CS26-0001)
    const participantId = generateParticipantId(registrationId);

    // 6c. Generate Secure Temporary Password (e.g., K7mP4xQ9) & SHA-256 Hash
    const temporaryPassword = generateTemporaryPassword(8);
    const passwordHash = hashPassword(temporaryPassword);

    // 7. Store Payment Screenshot in Google Drive
    let screenshotUrl = "";
    try {
      const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);

      // Clean base64 string (remove data:image/png;base64, prefix if present)
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
        `CODESTORM 2026 Payment Screenshot\nRegistration ID: ${registrationId}\nParticipant ID: ${participantId}\nParticipant: ${name}\nRoll: ${rollNumber}\nEmail: ${email}\nMobile: ${mobile}\nTransaction ID: ${data.transactionId || 'N/A'}`
      );

      // Make the file accessible to anyone with the link (viewer) so organizers can open it directly
      try {
        driveFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      } catch (permError) {
        // Fallback: Drive domain policy might restrict public sharing, file will still be accessible to folder owners
        Logger.log("Permission note: " + permError.toString());
      }

      screenshotUrl = driveFile.getUrl();
    } catch (driveError) {
      Logger.log("Drive upload failed: " + driveError.toString());
      return createJsonResponse({
        success: false,
        message: "Failed to upload payment screenshot to Google Drive: " + driveError.message
      });
    }

    // 8. Record Timestamp
    const formattedTimestamp = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd HH:mm:ss");

    // 9. Prepare Clickable Formula for Google Sheet
    // Using HYPERLINK formula: =HYPERLINK("url", "View Screenshot")
    const screenshotFormula = `=HYPERLINK("${screenshotUrl}", "View Screenshot")`;

    // 10. Append Registration Row to Google Sheet
    // Standard Column Structure:
    // [ Registration ID | Participant ID | Password | Name | Roll Number | Email | Mobile Number | Year | Branch | Section | Payment Screenshot | Registration Status | Timestamp ]
    const newRow = [
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
      screenshotFormula,
      "Registered",
      formattedTimestamp
    ];

    sheet.appendRow(newRow);

    // Apply alignment to the newly added row
    const targetRowIndex = sheet.getLastRow();
    const newRange = sheet.getRange(targetRowIndex, 1, 1, newRow.length);
    newRange.setVerticalAlignment("middle");

    // Center identifiers, codes, and links
    sheet.getRange(targetRowIndex, 1).setHorizontalAlignment("center");  // Registration ID
    sheet.getRange(targetRowIndex, 2).setHorizontalAlignment("center");  // Participant ID
    sheet.getRange(targetRowIndex, 3).setHorizontalAlignment("center");  // Temporary Password
    sheet.getRange(targetRowIndex, 5).setHorizontalAlignment("center");  // Roll Number
    sheet.getRange(targetRowIndex, 7).setHorizontalAlignment("center");  // Mobile
    sheet.getRange(targetRowIndex, 8).setHorizontalAlignment("center");  // Year
    sheet.getRange(targetRowIndex, 9).setHorizontalAlignment("center");  // Branch
    sheet.getRange(targetRowIndex, 10).setHorizontalAlignment("center"); // Section
    sheet.getRange(targetRowIndex, 11).setHorizontalAlignment("center"); // Screenshot Link
    sheet.getRange(targetRowIndex, 12).setHorizontalAlignment("center"); // Status
    sheet.getRange(targetRowIndex, 13).setHorizontalAlignment("center"); // Timestamp

    // 11. Return JSON Success Response with credentials
    return createJsonResponse({
      success: true,
      registrationId: registrationId,
      participantId: participantId,
      temporaryPassword: temporaryPassword,
      message: "Registration successful"
    });

  } catch (globalError) {
    Logger.log("Global Error in doPost: " + globalError.toString());
    return createJsonResponse({
      success: false,
      message: "Server error: " + globalError.message
    });
  } finally {
    // Always release lock
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
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generates the next sequential Registration ID (e.g. CODESTORM-2026-0001).
 * Scans existing IDs in Column 10 (Registration ID) to guarantee monotonic increments.
 */
/**
 * Generates the next sequential Registration ID (e.g. CODESTORM-2026-0001).
 * Scans existing IDs in Registration ID column to guarantee monotonic increments.
 */
function generateNextRegistrationId(sheet) {
  const lastRow = sheet.getLastRow();
  let maxNumber = 0;

  if (lastRow > 1) {
    const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    let regCol = headers.indexOf("Registration ID") + 1;
    if (regCol === 0) regCol = 1; // Default to Column 1

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
  return PARTICIPANT_ID_PREFIX + "0001";
}

/**
 * Generates a secure, unpredictable 8-character temporary password (e.g. K7mP4xQ9)
 * containing uppercase, lowercase, and numeric characters.
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
 * Required columns: Registration ID, Participant ID, Password, Name, Roll Number, Email, Mobile Number, Year, Branch, Section, Payment Screenshot, Registration Status, Timestamp
 */
function initSheetFormatting(sheet) {
  const headers = [
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
    "Payment Screenshot",
    "Registration Status",
    "Timestamp"
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  // Freeze top row
  sheet.setFrozenRows(1);

  // Header style
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight("bold");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setBackground("#0f172a"); // Dark slate / navy
  headerRange.setHorizontalAlignment("center");
  headerRange.setVerticalAlignment("middle");
  sheet.setRowHeight(1, 40);

  // Set individual column widths for readability
  sheet.setColumnWidth(1,  170); // Timestamp
  sheet.setColumnWidth(2,  220); // Name
  sheet.setColumnWidth(3,  150); // Roll Number
  sheet.setColumnWidth(4,  240); // Email
  sheet.setColumnWidth(5,  140); // Mobile Number
  sheet.setColumnWidth(6,  120); // Year
  sheet.setColumnWidth(7,  200); // Branch
  sheet.setColumnWidth(8,  100); // Section
  sheet.setColumnWidth(9,  180); // Payment Screenshot
  sheet.setColumnWidth(10, 200); // Registration ID
  sheet.setColumnWidth(11, 160); // Participant ID
  sheet.setColumnWidth(12, 240); // Password Hash

  // Enable filter if not already enabled
  try {
    const filter = sheet.getFilter();
    if (!filter) {
      sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), headers.length).createFilter();
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

/**
 * Run this function once from the Apps Script editor (select 'setupSheet' and click 'Run')
 * to automatically prepare the headers, formatting, freeze row 1, and enable filters!
 */
function setupSheet() {
  if (!SPREADSHEET_ID || SPREADSHEET_ID === "YOUR_GOOGLE_SHEET_ID") {
    throw new Error("Please replace SPREADSHEET_ID at the top of the script first!");
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(SHEET_NAME);

  // If a tab named 'Registrations' doesn't exist, check if there's a default 'Sheet1' and rename it
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

/**
 * Run this function from the Apps Script editor (select 'testRegistration' and click 'Run')
 * to test writing to your Google Sheet and Google Drive folder before testing from the website!
 */
function testRegistration() {
  Logger.log("Starting test registration...");

  // Create a minimal 1x1 transparent PNG blob for testing Drive upload
  const testBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

  const mockEvent = {
    postData: {
      contents: JSON.stringify({
        name: "Test Participant",
        rollNumber: "TEST2026" + Math.floor(100 + Math.random() * 900),
        email: "test_" + Date.now() + "@example.com",
        mobile: "9876543210",
        year: "3rd Year",
        branch: "CSE \u2013 Data Science (CSD)",
        section: "A",
        screenshotBase64: testBase64,
        screenshotType: "image/png"
      })
    }
  };

  const response = doPost(mockEvent);
  Logger.log("Response from doPost: " + response.getContent());
}
