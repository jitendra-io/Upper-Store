import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import './Press.css';

const COLOR_PALETTE = [
  { name: 'Antique Gold', hex: '#D4AF37', label: 'Primary Brand Accent', bg: '#D4AF37', text: '#0D0D0F' },
  { name: 'Deep Dark Noir', hex: '#121216', label: 'Background & Surface', bg: '#121216', text: '#FFFFFF', border: true },
  { name: 'Emerald Green', hex: '#10B981', label: 'Security & Verification', bg: '#10B981', text: '#FFFFFF' },
  { name: 'Sky Electric Blue', hex: '#38BDF8', label: 'Actions & Highlights', bg: '#38BDF8', text: '#0D0D0F' }
];

const Press = () => {
  const handleDownloadLogo = (format) => {
    // Create a temporary download anchor for the logo
    const link = document.createElement('a');
    link.href = logoImg;
    link.download = `Upper_Store_Official_Logo.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="press-container" style={{ zIndex: 1, position: 'relative' }}>
      {/* Hero Header */}
      <header className="press-header">
        <span className="press-pill-tag">Media & Resource Center</span>
        <h1>Press & <span className="highlight">Media Kit</span></h1>
        <p>Official brand assets, company statistics, brand guidelines, and high-resolution resources for press and media coverage.</p>
        
        <div className="press-hero-actions">
          <button onClick={() => handleDownloadLogo('png')} className="press-download-all-btn">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span>Download Brand Asset Pack (.zip)</span>
          </button>
        </div>
      </header>

      {/* Brand Logos Section */}
      <section className="press-section">
        <div className="section-title-bar">
          <h2>Official Brand Logos</h2>
          <p>Download vector and raster logo assets in high resolution for editorial and media usage.</p>
        </div>

        <div className="logo-assets-grid">
          <div className="logo-asset-card">
            <div className="logo-preview-box">
              <img src={logoImg} alt="Upper Store Primary Logo" className="logo-preview-img" />
            </div>
            <div className="logo-asset-info">
              <h3>Primary Brand Logo</h3>
              <p>Square high-resolution logo featuring the gold & dark noir identity.</p>
              <div className="logo-download-btns">
                <button onClick={() => handleDownloadLogo('jpg')} className="asset-dl-btn">JPG Format</button>
                <button onClick={() => handleDownloadLogo('png')} className="asset-dl-btn highlight">PNG Format</button>
              </div>
            </div>
          </div>

          <div className="logo-asset-card">
            <div className="logo-preview-box dark-frame">
              <div className="watermark-logo-badge">
                <span className="gold-text-logo">Upper <span>Store</span></span>
              </div>
            </div>
            <div className="logo-asset-info">
              <h3>Logotype & Typography</h3>
              <p>Wordmark font styling using Outfit typography with Gold highlight accents.</p>
              <div className="logo-download-btns">
                <button onClick={() => handleDownloadLogo('png')} className="asset-dl-btn highlight">PNG Format</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand Color Palette */}
      <section className="press-section">
        <div className="section-title-bar">
          <h2>Brand Color Palette</h2>
          <p>Official HEX color codes used across Upper Store products and branding.</p>
        </div>

        <div className="color-palette-grid">
          {COLOR_PALETTE.map((color) => (
            <div key={color.hex} className="color-swatch-card">
              <div 
                className="color-swatch-block" 
                style={{ 
                  backgroundColor: color.bg, 
                  border: color.border ? '1px solid rgba(255,255,255,0.2)' : 'none' 
                }}
              >
                <span className="hex-code" style={{ color: color.text }}>{color.hex}</span>
              </div>
              <div className="color-swatch-info">
                <h4>{color.name}</h4>
                <p>{color.label}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Fact Sheet & Media Contact */}
      <section className="press-section">
        <div className="section-title-bar">
          <h2>Fast Facts & Overview</h2>
          <p>Key information regarding the Upper Store platform and distribution architecture.</p>
        </div>

        <div className="facts-grid">
          <div className="fact-card">
            <span className="fact-icon">⚡</span>
            <h4>Direct Package Infrastructure</h4>
            <p>Packages (.apk & .exe) are served via official GitHub Release mirrors, providing unlimited bandwidth and 99.9% uptime.</p>
          </div>

          <div className="fact-card">
            <span className="fact-icon">🛡️</span>
            <h4>Security Verification</h4>
            <p>Every binary listed undergoes strict cryptographic SHA-256 integrity validation to guarantee 100% clean, malware-free software.</p>
          </div>

          <div className="fact-card">
            <span className="fact-icon">🖼️</span>
            <h4>Global CDN Media Streaming</h4>
            <p>Logos, screenshots, and visual branding assets are cached globally on ImageKit Edge CDN for instant loading.</p>
          </div>
        </div>
      </section>

      {/* Press Inquiry Contact Card */}
      <div className="press-contact-card">
        <div className="press-contact-text">
          <h3>Media & Press Contact</h3>
          <p>For press inquiries, interview requests, or partnership opportunities, contact our team directly.</p>
        </div>
        <Link to="/contact" className="press-contact-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>Get in Touch</span>
        </Link>
      </div>
    </div>
  );
};

export default Press;
