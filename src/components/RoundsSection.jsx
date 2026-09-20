import { useEffect, useRef } from 'react';
import './RoundsSection.css';

const rounds = [
  {
    number: '01',
    title: 'Debug the Code',
    desc: 'Find the errors, identify the bugs, and make the code run correctly.',
    keywords: ['SPOT', 'FIX', 'SOLVE'],
    color: 'blue',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Find the Output',
    desc: 'Analyze the given code and predict the exact output without running it.',
    keywords: ['THINK', 'ANALYZE', 'PREDICT'],
    color: 'orange',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Write the Code',
    desc: 'Solve the given problem statement by writing an efficient solution.',
    keywords: ['LOGIC', 'SPEED', 'ACCURACY'],
    color: 'teal',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <polyline points="16 18 22 12 16 6"/>
        <polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
];

export default function RoundsSection() {
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.querySelectorAll('.reveal').forEach((el, i) => {
              setTimeout(() => el.classList.add('visible'), i * 130);
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
    <section id="rounds" className="section rounds-section" ref={sectionRef} aria-labelledby="rounds-heading">
      <div className="container">
        <div className="rounds-header text-center reveal">
          <p className="section-subtitle">The Challenge</p>
          <h2 className="section-title" id="rounds-heading">3 Rounds • 1 Challenge</h2>
          <p className="section-desc" style={{ margin: '12px auto 0', textAlign: 'center' }}>
            Each round is designed to test a different dimension of your programming skills.
          </p>
        </div>

        <div className="rounds-grid mt-48">
          {rounds.map((round, i) => (
            <div
              key={round.number}
              className={`round-card round-card-${round.color} reveal`}
              style={{ transitionDelay: `${i * 0.15}s` }}
              role="article"
              aria-label={`Round ${round.number}: ${round.title}`}
            >
              <div className="round-card-inner">
                <div className="round-number-badge">ROUND {round.number}</div>
                <div className={`round-icon-wrap round-icon-${round.color}`} aria-hidden="true">
                  {round.icon}
                </div>
                <h3 className="round-title">{round.title}</h3>
                <p className="round-desc">{round.desc}</p>
                <div className="round-keywords" aria-label="Keywords">
                  {round.keywords.map((kw) => (
                    <span key={kw} className={`round-keyword round-kw-${round.color}`}>
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
