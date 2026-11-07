import { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { ShieldCheckIcon, LayersIcon, ArrowRightIcon, CheckIcon } from '../components/Icons';
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
      {/* 1. HERO HEADER */}
      <section className="about-hero">
        <span className="about-crimson-badge">
          <span className="crimson-dot-pulse" />
          Engineering Excellence &amp; Architecture
        </span>
        <h1 className="about-title">
          About <span className="about-title-crimson">Upper</span> <span className="about-title-white">Store</span>
        </h1>
        <p className="about-subtitle">
          Architecting Next-Generation Software Distribution for Developers &amp; Digital Creators.
        </p>
      </section>

      {/* 2. THREE CORE PILLARS GRID */}
      <section className="about-pillars-grid">
        <div className="about-pillar-card">
          <div className="pillar-icon-box crimson">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
            </svg>
          </div>
          <h3>Unified Distribution</h3>
          <p>
            A single, highly reliable ecosystem for discovering and deploying Android APKs, Windows executables, and high-performance digital tools.
          </p>
        </div>

        <div className="about-pillar-card">
          <div className="pillar-icon-box crimson">
            <ShieldCheckIcon size={24} />
          </div>
          <h3>Cryptographic Security</h3>
          <p>
            Zero third-party compromise. Every binary distributed is SHA-256 verified and continuously monitored for absolute software integrity.
          </p>
        </div>

        <div className="about-pillar-card">
          <div className="pillar-icon-box crimson">
            <LayersIcon size={24} />
          </div>
          <h3>High-Speed CDN Edge</h3>
          <p>
            Backed by ImageKit CDN for instant media rendering and direct high-bandwidth GitHub Release mirrors for rapid package downloads.
          </p>
        </div>
      </section>

      {/* 3. BRAND COMMITMENT & ARCHITECTURE SECTION */}
      <section className="about-overview-section">
        {/* Our Vision Card */}
        <div className="about-card">
          <span className="card-kicker">Core Philosophy</span>
          <h2 className="card-heading">Our Vision &amp; Commitment</h2>
          <p className="card-body-text">
            At Upper Store, we believe software delivery should be effortless, secure, and visually extraordinary.
            Whether you are a developer looking for standalone desktop utilities or a mobile user seeking verified applications,
            our platform guarantees zero bloatware, authentic releases, and uncompromised speed.
          </p>
        </div>

        {/* High-Availability Architecture Card */}
        <div className="about-card arch-card">
          <span className="card-kicker">Resilient Infrastructure</span>
          <h2 className="card-heading">High-Availability System Architecture</h2>
          <p className="card-body-text">
            Our architecture has been engineered using modern serverless and CDN distribution patterns that isolate heavy workloads and prevent server crashes.
          </p>
          <div className="about-arch-grid">
            <div className="arch-module-card">
              <div className="arch-card-top">
                <span className="arch-tag">Frontend &amp; Assets</span>
              </div>
              <h4>Edge CDN Asset Delivery</h4>
              <p>Static frontend assets auto-scale globally across edge nodes for zero-latency UI rendering.</p>
            </div>

            <div className="arch-module-card">
              <div className="arch-card-top">
                <span className="arch-tag">Binary Streams</span>
              </div>
              <h4>Offloaded Binary Streams</h4>
              <p>Multi-gigabyte APK and EXE package downloads stream directly from GitHub Release CDN mirrors.</p>
            </div>

            <div className="arch-module-card">
              <div className="arch-card-top">
                <span className="arch-tag">Data Layer</span>
              </div>
              <h4>Autoscaling Cloud Architecture</h4>
              <p>Encrypted data stores with automatic load distribution scale reliably to millions of queries.</p>
            </div>
          </div>
        </div>

        {/* 4. DEVELOPER PUBLISHING DIRECTIVE */}
        <div id="publish" className="about-card publish-card-target">
          <span className="card-kicker">Developer Ecosystem</span>
          <h2 className="card-heading">Publishing Your Product on Upper Store</h2>
          <p className="card-body-text">
            We welcome independent developers, software engineers, and digital creators to distribute their verified software applications, Android APKs, and developer tools across our global ecosystem.
          </p>

          {/* Instant VIP Developer Studio Highlight */}
          <div className="vip-instant-publish-card">
            <div className="vip-publish-header-row">
              <div className="vip-publish-title-group">
                <span className="vip-instant-pill">Instant Publishing</span>
                <h4 className="vip-publish-heading">Publish Instantly with VIP Plan</h4>
              </div>
              <Link to="/vip-club" className="vip-publish-cta-btn">
                <span>View VIP Plans</span>
                <ArrowRightIcon size={14} />
              </Link>
            </div>

            <p className="vip-publish-desc">
              If you want to publish your product in the store instantly, take a VIP plan! Complete your quick one-time Developer Profile Registration to unlock immediate direct publishing privileges via the VIP Developer Studio:
            </p>

            <div className="vip-tier-perks-grid">
              <div className="vip-tier-perk-box pro">
                <div className="perk-badge-label pro">PRO VIP PLAN</div>
                <h5>Pro Developer Pass</h5>
                <p>
                  Publish up to <strong>3 products</strong> in the Store with official developer attribution, verified badge, and community broadcast privileges.
                </p>
              </div>

              <div className="vip-tier-perk-box elite">
                <div className="perk-badge-label elite">ELITE VIP PLAN</div>
                <h5>Elite Developer Pass</h5>
                <p>
                  Publish <strong>UNLIMITED products</strong> in the Store with royal purple verified flair, highest catalog ranking, and pinned community reviews.
                </p>
              </div>
            </div>
          </div>

          {/* Standard Manual Review Option */}
          <div className="about-manual-req-box">
            <h4>Standard Developer Review (Manual Email Queue):</h4>
            <p>
              Creators without a VIP membership can submit software packages for manual administrative auditing by emailing{' '}
              <a href="mailto:upper.official.in@gmail.com" className="about-email-link">
                upper.official.in@gmail.com
              </a>{' '}
              with the following mandatory specifications:
            </p>
            <ul className="about-req-list">
              <li>
                <CheckIcon size={14} className="check-icon" />
                <span><strong>Complete Product Specifications:</strong> Title, Category, Version, Description, Key Features, &amp; YouTube Demo Video URL.</span>
              </li>
              <li>
                <CheckIcon size={14} className="check-icon" />
                <span><strong>GitHub Developer Account:</strong> Direct link to your active, verified GitHub repository or release binary.</span>
              </li>
              <li>
                <CheckIcon size={14} className="check-icon" />
                <span><strong>Creator Contact &amp; Attribution:</strong> Full legal name, developer studio handle, and contact phone number. No government identity documents are required.</span>
              </li>
            </ul>
          </div>

          <p className="about-audit-disclaimer">
            All product submissions undergo thorough security auditing and cryptographic verification prior to public listing.
          </p>
        </div>
      </section>

      {/* 5. BRAND LOGO SHOWCASE CARD */}
      <section className="about-logo-section">
        <div className="brand-logo-showcase-card">
          <div className="showcase-logo-frame">
            <img src={logoImg} alt="Upper Store Official Logo" className="showcase-logo-img" />
          </div>
          <div className="showcase-logo-details">
            <h2><span style={{ color: '#ff2a2a' }}>Upper</span> <span style={{ color: '#ffffff' }}>Store</span></h2>
            <p>Empowering digital creators with elite applications, seamless delivery, and uncompromised security.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
