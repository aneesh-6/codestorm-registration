import { useEffect, useRef } from 'react';
import './ContactSection.css';

export default function ContactSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach((el, i) => {
              setTimeout(() => el.classList.add('visible'), i * 100);
            });
          }
        });
      },
      { threshold: 0.15 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="contact" className="section contact-section" ref={sectionRef} aria-labelledby="contact-heading">
      <div className="container">
        <div className="contact-card reveal">
          {/* Header */}
          <div className="contact-header">
            <div className="contact-header-icon" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.09 4.18 2 2 0 015.07 2h3a2 2 0 012 1.72c.13 1 .37 1.97.72 2.9a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006.99 7l1.18-1.18a2 2 0 012.11-.45c.93.35 1.9.59 2.9.72A2 2 0 0122 16.92z"/>
              </svg>
            </div>
            <div>
              <p className="section-subtitle" style={{ marginBottom: 4 }}>Get in Touch</p>
              <h2 className="section-title" id="contact-heading">Need Help?</h2>
              <p className="contact-subtitle">For registration-related queries, contact our student coordinators.</p>
            </div>
          </div>

          {/* Contacts */}
          <div className="contact-persons">
            {/* Aneesh */}
            <div className="contact-person-card reveal">
              <div className="contact-avatar contact-avatar-blue" aria-hidden="true">A</div>
              <div className="contact-person-info">
                <p className="contact-person-name">Aneesh</p>
                <p className="contact-person-role">Student Coordinator</p>
                <a
                  href="tel:+917036648459"
                  id="contact-aneesh-phone"
                  className="contact-phone-link"
                  aria-label="Call Aneesh at 7036648459"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.09 4.18 2 2 0 015.07 2h3a2 2 0 012 1.72c.13 1 .37 1.97.72 2.9a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006.99 7l1.18-1.18a2 2 0 012.11-.45c.93.35 1.9.59 2.9.72A2 2 0 0122 16.92z"/>
                  </svg>
                  7036648459
                </a>
              </div>
            </div>

            {/* Tijil */}
            <div className="contact-person-card reveal">
              <div className="contact-avatar contact-avatar-orange" aria-hidden="true">T</div>
              <div className="contact-person-info">
                <p className="contact-person-name">Tijil</p>
                <p className="contact-person-role">Student Coordinator</p>
                <a
                  href="tel:+918500624035"
                  id="contact-tijil-phone"
                  className="contact-phone-link"
                  aria-label="Call Tijil at 8500624035"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.09 4.18 2 2 0 015.07 2h3a2 2 0 012 1.72c.13 1 .37 1.97.72 2.9a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006.99 7l1.18-1.18a2 2 0 012.11-.45c.93.35 1.9.59 2.9.72A2 2 0 0122 16.92z"/>
                  </svg>
                  8500624035
                </a>
              </div>
            </div>
          </div>

          {/* College Info */}
          <div className="contact-college-info reveal">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            <p>
              Malla Reddy Engineering College and Management Sciences,
              Kistapur Village, Medchal Road, Medchal, Hyderabad – 501401, Telangana, India
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
