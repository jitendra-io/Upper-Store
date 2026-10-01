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
  const [notifications, setNotifications] = useState([]);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('upper_read_notifications') || '[]');
    } catch {
      return [];
    }
  });
  const notifDropdownRef = useRef(null);

  const [flashToast, setFlashToast] = useState(null);
  const initialFetchRef = useRef(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      if (res.ok) {
        const data = await res.json();
        const newNotifs = data || [];
        setNotifications(newNotifs);

        if (newNotifs.length > 0) {
          const latest = newNotifs[0];
          const toastedIds = JSON.parse(sessionStorage.getItem('upper_toasted_notifications') || '[]');

          if (!toastedIds.includes(latest.id)) {
            toastedIds.push(latest.id);
            sessionStorage.setItem('upper_toasted_notifications', JSON.stringify(toastedIds));

            const isRecent = (Date.now() - new Date(latest.createdAt || Date.now()).getTime()) < 5 * 60 * 1000;

            if (!initialFetchRef.current || isRecent) {
              setFlashToast(latest);
              setTimeout(() => {
                setFlashToast(null);
              }, 3000);
            }
          }
        }
        initialFetchRef.current = false;
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !readNotifIds.includes(n.id)).length;

  const markAllAsRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadNotifIds(allIds);
    localStorage.setItem('upper_read_notifications', JSON.stringify(allIds));
  };

  // Close notification dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

          {/* BLUE NOTIFICATION BELL */}
          <div className="nav-notif-wrapper" ref={notifDropdownRef}>
            <button
              type="button"
              className="nav-notif-bell-btn"
              onClick={() => {
                setNotifDropdownOpen(!notifDropdownOpen);
                setUserDropdownOpen(false);
              }}
              title="Notifications & Broadcasts"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span className="nav-notif-badge">{unreadCount}</span>
              )}
            </button>

            {/* NOTIFICATION DROPDOWN */}
            {notifDropdownOpen && (
              <div className="nav-notif-dropdown">
                <div className="notif-header">
                  <div className="notif-header-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                      <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                    </svg>
                    <h4>Broadcasts & Updates</h4>
                  </div>
                  {unreadCount > 0 && (
                    <button className="notif-mark-read-btn" onClick={markAllAsRead}>
                      Mark read
                    </button>
                  )}
                </div>

                <div className="notif-list-body">
                  {notifications.length === 0 ? (
                    <div className="notif-empty-state">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                      </svg>
                      <p>No notifications yet.</p>
                      <span>Admin announcements and release updates will appear here.</span>
                    </div>
                  ) : (
                    notifications.map((n) => {
                      const isUnread = !readNotifIds.includes(n.id);
                      return (
                        <div key={n.id} className={`notif-item-card ${isUnread ? 'unread' : 'read'}`}>
                          <div className="notif-item-top">
                            <span className={`notif-cat-tag ${(n.category || 'Update').toLowerCase()}`}>
                              {n.category || 'Update'}
                            </span>
                            <span className="notif-time">{new Date(n.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                          <h5 className="notif-item-title">{n.title}</h5>
                          <p className="notif-item-msg">{n.message}</p>
                          {n.link && (
                            <a href={n.link} target="_blank" rel="noopener noreferrer" className="notif-item-link">
                              Open Link ➔
                            </a>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

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
                  referrerPolicy="no-referrer"
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
                        referrerPolicy="no-referrer"
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
                      if (window.confirm('Are you sure you want to sign out of your account?')) {
                        logout();
                        closeMenu();
                      }
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

      {/* FLASHING BLUE NOTIFICATION TOAST (TOP RIGHT CORNER BELOW NAVBAR) */}
      {flashToast && (
        <div 
          className="nav-flash-toast" 
          onClick={() => {
            setNotifDropdownOpen(true);
            setFlashToast(null);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="toast-bell-icon">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span>New notification: <strong>{flashToast.title}</strong></span>
        </div>
      )}

      {/* DOWNLOAD HISTORY MODAL */}
      <DownloadHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
      />
    </>
  );
};

export default Navbar;
