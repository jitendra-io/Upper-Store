import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
    <div className="about-container">
      {/* Hero Header */}
      <section className="about-hero">
        <span className="about-pill-tag">Engineering Excellence</span>
        <h1>About <span className="highlight">Upper Store</span></h1>
        <p>Architecting Next-Generation Software Distribution for Developers &amp; Digital Creators.</p>
      </section>

      {/* Professional Pillars Grid */}
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
          <h2>Our Vision &amp; Commitment</h2>
          <p>
            At Upper Store, we believe software delivery should be effortless, secure, and visually extraordinary. 
            Whether you are a developer looking for standalone desktop utilities or a mobile user seeking verified applications, 
            our platform guarantees zero bloatware, authentic releases, and uncompromised speed.
          </p>
        </div>

        <div className="overview-card arch-card">
          <h2 className="arch-heading">High-Availability System Architecture</h2>
          <p className="arch-subtext">
            Our architecture has been engineered using modern serverless and CDN distribution patterns that isolate heavy workloads and prevent server crashes.
          </p>
          <div className="about-arch-grid">
            <div className="about-arch-card green">
              <h4>Edge CDN Asset Delivery</h4>
              <p>Static frontend assets auto-scale globally across edge nodes for zero-latency UI rendering.</p>
            </div>
            <div className="about-arch-card blue">
              <h4>Offloaded Binary Streams</h4>
              <p>Multi-gigabyte APK/EXE package downloads stream directly from GitHub Release CDN mirrors.</p>
            </div>
            <div className="about-arch-card gold">
              <h4>Autoscaling Serverless DB</h4>
              <p>Google Firebase Firestore scales to 1,000,000+ concurrent connections without downtime.</p>
            </div>
          </div>
        </div>

        <div id="publish" className="overview-card publish-card-target">
          <h2>Publishing Your Product on Upper Store</h2>
          <p>
            We welcome independent developers, software engineers, and digital creators to distribute their verified software applications, Android APKs, and developer tools across our global ecosystem.
          </p>

          {/* INSTANT VIP DEVELOPER STUDIO HIGHLIGHT */}
          <div className="vip-instant-publish-card">
            <div className="vip-publish-header-row">
              <div className="vip-publish-title-group">
                <span className="vip-instant-pill">Instant Publishing</span>
                <h4 className="vip-publish-heading">Publish Instantly with VIP Plan</h4>
              </div>
              <Link to="/vip" className="vip-publish-cta-btn">
                <span>Take VIP Plan</span>
                <span className="cta-arrow">&rarr;</span>
              </Link>
            </div>

            <p className="vip-publish-desc">
              If you want to publish your product in the store instantly, take a VIP plan! Complete your quick one-time Developer Profile Registration to unlock immediate direct publishing privileges via the VIP Developer Studio:
            </p>

            <div className="vip-tier-perks-grid">
              <div className="vip-tier-perk-box pro">
                <h5>Pro VIP Plan</h5>
                <p>
                  Publish up to <strong>3 products</strong> in the Store with official developer attribution, golden animated ring, and community broadcast privileges.
                </p>
              </div>

              <div className="vip-tier-perk-box elite">
                <h5>Elite VIP Plan</h5>
                <p>
                  Publish <strong>UNLIMITED products</strong> in the Store with royal purple animated ring, highest catalog ranking, and pinned community reviews.
                </p>
              </div>
            </div>
          </div>

          {/* STANDARD MANUAL EMAIL SUBMISSION OPTION */}
          <div className="about-manual-req-box">
            <h4>Standard Developer Review (Manual Email Queue):</h4>
            <p>
              Creators without a VIP membership can submit software packages for manual administrative auditing by emailing <a href="mailto:upper.official.in@gmail.com" className="about-email-link">upper.official.in@gmail.com</a> with the following mandatory specifications:
            </p>
            <ul className="about-req-list">
              <li><strong>Complete Product Specifications:</strong> Title, Category, Version, Description, Key Features, &amp; YouTube Demo Video URL.</li>
              <li><strong>GitHub Developer Account:</strong> Direct link to your active, verified GitHub repository or release binary.</li>
              <li><strong>Creator Contact &amp; Attribution:</strong> Full legal name, developer studio handle, and contact phone number. No government identity documents are required.</li>
            </ul>
          </div>
          <p className="about-audit-disclaimer">
            All product submissions undergo thorough security auditing and identity verification prior to public listing.
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
