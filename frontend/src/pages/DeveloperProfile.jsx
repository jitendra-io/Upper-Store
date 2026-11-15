import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VipAvatar } from '../components/VipAvatar';
import StarRatingBadge from '../components/StarRatingBadge';
import ProductDetailModal from '../components/ProductDetailModal';
import EditProfileModal from '../components/EditProfileModal';
import DeveloperDownloadsModal from '../components/DeveloperDownloadsModal';
import DeveloperFollowModal from '../components/DeveloperFollowModal';
import { formatDownloadCount, getProductDownloadCount } from '../utils/downloadTracker';
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
  const { user, token, isLoggedIn, openAuthModal } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [developer, setDeveloper] = useState(null);
  const [stats, setStats] = useState({ productsCount: 0, totalDownloads: 0, averageRating: 0, totalReviews: 0, followersCount: 0, followingCount: 0 });
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Single Unified Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Private Downloads Telemetry Modal State (Visible only to the developer himself)
  const [isDownloadsModalOpen, setIsDownloadsModalOpen] = useState(false);

  // Real-time product download tracker refresh ticker
  const [refreshDownloads, setRefreshDownloads] = useState(0);

  // Clean the username parameter
  const cleanUsername = useMemo(() => {
    return (username || '').replace(/^@/, '').trim().toLowerCase();
  }, [username]);

  // Social Follower State
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followSubmitting, setFollowSubmitting] = useState(false);

  // Followers & Following List Modal State
  const [followModalState, setFollowModalState] = useState({ isOpen: false, tab: 'followers' });

  const openFollowModal = (tab = 'followers') => {
    setFollowModalState({ isOpen: true, tab });
  };

  const closeFollowModal = () => {
    setFollowModalState((prev) => ({ ...prev, isOpen: false }));
  };

  // Responsive viewport detector for products showcase scrolling threshold
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // When there are not enough products (<= 10 on desktop, <= 6 on mobile),
  // the showcase behaves like normal (no scroll trapping, scrolling that area scrolls the whole page naturally).
  // When enough products arrive (> 10 on desktop, > 6 on mobile), it enables independent scrolling!
  const isProductsScrollable = useMemo(() => {
    if (!products || products.length === 0) return false;
    const threshold = isMobileViewport ? 6 : 10;
    return products.length > threshold;
  }, [products, isMobileViewport]);

  useEffect(() => {
    if (developer) {
      if (developer.followersCount !== undefined) {
        setFollowersCount(Number(developer.followersCount) || 0);
      }
      if (developer.followingCount !== undefined) {
        setFollowingCount(Number(developer.followingCount) || 0);
      }
      if (developer.isFollowing !== undefined) {
        setIsFollowing(Boolean(developer.isFollowing));
      }
    }
  }, [developer]);

  const handleToggleFollow = async () => {
    if (!isLoggedIn) {
      if (openAuthModal) {
        openAuthModal("Sign in to follow this developer and get notified of new software releases.");
      }
      return;
    }
    if (followSubmitting) return;
    setFollowSubmitting(true);

    const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('upper_user_token') : null);
    const prevFollowing = isFollowing;
    const prevCount = followersCount;

    // Optimistic UI update
    const optimisticNext = !prevFollowing;
    setIsFollowing(optimisticNext);
    setFollowersCount(optimisticNext ? prevCount + 1 : Math.max(0, prevCount - 1));

    try {
      const res = await fetch(`${API_BASE}/api/developers/follow/${cleanUsername}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsFollowing(Boolean(data.isFollowing));
        if (data.followersCount !== undefined) {
          setFollowersCount(Number(data.followersCount));
        }
      } else {
        // Revert on error
        setIsFollowing(prevFollowing);
        setFollowersCount(prevCount);
      }
    } catch (_) {
      // Revert on network failure
      setIsFollowing(prevFollowing);
      setFollowersCount(prevCount);
    } finally {
      setFollowSubmitting(false);
    }
  };

  // Listen to real-time download increments across the platform
  useEffect(() => {
    const handleDownloadsUpdated = (e) => {
      const { productId, newCount } = e.detail || {};
      if (productId && newCount !== undefined) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === productId ? { ...p, downloadCount: Number(newCount) } : p
          )
        );
      }
      setRefreshDownloads((prev) => prev + 1);
    };

    window.addEventListener('productDownloadsUpdated', handleDownloadsUpdated);
    return () => {
      window.removeEventListener('productDownloadsUpdated', handleDownloadsUpdated);
    };
  }, []);

  // UX Feedback & Interaction States
  const [copied, setCopied] = useState(false);

  // Determine if the current authenticated user owns this developer/user profile
  const isOwner = useMemo(() => {
    // 1. Unauthenticated or logged-out visitors can NEVER edit any profile
    if (!developer || !user) return false;

    // 2. Check if viewing the official Upper Store profile
    const devHandle = (developer.username || '').toLowerCase();
    const isOfficialDev = Boolean(
      developer.isOfficial ||
      ['upperstore', 'upper-store', 'upper_store'].includes(devHandle) ||
      ['upperstore', 'upper-store', 'upper_store'].includes(cleanUsername)
    );

    if (isOfficialDev) {
      // Official Upper Store profile can strictly ONLY be edited by an authenticated administrator
      if (user.role !== 'admin') return false;

      const adminToken = localStorage.getItem('adminToken');
      if (!adminToken) return false;

      try {
        const payload = JSON.parse(atob(adminToken.split('.')[1]));
        return Boolean(payload && payload.role === 'admin' && payload.exp && payload.exp * 1000 > Date.now());
      } catch (_) {
        return false;
      }
    }

    // 3. Normal developer/creator profile ownership checks
    const userHandle = (user.username || '').toLowerCase();
    const userEmail = (user.email || '').toLowerCase().trim();
    const userEmailPrefix = userEmail.split('@')[0];
    if (userHandle && devHandle && userHandle === devHandle) return true;
    if (userHandle && cleanUsername && userHandle === cleanUsername) return true;
    if (userEmailPrefix && devHandle && userEmailPrefix === devHandle) return true;
    if (userEmailPrefix && cleanUsername && userEmailPrefix === cleanUsername) return true;
    if (user.uid && developer.userId && String(user.uid) === String(developer.userId)) return true;
    if (user.id && developer.userId && String(user.id) === String(developer.userId)) return true;
    if (user.uid && developer.id && String(user.uid) === String(developer.id)) return true;
    if (user.id && developer.id && String(user.id) === String(developer.id)) return true;
    if (userEmail && developer.email && userEmail === developer.email.toLowerCase().trim()) return true;
    return false;
  }, [user, developer, cleanUsername]);

  // Dynamic Real-time Total Downloads (Declared at top level before conditional returns)
  const totalDownloads = useMemo(() => {
    if (!products || products.length === 0) return Number(stats.totalDownloads) || 0;
    const computedSum = products.reduce((acc, p) => {
      const base = Number(p.downloadCount ?? p.downloadsCount ?? p.downloads ?? 0);
      return acc + getProductDownloadCount(p.id, base);
    }, 0);
    return Math.max(computedSum, Number(stats.totalDownloads) || 0);
  }, [products, stats.totalDownloads, refreshDownloads]);



  // Fetch Public Profile
  useEffect(() => {
    let isMounted = true;

    const fetchDeveloper = async () => {
      setLoading(true);
      setError(null);
      try {
        const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('upper_user_token') : null);
        const res = await fetch(`${API_BASE}/api/developers/profile/${cleanUsername}`, {
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        });
        const data = await res.json();

        if (!isMounted) return;

        if (res.ok && data.developer) {
          setDeveloper(data.developer);
          setStats(data.stats || { productsCount: 0, totalDownloads: 0, averageRating: 0, totalReviews: 0, followersCount: 0, followingCount: 0 });
          setProducts(Array.isArray(data.products) ? data.products : []);
          if (data.developer.followersCount !== undefined) {
            setFollowersCount(Number(data.developer.followersCount) || 0);
          }
          if (data.developer.followingCount !== undefined) {
            setFollowingCount(Number(data.developer.followingCount) || 0);
          }
          if (data.developer.isFollowing !== undefined) {
            setIsFollowing(Boolean(data.developer.isFollowing));
          }
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

  // Navigate back to previous page
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const devHandle = (developer?.username || '').toLowerCase();
  const isOfficialDev = Boolean(
    developer?.isOfficial ||
    developer?.vipPlan === 'official' ||
    ['upperstore', 'upper-store', 'upper_store'].includes(devHandle) ||
    ['upperstore', 'upper-store', 'upper_store'].includes(cleanUsername)
  );

  // Authenticated owner live membership fallback:
  // If the visiting user owns this profile and has an active VIP membership in their auth session,
  // ensure the profile reflects their active tier even before server re-fetch.
  const isAuthUserVip = Boolean(
    user?.membership &&
    (user.membership.plan === 'elite' || user.membership.plan === 'pro') &&
    user.membership.validUntil &&
    new Date(user.membership.validUntil) > new Date() &&
    !user.membership.isCancelled &&
    !user.vipCancelledAt &&
    !user.isBanned
  );
  const ownerMembershipPlan = isOwner && isAuthUserVip ? user.membership.plan : null;

  // Resolve developer VIP tier:
  // Check owner session, then server developer.vipPlan (checking both 'elite' and 'pro')
  const devVipRaw = String(developer?.vipPlan || '').toLowerCase().trim();
  const isDevVipFromServer = Boolean(
    (devVipRaw === 'elite' || devVipRaw === 'pro') &&
    !developer?.subscriptionEnded &&
    developer?.isVipActive !== false
  );

  const effectivePlan = ownerMembershipPlan
    || (isDevVipFromServer ? devVipRaw : null)
    || ((devVipRaw === 'elite' || devVipRaw === 'pro') ? devVipRaw : 'free');

  const isVipActive = Boolean(
    !isOfficialDev &&
    (effectivePlan === 'elite' || effectivePlan === 'pro')
  );
  const isElite = isVipActive && effectivePlan === 'elite';
  const isPro = isVipActive && effectivePlan === 'pro';
  const isDev = Boolean(developer?.isDeveloper);
  const isSubscriptionEnded = Boolean(developer?.subscriptionEnded && !ownerMembershipPlan && !isDevVipFromServer);

  // Premium rotating conic ring for active creators / VIPs (Official gets emerald green ring)
  const avatarRingPlan = isOfficialDev
    ? 'official'
    : isElite
    ? 'elite'
    : isPro
    ? 'pro'
    : 'free';

  // Resolved cover banner URL (No demo background image)
  const coverBannerUrl = developer ? (developer.coverImage || developer.banner || '') : '';

  // Parse banner positioning, scale, and fit parameters (Strict fixed container)
  const bannerSettings = useMemo(() => {
    let posY = developer?.bannerPosY !== undefined ? Number(developer.bannerPosY) : 50;
    let zoom = developer?.bannerZoom !== undefined ? Number(developer.bannerZoom) : 1.0;
    let fit = (developer?.bannerFit && ['cover', 'contain'].includes(developer.bannerFit)) ? developer.bannerFit : 'contain';

    if (coverBannerUrl) {
      const posMatch = coverBannerUrl.match(/[#?&]vpos=([0-9.]+)/);
      if (posMatch) posY = Math.max(0, Math.min(100, Number(posMatch[1])));

      const zoomMatch = coverBannerUrl.match(/[#?&]zoom=([0-9.]+)/);
      if (zoomMatch) zoom = Math.max(1.0, Math.min(2.5, Number(zoomMatch[1])));

      const fitMatch = coverBannerUrl.match(/[#?&]fit=([a-z]+)/);
      if (fitMatch && ['cover', 'contain'].includes(fitMatch[1])) fit = fitMatch[1];
    }

    if (cleanUsername && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`upper_banner_pos_${cleanUsername}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!coverBannerUrl.includes('vpos=') && parsed.posY !== undefined) posY = parsed.posY;
          if (!coverBannerUrl.includes('zoom=') && parsed.zoom !== undefined) zoom = parsed.zoom;
          if (!coverBannerUrl.includes('fit=') && parsed.fit !== undefined) fit = parsed.fit;
        }
      } catch (_) {}
    }

    return { posY, zoom, fit };
  }, [coverBannerUrl, cleanUsername, developer?.bannerPosY, developer?.bannerZoom, developer?.bannerFit]);

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
        <div className="dev-ref-top-nav-bar">
          <button
            type="button"
            className="dev-ref-back-btn"
            onClick={handleBack}
            title="Back to previous page"
            aria-label="Back to previous page"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span className="dev-ref-back-text">Back to Store</span>
          </button>
        </div>
        <div className="dev-error-card">
          <div className="dev-error-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="dev-error-title">Profile Not Found</h2>
          <p className="dev-error-text">
            {error || `The handle @${cleanUsername} does not exist or has been removed from Upper Store.`}
          </p>
          <div className="dev-error-actions">
            <button className="dev-action-btn primary-crimson" onClick={() => navigate('/products')}>
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



  return (
    <div className="dev-ref-page-container">
      {/* Top Back Navigation Bar */}
      <div className="dev-ref-top-nav-bar">
        <button
          type="button"
          className="dev-ref-back-btn"
          onClick={handleBack}
          title="Back to previous page"
          aria-label="Back to previous page"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          <span className="dev-ref-back-text">Back to Store</span>
        </button>
      </div>

      {/* ===============================================================
          TOP LANDSCAPE COVER BANNER (Strict Fixed Area, Size Never Changes)
          =============================================================== */}
      <div className={`dev-ref-banner-frame ${coverBannerUrl ? 'has-custom-cover' : 'default-mesh-cover'}`}>
        {coverBannerUrl ? (
          <>
            {/* Ambient Blurred Background for Depth */}
            <div
              className="dev-ref-banner-ambient-bg"
              style={{
                backgroundImage: `url(${coverBannerUrl.split('#')[0]})`,
              }}
              aria-hidden="true"
            />
            {/* Main Adjustable Banner Image */}
            <img
              src={coverBannerUrl.split('#')[0]}
              alt="Developer Profile Cover Banner"
              className={`dev-ref-banner-img fit-${bannerSettings.fit}`}
              style={{
                objectFit: bannerSettings.fit,
                objectPosition: `center ${bannerSettings.posY}%`,
                transform: bannerSettings.zoom > 1 ? `scale(${bannerSettings.zoom})` : undefined,
                transformOrigin: `center ${bannerSettings.posY}%`,
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </>
        ) : (
          <div className="dev-ref-banner-mesh-pattern"></div>
        )}
        <div className="dev-ref-banner-overlay"></div>
      </div>

      {/* ===============================================================
          2-COLUMN STOREFRONT LAYOUT (SIDEBAR LEFT + SHOWCASE RIGHT)
          =============================================================== */}
      <div className="dev-storefront-layout">
        {/* LEFT COLUMN: CREATOR PROFILE SIDEBAR */}
        <aside className="dev-profile-sidebar">
          {/* HEADER ROW: AVATAR LEFT + SOCIAL STATS (FOLLOWERS/FOLLOWING) RIGHT */}
          <div className="dev-sidebar-header-row">
            {/* AVATAR OVERLAPPING BANNER */}
            <div className="dev-sidebar-avatar-wrapper">
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" fill={isOfficialDev ? '#10b981' : '#ff2a2a'} />
                    <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              )}
            </div>

            {/* TOP RIGHT: FOLLOWERS & FOLLOWING SOCIAL STRIP (ACCORDING TO USER SKETCH) */}
            <div className="dev-sidebar-social-strip" title="Creator community audience">
              <div
                className="stat-segment stat-clickable"
                onClick={() => openFollowModal('followers')}
                role="button"
                tabIndex={0}
                title="Click to view followers list"
              >
                <span className="stat-segment-val">{followersCount}</span>
                <span className="stat-segment-lbl">Followers</span>
              </div>
              <div
                className="stat-segment stat-clickable"
                onClick={() => openFollowModal('following')}
                role="button"
                tabIndex={0}
                title="Click to view following list"
              >
                <span className="stat-segment-val">{followingCount}</span>
                <span className="stat-segment-lbl">Following</span>
              </div>
            </div>
          </div>

          {/* SIDEBAR IDENTITY INFO */}
          <div className="dev-sidebar-identity">
            <h1 className="dev-ref-display-name">{developer.displayName || developer.username}</h1>
            <div className="dev-sidebar-handle-row">
              <span className="dev-ref-username-tag">@{developer.username}</span>
              {isOfficialDev && (
                <span className="dev-ref-official-pill" title="Upper Store Official Publishing House">
                  OFFICIAL
                </span>
              )}
              {!isDev && !isOfficialDev && (
                <span className="dev-ref-community-pill">Community Member</span>
              )}
            </div>

            {/* BIO DESCRIPTION (No raw 'None') */}
            {(() => {
              const rawBio = (developer.bio || '').trim();
              const isLegacy =
                rawBio === 'Verified Upper Store Creator. Building high-performance software and developer tools.' ||
                rawBio === 'Upper Store Community Member.' ||
                rawBio === 'Verified Upper Store creator crafting high-performance tools and applications.' ||
                rawBio === 'Upper Store Community Member exploring verified developer releases and utilities.' ||
                rawBio === 'Official Upper Store verified publishing house. Curating elite software, cybersecurity tools, utilities, and developer frameworks for the community.' ||
                rawBio === 'No bio' ||
                rawBio.toLowerCase() === 'none';

              if (rawBio && !isLegacy) {
                return <p className="dev-ref-bio-text">{rawBio}</p>;
              }

              if (isOwner) {
                return (
                  <p
                    className="dev-ref-bio-text dev-ref-bio-placeholder owner-clickable"
                    onClick={() => setIsEditModalOpen(true)}
                    title="Click to add a custom bio"
                  >
                    + Add a bio to tell users about your applications and software...
                  </p>
                );
              }

              return (
                <p className="dev-ref-bio-text dev-ref-bio-default">
                  {isOfficialDev
                    ? 'Official Upper Store verified publishing house.'
                    : isDev
                    ? 'Software developer and creator publishing on Upper Store.'
                    : 'Upper Store community member.'}
                </p>
              );
            })()}

            {/* METADATA ROW */}
            <div className="dev-ref-meta-row">
              {developer.location && developer.location.trim() && developer.location.trim().toLowerCase() !== 'none' && (
                <div className="dev-ref-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>{developer.location.trim()}</span>
                </div>
              )}

              <div className="dev-ref-meta-item">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span>{formatJoinedDate(developer.joinedAt || developer.createdAt)}</span>
              </div>

              {(developer.isVerified || isOfficialDev) && (
                <div className="dev-ref-meta-item verified-meta-item">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isOfficialDev ? "#10b981" : "#ff4a4a"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                  <span className="verified-meta-text">{isOfficialDev ? 'Official House' : 'Verified Creator'}</span>
                </div>
              )}
            </div>

            {/* ACTION BUTTONS (Share & Edit/Follow) */}
            <div className="dev-sidebar-actions-row">
              {isOwner ? (
                <button
                  type="button"
                  className="dev-ref-action-pill-btn edit-btn"
                  onClick={() => setIsEditModalOpen(true)}
                  title="Edit Profile Settings"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>Edit profile</span>
                </button>
              ) : (
                <button
                  type="button"
                  className={`dev-ref-action-pill-btn follow-btn ${isFollowing ? 'following' : ''}`}
                  onClick={handleToggleFollow}
                  title={isFollowing ? 'Unfollow this creator' : 'Follow this creator'}
                >
                  {isFollowing ? (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                className={`dev-ref-action-pill-btn share-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
                title={copied ? 'Link Copied to Clipboard!' : 'Share Profile Link'}
              >
                {copied ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"></circle>
                      <circle cx="6" cy="12" r="3"></circle>
                      <circle cx="18" cy="19" r="3"></circle>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    <span>Share</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3-SEGMENT HORIZONTAL METRIC BAR (PRODUCTS, DOWNLOADS, RATING) */}
          <div className="dev-segmented-stats-bar stats-3-col">
            {/* 1. Products */}
            <div className="stat-segment">
              <span className="stat-segment-val">{products.length}</span>
              <span className="stat-segment-lbl">Products</span>
            </div>

            {/* 2. Downloads */}
            <div
              className={`stat-segment ${isOwner && isDev ? 'stat-clickable' : ''}`}
              onClick={isOwner && isDev ? () => setIsDownloadsModalOpen(true) : undefined}
              role={isOwner && isDev ? 'button' : undefined}
              tabIndex={isOwner && isDev ? 0 : undefined}
              title={isOwner && isDev ? 'Click to view downloads telemetry breakdown' : 'Total downloads across all products'}
            >
              <div className="stat-val-inline">
                <span className="stat-segment-val highlight-crimson">{formatDownloadCount(totalDownloads)}</span>
              </div>
              <span className="stat-segment-lbl">
                Downloads
                {isOwner && isDev && <span className="stat-telemetry-dot" title="Telemetry viewable"></span>}
              </span>
            </div>

            {/* 3. Rating */}
            <div className="stat-segment">
              <div className="stat-val-inline">
                <span className="stat-segment-val highlight-amber">
                  {stats.averageRating && Number(stats.averageRating) > 0 ? Number(stats.averageRating).toFixed(1) : (products.length > 0 && stats.totalReviews === 0 ? '5.0' : '0.0')}
                </span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1" aria-hidden="true">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                </svg>
              </div>
              <span className="stat-segment-lbl">Rating</span>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: PUBLISHED PRODUCTS SHOWCASE */}
        <main className="dev-showcase-main">
          {/* Header */}
          <div className="dev-showcase-header">
            <div className="dev-showcase-title-row">
              <h2 className="dev-showcase-title">Published Products</h2>
              <span className="dev-ref-count-chip">{products.length}</span>
            </div>
          </div>

          {/* Products Grid */}
          <div className={`dev-showcase-content ${isProductsScrollable ? 'is-scrollable' : 'is-natural'}`}>
            {isDev && products.length > 0 ? (
              <div className="dev-products-grid">
                {products.map((product) => {
                  const displayImage = product.image || product.logo || product.imageUrl1 || '/logo.png';
                  const downloadsCount = getProductDownloadCount(
                    product.id,
                    product.downloadCount ?? product.downloadsCount ?? product.downloads ?? 0
                  );
                  const isFree = !product.price || String(product.price).trim().toLowerCase() === 'free' || product.price === 0 || product.price === '0';

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
                          decoding="async"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/logo.png';
                          }}
                        />
                        <div className="dev-mini-card-badges-row">
                          {product.category && (
                            <span className="dev-mini-card-cat">{product.category}</span>
                          )}
                          <span className={`dev-mini-card-price ${isFree ? 'price-free' : 'price-paid'}`}>
                            {product.price || 'Free'}
                          </span>
                        </div>
                      </div>

                      {/* COMPACT DETAILS BODY */}
                      <div className="dev-mini-card-body">
                        <div className="dev-mini-card-header-row">
                          {product.logo ? (
                            <img
                              src={product.logo}
                              alt=""
                              className="dev-mini-app-logo"
                              loading="lazy"
                              decoding="async"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="dev-mini-logo-placeholder">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff4a4a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                              </svg>
                            </div>
                          )}
                          <h4 className="dev-mini-card-title" title={product.title}>
                            {product.title}
                          </h4>
                        </div>

                        <div className="dev-mini-card-meta-row">
                          <div className="dev-mini-rating-wrap">
                            <StarRatingBadge
                              productId={product.id}
                              initialRating={product.averageRating || 5.0}
                              initialCount={product.reviewsCount || 0}
                            />
                          </div>
                          <span className="dev-mini-card-downloads">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                              <polyline points="7 10 12 15 17 10"></polyline>
                              <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            {formatDownloadCount(downloadsCount)}
                          </span>
                          {product.version && (
                            <span className="dev-mini-card-version">v{product.version}</span>
                          )}
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
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff4a4a" strokeWidth="2">
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
                    <Link to="/vip" className="dev-ref-action-pill-btn edit-btn">
                      Join VIP &amp; Become a Developer
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              /* NO RELEASES FOUND */
              <div className="dev-ref-empty-card">
                <div className="empty-icon-circle">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#ff4a4a" strokeWidth="2">
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
        </main>
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
          totalDownloads={totalDownloads}
          onSelectProduct={(product) => setSelectedProduct(product)}
        />
      )}

      {/* ===============================================================
          REAL FOLLOWERS & FOLLOWING LIST MODAL
          =============================================================== */}
      <DeveloperFollowModal
        isOpen={followModalState.isOpen}
        onClose={closeFollowModal}
        username={developer.username || cleanUsername}
        initialTab={followModalState.tab}
        followersCount={followersCount}
        followingCount={followingCount}
        isOwner={isOwner}
        onFollowerRemoved={(newCount) => {
          setFollowersCount(newCount);
          setStats((prev) => ({ ...prev, followersCount: newCount }));
        }}
        onFollowingChanged={(newCount) => {
          setFollowingCount(newCount);
          setStats((prev) => ({ ...prev, followingCount: newCount }));
        }}
      />

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
