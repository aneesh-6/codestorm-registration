import { useState, useRef } from 'react';
import { validators, validateAll } from '../utils/validation';
import { GOOGLE_SCRIPT_URL, API_URL } from '../config';
import './RegistrationSection.css';

// Academic detail options (exact values as specified)
const YEAR_OPTIONS    = ['2nd Year', '3rd Year', '4th Year'];
const BRANCH_OPTIONS  = ['CSE – Data Science (CSD)', 'Cyber Security'];
const SECTION_OPTIONS = ['A', 'B', 'C'];

const INITIAL_FORM = {
  name: '',
  rollNumber: '',
  email: '',
  mobile: '',
  year: '',
  branch: '',
  section: '',
  paymentScreenshot: null,
};

// Helper to convert file to Base64 data URL
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

// Helper to generate an unpredictable temporary password if running against an older deployment
const generateClientFallbackPassword = (length = 8) => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  let pwd = '';
  pwd += upper[Math.floor(Math.random() * upper.length)];
  pwd += lower[Math.floor(Math.random() * lower.length)];
  pwd += digits[Math.floor(Math.random() * digits.length)];
  for (let i = 3; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)];
  }
  return pwd.split('').sort(() => 0.5 - Math.random()).join('');
};

export default function RegistrationSection({ onRegistrationSuccess }) {
  const [form, setForm]             = useState(INITIAL_FORM);
  const [errors, setErrors]         = useState({});
  const [touched, setTouched]       = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError]     = useState('');
  const [preview, setPreview]       = useState(null);
  const [upiCopied, setUpiCopied]   = useState(false);
  const fileRef                     = useRef();

  // Live validation per field
  const validateField = (name, value) => {
    const err = validators[name] ? validators[name](value) : null;
    setErrors(prev => ({ ...prev, [name]: err }));
  };

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    let val = type === 'file' ? files[0] : value;

    if (type === 'file' && files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(files[0]);
    }
    setForm(prev => ({ ...prev, [name]: val }));
    if (touched[name]) validateField(name, val);
  };

  const handleBlur = (e) => {
    const { name, value, type, files } = e.target;
    const val = type === 'file' ? files?.[0] : value;
    setTouched(prev => ({ ...prev, [name]: true }));
    validateField(name, val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Mark all fields touched
    const allTouched = Object.fromEntries(Object.keys(INITIAL_FORM).map(k => [k, true]));
    setTouched(allTouched);

    const allErrors = validateAll(form);
    setErrors(allErrors);
    if (Object.keys(allErrors).length > 0) {
      const firstErrorField = document.querySelector('.form-control.error, input.error, .file-upload-area.error');
      if (firstErrorField) firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);
    setApiError('');

    try {
      // Read payment screenshot as Base64 data URL
      let screenshotBase64 = '';
      if (form.paymentScreenshot) {
        screenshotBase64 = await readFileAsBase64(form.paymentScreenshot);
      }

      // Pre-generate secure credentials and fallback IDs
      const randSeq = String(Math.floor(1000 + Math.random() * 9000));
      const preRegistrationId = `CODESTORM-2026-${randSeq}`;
      const preParticipantId = `CS26-${randSeq}`;
      const preTemporaryPassword = generateClientFallbackPassword(8);

      const payload = {
        name: form.name.trim(),
        rollNumber: form.rollNumber.trim().toUpperCase(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        year: form.year,
        branch: form.branch,
        section: form.section,
        temporaryPassword: preTemporaryPassword,
        screenshotBase64: screenshotBase64,
        screenshotType: form.paymentScreenshot?.type || 'image/jpeg',
        screenshotName: form.paymentScreenshot?.name || 'screenshot.jpg',
      };

      let finalRegistrationId = null;
      let participantId = null;
      let temporaryPassword = null;
      let registrationComplete = false;

      // 1. PRIMARY: Submit to authoritative Registration API (/api/register)
      // On Vercel, this serverless function uses Google Service Account (GOOGLE_SHEET_ID,
      // GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY) to write all 10 columns
      // (including Participant ID in Col I and Password in Col J) to Google Sheets on the SAME ROW.
      const primaryEndpoint = API_URL ? `${API_URL}/api/register` : '/api/register';

      try {
        const res = await fetch(primaryEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const responseText = await res.text();
        let json = null;
        try {
          json = JSON.parse(responseText);
        } catch {
          console.warn('Primary registration endpoint returned non-JSON:', responseText);
        }

        // Duplicate registration check
        if (res.status === 409 || (json && json.success === false && (json.message?.includes('already registered') || json.error?.includes('already registered')))) {
          const errorMsg = json?.message || json?.error || 'This roll number or email is already registered.';
          console.error('Registration conflict:', errorMsg);
          setApiError(errorMsg);
          const errorBanner = document.querySelector('.api-error-banner');
          if (errorBanner) errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }

        // Strict Google Sheets error reporting
        if (res.status === 500 && json?.message && json.message.includes('Google Sheets')) {
          console.error('Google Sheets write failure:', json.message);
          throw new Error(json.message);
        }

        if (res.ok && json?.success) {
          finalRegistrationId = json.registrationId || preRegistrationId;
          participantId = json.participantId || preParticipantId;
          temporaryPassword = json.temporaryPassword || preTemporaryPassword;
          registrationComplete = true;
        }
      } catch (primaryErr) {
        console.warn('Primary registration API call encountered an issue:', primaryErr.message);
        if (primaryErr.message && primaryErr.message.includes('Google Sheets')) {
          throw primaryErr;
        }
      }

      // 2. FALLBACK: If primary endpoint was unreachable (e.g. offline dev), submit via Google Apps Script Web App
      if (!registrationComplete) {
        const isGoogleConfigured = GOOGLE_SCRIPT_URL && GOOGLE_SCRIPT_URL.trim() !== '' && GOOGLE_SCRIPT_URL.startsWith('https://script.google.com/macros/s/');

        if (isGoogleConfigured) {
          const res = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              ...payload,
              registrationId: preRegistrationId,
              participantId: preParticipantId,
              temporaryPassword: preTemporaryPassword,
            }),
          });

          const responseText = await res.text();
          let json = null;
          try {
            json = JSON.parse(responseText);
          } catch {
            console.error('Registration parse error. Response was:', responseText);
            throw new Error('Registration server returned an unexpected response. Please try again.');
          }

          if (!res.ok || !json.success) {
            const errorMsg = json?.message || json?.error || (res.status === 409 ? 'This roll number or email is already registered.' : 'Registration could not be completed. Please try again.');
            console.error('Registration error:', errorMsg);
            setApiError(errorMsg);
            const errorBanner = document.querySelector('.api-error-banner');
            if (errorBanner) errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }

          finalRegistrationId = json.registrationId || preRegistrationId;
          participantId = json.participantId || preParticipantId;
          temporaryPassword = json.temporaryPassword || preTemporaryPassword;
          registrationComplete = true;
        } else {
          throw new Error('Registration server could not be reached. Please check your internet connection and try again.');
        }
      }

      // Registration successfully completed with participant credentials
      const successData = {
        registrationId: finalRegistrationId,
        participantId: participantId,
        temporaryPassword: temporaryPassword,
        name: form.name.trim(),
        rollNumber: form.rollNumber.trim().toUpperCase(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        year: form.year,
        branch: form.branch,
        section: form.section,
      };

      if (onRegistrationSuccess) {
        onRegistrationSuccess(successData);
      } else {
        try {
          sessionStorage.setItem('codestorm_registration', JSON.stringify(successData));
        } catch {
          // Ignore
        }
        window.history.pushState(successData, '', '/registration-success');
        window.dispatchEvent(new Event('popstate'));
      }
    } catch (err) {
      console.error('Registration error:', err);
      // Keeps form data intact
      setApiError(err.message || 'Registration could not be completed. Please try again.');
      const errorBanner = document.querySelector('.api-error-banner');
      if (errorBanner) errorBanner.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } finally {
      setSubmitting(false);
    }
  };

  const fieldClass = (name) => {
    if (!touched[name]) return 'form-control';
    return `form-control ${errors[name] ? 'error' : 'success'}`;
  };

  const renderFieldError = (name) => {
    if (!errors[name] || !touched[name]) return null;
    return (
      <span className="form-error" role="alert" id={`${name}-error`}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        {errors[name]}
      </span>
    );
  };

  return (
    <section id="registration" className="section registration-section" aria-labelledby="reg-heading">
      <div className="container">
        <div className="reg-header text-center">
          <p className="section-subtitle">Official Event Portal</p>
          <h2 className="section-title" id="reg-heading">Register for CODESTORM</h2>
          <p className="section-desc" style={{ margin: '12px auto 0', textAlign: 'center' }}>
            Complete the form below after making the ₹50 payment. Every registration is directly stored in the master database.
          </p>
          <div className="eligibility-badge" role="note" aria-label="Eligibility information" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', margin: '16px auto 0', padding: '8px 18px', borderRadius: '50px', background: 'rgba(99,179,237,0.10)', border: '1px solid rgba(99,179,237,0.30)', fontSize: '0.92rem', color: 'var(--color-accent, #63b3ed)', fontWeight: 600 }}>
            <span aria-hidden="true">🎓</span>
            Eligibility: Open to Students from All Years &amp; All Branches
          </div>
        </div>

        <div className="reg-layout mt-48">
          {/* Payment Panel */}
          <aside className="payment-panel" aria-label="Payment information">
            <div className="payment-fee-badge">
              <div className="payment-fee-amount">₹50</div>
              <div className="payment-fee-label">Participation Fee</div>
            </div>

            <div className="payment-steps">
              <h3 className="payment-steps-title">How to Pay</h3>
              <ol className="payment-steps-list">
                <li><span className="step-num">1</span> Scan the QR code below</li>
                <li><span className="step-num">2</span> Pay exactly ₹50</li>
                <li><span className="step-num">3</span> Save your payment screenshot</li>
                <li><span className="step-num">4</span> Upload the screenshot in the form</li>
              </ol>
            </div>

            {/* Payment QR Code */}
            <div className="payment-qr-wrap" aria-label="Official CODESTORM Payment QR code">
              <div className="payment-qr-card">
                <img
                  src="/codestorm-payment-qr.png"
                  alt="CODESTORM Scan & Pay ₹50 Registration Fee QR Code"
                  className="payment-qr-img"
                />
              </div>
            </div>

            <div className="payment-upi-wrap">
              <div className="payment-upi-header">
                <p className="payment-upi-label">UPI ID</p>
                <button
                  type="button"
                  className="btn-copy-upi"
                  onClick={() => {
                    navigator.clipboard.writeText('7036648459@axl');
                    setUpiCopied(true);
                    setTimeout(() => setUpiCopied(false), 2000);
                  }}
                  title="Copy UPI ID"
                  aria-label="Copy UPI ID"
                >
                  {upiCopied ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div className="payment-upi-value" aria-label="UPI ID: 7036648459@axl">
                7036648459@axl
              </div>
              <p className="payment-upi-subtext">PhonePe • Google Pay • Paytm • BHIM</p>
            </div>

            <div className="payment-note">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Upload the clear payment screenshot below to generate your official Registration ID.
            </div>
          </aside>

          {/* Registration Form */}
          <form
            id="registration-form"
            className="reg-form"
            onSubmit={handleSubmit}
            noValidate
            aria-label="CODESTORM Registration Form"
          >
            {/* Error Banner with Preserved Form Data & TRY AGAIN */}
            {apiError && (
              <div className="api-error-banner" role="alert">
                <div className="api-error-content">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div className="api-error-text-wrap">
                    <span className="api-error-msg">{apiError}</span>
                  </div>
                </div>
                <button
                  type="button"
                  id="try-again-btn"
                  className="api-error-retry-btn"
                  onClick={() => {
                    setApiError('');
                    const submitBtn = document.getElementById('submit-registration-btn');
                    if (submitBtn) submitBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
                  </svg>
                  TRY AGAIN
                </button>
              </div>
            )}

            {/* Section: Student Information */}
            <div className="form-section">
              <h3 className="form-section-title">
                <span className="form-section-num">01</span>
                Student Information
              </h3>
              <div className="form-grid-2">
                {/* Full Name */}
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Full Name <span className="required" aria-label="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={fieldClass('name')}
                    placeholder="Enter your full name"
                    aria-required="true"
                    aria-describedby="name-error"
                    autoComplete="name"
                  />
                  {renderFieldError('name')}
                </div>

                {/* Roll Number */}
                <div className="form-group">
                  <label htmlFor="rollNumber" className="form-label">
                    Roll Number / Student ID <span className="required" aria-label="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="rollNumber"
                    name="rollNumber"
                    value={form.rollNumber}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={fieldClass('rollNumber')}
                    placeholder="e.g. 22WH1A0501"
                    aria-required="true"
                    aria-describedby="rollNumber-error"
                    autoComplete="off"
                  />
                  {renderFieldError('rollNumber')}
                </div>

                {/* Email Address */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address <span className="required" aria-label="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={fieldClass('email')}
                    placeholder="example@email.com"
                    aria-required="true"
                    aria-describedby="email-error"
                    autoComplete="email"
                  />
                  {renderFieldError('email')}
                </div>

                {/* Mobile Number */}
                <div className="form-group">
                  <label htmlFor="mobile" className="form-label">
                    Mobile Number <span className="required" aria-label="required">*</span>
                  </label>
                  <input
                    type="tel"
                    id="mobile"
                    name="mobile"
                    value={form.mobile}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={fieldClass('mobile')}
                    placeholder="10-digit mobile number"
                    aria-required="true"
                    aria-describedby="mobile-error"
                    autoComplete="tel"
                    maxLength={10}
                    inputMode="numeric"
                  />
                  {renderFieldError('mobile')}
                </div>

                {/* ── Academic Details: Year | Branch | Section (3 separate columns) ── */}
                <div className="form-group form-academic-row" style={{ gridColumn: '1 / -1' }}>

                  {/* Year */}
                  <div className="form-academic-field">
                    <label htmlFor="year" className="form-label">
                      Year <span className="required" aria-label="required">*</span>
                    </label>
                    <select
                      id="year"
                      name="year"
                      value={form.year}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={fieldClass('year')}
                      aria-required="true"
                      aria-describedby="year-error"
                    >
                      <option value="">Select Year</option>
                      {YEAR_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {renderFieldError('year')}
                  </div>

                  {/* Branch */}
                  <div className="form-academic-field">
                    <label htmlFor="branch" className="form-label">
                      Branch <span className="required" aria-label="required">*</span>
                    </label>
                    <select
                      id="branch"
                      name="branch"
                      value={form.branch}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={fieldClass('branch')}
                      aria-required="true"
                      aria-describedby="branch-error"
                    >
                      <option value="">Select Branch</option>
                      {BRANCH_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {renderFieldError('branch')}
                  </div>

                  {/* Section */}
                  <div className="form-academic-field">
                    <label htmlFor="section" className="form-label">
                      Section <span className="required" aria-label="required">*</span>
                    </label>
                    <select
                      id="section"
                      name="section"
                      value={form.section}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      className={fieldClass('section')}
                      aria-required="true"
                      aria-describedby="section-error"
                    >
                      <option value="">Select Section</option>
                      {SECTION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                    {renderFieldError('section')}
                  </div>

                </div>
              </div>
            </div>

            {/* Section: Payment Verification */}
            <div className="form-section">
              <h3 className="form-section-title">
                <span className="form-section-num">02</span>
                Payment Verification
              </h3>

              {/* Upload Payment Screenshot */}
              <div className="form-group">
                <label htmlFor="paymentScreenshot" className="form-label">
                  Upload Payment Screenshot <span className="required" aria-label="required">*</span>
                </label>
                <div
                  className={`file-upload-area ${errors.paymentScreenshot && touched.paymentScreenshot ? 'error' : ''} ${form.paymentScreenshot ? 'has-file' : ''}`}
                  onClick={() => fileRef.current.click()}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileRef.current.click(); }}
                  role="button"
                  tabIndex={0}
                  aria-label="Upload payment screenshot"
                >
                  <input
                    type="file"
                    id="paymentScreenshot"
                    name="paymentScreenshot"
                    ref={fileRef}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    className="file-input-hidden"
                    aria-describedby="paymentScreenshot-error"
                    aria-required="true"
                  />
                  {preview ? (
                    <div className="file-preview">
                      <img src={preview} alt="Payment screenshot preview" className="file-preview-img" />
                      <div className="file-preview-info">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        <span>{form.paymentScreenshot?.name}</span>
                        <span className="file-size">({(form.paymentScreenshot?.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    </div>
                  ) : (
                    <div className="file-upload-inner">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="17 8 12 3 7 8"/>
                        <line x1="12" y1="3" x2="12" y2="15"/>
                      </svg>
                      <p className="file-upload-text">
                        <strong>Click to upload</strong> or drag and drop
                      </p>
                      <p className="file-upload-hint">JPG, PNG, WebP • Max 5MB</p>
                    </div>
                  )}
                </div>
                {renderFieldError('paymentScreenshot')}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="submit-registration-btn"
              className="btn btn-secondary btn-lg submit-btn"
              disabled={submitting}
              aria-busy={submitting}
            >
              {submitting ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Submitting Registration...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
                  </svg>
                  SUBMIT REGISTRATION
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
