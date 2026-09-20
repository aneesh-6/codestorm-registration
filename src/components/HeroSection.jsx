import { useEffect, useRef } from 'react';
import './HeroSection.css';

export default function HeroSection() {
  const heroRef = useRef(null);

  useEffect(() => {
    const el = heroRef.current;
    if (el) {
      el.classList.add('hero-loaded');
    }
  }, []);

  return (
    <section id="home" className="hero-section" ref={heroRef} aria-label="Hero Section">
      {/* Subtle background decoration */}
      <div className="hero-bg-decor" aria-hidden="true">
        <div className="hero-bg-circle hero-bg-circle-1" />
        <div className="hero-bg-circle hero-bg-circle-2" />
        <div className="hero-bg-grid" />
      </div>

      <div className="container hero-container">
        {/* Left: Content */}
        <div className="hero-content">
          <div className="hero-dept-badge">
            <span className="hero-dept-dot" aria-hidden="true" />
            Department of CSE – Data Science
          </div>

          <h1 className="hero-title" id="hero-heading">
            CODE<span className="hero-title-accent">STORM</span>
          </h1>

          <p className="hero-subtitle">A Technical Coding Program</p>

          <div className="hero-tagline" aria-label="Event tagline">
            <span>THINK</span>
            <span className="tagline-dot" aria-hidden="true">•</span>
            <span>DEBUG</span>
            <span className="tagline-dot" aria-hidden="true">•</span>
            <span>PREDICT</span>
            <span className="tagline-dot" aria-hidden="true">•</span>
            <span>CODE</span>
          </div>

          <p className="hero-desc">
            Challenge your logic. Showcase your coding skills.
          </p>

          <div className="hero-college">
            <svg className="hero-college-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            Malla Reddy Engineering College and Management Sciences
          </div>

          <div className="hero-actions">
            <a
              href="#registration"
              id="hero-register-btn"
              className="btn btn-secondary btn-lg"
              aria-label="Register for CODESTORM"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              Register Now
            </a>
            <a
              href="#rounds"
              id="hero-explore-btn"
              className="btn btn-outline btn-lg"
              aria-label="Explore event rounds"
            >
              Explore Event
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>

          {/* Stat Pills */}
          <div className="hero-stats">
            <div className="hero-stat-pill">
              <span className="hero-stat-value">3</span>
              <span className="hero-stat-label">Coding Rounds</span>
            </div>
            <div className="hero-stat-pill">
              <span className="hero-stat-value">₹50</span>
              <span className="hero-stat-label">Entry Fee</span>
            </div>
            <div className="hero-stat-pill">
              <span className="hero-stat-value">CS-2026</span>
              <span className="hero-stat-label">Registration ID</span>
            </div>
          </div>
        </div>

        {/* Right: Illustration */}
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-illustration-wrap">
            <div className="hero-code-card hero-code-card-1">
              <div className="code-card-header">
                <span className="code-dot c1" /><span className="code-dot c2" /><span className="code-dot c3" />
                <span className="code-card-lang">Python</span>
              </div>
              <pre className="code-card-body"><code>{`def solve(n):
    dp = [0] * (n+1)
    dp[1] = 1
    for i in range(2, n+1):
        dp[i] = dp[i-1] + dp[i-2]
    return dp[n]`}</code></pre>
            </div>

            <div className="hero-code-card hero-code-card-2">
              <div className="code-card-header">
                <span className="code-dot c1" /><span className="code-dot c2" /><span className="code-dot c3" />
                <span className="code-card-lang">Output</span>
              </div>
              <pre className="code-card-body output-card"><code>{`> solve(10)
  55

> solve(15)
  610

> Time: 0.002ms ✓`}</code></pre>
            </div>

            <div className="hero-badge-float hero-badge-debug">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              Debug
            </div>
            <div className="hero-badge-float hero-badge-analyze">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Analyze
            </div>
            <div className="hero-badge-float hero-badge-solve">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              Solve
            </div>

            {/* Center illustration */}
            <div className="hero-center-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <circle cx="40" cy="40" r="38" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="2"/>
                <rect x="18" y="24" width="44" height="32" rx="4" fill="#1a2d5a"/>
                <rect x="22" y="28" width="36" height="20" rx="2" fill="#243d78"/>
                <line x1="26" y1="34" x2="38" y2="34" stroke="#f97316" strokeWidth="2" strokeLinecap="round"/>
                <line x1="26" y1="38" x2="46" y2="38" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                <line x1="26" y1="42" x2="42" y2="42" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                <path d="M35 60 L40 56 L45 60" fill="#1a2d5a"/>
                <rect x="32" y="56" width="16" height="3" rx="1.5" fill="#1a2d5a"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="hero-scroll-indicator" aria-label="Scroll down">
        <div className="scroll-mouse">
          <div className="scroll-dot" />
        </div>
        <span className="scroll-text">Scroll</span>
      </div>
    </section>
  );
}
