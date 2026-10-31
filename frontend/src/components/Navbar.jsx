import { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import { useAuth } from '../context/AuthContext';
import DownloadHistoryModal from './DownloadHistoryModal';
import UserLicensesModal from './UserLicensesModal';
import VipClubModal from './VipClubModal';
import CancelSubscriptionModal from './CancelSubscriptionModal';
import DeveloperStudioModal from './DeveloperStudioModal';
import { CrownIcon, DiamondIcon, SparkleIcon, AlertTriangleIcon, ArrowRightIcon, CloseIcon, ShieldOffIcon } from './Icons';
import { getUserDownloadHistory, fetchUserDownloadHistoryFromDB } from '../utils/downloadTracker';
import { VipAvatar, VipFlairBadge } from './VipAvatar';
import { isUserVipActive, getUserVipTier } from '../utils/vipValidator';
import './Navbar.css';

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [licensesModalOpen, setLicensesModalOpen] = useState(false);
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [devStudioOpen, setDevStudioOpen] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);
  const [licenseCount, setLicenseCount] = useState(0);
  const location = useLocation();
  const { user, token, isLoggedIn, openAuthModal, logout } = useAuth();
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (user && user.email) {
      setDownloadCount(getUserDownloadHistory(user.email).length);
      fetchUserDownloadHistoryFromDB(user.email).then((dbHistory) => {
        if (dbHistory) setDownloadCount(dbHistory.length);
      });
    } else {
      setDownloadCount(0);
    }
  }, [user]);

  useEffect(() => {
    const handleHistoryUpdate = (e) => {
      if (user && user.email) {
        if (e.detail?.history) {
          setDownloadCount(e.detail.history.length);
        } else {
          setDownloadCount(getUserDownloadHistory(user.email).length);
        }
      }
    };
    window.addEventListener('downloadHistoryUpdated', handleHistoryUpdate);
    return () => window.removeEventListener('downloadHistoryUpdated', handleHistoryUpdate);
  }, [user]);

  const fetchLicenseCount = async () => {
    if (!user || !user.email) {
      setLicenseCount(0);
      return;
    }
    try {
      const token = localStorage.getItem('upper_user_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${apiBase}/api/payments/my-licenses`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLicenseCount(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      // Silently fall back
    }
  };

  useEffect(() => {
    fetchLicenseCount();
  }, [user]);

  useEffect(() => {
    const handleLicenseIssued = () => {
      fetchLicenseCount();
    };
    window.addEventListener('licenseIssued', handleLicenseIssued);
    return () => window.removeEventListener('licenseIssued', handleLicenseIssued);
  }, [user]);

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const closeMenu = () => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
  };

  // Lock background scroll when mobile hamburger drawer is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [menuOpen]);

  // Automatically close mobile menu and dropdowns upon navigation
  useEffect(() => {
    setMenuOpen(false);
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
  }, [location.pathname]);

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
      const activeToken = token || localStorage.getItem('upper_user_token');
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
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
              }, 5000);
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
        const activeToken = token || localStorage.getItem('upper_user_token');
        const res = await fetch(`${API_BASE}/api/auth/user/status/${encodeURIComponent(user.email)}`, {
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        });
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

  const handleNotifWheel = (e) => {
    const el = e.currentTarget;
    const isScrollable = el.scrollHeight > el.clientHeight;
    if (!isScrollable) {
      e.preventDefault();
      return;
    }
    const isAtTop = el.scrollTop === 0;
    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 1;
    if ((isAtTop && e.deltaY < 0) || (isAtBottom && e.deltaY > 0)) {
      e.preventDefault();
    }
  };

  return (
    <>
      <nav className="navbar">
        <div className="nav-logo">
          <Link to="/" onClick={closeMenu}>
            <img src={logoImg} alt="Upper Store Logo" className="brand-logo-img" />
            <span>Upper <span className="highlight-text">Store</span></span>
          </Link>
        </div>


        {/* Backdrop for mobile drawer (inside navbar for correct stacking context) */}
        {menuOpen && <div className="nav-drawer-backdrop" onClick={closeMenu} />}

        {/* Navigation Links (Desktop bar / Mobile sliding drawer) */}
        <div className={`nav-links ${menuOpen ? 'mobile-active' : ''}`}>
          <div className="mobile-drawer-header">
            <span className="drawer-title">Navigation</span>
            <button className="drawer-close-btn" onClick={closeMenu} aria-label="Close menu">
              <CloseIcon size={16} />
            </button>
          </div>
          <Link to="/" onClick={closeMenu} className={location.pathname === '/' ? 'active-link' : ''}>Home</Link>
          <Link to="/products" onClick={closeMenu} className={location.pathname.startsWith('/products') ? 'active-link' : ''}>Products</Link>
          <Link to="/vip-club" onClick={closeMenu} className={`vip-nav-link ${location.pathname === '/vip-club' || location.pathname === '/vip' ? 'active-link' : ''}`}>
            <SparkleIcon size={13} style={{ marginRight: '5px' }} />
            VIP Club
          </Link>
          {isUserVipActive(user) && (
            <button
              type="button"
              className="mobile-drawer-dev-btn"
              onClick={() => {
                setDevStudioOpen(true);
                closeMenu();
              }}
            >
              <span className="mobile-drawer-dev-btn-left">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
                  <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
                  <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
                  <path d="M12 9v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
                </svg>
                <span>Developer Studio</span>
              </span>
              <span className="mobile-drawer-vip-pill">
                {getUserVipTier(user) === 'elite' ? 'ELITE VIP' : 'PRO VIP'}
              </span>
            </button>
          )}
          <Link to="/about" onClick={closeMenu} className={location.pathname === '/about' ? 'active-link' : ''}>About</Link>
          <Link to="/blog" onClick={closeMenu} className={location.pathname === '/blog' ? 'active-link' : ''}>Blog</Link>
          <Link to="/faq" onClick={closeMenu} className={location.pathname === '/faq' ? 'active-link' : ''}>FAQ</Link>
          <Link to="/contact" onClick={closeMenu} className={location.pathname === '/contact' ? 'active-link' : ''}>Contact</Link>
          <div className="mobile-drawer-footer">
            <span className="drawer-footer-text">Upper Store • Elite Experience</span>
          </div>
        </div>

        {/* ALWAYS-VISIBLE TOP HEADER ACTIONS (Notification, User Profile / Sign In, Mobile Toggle) */}
        <div className="nav-actions">
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

                <div className="notif-list-body" onWheel={handleNotifWheel}>
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
                      const isEliteAuthor = n.authorTier === 'elite';
                      const isProAuthor = n.authorTier === 'pro';
                      const tierCardClass = isEliteAuthor ? 'vip-elite-card' : isProAuthor ? 'vip-pro-card' : '';

                      return (
                        <div key={n.id} className={`notif-item-card ${isUnread ? 'unread' : 'read'} ${tierCardClass}`}>
                          {isEliteAuthor || isProAuthor ? (
                            <div className={`notif-vip-author-bar ${isEliteAuthor ? 'elite' : 'pro'}`}>
                              <VipAvatar
                                src={n.authorAvatar}
                                alt={n.authorName || 'VIP Member'}
                                plan={isEliteAuthor ? 'elite' : 'pro'}
                                size="sm"
                                fallbackSeed={n.authorEmail || n.authorName || 'vip'}
                              />
                              <div className="notif-vip-author-meta">
                                <span className="notif-author-title">{n.authorName || 'VIP Developer'}</span>
                                <VipFlairBadge plan={isEliteAuthor ? 'elite' : 'pro'} compact={true} />
                              </div>
                              <span className={`notif-cat-tag ${isEliteAuthor ? 'elite' : 'pro'}`}>
                                {n.category || 'Release'}
                              </span>
                            </div>
                          ) : (
                            <div className="notif-official-author-bar">
                              <div className="notif-official-avatar-frame">
                                <img src={logoImg} alt="Upper Store Official" className="notif-official-avatar-img" />
                              </div>
                              <div className="notif-official-author-meta">
                                <span className="notif-author-title">{n.authorName || 'Upper Store Official'}</span>
                                <span className="notif-official-badge">OFFICIAL</span>
                              </div>
                              <span className={`notif-cat-tag ${(n.category || 'Update').toLowerCase()}`}>
                                {n.category || 'Update'}
                              </span>
                            </div>
                          )}
                          <h5 className="notif-item-title">{n.title}</h5>
                          <p className="notif-item-msg">{n.message}</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.45rem', flexWrap: 'wrap', gap: '6px' }}>
                            {n.link ? (
                              <a href={n.link} target="_blank" rel="noopener noreferrer" className="notif-item-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                Open Link <ArrowRightIcon size={12} />
                              </a>
                            ) : <span />}
                            <span className="notif-time">
                              {new Date(n.createdAt || Date.now()).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    }))}
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
                onClick={() => {
                  setUserDropdownOpen(!userDropdownOpen);
                  setNotifDropdownOpen(false);
                }}
              >
                <VipAvatar
                  src={userAvatar}
                  alt={user?.displayName || 'User profile photo'}
                  plan={getUserVipTier(user)}
                  size="sm"
                  fallbackSeed={user?.email || 'user'}
                />
                <span className="nav-user-name">{user?.displayName || user?.email?.split('@')[0]}</span>
                {isUserVipActive(user) && (
                  <VipFlairBadge plan={getUserVipTier(user)} compact={true} />
                )}
                {isBanned && <span className="nav-banned-tag">BANNED</span>}
                <span className="dropdown-caret">▾</span>
              </button>

              {/* DROPDOWN MENU */}
              {userDropdownOpen && (() => {
                const isVipActive = (user?.membership?.plan === 'pro' || user?.membership?.plan === 'elite') &&
                  user?.membership?.validUntil &&
                  new Date(user.membership.validUntil) > new Date();

                return (
                  <div className="nav-user-dropdown">
                    <div className="dropdown-user-header">
                      <div className="dropdown-avatar-wrapper">
                        <VipAvatar
                          src={userAvatar}
                          alt={user?.displayName || 'User'}
                          plan={getUserVipTier(user)}
                          size="lg"
                          fallbackSeed={user?.email || 'user'}
                        />
                      </div>
                      <p className="dropdown-user-title">
                        <span>{user?.displayName || 'User'}</span>
                        {isBanned && <span className="nav-banned-tag sm">BANNED</span>}
                      </p>
                      <p className="dropdown-user-handle">@{user?.username || user?.email?.split('@')[0]}</p>
                      <p className="dropdown-user-email" title={user?.email}>{user?.email}</p>
                      
                      <div className="dropdown-badges-row">
                        <span className="dropdown-provider-tag">
                          {user?.provider === 'google' ? 'Google' : 'Email'}
                        </span>
                        {isVipActive && user?.membership?.plan === 'elite' ? (
                          <span className="dropdown-vip-status-badge elite">
                            <DiamondIcon size={12} /> Elite VIP
                          </span>
                        ) : isVipActive && user?.membership?.plan === 'pro' ? (
                          <span className="dropdown-vip-status-badge pro">
                            <CrownIcon size={12} /> Pro VIP
                          </span>
                        ) : (
                          <span className="dropdown-vip-status-badge free">Free Tier</span>
                        )}
                      </div>

                      {isVipActive && user?.membership?.validUntil && (
                        <div className="dropdown-vip-expiry-well">
                          <div className="dropdown-vip-expiry-info">
                            <span className="dropdown-vip-expiry-label">VIP Active Until</span>
                            <span className="dropdown-vip-expiry-date">
                              {new Date(user.membership.validUntil).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="nav-cancel-sub-link"
                            onClick={() => {
                              setCancelModalOpen(true);
                              setUserDropdownOpen(false);
                            }}
                            title="Cancel subscription"
                          >
                            Cancel
                          </button>
                        </div>
                      )}

                      {user?.subscriptionCount > 0 && (
                        <p className="dropdown-subs-stat">
                          {user.subscriptionCount} {user.subscriptionCount === 1 ? 'Subscription' : 'Subscriptions'} &bull; {user.totalVipDays || 0} VIP Days
                        </p>
                      )}

                      {isBanned && (
                        <div className="nav-banned-notice">
                          <p style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                            <AlertTriangleIcon size={14} style={{ color: '#ef4444' }} /> Account Banned: Downloads restricted.
                          </p>
                          <Link to="/contact" onClick={closeMenu} className="nav-banned-appeal-btn">
                            Submit Ban Appeal
                          </Link>
                        </div>
                      )}
                    </div>

                    <div className="dropdown-menu-list">
                      {/* DEVELOPER STUDIO BUTTON FOR ACTIVE VIPs */}
                      {isUserVipActive(user) && (
                        <button
                          className="dropdown-item-btn dev-studio-action-btn"
                          onClick={() => {
                            setDevStudioOpen(true);
                            closeMenu();
                          }}
                        >
                          <div className="dropdown-item-left">
                            <span className="dropdown-item-icon dev-icon-box">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 18l6-6-6-6"></path>
                                <path d="M8 6l-6 6 6 6"></path>
                              </svg>
                            </span>
                            <span className="dropdown-item-label">Developer Studio</span>
                          </div>
                          <span className="dropdown-history-count-tag dev-studio-badge">
                            PUBLISH &amp; BROADCAST
                          </span>
                        </button>
                      )}

                      {/* UPPER VIP CLUB BUTTON */}
                      <button
                        className="dropdown-item-btn vip-action-btn"
                        onClick={() => {
                          setVipModalOpen(true);
                          closeMenu();
                        }}
                      >
                        <div className="dropdown-item-left">
                          <span className="dropdown-item-icon vip-icon-box">
                            {user?.membership?.plan === 'elite' ? <DiamondIcon size={16} /> : <CrownIcon size={16} />}
                          </span>
                          <span className="dropdown-item-label">Upper VIP Club</span>
                        </div>
                        <span className={`dropdown-history-count-tag vip-perk-badge ${user?.membership?.plan ? 'active' : ''}`}>
                          {user?.membership?.plan === 'elite' ? 'ELITE' : user?.membership?.plan === 'pro' ? 'PRO' : '₹0 FEES'}
                        </span>
                      </button>

                      {/* DOWNLOAD HISTORY BUTTON */}
                      <button
                        className="dropdown-item-btn"
                        onClick={() => {
                          setHistoryModalOpen(true);
                          closeMenu();
                        }}
                      >
                        <div className="dropdown-item-left">
                          <span className="dropdown-item-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                          </span>
                          <span className="dropdown-item-label">Download History</span>
                        </div>
                        <span className="dropdown-history-count-tag">{downloadCount}</span>
                      </button>

                      {/* MY LICENSES BUTTON */}
                      <button
                        className="dropdown-item-btn"
                        onClick={() => {
                          setLicensesModalOpen(true);
                          closeMenu();
                        }}
                      >
                        <div className="dropdown-item-left">
                          <span className="dropdown-item-icon">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 2l-2 2m-1-1l-3 3m1 1l-2 2m-1-1l-2 2m-1-1l-2 2m-1-1l-3 3"></path>
                              <circle cx="7.5" cy="15.5" r="5.5"></circle>
                            </svg>
                          </span>
                          <span className="dropdown-item-label">My Licenses</span>
                        </div>
                        <span className="dropdown-history-count-tag license-count-badge">{licenseCount}</span>
                      </button>
                    </div>

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
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                        <polyline points="16 17 21 12 16 7"></polyline>
                        <line x1="21" y1="12" x2="9" y2="12"></line>
                      </svg>
                      <span>Sign Out</span>
                    </button>
                  </div>
                );
              })()}
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

      {/* USER LICENSES MODAL */}
      <UserLicensesModal
        isOpen={licensesModalOpen}
        onClose={() => {
          setLicensesModalOpen(false);
          fetchLicenseCount();
        }}
      />

      {/* VIP CLUB SUBSCRIPTION MODAL */}
      <VipClubModal
        isOpen={vipModalOpen}
        onClose={() => setVipModalOpen(false)}
      />

      {/* CANCEL SUBSCRIPTION CONFIRMATION MODAL */}
      <CancelSubscriptionModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
      />

      {/* VIP DEVELOPER STUDIO MODAL */}
      <DeveloperStudioModal
        isOpen={devStudioOpen}
        onClose={() => setDevStudioOpen(false)}
        onProductPublished={() => {
          window.dispatchEvent(new Event('productsUpdated'));
        }}
      />
    </>
  );
};

export default Navbar;
