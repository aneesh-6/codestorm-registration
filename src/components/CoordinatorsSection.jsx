import { useEffect, useRef } from 'react';
import './CoordinatorsSection.css';

// Student Coordinators
const studentCoords = [
  { name: 'ANEESH',  phone: '7036648459', initial: 'A', color: 'blue',   role: 'Student Coordinator' },
  { name: 'TIJIL',   phone: '8500624035', initial: 'T', color: 'orange', role: 'Student Coordinator' },
  { name: 'LAVANYA', phone: null,         initial: 'L', color: 'teal',   role: 'Student Coordinator' },
  { name: 'SIRI',    phone: null,         initial: 'S', color: 'purple', role: 'Student Coordinator' },
];

// Faculty Coordinators (Updated per official specification)
const facultyCoords = [
  { name: 'Dr. Zaheer Sultana',                      phone: null, initial: 'ZS', color: 'orange', role: 'Faculty Coordinator' },
  { name: 'Assistant Professor Jagat Jeeta Mohanty', phone: null, initial: 'JM', color: 'blue',   role: 'Faculty Coordinator' },
  { name: 'Miss Supriya',                            phone: null, initial: 'MS', color: 'teal',   role: 'Faculty Coordinator' },
];

function CoordCard({ name, phone, initial, color, role }) {
  return (
    <div className={`coord-card coord-${color} reveal`} role="article" aria-label={`Coordinator: ${name}`}>
      <div className={`coord-avatar coord-avatar-${color}`} aria-hidden="true">
        {initial}
      </div>
      <div className="coord-info">
        <p className="coord-name" title={name}>{name}</p>
        {role && <p className="coord-role">{role}</p>}
        {phone ? (
          <a
            href={`tel:+91${phone}`}
            className="coord-phone"
            aria-label={`Call ${name} at ${phone}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M22 16.92v3a2 2 0 01-2.18 2A19.79 19.79 0 013.09 4.18 2 2 0 015.07 2h3a2 2 0 012 1.72c.13 1 .37 1.97.72 2.9a2 2 0 01-.45 2.11L9.09 9.91a16 16 0 006.99 7l1.18-1.18a2 2 0 012.11-.45c.93.35 1.9.59 2.9.72A2 2 0 0122 16.92z"/>
            </svg>
            {phone}
          </a>
        ) : (
          <span className="coord-phone-na">Contact on campus</span>
        )}
      </div>
    </div>
  );
}

export default function CoordinatorsSection() {
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
      { threshold: 0.1 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="coordinators" className="section coordinators-section" ref={sectionRef} aria-labelledby="coord-heading">
      <div className="container">
        <div className="text-center reveal">
          <p className="section-subtitle">Meet the Team</p>
          <h2 className="section-title" id="coord-heading">Coordinators</h2>
        </div>

        {/* Student Coordinators */}
        <div className="coord-group mt-48 reveal">
          <div className="coord-group-header">
            <div className="coord-group-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87"/>
                <path d="M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <h3 className="coord-group-title">Student Coordinators</h3>
          </div>
          <div className="coord-grid">
            {studentCoords.map((c) => (
              <CoordCard key={c.name} {...c} />
            ))}
          </div>
        </div>

        {/* Faculty Coordinators */}
        <div className="coord-group mt-32 reveal">
          <div className="coord-group-header">
            <div className="coord-group-icon faculty-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <h3 className="coord-group-title">Faculty Coordinators</h3>
          </div>
          <div className="coord-grid coord-grid-3">
            {facultyCoords.map((c) => (
              <CoordCard key={c.name} {...c} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
