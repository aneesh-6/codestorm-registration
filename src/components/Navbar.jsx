import { useState, useEffect, useRef } from 'react';
import './Navbar.css';

const NAV_LINKS = [
  { href: '#home', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#rounds', label: 'Rounds' },
  { href: '#registration', label: 'Registration' },
  { href: '#coordinators', label: 'Coordinators' },
  { href: '#contact', label: 'Contact' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close menu on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const handleNavClick = () => setMenuOpen(false);

  return (
    <header className={`navbar ${scrolled ? 'scrolled' : ''}`} role="banner">
      <div className="container navbar-inner">
        {/* Left: Logo + Brand */}
        <a href="#home" className="navbar-brand" aria-label="CODESTORM Home">
          <div className="brand-logo">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <rect width="36" height="36" rx="8" fill="#1a2d5a"/>
              <path d="M10 13L6 18L10 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M26 13L30 18L26 23" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M21 10L15 26" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-name">CODESTORM</span>
            <span className="brand-college">MREM • CSE Data Science</span>
          </div>
        </a>

        {/* Center: Nav Links */}
        <nav
          ref={menuRef}
          className={`navbar-nav ${menuOpen ? 'open' : ''}`}
          aria-label="Main navigation"
        >
          <ul className="nav-list">
            {NAV_LINKS.map(link => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="nav-link"
                  onClick={handleNavClick}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          {/* Mobile CTA */}
          <a
            href="#registration"
            className="btn btn-secondary mobile-register-btn"
            onClick={handleNavClick}
          >
            Register Now
          </a>
        </nav>

        {/* Right: CTA */}
        <a
          href="#registration"
          id="navbar-register-btn"
          className="btn btn-secondary navbar-cta"
          aria-label="Register for CODESTORM"
        >
          Register Now
        </a>

        {/* Hamburger */}
        <button
          className={`hamburger ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="navbar-nav"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>
      </div>
    </header>
  );
}
