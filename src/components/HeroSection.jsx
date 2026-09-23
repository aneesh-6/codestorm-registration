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
      {/* Subtle Background Layer (Strictly z-index: 0, non-interactive) */}
      <div className="hero-bg-decor" aria-hidden="true">
        <div className="hero-bg-grid" />
        <div className="hero-bg-glow hero-bg-glow-1" />
        <div className="hero-bg-glow hero-bg-glow-2" />

        {/* Ambient Subtle Coding Elements (Slow 8-12s drift, very low opacity) */}
        <div className="hero-ambient-code">
          <span className="ambient-token token-1">{'{ }'}</span>
          <span className="ambient-token token-2">&lt; / &gt;</span>
          <span className="ambient-token token-3">0101</span>
          <span className="ambient-token token-4">=&gt;</span>
          <span className="ambient-token token-5">;</span>
          <span className="ambient-token token-6">( )</span>
          <span className="ambient-token token-7">#</span>
          <span className="ambient-token token-8">data: [ ]</span>
        </div>
      </div>

      <div className="container hero-container">
        {/* Main Content (Strictly z-index: 2) */}
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

          {/* Action Buttons (z-index: 3) */}
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
              <svg className="hero-explore-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </a>
          </div>

          {/* Static Statistics Cards (z-index: 4 - completely stable, no floating/rotation) */}
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
            <div className="hero-stat-pill" title="Open to students from all years and all branches">
              <span className="hero-stat-value" style={{ fontSize: '0.85rem', letterSpacing: '0.02em' }}>All Years</span>
              <span className="hero-stat-label">🎓 All Branches</span>
            </div>
          </div>
        </div>

        {/* Desktop-Only Clean Code Preview Terminal (Hidden below 900px to guarantee zero mobile collision) */}
        <div className="hero-visual" aria-hidden="true">
          <div className="hero-terminal-card">
            <div className="terminal-header">
              <div className="terminal-dots">
                <span className="terminal-dot dot-red" />
                <span className="terminal-dot dot-yellow" />
                <span className="terminal-dot dot-green" />
              </div>
              <span className="terminal-title">codestorm_challenge.py</span>
              <span className="terminal-badge">READY</span>
            </div>

            <div className="terminal-body">
              <div className="terminal-line">
                <span className="line-num">1</span>
                <span className="code-kw">def</span> <span className="code-fn">codestorm</span>(participant):
              </div>
              <div className="terminal-line indent-1">
                <span className="line-num">2</span>
                logic = participant.<span className="code-prop">think</span>()
              </div>
              <div className="terminal-line indent-1">
                <span className="line-num">3</span>
                solution = logic.<span className="code-prop">debug</span>()
              </div>
              <div className="terminal-line indent-1">
                <span className="line-num">4</span>
                <span className="code-kw">return</span> solution.<span className="code-prop">compile</span>()
              </div>
              <div className="terminal-line">
                <span className="line-num">5</span>
              </div>
              <div className="terminal-line">
                <span className="line-num">6</span>
                <span className="code-cmd">&gt; debug(code)</span>
              </div>

              {/* Decorative Result Box */}
              <div className="terminal-output-block">
                <div className="output-row">
                  <span className="output-tag">OUTPUT: SUCCESS</span>
                  <span className="output-metrics">runtime: 0.002ms</span>
                </div>
                <div className="output-meter">
                  <div className="meter-bar" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Scroll Indicator (Hidden on mobile) */}
      <div className="hero-scroll-indicator" aria-label="Scroll down">
        <div className="scroll-mouse">
          <div className="scroll-dot" />
        </div>
        <span className="scroll-text">Scroll</span>
      </div>
    </section>
  );
}
