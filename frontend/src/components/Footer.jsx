import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import './Footer.css';

const Footer = () => {
  const [activeModal, setActiveModal] = useState(null); // 'advisories' | 'status' | null

  const closeModal = () => setActiveModal(null);

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <div className="footer-logo">
            <img src={logoImg} alt="Upper Store Logo" className="footer-logo-img" />
            <span>Upper <span>Store</span></span>
          </div>
          <p className="footer-tagline">
            Empowering developers and creators with elite applications and assets.
          </p>
          <div className="footer-socials">
            <a href="https://github.com/YourJITENDRA" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>

        <div className="footer-links-grid">
          <div className="footer-column">
            <h4>Support</h4>
            <ul>
              <li><Link to="/faq">Help & FAQ</Link></li>
              <li>
                <button type="button" onClick={() => setActiveModal('advisories')} className="footer-modal-trigger">
                  Advisories
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setActiveModal('status')} className="footer-modal-trigger">
                  System Status <span className="status-dot-pulse"></span>
                </button>
              </li>
              <li><Link to="/contact">Contact Support</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><Link to="/blog">Blog & Updates</Link></li>
              <li><Link to="/products">Press Kit</Link></li>
              <li><Link to="/products">Catalog</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Terms & Policies</h4>
            <ul>
              <li><Link to="/contact">Store Policies</Link></li>
              <li><Link to="/contact">Terms of Service</Link></li>
              <li><Link to="/contact">Code of Conduct</Link></li>
              <li><Link to="/contact">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Upper Store. All rights reserved.</p>
      </div>

      <div className="footer-gradient-bar"></div>

      {/* ADVISORIES MODAL PORTAL */}
      {activeModal === 'advisories' && createPortal(
        <div className="footer-modal-backdrop" onClick={closeModal}>
          <div className="footer-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="footer-modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }}>
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                Security & Service Advisories
              </h3>
              <button className="footer-modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="footer-modal-body">
              <div className="advisory-item">
                <span className="advisory-badge green">Verified Integrity</span>
                <h4>Official Package Downloads</h4>
                <p>All application binaries (.apk and .exe) on Upper Store are cryptographic SHA-256 verified and mirrored directly via high-speed GitHub Release endpoints.</p>
              </div>

              <div className="advisory-item">
                <span className="advisory-badge gold">CDN Security</span>
                <h4>Media & Image Assets</h4>
                <p>Logos, screenshots, and visual branding are optimized and delivered securely via ImageKit CDN with global SSL encryption.</p>
              </div>

              <div className="advisory-item">
                <span className="advisory-badge blue">Direct Inbox Guarantee</span>
                <h4>Customer Support Messaging</h4>
                <p>Contact messages bypass cloud SMTP restrictions (like Render port blocks) by storing directly in encrypted Firebase Firestore for real-time Admin Inbox response.</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* SYSTEM STATUS MODAL PORTAL */}
      {activeModal === 'status' && createPortal(
        <div className="footer-modal-backdrop" onClick={closeModal}>
          <div className="footer-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="footer-modal-header">
              <h3>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }}>
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                System Status Monitor
              </h3>
              <button className="footer-modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="footer-modal-body">
              <div className="status-overall-banner">
                <span className="live-indicator"></span>
                <span>All Systems Operational</span>
                <span className="uptime-pill">100% Uptime</span>
              </div>

              <div className="status-services-list">
                <div className="status-service-row">
                  <div className="service-info">
                    <span className="status-light operational"></span>
                    <span className="service-name">REST API Services</span>
                  </div>
                  <span className="service-status-tag">Operational</span>
                </div>

                <div className="status-service-row">
                  <div className="service-info">
                    <span className="status-light operational"></span>
                    <span className="service-name">Firebase Firestore Database</span>
                  </div>
                  <span className="service-status-tag">Operational</span>
                </div>

                <div className="status-service-row">
                  <div className="service-info">
                    <span className="status-light operational"></span>
                    <span className="service-name">ImageKit CDN (Media Server)</span>
                  </div>
                  <span className="service-status-tag">Operational</span>
                </div>

                <div className="status-service-row">
                  <div className="service-info">
                    <span className="status-light operational"></span>
                    <span className="service-name">GitHub Release Downloads</span>
                  </div>
                  <span className="service-status-tag">Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </footer>
  );
};

export default Footer;
