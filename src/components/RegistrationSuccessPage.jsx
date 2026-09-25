import { useState } from 'react';
import { EVENT_CONFIG, EVENT_PLATFORM_URL } from '../config';
import './RegistrationSuccessPage.css';

export default function RegistrationSuccessPage({ registrationData, onBack }) {
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPartId, setCopiedPartId] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Fallback to data stored in sessionStorage if refreshed directly
  const data = registrationData || (() => {
    try {
      const stored = sessionStorage.getItem('codestorm_registration');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  })() || {
    registrationId: 'CODESTORM-2026-0001',
    name: 'Registered Participant',
    rollNumber: 'N/A',
    year: 'N/A',
    branch: 'N/A',
    section: 'N/A',
  };

  const whatsappLink = EVENT_CONFIG.whatsappGroupLink;
  const isLinkConfigured = Boolean(
    whatsappLink &&
    whatsappLink !== 'PASTE_YOUR_WHATSAPP_GROUP_LINK_HERE' &&
    (whatsappLink.startsWith('https://chat.whatsapp.com/') || whatsappLink.startsWith('https://wa.me/'))
  );

  const handleWhatsAppClick = (e) => {
    if (!isLinkConfigured) {
      e.preventDefault();
      alert(
        'The official CODESTORM WhatsApp group link is being set up by organizers. Please check back shortly or reach out to our student coordinators: ANEESH (7036648459) / TIJIL (8500624035).'
      );
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const participantId = data.participantId || (data.registrationId && data.registrationId.startsWith('CODESTORM-2026-') ? `CS26-${data.registrationId.split('-').pop()}` : '');

  // Derive deterministic password from registration number if not in data
  let temporaryPassword = data.temporaryPassword || '';
  if (!temporaryPassword && data.registrationId) {
    const regMatch = data.registrationId.match(/CODESTORM-2026-(\d+)$/i);
    if (regMatch) {
      temporaryPassword = `PASS${regMatch[1]}`;
    }
  }

  const eventPlatformUrl = 'https://codestorm-event-platform.onrender.com';

  const handleCopyId = () => {
    if (data.registrationId) {
      navigator.clipboard.writeText(data.registrationId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleCopyPartId = () => {
    if (participantId) {
      navigator.clipboard.writeText(participantId);
      setCopiedPartId(true);
      setTimeout(() => setCopiedPartId(false), 2000);
    }
  };

  const handleCopyPassword = () => {
    if (temporaryPassword) {
      navigator.clipboard.writeText(temporaryPassword);
      setCopiedPassword(true);
      setTimeout(() => setCopiedPassword(false), 2000);
    }
  };

  const handleCopyAll = () => {
    const lines = [
      'CodeStorm 2026',
      '',
      `Registration ID: ${data.registrationId}`,
      `Participant ID: ${participantId || 'N/A'}`,
      `Password: ${temporaryPassword}`,
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="success-page-wrapper">
      {/* Top Brand Bar */}
      <header className="success-navbar no-print">
        <div className="container success-navbar-inner">
          <div className="success-brand">
            <div className="brand-logo">
              <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
                <rect width="36" height="36" rx="8" fill="#1a2d5a"/>
                <path d="M10 13L6 18L10 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M26 13L30 18L26 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 10L15 26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <span className="success-brand-title">CODESTORM 2026</span>
              <span className="success-brand-dept">MREM • CSE Data Science</span>
            </div>
          </div>
          <button onClick={onBack} className="btn btn-outline btn-sm success-nav-back" aria-label="Back to CODESTORM home">
            ← Back to Home
          </button>
        </div>
      </header>

      <main className="container success-main-container">
        <div className="success-card-main animate-scale-in">
          
          {/* Confetti Animation Elements */}
          <div className="success-confetti-wrap no-print" aria-hidden="true">
            {[...Array(16)].map((_, i) => (
              <div key={i} className={`confetti-item confetti-c${i % 4}`} style={{ '--idx': i }} />
            ))}
          </div>

          {/* Header */}
          <div className="success-hero-header">
            <div className="success-party-icon" aria-hidden="true">🎉</div>
            <h1 className="success-title-text">REGISTRATION SUCCESSFUL!</h1>
            <p className="success-subtitle-text">
              Your registration for CODESTORM has been successfully submitted.
            </p>
          </div>

          {/* Email Status Notification */}
          {data.emailSent === true && (
            <div style={{ background: 'rgba(74,222,128,0.10)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: '10px', padding: '12px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>✉️</span>
              <span style={{ color: '#4ade80', fontSize: '0.92rem', fontWeight: 600 }}>Credential email sent to {data.email}.</span>
            </div>
          )}
          {data.emailSent === false && data.emailNote && (
            <div style={{ background: 'rgba(251,191,36,0.10)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '10px', padding: '12px 18px', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.2rem' }}>⚠️</span>
              <span style={{ color: '#fbbf24', fontSize: '0.88rem', fontWeight: 600 }}>{data.emailNote}</span>
            </div>
          )}

          {/* Prominent Credentials Card (Registration ID, Participant ID, Password) */}
          <div className="success-id-hero-card" aria-label="Participant Event Credentials">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px', width: '100%', marginBottom: '14px' }}>
              
              {/* Registration ID */}
              <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                <span className="success-id-tag">REGISTRATION ID</span>
                <div className="success-id-row" style={{ marginTop: '8px' }}>
                  <span className="success-id-code" style={{ fontSize: '1.2rem' }}>{data.registrationId}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="btn-copy-id no-print"
                    title="Copy Registration ID"
                    aria-label="Copy Registration ID"
                  >
                    {copiedId ? <span>✓ Copied</span> : <span>Copy</span>}
                  </button>
                </div>
              </div>

              {/* Participant ID */}
              {participantId && (
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span className="success-id-tag">PARTICIPANT ID</span>
                  <div className="success-id-row" style={{ marginTop: '8px' }}>
                    <span className="success-id-code" style={{ fontSize: '1.2rem', color: '#38bdf8' }}>{participantId}</span>
                    <button
                      type="button"
                      onClick={handleCopyPartId}
                      className="btn-copy-id no-print"
                      title="Copy Participant ID"
                      aria-label="Copy Participant ID"
                    >
                      {copiedPartId ? <span>✓ Copied</span> : <span>Copy</span>}
                    </button>
                  </div>
                </div>
              )}

              {/* Password (Visible) */}
              {temporaryPassword && (
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.12)' }}>
                  <span className="success-id-tag">PASSWORD</span>
                  <div className="success-id-row" style={{ marginTop: '8px' }}>
                    <span className="success-id-code" style={{ fontSize: '1.2rem', color: '#4ade80', letterSpacing: '1px' }}>{temporaryPassword}</span>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      className="btn-copy-id no-print"
                      title="Copy Password"
                      aria-label="Copy Password"
                    >
                      {copiedPassword ? <span>✓ Copied</span> : <span>Copy</span>}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Save credentials notice + Copy Credentials button + Event Platform button */}
            <div style={{ textAlign: 'center', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <p style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 700, color: '#fbbf24', letterSpacing: '0.3px' }}>
                Save these credentials. You will need them to log in to the CodeStorm Event Platform.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
                <button
                  type="button"
                  id="copy-credentials-btn"
                  onClick={handleCopyAll}
                  className="btn btn-outline btn-sm no-print"
                  style={{ borderColor: 'rgba(251,191,36,0.6)', color: '#fbbf24', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.92rem' }}
                >
                  {copiedAll ? '✓ Copied!' : '📋 COPY CREDENTIALS'}
                </button>
                <a
                  href={eventPlatformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  id="event-platform-btn"
                  className="btn btn-outline btn-sm no-print"
                  style={{ borderColor: 'rgba(56,189,248,0.6)', color: '#38bdf8', padding: '8px 18px', borderRadius: '8px', fontWeight: 700, fontSize: '0.92rem', textDecoration: 'none' }}
                >
                  🚀 OPEN EVENT PLATFORM
                </a>
              </div>
            </div>
          </div>


          {/* Submission Acknowledgement */}
          <div className="success-ack-box">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            <div>
              <p className="success-ack-title">Thank you for registering for CODESTORM.</p>
              <p className="success-ack-desc">Your payment screenshot and registration details have been submitted successfully.</p>
            </div>
          </div>

          {/* ================================================================ */}
          {/* PROMINENT WHATSAPP SECTION                                      */}
          {/* ================================================================ */}
          <section className="whatsapp-section-card no-print" aria-labelledby="whatsapp-heading">
            <div className="whatsapp-icon-bubble" aria-hidden="true">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.35C9.33 7.35 9.02 7.42 8.76 7.7C8.5 7.97 7.76 8.67 7.76 10.08C7.76 11.5 8.79 12.87 8.93 13.06C9.07 13.25 10.96 16.17 13.85 17.42C14.54 17.71 15.08 17.89 15.5 18.03C16.2 18.25 16.83 18.22 17.33 18.15C17.89 18.06 19.05 17.44 19.29 16.76C19.53 16.08 19.53 15.5 19.46 15.38C19.39 15.26 19.19 15.19 18.89 15.04C18.59 14.89 17.11 14.16 16.83 14.06C16.56 13.96 16.36 13.91 16.16 14.21C15.96 14.51 15.39 15.19 15.21 15.39C15.04 15.59 14.86 15.61 14.56 15.46C14.26 15.31 13.3 15 12.16 13.99C11.27 13.2 10.67 12.22 10.5 11.92C10.33 11.62 10.48 11.46 10.63 11.31C10.77 11.18 10.93 10.96 11.08 10.79C11.23 10.61 11.28 10.49 11.38 10.29C11.48 10.09 11.43 9.91 11.36 9.77C11.28 9.62 10.7 8.19 10.46 7.62C10.22 7.07 9.98 7.14 9.8 7.14C9.64 7.14 9.45 7.14 9.25 7.14L9.53 7.35Z"/>
              </svg>
            </div>
            
            <div className="whatsapp-content">
              <h2 id="whatsapp-heading" className="whatsapp-title">
                JOIN THE CODESTORM WHATSAPP GROUP
              </h2>
              <p className="whatsapp-desc">
                Stay updated with important announcements, event instructions, round details, timings, and other CODESTORM updates.
              </p>

              {/* Large WhatsApp Action Button */}
              <a
                href={isLinkConfigured ? whatsappLink : '#'}
                onClick={handleWhatsAppClick}
                target={isLinkConfigured ? '_blank' : '_self'}
                rel="noopener noreferrer"
                id="join-whatsapp-btn"
                className="btn btn-whatsapp-large"
                aria-label="Join CODESTORM official WhatsApp group"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.53 7.35C9.33 7.35 9.02 7.42 8.76 7.7C8.5 7.97 7.76 8.67 7.76 10.08C7.76 11.5 8.79 12.87 8.93 13.06C9.07 13.25 10.96 16.17 13.85 17.42C14.54 17.71 15.08 17.89 15.5 18.03C16.2 18.25 16.83 18.22 17.33 18.15C17.89 18.06 19.05 17.44 19.29 16.76C19.53 16.08 19.53 15.5 19.46 15.38C19.39 15.26 19.19 15.19 18.89 15.04C18.59 14.89 17.11 14.16 16.83 14.06C16.56 13.96 16.36 13.91 16.16 14.21C15.96 14.51 15.39 15.19 15.21 15.39C15.04 15.59 14.86 15.61 14.56 15.46C14.26 15.31 13.3 15 12.16 13.99C11.27 13.2 10.67 12.22 10.5 11.92C10.33 11.62 10.48 11.46 10.63 11.31C10.77 11.18 10.93 10.96 11.08 10.79C11.23 10.61 11.28 10.49 11.38 10.29C11.48 10.09 11.43 9.91 11.36 9.77C11.28 9.62 10.7 8.19 10.46 7.62C10.22 7.07 9.98 7.14 9.8 7.14C9.64 7.14 9.45 7.14 9.25 7.14L9.53 7.35Z"/>
                </svg>
                <span>💬 JOIN WHATSAPP GROUP</span>
              </a>

              {/* Important Warning Notice */}
              <div className="whatsapp-warning-note">
                <div className="whatsapp-warning-header">
                  <span className="warning-badge-icon" aria-hidden="true">⚠️</span>
                  <strong className="warning-badge-text">IMPORTANT</strong>
                </div>
                <p className="warning-body-text">
                  Joining the WhatsApp group is important because event-related announcements and instructions will be shared there.
                </p>
                <p className="warning-callout-text">
                  “Please join the group after completing your registration.”
                </p>
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* REGISTRATION SUMMARY CARD (Non-sensitive)                         */}
          {/* ================================================================ */}
          <section className="reg-summary-section" aria-label="Registration Summary">
            <div className="reg-summary-header">
              <h3 className="reg-summary-title">Registration Summary</h3>
              <span className="reg-status-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                ✓ Registration Submitted
              </span>
            </div>

            <div className="reg-summary-grid">
              <div className="reg-summary-item">
                <span className="reg-item-label">Registration ID</span>
                <span className="reg-item-value mono-val">{data.registrationId}</span>
              </div>
              <div className="reg-summary-item">
                <span className="reg-item-label">Name</span>
                <span className="reg-item-value">{data.name}</span>
              </div>
              <div className="reg-summary-item">
                <span className="reg-item-label">Roll Number</span>
                <span className="reg-item-value mono-val">{data.rollNumber}</span>
              </div>
              <div className="reg-summary-item">
                <span className="reg-item-label">Year</span>
                <span className="reg-item-value">{data.year || 'N/A'}</span>
              </div>
              <div className="reg-summary-item">
                <span className="reg-item-label">Branch</span>
                <span className="reg-item-value">{data.branch || 'N/A'}</span>
              </div>
              <div className="reg-summary-item">
                <span className="reg-item-label">Section</span>
                <span className="reg-item-value">{data.section || 'N/A'}</span>
              </div>
              <div className="reg-summary-item">
                <span className="reg-item-label">Status</span>
                <span className="reg-item-value status-success-text">✓ Registration Submitted</span>
              </div>
              <div className="reg-summary-item">
                <span className="reg-item-label">Registered Date</span>
                <span className="reg-item-value">{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* OFFICIAL COORDINATORS (Updated per specification)                */}
          {/* ================================================================ */}
          <section className="success-coordinators-card" aria-label="Event Coordinators">
            <h4 className="success-coords-title">Event Coordinators</h4>
            <div className="success-coords-grid">
              <div className="success-coord-col">
                <strong className="coord-col-title">Student Coordinators</strong>
                <ul className="coord-mini-list">
                  <li><strong>ANEESH</strong> — <a href="tel:+917036648459">7036648459</a></li>
                  <li><strong>TIJIL</strong> — <a href="tel:+918500624035">8500624035</a></li>
                  <li><strong>LAVANYA</strong></li>
                  <li><strong>SIRI</strong></li>
                </ul>
              </div>
              <div className="success-coord-col">
                <strong className="coord-col-title">Faculty Coordinators</strong>
                <ul className="coord-mini-list">
                  <li>Dr. Zaheer Sultana</li>
                  <li>Asst. Prof. Jagat Jeeta Mohanty</li>
                  <li>Miss Supriya Kumari</li>
                </ul>
              </div>
            </div>
          </section>

          {/* ================================================================ */}
          {/* ACTION BUTTONS                                                   */}
          {/* ================================================================ */}
          <div className="success-actions-row no-print">
            <a
              href={isLinkConfigured ? whatsappLink : '#'}
              onClick={handleWhatsAppClick}
              target={isLinkConfigured ? '_blank' : '_self'}
              rel="noopener noreferrer"
              className="btn btn-whatsapp-secondary"
              aria-label="Join WhatsApp Group"
            >
              💬 JOIN WHATSAPP GROUP
            </a>

            <button
              type="button"
              id="back-to-codestorm-btn"
              onClick={onBack}
              className="btn btn-primary"
              aria-label="Back to CODESTORM Home"
            >
              ← BACK TO CODESTORM
            </button>

            <button
              type="button"
              id="print-registration-btn"
              onClick={handlePrint}
              className="btn btn-outline"
              aria-label="Print or Save Registration Details"
            >
              🖨️ PRINT / SAVE REGISTRATION
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}
