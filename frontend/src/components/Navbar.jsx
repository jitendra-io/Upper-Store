import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/" onClick={closeMenu}>
          <img src={logoImg} alt="Upper Store Logo" className="brand-logo-img" />
          <span>Upper <span className="highlight-text">Store</span></span>
        </Link>
      </div>

      {/* Mobile Hamburger Toggle Button */}
      <button
        className={`mobile-toggle-btn ${menuOpen ? 'active' : ''}`}
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Toggle Navigation Menu"
      >
        <span></span>
        <span></span>
        <span></span>
      </button>

      {/* Nav Links */}
      <div className={`nav-links ${menuOpen ? 'mobile-active' : ''}`}>
        <Link to="/" onClick={closeMenu} className={location.pathname === '/' ? 'active-link' : ''}>Home</Link>
        <Link to="/products" onClick={closeMenu} className={location.pathname.startsWith('/products') ? 'active-link' : ''}>Products</Link>
        <Link to="/about" onClick={closeMenu} className={location.pathname === '/about' ? 'active-link' : ''}>About</Link>
        <Link to="/contact" onClick={closeMenu} className={location.pathname === '/contact' ? 'active-link' : ''}>Contact</Link>
      </div>
    </nav>
  );
};

export default Navbar;
