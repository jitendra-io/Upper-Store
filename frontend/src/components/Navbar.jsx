import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import DownloadHistoryModal from './DownloadHistoryModal';
import { getUserDownloadHistory } from '../utils/downloadTracker';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const location = useLocation();
  const { user, isLoggedIn, openAuthModal, logout } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user && user.email) {
      setDownloadCount(getUserDownloadHistory(user.email).length);
    } else {
      setDownloadCount(0);
    }
  }, [user]);

  useEffect(() => {
    const handleHistoryUpdate = () => {
      if (user && user.email) {
        setDownloadCount(getUserDownloadHistory(user.email).length);
      }
    };
    window.addEventListener('downloadHistoryUpdated', handleHistoryUpdate);
    return () => window.removeEventListener('downloadHistoryUpdated', handleHistoryUpdate);
  }, [user]);

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

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [isBanned, setIsBanned] = useState(Boolean(user?.isBanned));

  useEffect(() => {
    if (!user || !user.email) return;
    setIsBanned(Boolean(user.isBanned));
    const checkBanStatus = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/user/status/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setIsBanned(Boolean(data.isBanned));
        }
      } catch (err) {
        // Keep current state
      }
    };
    checkBanStatus();
  }, [user]);

  const userAvatar = user?.photoURL || `https://unavatar.io/${encodeURIComponent(user?.email ? user.email.trim().toLowerCase() : 'user')}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(user?.email || 'user')}`;

  return (
    <>
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
                className={`nav-user-pill ${isBanned ? 'banned' : ''}`}
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              >
                <img
                  src={userAvatar}
                  alt={user?.displayName || 'User profile photo'}
                  className="nav-user-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.email || 'user')}&backgroundColor=d4af37&textColor=000000`;
                  }}
                />
                <span className="nav-user-name">{user?.displayName || user?.email?.split('@')[0]}</span>
                {isBanned && <span className="nav-banned-tag">BANNED</span>}
                <span className="dropdown-caret">▾</span>
              </button>

              {/* DROPDOWN MENU */}
              {userDropdownOpen && (
                <div className="nav-user-dropdown">
                  <div className="dropdown-user-header">
                    <div className="dropdown-avatar-wrapper">
                      <img
                        src={userAvatar}
                        alt={user?.displayName || 'User'}
                        className="dropdown-user-avatar-large"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user?.email || 'user')}&backgroundColor=d4af37&textColor=000000`;
                        }}
                      />
                    </div>
                    <p className="dropdown-user-title">
                      {user?.displayName || 'User'}
                      {isBanned && <span className="nav-banned-tag sm">BANNED</span>}
                    </p>
                    <p className="dropdown-user-email">{user?.email}</p>
                    <span className="dropdown-provider-tag">
                      {user?.provider === 'google' ? 'Google Sign-In' : 'Email Account'}
                    </span>
                    {isBanned && (
                      <div className="nav-banned-notice">
                        <p>⚠️ Account Banned: Downloads restricted.</p>
                        <Link to="/contact" onClick={closeMenu} className="nav-banned-appeal-btn">
                          Submit Ban Appeal
                        </Link>
                      </div>
                    )}
                  </div>
                  
                  <hr className="dropdown-divider" />

                  {/* DOWNLOAD HISTORY BUTTON */}
                  <button
                    className="dropdown-item-btn"
                    onClick={() => {
                      setHistoryModalOpen(true);
                      closeMenu();
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download History
                    <span className="dropdown-history-count-tag">{downloadCount}</span>
                  </button>

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

      {/* DOWNLOAD HISTORY MODAL */}
      <DownloadHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
