import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VipAvatar, VipFlairBadge } from '../components/VipAvatar';
import StarRatingBadge from '../components/StarRatingBadge';
import ProductDetailModal from '../components/ProductDetailModal';
import EditProfileModal from '../components/EditProfileModal';
import DeveloperDownloadsModal from '../components/DeveloperDownloadsModal';
import { formatDownloadCount } from '../utils/downloadTracker';
import './DeveloperProfile.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const formatJoinedDate = (dateString) => {
  if (!dateString) {
    const now = new Date();
    return `Joined ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
  const trimmed = String(dateString).trim();
  if (/^joined\s+/i.test(trimmed)) {
    return trimmed;
  }
  if (/^[A-Za-z]+\s+\d{4}$/.test(trimmed)) {
    return `Joined ${trimmed}`;
  }
  try {
    const d = new Date(trimmed);
    if (isNaN(d.getTime())) {
      const now = new Date();
      return `Joined ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
    }
    return `Joined ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  } catch {
    const now = new Date();
    return `Joined ${now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  }
};

const DeveloperProfile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [developer, setDeveloper] = useState(null);
  const [stats, setStats] = useState({ productsCount: 0, totalDownloads: 0, averageRating: 5.0 });
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Single Unified Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Private Downloads Telemetry Modal State (Visible only to the developer himself)
  const [isDownloadsModalOpen, setIsDownloadsModalOpen] = useState(false);

  // UX Feedback & Interaction States
  const [copied, setCopied] = useState(false);

  // Clean the username parameter
  const cleanUsername = useMemo(() => {
    return (username || '').replace(/^@/, '').trim().toLowerCase();
  }, [username]);

  // Determine if the current authenticated user owns this developer/user profile
  const isOwner = useMemo(() => {
    if (!developer) return false;

    // Check if viewing the official Upper Store profile
    const devHandle = (developer.username || '').toLowerCase();
    const isOfficialDev = Boolean(
      developer.isOfficial ||
      ['upperstore', 'upper-store', 'upper_store'].includes(devHandle) ||
      ['upperstore', 'upper-store', 'upper_store'].includes(cleanUsername)
    );

    if (isOfficialDev) {
      const userRole = user?.role || '';
      const userEmail = (user?.email || '').toLowerCase();
      const hasAdminToken = Boolean(localStorage.getItem('adminToken'));
      const isOfficialAdmin =
        userRole === 'admin' ||
        hasAdminToken ||
        userEmail === 'upper.official.in@gmail.com' ||
        userEmail === 'kumar.jkm.io@gmail.com' ||
        (user?.username && ['upperstore', 'upperofficial'].includes(user.username.toLowerCase()));

      if (isOfficialAdmin) return true;
    }

    if (!user) return false;
    const userHandle = (user.username || '').toLowerCase();
    if (userHandle && devHandle && userHandle === devHandle) return true;
    if (user.uid && developer.userId && user.uid === developer.userId) return true;
    if (user.id && developer.id && user.id === developer.id) return true;
    if (user.email && developer.email && user.email.toLowerCase() === developer.email.toLowerCase()) return true;
    return false;
  }, [user, developer, cleanUsername]);



  // Fetch Public Profile
  useEffect(() => {
    let isMounted = true;

    const fetchDeveloper = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/developers/profile/${cleanUsername}`);
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.developer) {
          setDeveloper(data.developer);
          setStats(data.stats || { productsCount: 0, totalDownloads: 0, averageRating: 5.0 });
          setProducts(Array.isArray(data.products) ? data.products : []);
        } else {
          setError(data.message || `Profile @${cleanUsername} was not found.`);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error('Error fetching profile:', err);
        setError('Network error: Unable to load profile. Please check your connection.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (cleanUsername) {
      fetchDeveloper();
    } else {
      setError('Invalid username specified.');
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [cleanUsername]);



  // Copy Profile Link Handler
  const handleCopyLink = () => {
    const url = window.location.href;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      });
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className="dev-ref-page-container">
        <div className="dev-ref-skeleton-banner"></div>
        <div className="dev-ref-skeleton-body">
          <div className="skeleton-circle"></div>
          <div className="skeleton-line lg"></div>
          <div className="skeleton-line md"></div>
          <div className="skeleton-line sm"></div>
        </div>
      </div>
    );
  }

  // Error / 404 Not Found State
  if (error || !developer) {
    return (
      <div className="dev-ref-page-container">
        <div className="dev-error-card">
          <div className="dev-error-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="dev-error-title">Profile Not Found</h2>
          <p className="dev-error-text">
            {error || `The handle @${cleanUsername} does not exist or has been removed from Upper Store.`}
          </p>
          <div className="dev-error-actions">
            <button className="dev-action-btn primary-gold" onClick={() => navigate('/products')}>
              Browse All Products
            </button>
            <button className="dev-action-btn secondary-ghost" onClick={() => navigate('/')}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const devHandle = (developer.username || '').toLowerCase();
  const isOfficialDev = Boolean(
    developer.isOfficial ||
    developer.vipPlan === 'official' ||
    ['upperstore', 'upper-store', 'upper_store'].includes(devHandle) ||
    ['upperstore', 'upper-store', 'upper_store'].includes(cleanUsername)
  );

  const isElite = developer.vipPlan === 'elite';
  const isPro = developer.vipPlan === 'pro';
  const isDev = Boolean(developer.isDeveloper);
  const isSubscriptionEnded = Boolean(developer.subscriptionEnded);

  // Premium rotating conic ring for active creators / VIPs (Official gets emerald green ring)
  const avatarRingPlan = isOfficialDev
    ? 'official'
    : isSubscriptionEnded
    ? 'free'
    : isElite
    ? 'elite'
    : isDev || isPro
    ? 'pro'
    : developer.vipPlan || 'free';

  // Resolved cover banner URL (No demo background image)
  const coverBannerUrl = developer.coverImage || developer.banner || '';

  return (
    <div className="dev-ref-page-container">
      {/* ===============================================================
          TOP LANDSCAPE COVER BANNER (Custom User Banner OR Luxury Dark Mesh)
          =============================================================== */}
      <div className={`dev-ref-banner-frame ${coverBannerUrl ? 'has-custom-cover' : 'default-mesh-cover'}`}>
        {coverBannerUrl ? (
          <img
            src={coverBannerUrl}
            alt="Developer Profile Cover Banner"
            className="dev-ref-banner-img"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="dev-ref-banner-mesh-pattern"></div>
        )}
        <div className="dev-ref-banner-overlay"></div>
      </div>

      {/* ===============================================================
          AVATAR & ACTION BUTTONS ROW (Overlapping Bottom of Banner)
          =============================================================== */}
      <div className="dev-ref-header-actions-row">
        {/* AVATAR WITH VIP HALO & VERIFIED CHECKMARK */}
        <div className="dev-ref-avatar-wrapper">
          <VipAvatar
            src={developer.avatar}
            alt={developer.displayName}
            plan={avatarRingPlan}
            size="xl"
            fallbackSeed={developer.username || developer.displayName}
            className="dev-ref-vip-avatar"
          />
          {(developer.isVerified || isOfficialDev) && (isDev || isOfficialDev) && (
            <span className="dev-ref-verified-badge" title={isOfficialDev ? "Official Upper Store Verified House" : "Verified Authentic Developer"}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill={isOfficialDev ? '#10b981' : '#f59e0b'} />
                <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke={isOfficialDev ? '#042f1a' : '#000'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>

        {/* RIGHT ACTION BUTTONS: SHARE, EDIT PROFILE (NO FOLLOW BUTTON) */}
        <div className="dev-ref-actions-group">
          {/* Share Profile Button */}
          <button
            className={`dev-ref-circle-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopyLink}
            title={copied ? 'Link Copied!' : 'Share Profile'}
          >
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle>
                <circle cx="6" cy="12" r="3"></circle>
                <circle cx="18" cy="19" r="3"></circle>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            )}
          </button>

          {/* Main Action Pill: Edit Profile (Single Unified Modal, Owner Only) */}
          {isOwner && (
            <button
              className="dev-ref-edit-pill-btn"
              onClick={() => setIsEditModalOpen(true)}
              title="Edit Profile Settings"
            >
              <span>Edit profile</span>
            </button>
          )}
        </div>
      </div>

      {/* ===============================================================
          DEVELOPER IDENTITY, BIO & METADATA SECTION
          =============================================================== */}
      <div className="dev-ref-info-section">
        {/* NAME AND USERNAME HANDLE */}
        <div className="dev-ref-name-row">
          <h1 className="dev-ref-display-name">{developer.displayName || developer.username}</h1>
          <span className="dev-ref-username-tag">@{developer.username}</span>
          {isOfficialDev ? (
            <span className="dev-ref-official-pill" title="Upper Store Official Publishing House">
              OFFICIAL
            </span>
          ) : (
            developer.vipPlan && developer.vipPlan !== 'free' && (
              <VipFlairBadge plan={developer.vipPlan} compact={true} />
            )
          )}
          {!isDev && !isOfficialDev && (
            <span className="dev-ref-community-pill">Community Member</span>
          )}
        </div>

        {/* EXPIRED SUBSCRIPTION NOTICE BANNER */}
        {isSubscriptionEnded && (
          <div className="dev-ref-expired-banner">
            <div className="expired-banner-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <div className="expired-banner-text">
              <span>VIP Creator Subscription Inactive &middot; Published applications remain active in the store catalog.</span>
            </div>
            {isOwner && (
              <Link to="/vip" className="dev-ref-renew-link">
                Renew VIP
              </Link>
            )}
          </div>
        )}

        {/* BIO DESCRIPTION */}
        <p className="dev-ref-bio-text">
          {developer.bio || (isDev
            ? 'Verified Upper Store creator crafting high-performance tools and applications.'
            : 'Upper Store Community Member exploring verified developer releases and utilities.')}
        </p>

        {/* METADATA ROW (Location default 'None', Joined Date) */}
        <div className="dev-ref-meta-row">
          <div className="dev-ref-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>{developer.location && developer.location.trim() ? developer.location : 'None'}</span>
          </div>

          <div className="dev-ref-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            <span>{formatJoinedDate(developer.joinedAt || developer.createdAt)}</span>
          </div>
        </div>

        {/* STATS ROW (Products Count + Downloads visible only to developer himself) */}
        <div className="dev-ref-stats-row">
          <div className="dev-ref-stat">
            <span className="stat-bold-val">{products.length}</span>
            <span className="stat-muted-lbl">Products</span>
          </div>

          {/* DOWNLOAD TELEMETRY: VISIBLE ONLY TO THE DEVELOPER HIMSELF */}
          {isOwner && isDev && (
            <button
              type="button"
              className="dev-ref-stat dev-downloads-clickable-stat"
              onClick={() => setIsDownloadsModalOpen(true)}
              title="Click to view detailed per-app downloads telemetry"
            >
              <span className="stat-bold-val highlight-gold">{formatDownloadCount(stats.totalDownloads)}</span>
              <span className="stat-muted-lbl">Downloads</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" className="downloads-stat-icon">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* ===============================================================
          PRODUCTS TAB HEADER (Replacing "Post" with "Products")
          =============================================================== */}
      <div className="dev-ref-tabs-container">
        <div className="dev-ref-tabs-bar">
          <div className="dev-ref-tab-btn active">
            <span>Products</span>
            <span className="dev-tab-count-tag">{products.length}</span>
          </div>
        </div>
      </div>

      {/* ===============================================================
          PRODUCTS GRID (4 Products per Row on Desktop, 2 on Phone)
          Compact Mini Cards (1/4th the visual size of catalog cards)
          =============================================================== */}
      <div className="dev-ref-tab-content">
        {isDev && products.length > 0 ? (
          <div className="dev-products-grid">
            {products.map((product) => {
              const displayImage = product.image || product.logo || product.imageUrl1 || '/logo.png';
              const downloadsCount = Number(product.downloadsCount) || Number(product.downloads) || 0;

              return (
                <div
                  key={product.id}
                  className="dev-mini-product-card"
                  onClick={() => setSelectedProduct(product)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedProduct(product);
                    }
                  }}
                  title={`View ${product.title} details`}
                >
                  {/* COMPACT THUMBNAIL */}
                  <div className="dev-mini-card-thumb">
                    <img
                      src={displayImage}
                      alt={product.title}
                      className="dev-mini-card-img"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = '/logo.png';
                      }}
                    />
                    <span className="dev-mini-card-price">{product.price || 'Free'}</span>
                    {product.category && (
                      <span className="dev-mini-card-cat">{product.category}</span>
                    )}
                  </div>

                  {/* COMPACT DETAILS BODY */}
                  <div className="dev-mini-card-body">
                    <div className="dev-mini-card-header-row">
                      {product.logo ? (
                        <img
                          src={product.logo}
                          alt=""
                          className="dev-mini-app-logo"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="dev-mini-logo-placeholder">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                          </svg>
                        </div>
                      )}
                      <h4 className="dev-mini-card-title" title={product.title}>
                        {product.title}
                      </h4>
                    </div>

                    <div className="dev-mini-card-meta-row">
                      <span className="dev-mini-card-version">v{product.version || '1.0.0'}</span>
                      <span className="dev-mini-card-downloads">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {formatDownloadCount(downloadsCount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          ) : !isDev ? (
            /* NON-DEVELOPER COMMUNITY VIEW */
            <div className="dev-ref-empty-card">
              <div className="empty-icon-circle">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </div>
              <h3>Community Member Profile</h3>
              <p>
                @{developer.username} is a registered member of Upper Store exploring creator tools and applications.
              </p>
              {isOwner && (
                <div className="dev-owner-upgrade-cta">
                  <p>Want to publish and distribute your own software to Upper Store users?</p>
                  <Link to="/vip" className="dev-ref-edit-pill-btn">
                    Join VIP &amp; Become a Developer
                  </Link>
                </div>
              )}
            </div>
          ) : (
            /* NO RELEASES FOUND */
            <div className="dev-ref-empty-card">
              <div className="empty-icon-circle">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
                  <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h3>No Products Published Yet</h3>
              <p>@{developer.username} has not published any public applications to Upper Store yet.</p>
            </div>
          )}
      </div>

      {/* ===============================================================
          SINGLE UNIFIED EDIT PROFILE MODAL (FOR USER & DEVELOPER)
          =============================================================== */}
      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        developer={developer}
        products={products}
        onProfileUpdated={({ displayName, username: newUsername, bio, coverImage: newCover, location: newLoc, locationLocked }) => {
          setDeveloper((prev) => ({
            ...prev,
            displayName,
            username: newUsername,
            bio,
            coverImage: newCover !== undefined ? newCover : prev.coverImage,
            banner: newCover !== undefined ? newCover : prev.banner,
            location: newLoc !== undefined ? newLoc : prev.location,
            locationLocked: locationLocked !== undefined ? locationLocked : prev.locationLocked,
          }));
          if (newUsername && newUsername !== cleanUsername) {
            navigate(`/developer/${newUsername}`, { replace: true });
          }
        }}
        onProductDeleted={(deletedId) => {
          setProducts((prev) => prev.filter((p) => p.id !== deletedId));
          setStats((prev) => ({
            ...prev,
            productsCount: Math.max(0, (prev.productsCount || 1) - 1),
          }));
        }}
      />

      {/* ===============================================================
          PRIVATE TELEMETRY DOWNLOADS BREAKDOWN MODAL (FOR DEVELOPER ONLY)
          =============================================================== */}
      {isOwner && isDev && (
        <DeveloperDownloadsModal
          isOpen={isDownloadsModalOpen}
          onClose={() => setIsDownloadsModalOpen(false)}
          developer={developer}
          products={products}
          totalDownloads={stats.totalDownloads}
          onSelectProduct={(product) => setSelectedProduct(product)}
        />
      )}

      {/* ===============================================================
          PRODUCT DETAIL MODAL (Opens seamlessly on click)
          =============================================================== */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default DeveloperProfile;
