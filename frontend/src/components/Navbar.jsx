import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const location = useLocation();
  const { user, isLoggedIn, openAuthModal, logout } = useAuth();
  const dropdownRef = useRef(null);

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const closeMenu = () => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      {/* Nav Links & User Action */}
      <div className={`nav-links ${menuOpen ? 'mobile-active' : ''}`}>
        <Link to="/" onClick={closeMenu} className={location.pathname === '/' ? 'active-link' : ''}>Home</Link>
        <Link to="/products" onClick={closeMenu} className={location.pathname.startsWith('/products') ? 'active-link' : ''}>Products</Link>
        <Link to="/about" onClick={closeMenu} className={location.pathname === '/about' ? 'active-link' : ''}>About</Link>
        <Link to="/blog" onClick={closeMenu} className={location.pathname === '/blog' ? 'active-link' : ''}>Blog</Link>
        <Link to="/faq" onClick={closeMenu} className={location.pathname === '/faq' ? 'active-link' : ''}>FAQ</Link>
        <Link to="/contact" onClick={closeMenu} className={location.pathname === '/contact' ? 'active-link' : ''}>Contact</Link>

        {/* AUTH USER PROFILE BADGE OR SIGN IN BUTTON */}
        {isLoggedIn ? (
          <div className="nav-user-wrapper" ref={dropdownRef}>
            <button
              type="button"
              className="nav-user-pill"
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="nav-user-avatar" />
              ) : (
                <div className="nav-user-initial">
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : '👤'}
                </div>
              )}
              <span className="nav-user-name">{user.displayName || user.email.split('@')[0]}</span>
              <span className="dropdown-caret">▾</span>
            </button>

            {/* DROPDOWN MENU */}
            {userDropdownOpen && (
              <div className="nav-user-dropdown">
                <div className="dropdown-user-header">
                  <p className="dropdown-user-title">{user.displayName || 'User'}</p>
                  <p className="dropdown-user-email">{user.email}</p>
                  <span className="dropdown-provider-tag">
                    {user.provider === 'google' ? 'Google Sign-In' : 'Email Account'}
                  </span>
                </div>
                <hr className="dropdown-divider" />
                <button
                  className="dropdown-logout-btn"
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            className="nav-signin-btn"
            onClick={() => {
              openAuthModal();
              closeMenu();
            }}
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
