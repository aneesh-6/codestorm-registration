import { useEffect, useRef } from 'react';
import './HighlightsSection.css';

const highlights = [
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    title: 'Technical Challenge',
    desc: 'Put your programming skills to the test with 3 progressive coding rounds.',
    color: 'blue',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: '3 Coding Rounds',
    desc: 'Progress from debugging to predicting outputs to complete problem solving.',
    color: 'orange',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87"/>
        <path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Open to Students',
    desc: 'Encourage participation from students across all branches and years.',
    color: 'teal',
  },
  {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    title: '₹50 Participation Fee',
    desc: 'Affordable registration ensuring every student can participate and compete.',
    color: 'purple',
  },
];

export default function HighlightsSection() {
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
    <section id="highlights" className="section highlights-section" ref={sectionRef} aria-labelledby="highlights-heading">
      <div className="container">
        <div className="text-center reveal">
          <p className="section-subtitle">Why Participate?</p>
          <h2 className="section-title" id="highlights-heading">Event Highlights</h2>
        </div>

        <div className="highlights-grid mt-48">
          {highlights.map((h, i) => (
            <div
              key={h.title}
              className={`highlight-card highlight-${h.color} reveal`}
              style={{ transitionDelay: `${i * 0.1}s` }}
            >
              <div className={`highlight-icon highlight-icon-${h.color}`} aria-hidden="true">
                {h.icon}
              </div>
              <div className="highlight-content">
                <h3 className="highlight-title">{h.title}</h3>
                <p className="highlight-desc">{h.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
