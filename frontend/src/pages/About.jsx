import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import './About.css';

const About = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash === '#publish' || window.location.hash === '#publish') {
      const el = document.getElementById('publish');
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }, [location]);

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
      </section>

      {/* Brand Overview & Developer Listing Requirements Section */}
      <section className="about-overview-section">
        <div className="overview-card">
          <h2>Our Vision & Commitment</h2>
          <p>
            At Upper Store, we believe software delivery should be effortless, secure, and visually extraordinary. 
            Whether you are a developer looking for standalone desktop utilities or a mobile user seeking verified applications, 
            our platform guarantees zero bloatware, authentic releases, and uncompromised speed.
          </p>
        </div>

        <div className="overview-card" style={{ marginTop: '1.5rem', borderColor: 'rgba(16, 185, 129, 0.35)' }}>
          <h2 style={{ color: '#10b981' }}>High-Availability System Architecture</h2>
          <p style={{ fontSize: '1.08rem', color: '#f8fafc', fontWeight: 500 }}>
            Our architecture has been engineered using modern serverless and CDN distribution patterns that isolate heavy workloads and prevent server crashes.
          </p>
          <div style={{ marginTop: '1.2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', textAlign: 'left' }}>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', borderLeft: '3px solid #10b981' }}>
              <h4 style={{ color: '#10b981', margin: '0 0 0.3rem 0', fontSize: '0.92rem' }}>Edge CDN Asset Delivery</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>Static frontend assets auto-scale globally across edge nodes for zero-latency UI rendering.</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', borderLeft: '3px solid #38bdf8' }}>
              <h4 style={{ color: '#38bdf8', margin: '0 0 0.3rem 0', fontSize: '0.92rem' }}>Offloaded Binary Streams</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>Multi-gigabyte APK/EXE package downloads stream directly from GitHub Release CDN mirrors.</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '10px', borderLeft: '3px solid #d4af37' }}>
              <h4 style={{ color: '#d4af37', margin: '0 0 0.3rem 0', fontSize: '0.92rem' }}>Autoscaling Serverless DB</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>Google Firebase Firestore scales to 1,000,000+ concurrent connections without downtime.</p>
            </div>
          </div>
        </div>

        <div id="publish" className="overview-card publish-card-target" style={{ marginTop: '1.5rem', borderColor: 'rgba(212, 175, 55, 0.45)' }}>
          <h2>Publishing Your Product on Upper Store</h2>
          <p>
            We welcome independent developers, software engineers, and digital creators to list their verified software applications, Android APKs, and developer tools on Upper Store.
          </p>
          <div style={{ marginTop: '1rem', background: 'rgba(255, 255, 255, 0.03)', padding: '1.2rem', borderRadius: '10px', borderLeft: '3px solid #d4af37' }}>
            <h4 style={{ color: '#d4af37', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>Developer Submission Requirements:</h4>
            <p style={{ margin: '0 0 0.8rem 0', fontSize: '0.9rem', color: '#cbd5e1' }}>
              To list your software product, please send an official listing request to <a href="mailto:upper.official.in@gmail.com" style={{ color: '#38bdf8', fontWeight: 700, textDecoration: 'none' }}>upper.official.in@gmail.com</a> with the following mandatory details:
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#94a3b8', fontSize: '0.88rem', lineHeight: '1.6' }}>
              <li><strong>Complete Product Specifications:</strong> Title, Category, Version, Description, Key Features, & YouTube Demo Video URL.</li>
              <li><strong>GitHub Developer Account:</strong> Direct link to your active, verified GitHub profile.</li>
              <li><strong>Identity Verification:</strong> Clear digital image copy of your official Aadhaar Card / Government Identity Proof.</li>
            </ul>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#64748b', marginTop: '0.8rem', fontStyle: 'italic' }}>
            All product submissions undergo thorough security auditing and identity verification by our administration team prior to public listing.
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
            <h2>Upper <span className="highlight">Store</span></h2>
            <p>Empowering digital creators with elite applications, seamless delivery, and uncompromised security.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
