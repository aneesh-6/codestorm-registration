import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container footer-inner">
        {/* Brand Column */}
        <div className="footer-brand">
          <div className="footer-logo">
            <svg width="32" height="32" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1a2d5a"/>
              <path d="M10 13L6 18L10 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M26 13L30 18L26 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 10L15 26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span className="footer-logo-text">CODESTORM</span>
          </div>
          <p className="footer-event-subtitle">A Technical Coding Program</p>
          <p className="footer-tagline">"IDEAS TODAY | INNOVATION TOMORROW"</p>
        </div>

        {/* College */}
        <div className="footer-college">
          <p className="footer-college-name">Malla Reddy Engineering College</p>
          <p className="footer-college-name">and Management Sciences</p>
          <p className="footer-dept">Department of CSE – Data Science</p>
          <p className="footer-address">
            Kistapur Village, Medchal Road,<br/>
            Medchal, Hyderabad – 501401,<br/>
            Telangana, India
          </p>
        </div>

        {/* Quick Links */}
        <nav className="footer-nav" aria-label="Footer navigation">
          <p className="footer-nav-title">Quick Links</p>
          <ul className="footer-nav-list">
            {[
              { href: '#home', label: 'Home' },
              { href: '#about', label: 'About' },
              { href: '#rounds', label: 'Rounds' },
              { href: '#registration', label: 'Registration' },
              { href: '#coordinators', label: 'Coordinators' },
              { href: '#contact', label: 'Contact' },
            ].map(l => (
              <li key={l.href}><a href={l.href} className="footer-nav-link">{l.label}</a></li>
            ))}
          </ul>
        </nav>

        {/* Tagline + CTA */}
        <div className="footer-cta-col">
          <div className="footer-tagline-keywords" aria-label="Event keywords">
            <span>THINK</span>
            <span>•</span>
            <span>DEBUG</span>
            <span>•</span>
            <span>PREDICT</span>
            <span>•</span>
            <span>CODE</span>
          </div>
          <a href="#registration" className="btn btn-secondary footer-register-btn">
            Register Now – ₹50
          </a>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="footer-bottom">
        <div className="container footer-bottom-inner">
          <p className="footer-copyright">
            © {year} CODESTORM | MREM CSE – Data Science. All rights reserved.
          </p>
          <p className="footer-autonomy">
            An UGC Autonomous Institution
          </p>
        </div>
      </div>
    </footer>
  );
}
