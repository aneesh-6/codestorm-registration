import { useRef } from 'react';
import './SuccessScreen.css';

export default function SuccessScreen({ data, onBack }) {
  const { registrationId, name, rollNumber, year, branch, section, email, mobile, transactionId } = data;
  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  const printRef = useRef();

  const handleDownload = () => {
    const content = `
CODESTORM 2026 – REGISTRATION CONFIRMATION
Department of CSE – Data Science
Malla Reddy Engineering College and Management Sciences

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGISTRATION ID: ${registrationId}
Name:            ${name}
Roll Number:     ${rollNumber || 'N/A'}
Year:            ${year || 'N/A'}
Branch:          ${branch || 'N/A'}
Section:         ${section || 'N/A'}
Email:           ${email}
Mobile:          ${mobile}
Transaction ID:  ${transactionId || 'N/A'}
Registered On:   ${timestamp}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Keep this Registration ID for future reference.
THINK • DEBUG • PREDICT • CODE
    `.trim();
    const blob = new Blob([content], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `CODESTORM_${registrationId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="registration" className="section success-section" aria-labelledby="success-heading">
      <div className="container">
        <div className="success-card animate-scale-in" ref={printRef}>
          {/* Header */}
          <div className="success-header">
            <div className="success-icon-wrap" aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div className="success-confetti" aria-hidden="true">
              {[...Array(12)].map((_, i) => (
                <div key={i} className={`confetti-piece confetti-${i % 4}`} style={{ '--i': i }} />
              ))}
            </div>
            <h2 className="success-heading" id="success-heading">
              🎉 REGISTRATION SUCCESSFUL!
            </h2>
            <p className="success-subhead">
              Your registration has been recorded successfully. Please save your Registration ID.
            </p>
          </div>

          {/* Registration ID */}
          <div className="success-reg-id" aria-label={`Your registration ID is ${registrationId}`}>
            <div className="success-reg-id-label">Registration ID:</div>
            <div className="success-reg-id-value">{registrationId}</div>
          </div>

          {/* Official Event Conducting Platform Credentials Box */}
          <div style={{
            background: 'linear-gradient(135deg, #1a2d5a 0%, #0f1c3d 100%)',
            color: '#ffffff',
            borderRadius: '16px',
            padding: '1.75rem',
            margin: '1.5rem 0',
            textAlign: 'left',
            border: '2px solid #f97316',
            boxShadow: '0 8px 24px rgba(249, 115, 22, 0.2)'
          }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(249, 115, 22, 0.25)', color: '#fb923c', padding: '0.2rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 800, marginBottom: '0.75rem' }}>
              EVENT CONDUCTING PLATFORM CREDENTIALS
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#ffffff', margin: '0 0 0.5rem' }}>
              Your Account Has Been Created 🎉
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.8)', margin: '0 0 1.25rem' }}>
              Welcome to CodeStorm 2026. Login using these credentials during the event.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: 'rgba(255,255,255,0.08)', padding: '1rem 1.25rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Participant ID</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace', color: '#38bdf8', letterSpacing: '0.05em' }}>
                  {registrationId}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 700, textTransform: 'uppercase' }}>Temporary Password</div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, fontFamily: 'monospace', color: '#f97316', letterSpacing: '0.05em' }}>
                  {`STORM-${registrationId.replace(/\D/g, '').slice(-4) || '2026'}`}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.65)', margin: '0 0 1.25rem' }}>
              🔒 Login using these credentials during the event. You will be prompted to create your private password on first login.
            </p>

            <a
              href="http://localhost:5000"
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: '#ffffff',
                fontWeight: 800,
                padding: '0.75rem 1.5rem',
                borderRadius: '9999px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 14px rgba(249, 115, 22, 0.4)'
              }}
            >
              [ GO TO LOGIN ] →
            </a>
          </div>

          {/* Details */}
          <div className="success-details">
            <h3 className="success-details-title">Registration Summary</h3>
            <div className="success-details-grid">
              <div className="success-detail-item">
                <span className="success-detail-label">Participant Name</span>
                <span className="success-detail-value">{name}</span>
              </div>
              <div className="success-detail-item">
                <span className="success-detail-label">Registration ID</span>
                <span className="success-detail-value success-detail-mono">{registrationId}</span>
              </div>
              {rollNumber && (
                <div className="success-detail-item">
                  <span className="success-detail-label">Roll Number</span>
                  <span className="success-detail-value success-detail-mono">{rollNumber}</span>
                </div>
              )}
              {year && (
                <div className="success-detail-item">
                  <span className="success-detail-label">Year</span>
                  <span className="success-detail-value">{year}</span>
                </div>
              )}
              {branch && (
                <div className="success-detail-item">
                  <span className="success-detail-label">Branch</span>
                  <span className="success-detail-value">{branch}</span>
                </div>
              )}
              {section && (
                <div className="success-detail-item">
                  <span className="success-detail-label">Section</span>
                  <span className="success-detail-value">{section}</span>
                </div>
              )}
              <div className="success-detail-item">
                <span className="success-detail-label">Email Address</span>
                <span className="success-detail-value">{email}</span>
              </div>
              <div className="success-detail-item">
                <span className="success-detail-label">Mobile Number</span>
                <span className="success-detail-value">{mobile}</span>
              </div>
              {transactionId && (
                <div className="success-detail-item">
                  <span className="success-detail-label">Transaction ID</span>
                  <span className="success-detail-value success-detail-mono">{transactionId}</span>
                </div>
              )}
              <div className="success-detail-item">
                <span className="success-detail-label">Registered On</span>
                <span className="success-detail-value">{timestamp}</span>
              </div>
            </div>
          </div>

          {/* Note */}
          <div className="success-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>Please save this <strong>Registration ID</strong> for future reference and verification at the venue.</span>
          </div>

          {/* Actions */}
          <div className="success-actions">
            <button
              id="download-registration-btn"
              onClick={handleDownload}
              className="btn btn-primary btn-lg"
              aria-label="Download your registration details"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Registration Details
            </button>
            <button
              id="back-to-home-btn"
              onClick={onBack}
              className="btn btn-outline btn-lg"
              aria-label="Go back to home"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
