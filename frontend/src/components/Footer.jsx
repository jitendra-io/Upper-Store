import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import './Footer.css';

const Footer = () => {
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
              <li><Link to="/contact">Help & FAQ</Link></li>
              <li><a href="#advisories">Advisories</a></li>
              <li><a href="#status">System Status</a></li>
              <li><Link to="/contact">Contact Support</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Company</h4>
            <ul>
              <li><Link to="/about">About Us</Link></li>
              <li><a href="#blog">Blog</a></li>
              <li><a href="#press">Press Kit</a></li>
              <li><Link to="/products">Catalog</Link></li>
            </ul>
          </div>

          <div className="footer-column">
            <h4>Terms & Policies</h4>
            <ul>
              <li><a href="#policies">Store Policies</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#conduct">Code of Conduct</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} Upper Store. All rights reserved.</p>
      </div>

      <div className="footer-gradient-bar"></div>
    </footer>
  );
};

export default Footer;
