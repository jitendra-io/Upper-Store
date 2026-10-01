import logoImg from '../assets/logo.jpg';
import './About.css';

const About = () => {
  return (
    <div className="about-container" style={{ zIndex: 1, position: 'relative' }}>
      {/* Hero Header */}
      <section className="about-hero">
        <span className="about-pill-tag">Engineering Excellence</span>
        <h1>About <span className="highlight">Upper Store</span></h1>
        <p>Architecting Next-Generation Software Distribution for Developers & Digital Creators.</p>
      </section>

      {/* Professional Pillars Grid (All Writings First) */}
      <section className="about-pillars-grid">
        <div className="about-pillar-card">
          <div className="pillar-icon-box gold">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <h3>Unified Distribution</h3>
          <p>A single, highly reliable ecosystem for discovering and deploying Android APKs, Windows executables, and elite UI toolkits.</p>
        </div>

        <div className="about-pillar-card">
          <div className="pillar-icon-box green">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              <polyline points="9 11 11 13 15 9"></polyline>
            </svg>
          </div>
          <h3>Cryptographic Security</h3>
          <p>Zero third-party compromise. Every binary distributed is SHA-256 verified and continuously monitored for absolute software integrity.</p>
        </div>

        <div className="about-pillar-card">
          <div className="pillar-icon-box blue">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
            </svg>
          </div>
          <h3>High-Speed CDN Edge</h3>
          <p>Backed by ImageKit CDN for instant media rendering and direct high-bandwidth GitHub Release mirrors for rapid package downloads.</p>
        </div>

        <div className="about-pillar-card">
          <div className="pillar-icon-box purple">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            </svg>
          </div>
          <h3>User-Centric Design</h3>
          <p>Designed with modern dark-gold glassmorphic aesthetics, responsive mobile layout math, and an ad-free user experience.</p>
        </div>
      </section>

      {/* Brand Overview Writing Section */}
      <section className="about-overview-section">
        <div className="overview-card">
          <h2>Our Vision & Commitment</h2>
          <p>
            At Upper Store, we believe software delivery should be effortless, secure, and visually extraordinary. 
            Whether you are a developer looking for standalone desktop utilities or a mobile user seeking verified applications, 
            our platform guarantees zero bloatware, authentic releases, and uncompromised speed.
          </p>
        </div>
      </section>

      {/* LOGO CARD PLACED BELOW ALL THE WRITINGS */}
      <section className="about-logo-section">
        <div className="brand-logo-showcase-card">
          <div className="showcase-logo-frame">
            <img src={logoImg} alt="Upper Store Official Logo" className="showcase-logo-img" />
          </div>
          <div className="showcase-logo-details">
            <span className="brand-verified-pill">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.35rem', verticalAlign: 'middle' }}>
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              Official Brand Signature
            </span>
            <h2>Upper <span className="highlight">Store</span></h2>
            <p>Empowering digital creators with elite applications, seamless delivery, and uncompromised security.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
