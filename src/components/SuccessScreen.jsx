import { useState, useRef } from 'react';
import { EVENT_PLATFORM_URL } from '../config';
import './SuccessScreen.css';

export default function SuccessScreen({ data, onBack }) {
  const {
    registrationId,
    name,
    rollNumber,
    year,
    branch,
    section,
    email,
    mobile,
    transactionId
  } = data;
  const regMatch = registrationId?.match(/^CODESTORM-2026-(\d+)$/i);
  const participantId = data.participantId || (regMatch ? `CS26-${regMatch[1]}` : (registrationId ? `CS26-${registrationId.slice(-4)}` : ''));
  const password = data.temporaryPassword || data.password || (regMatch ? `PASS${regMatch[1]}` : (registrationId ? `PASS${registrationId.slice(-4)}` : ''));

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

REGISTRATION ID:  ${registrationId}
PARTICIPANT ID:   ${participantId}
PASSWORD:         ${password}
Name:             ${name}
Roll Number:      ${rollNumber || 'N/A'}
Year:             ${year || 'N/A'}
Branch:           ${branch || 'N/A'}
Section:          ${section || 'N/A'}
Email:            ${email}
Mobile:           ${mobile}
Transaction ID:   ${transactionId || 'N/A'}
Registered On:    ${timestamp}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Use your Participant ID and Password to log in to the CodeStorm Event Platform.
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
              Your registration has been recorded successfully. Please save your Participant ID and Password.
            </p>
          </div>

          {/* Credentials Display */}
          <div className="credentials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', margin: '20px 0' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Registration ID</div>
              <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'monospace', color: '#f1f5f9' }}>{registrationId}</div>
            </div>
            <div style={{ background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#38bdf8', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Participant ID (Login ID)</div>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: '#38bdf8' }}>{participantId}</div>
            </div>
            <div style={{ background: 'rgba(74, 222, 128, 0.08)', border: '1px solid rgba(74, 222, 128, 0.25)', borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#4ade80', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.5px' }}>Password</div>
              <div style={{ fontSize: '18px', fontWeight: 800, fontFamily: 'monospace', color: '#4ade80', letterSpacing: '1px' }}>{password}</div>
            </div>
          </div>

          {/* Event Platform Login Notice */}
          <div
            className="no-print"
            style={{
              background: 'linear-gradient(135deg, #0b1329 0%, #1a2d5a 100%)',
              color: '#ffffff',
              borderRadius: '12px',
              padding: '16px 20px',
              margin: '14px 0 20px',
              textAlign: 'center',
              border: '1.5px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>🔑</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e2e8f0', lineHeight: 1.5 }}>
              Log in to the CodeStorm Event Platform using your <strong style={{ fontFamily: 'monospace', color: '#38bdf8' }}>Participant ID</strong> and <strong style={{ fontFamily: 'monospace', color: '#4ade80' }}>Password</strong>.
            </span>
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
