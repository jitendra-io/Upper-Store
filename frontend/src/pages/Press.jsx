import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import './Press.css';

const BRAND_COLORS = [
  { name: 'Antique Gold', hex: '#D4AF37', rgb: 'rgb(212, 175, 55)', label: 'Primary Brand Accent', bg: '#D4AF37', text: '#0D0D0F' },
  { name: 'Deep Dark Noir', hex: '#121216', rgb: 'rgb(18, 18, 22)', label: 'Background Surface', bg: '#121216', text: '#FFFFFF', border: true },
  { name: 'Emerald Green', hex: '#10B981', rgb: 'rgb(16, 185, 129)', label: 'Security & Verification', bg: '#10B981', text: '#FFFFFF' },
  { name: 'Electric Sky Blue', hex: '#38BDF8', rgb: 'rgb(56, 189, 248)', label: 'Action & Highlights', bg: '#38BDF8', text: '#0D0D0F' }
];

const PRESS_RELEASES = [
  {
    id: 'pr-1',
    date: 'September 30, 2026',
    tag: 'Product Release',
    title: 'Upper Store 2.0 Launches Direct Package Distribution via GitHub Release Mirrors',
    summary: 'Upper Store unveils platform 2.0, introducing high-speed direct downloads for Android APKs and Windows EXEs backed by GitHub Release infrastructure.'
  },
  {
    id: 'pr-2',
    date: 'September 28, 2026',
    tag: 'Security Milestone',
    title: 'Upper Store Enforces 100% Cryptographic SHA-256 Package Verification',
    summary: 'All software packages distributed across the platform are now cryptographically verified prior to publishing to guarantee zero malware risk.'
  },
  {
    id: 'pr-3',
    date: 'September 25, 2026',
    tag: 'Infrastructure',
    title: 'Global Edge CDN Integration with ImageKit for Ultra-Fast Media Rendering',
    summary: 'Partnered with ImageKit CDN to serve web branding, application screenshots, and digital assets globally with SSL edge optimization.'
  }
];

const EDITORIAL_IMAGERY = [
  {
    id: 'img-1',
    title: 'Upper Store Web Interface',
    type: 'Desktop Screenshot',
    url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'img-2',
    title: 'Mobile Client Preview',
    type: 'Android App Mockup',
    url: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=600'
  },
  {
    id: 'img-3',
    title: 'Dark Gold UI Design Assets',
    type: 'Vector Package Banner',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600'
  }
];

const Press = () => {
  const { isLoggedIn, openAuthModal } = useAuth();

  const handleDownloadAsset = (filename) => {
    if (!isLoggedIn) {
      openAuthModal("Authentication Required: Please sign in to download official press assets and branding PDFs.");
      return;
    }
    const link = document.createElement('a');
    link.href = logoImg;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="press-container" style={{ zIndex: 1, position: 'relative' }}>
      {/* 1. HERO HEADER */}
      <header className="press-hero">
        <span className="press-badge-pill">Media & Resource Kit</span>
        <h1>Official Press & <span className="highlight">Media Kit</span></h1>
        <p>Comprehensive branding assets, company boilerplate statements, leadership bios, media releases, and guidelines for editorial coverage.</p>
        
        <div className="press-action-bar">
          <button onClick={() => handleDownloadAsset('Upper_Store_Press_Kit_Full.zip')} className="press-primary-dl-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download Complete Press Bundle (.ZIP)</span>
          </button>
        </div>
      </header>

      {/* 2. COMPANY OVERVIEW (BOILERPLATE STATEMENT) */}
      <section className="press-card-section">
        <div className="press-section-header">
          <h2>1. Company Overview (Boilerplate)</h2>
          <p>Standardized, approved company description for news publications, blogs, and press releases.</p>
        </div>

        <div className="boilerplate-card">
          <div className="boilerplate-content">
            <span className="quote-mark">“</span>
            <p>
              Founded in 2026, <strong>Upper Store</strong> is an elite software distribution platform designed for developers, digital creators, and power users who value security, speed, and design precision. Headquartered globally, Upper Store delivers verified Android applications (.apk), Windows desktop software (.exe), and high-caliber digital UI toolkits directly to users without middleman bloatware.
            </p>
            <p>
              Driven by a mission to modernize app delivery, Upper Store pairs high-bandwidth GitHub Release distribution mirrors with global ImageKit Edge CDN caching and real-time customer messaging systems. Every application listed undergoes cryptographic SHA-256 integrity inspection to guarantee uncompromised software safety.
            </p>
          </div>
          <button 
            className="copy-boilerplate-btn" 
            onClick={() => {
              navigator.clipboard.writeText("Founded in 2026, Upper Store is an elite software distribution platform designed for developers, digital creators, and power users who value security, speed, and design precision.");
              alert('Boilerplate text copied to clipboard!');
            }}
          >
            📋 Copy Boilerplate Text
          </button>
        </div>
      </section>

      {/* 3. OFFICIAL BRANDING ASSETS & STYLE GUIDELINES */}
      <section className="press-card-section">
        <div className="press-section-header">
          <h2>2. Official Branding Assets & Style Guidelines</h2>
          <p>High-resolution vector logos, color codes, typography standards, and brand identity resources.</p>
        </div>

        <div className="brand-assets-grid">
          {/* Logo Card 1 */}
          <div className="asset-card">
            <div className="asset-preview-frame">
              <img src={logoImg} alt="Upper Store Main Logo" />
            </div>
            <div className="asset-card-details">
              <h4>Primary Brand Logo</h4>
              <p>Square high-res logo with gold border and dark noir backdrop.</p>
              <div className="asset-btn-group">
                <button onClick={() => handleDownloadAsset('Upper_Store_Logo.svg')} className="asset-btn">SVG Vector</button>
                <button onClick={() => handleDownloadAsset('Upper_Store_Logo.png')} className="asset-btn primary">PNG (Transparent)</button>
              </div>
            </div>
          </div>

          {/* Logo Card 2 */}
          <div className="asset-card">
            <div className="asset-preview-frame dark-style">
              <div className="wordmark-badge">
                Upper <span className="gold-text">Store</span>
              </div>
            </div>
            <div className="asset-card-details">
              <h4>Official Wordmark</h4>
              <p>High-contrast typographic logo for header & editorial banners.</p>
              <div className="asset-btn-group">
                <button onClick={() => handleDownloadAsset('Upper_Store_Wordmark.png')} className="asset-btn primary">PNG (Transparent)</button>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Colors */}
        <div className="brand-sub-header">
          <h3>Brand Color Palette</h3>
        </div>
        <div className="palette-grid">
          {BRAND_COLORS.map((col) => (
            <div key={col.hex} className="swatch-card">
              <div className="swatch-color-box" style={{ backgroundColor: col.bg, border: col.border ? '1px solid rgba(255,255,255,0.2)' : 'none' }}>
                <span className="swatch-hex" style={{ color: col.text }}>{col.hex}</span>
              </div>
              <div className="swatch-meta">
                <h5>{col.name}</h5>
                <span>{col.rgb}</span>
                <p>{col.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Typography Standard */}
        <div className="brand-sub-header">
          <h3>Typography & Font Family</h3>
        </div>
        <div className="typography-card">
          <div className="font-preview-left">
            <span className="font-big-spec">Aa</span>
            <div>
              <h4>Outfit Font Family</h4>
              <p>Primary Google Font used for headings, UI text, and brand communication.</p>
            </div>
          </div>
          <div className="font-weights-list">
            <span className="weight-item light">Light 300</span>
            <span className="weight-item regular">Regular 400</span>
            <span className="weight-item bold">Bold 700</span>
          </div>
        </div>
      </section>

      {/* 4. LEADERSHIP & TEAM BIOS */}
      <section className="press-card-section">
        <div className="press-section-header">
          <h2>3. Leadership & Executive Bios</h2>
          <p>Approved biographies and leadership profiles for press interviews and coverage.</p>
        </div>

        <div className="leadership-grid">
          <div className="leader-card">
            <div className="leader-avatar-frame">
              <img src={logoImg} alt="Jitendra - Founder" className="leader-avatar-img" />
            </div>
            <div className="leader-bio-details">
              <span className="leader-role-tag">Founder & Lead Engineer</span>
              <h3>Jitendra</h3>
              <span className="leader-handle">@YourJITENDRA</span>
              <p>
                Jitendra is the Founder and Lead System Architect of Upper Store. With expertise in modern full-stack web applications, cloud API design, and digital distribution infrastructure, Jitendra spearheaded the development of Upper Store’s zero-latency package mirror pipeline and real-time database messaging architecture.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PRODUCT IMAGERY & B-ROLL */}
      <section className="press-card-section">
        <div className="press-section-header">
          <h2>4. Product Imagery & B-Roll Assets</h2>
          <p>High-resolution product mockups, UI screenshots, and promotional assets ready for publication.</p>
        </div>

        <div className="imagery-grid">
          {EDITORIAL_IMAGERY.map((img) => (
            <div key={img.id} className="imagery-card">
              <div className="imagery-frame">
                <img src={img.url} alt={img.title} />
                <span className="imagery-type-tag">{img.type}</span>
              </div>
              <div className="imagery-footer">
                <h4>{img.title}</h4>
                <button onClick={() => handleDownloadAsset(`${img.id}.jpg`)} className="img-dl-btn">
                  Download High-Res
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 6. PRESS RELEASES & MEDIA COVERAGE */}
      <section className="press-card-section">
        <div className="press-section-header">
          <h2>5. Press Releases & Notable Announcements</h2>
          <p>Archive of official press releases, product updates, and platform milestones.</p>
        </div>

        <div className="press-releases-list">
          {PRESS_RELEASES.map((pr) => (
            <div key={pr.id} className="pr-item-card">
              <div className="pr-meta-side">
                <span className="pr-date">{pr.date}</span>
                <span className="pr-tag">{pr.tag}</span>
              </div>
              <div className="pr-body-side">
                <h3>{pr.title}</h3>
                <p>{pr.summary}</p>
                <Link to="/contact" className="read-pr-link">Request Full Release PDF →</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. FAST FACTS & KEY METRICS */}
      <section className="press-card-section">
        <div className="press-section-header">
          <h2>6. Fast Facts & Key Metrics</h2>
          <p>Quick verified operational statistics for media coverage and report references.</p>
        </div>

        <div className="stats-metric-grid">
          <div className="metric-card">
            <span className="metric-val gold-text">100%</span>
            <span className="metric-lbl">Verified Packages (SHA-256)</span>
          </div>
          <div className="metric-card">
            <span className="metric-val green-text">99.9%</span>
            <span className="metric-lbl">Infrastructure Uptime</span>
          </div>
          <div className="metric-card">
            <span className="metric-val blue-text">Global</span>
            <span className="metric-lbl">ImageKit Edge CDN Reach</span>
          </div>
          <div className="metric-card">
            <span className="metric-val purple-text">Zero</span>
            <span className="metric-lbl">Adware & Bloatware Policy</span>
          </div>
        </div>
      </section>

      {/* 8. DIRECT PR / MEDIA CONTACT */}
      <div className="dedicated-pr-card">
        <div className="pr-contact-info">
          <span className="pr-channel-tag">Direct PR Channel</span>
          <h3>Public Relations & Media Contact</h3>
          <p>Are you a journalist, reviewer, or content creator covering Upper Store? Send inquiries directly to our public relations queue for expedited response.</p>
          <span className="pr-email-badge">✉️ press@upperstore.com</span>
        </div>
        <Link to="/contact" className="pr-contact-action-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>Send PR Inquiry</span>
        </Link>
      </div>
    </div>
  );
};

export default Press;
