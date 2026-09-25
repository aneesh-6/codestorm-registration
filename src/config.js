/**
 * ============================================================================
 * CODESTORM CONFIGURATION
 * ============================================================================
 *
 * Central configuration file for the CODESTORM event registration platform.
 */

export const EVENT_CONFIG = {
  // --------------------------------------------------------------------------
  // WHATSAPP GROUP LINK CONFIGURATION
  // --------------------------------------------------------------------------
  // Official CODESTORM WhatsApp group invitation link:
  whatsappGroupLink: "https://chat.whatsapp.com/FYVIZ11zmBB50cX8yk0KIj",

  eventName: "CODESTORM 2026",
  eventFee: "₹50",
  department: "Department of CSE – Data Science",
  college: "Malla Reddy Engineering College and Management Sciences",
};

// Single, easily editable export for the WhatsApp group link
export const WHATSAPP_GROUP_LINK = EVENT_CONFIG.whatsappGroupLink;

/**
 * Google Apps Script Web App Endpoint for Google Sheets Database
 */
export const GOOGLE_SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_SCRIPT_URL ||
  "https://script.google.com/macros/s/AKfycbyU3tUtbG6bzxDUAnOYjdUcC-FbPPDrv6Z9jG0XsxIeF8ZKO4oiD3zWW3HyCBv8cz-F/exec";

/**
 * Returns true if the Google Apps Script Web App URL is properly configured.
 */
export const isGoogleScriptConfigured = () => {
  return (
    Boolean(GOOGLE_SCRIPT_URL) &&
    GOOGLE_SCRIPT_URL.startsWith("https://script.google.com/macros/s/") &&
    !GOOGLE_SCRIPT_URL.includes("YOUR_")
  );
};

/**
 * CodeStorm Event Conducting Platform URL (Where participants log in to compete)
 * Configurable via VITE_EVENT_PLATFORM_URL
 */
export const EVENT_PLATFORM_URL =
  import.meta.env.VITE_EVENT_PLATFORM_URL || "http://localhost:5000";

/**
 * Backend API URL (for participant account creation)
 * Configurable via VITE_API_URL. In development, Vite dev proxy handles /api -> http://localhost:5000.
 */
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname !== 'localhost'
    ? ''
    : (import.meta.env.VITE_EVENT_PLATFORM_URL || 'http://localhost:5000'));


