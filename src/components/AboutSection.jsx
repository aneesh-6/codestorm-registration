import { useEffect, useRef } from 'react';
import './AboutSection.css';

const highlights = [
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
    title: 'Logic',
    desc: 'Test your analytical thinking and sharpen your problem-solving instincts.',
    color: 'blue',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="9 11 12 14 22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    title: 'Accuracy',
    desc: 'Find errors and predict outputs correctly. Every detail counts.',
    color: 'orange',
  },
  {
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: 'Problem Solving',
    desc: 'Turn ideas into working code. Build efficient solutions to real challenges.',
    color: 'teal',
  },
];

export default function AboutSection() {
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
    <section id="about" className="section about-section" ref={sectionRef} aria-labelledby="about-heading">
      <div className="container">
        <div className="about-header text-center reveal">
          <p className="section-subtitle">About the Event</p>
          <h2 className="section-title" id="about-heading">About CODESTORM</h2>
        </div>

        <div className="about-content reveal">
          <div className="about-text-wrap">
            <p className="about-text">
              <strong>CODESTORM</strong> is a technical coding program designed to challenge students
              across three levels of programming ability. Participants will test their debugging skills,
              analyze program outputs, and finally demonstrate their problem-solving ability by writing code.
            </p>
            <p className="about-text mt-16">
              Organized by the <strong>Department of CSE – Data Science</strong> at Malla Reddy
              Engineering College and Management Sciences, this event provides a platform for students
              to showcase their technical expertise and grow through healthy competition.
            </p>
          </div>
        </div>

        {/* Highlight Cards */}
        <div className="about-highlights grid-3 mt-48">
          {highlights.map((h, i) => (
            <div key={h.title} className={`about-card about-card-${h.color} reveal`} style={{ transitionDelay: `${i * 0.1}s` }}>
              <div className={`about-card-icon about-icon-${h.color}`} aria-hidden="true">
                {h.icon}
              </div>
              <h3 className="about-card-title">{h.title}</h3>
              <p className="about-card-desc">{h.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
