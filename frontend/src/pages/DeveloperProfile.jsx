import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VipAvatar, VipFlairBadge } from '../components/VipAvatar';
import StarRatingBadge from '../components/StarRatingBadge';
import ProductDetailModal from '../components/ProductDetailModal';
import EditProfileModal from '../components/EditProfileModal';
import { formatDownloadCount } from '../utils/downloadTracker';
import './DeveloperProfile.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Default atmospheric nature dusk landscape banner matching reference image
const DEFAULT_COVER_BANNER =
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1600&q=80';

const formatJoinedDate = (dateString) => {
  if (!dateString) return 'Joined March 2024';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return 'Joined March 2024';
    return `Joined ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;
  } catch {
    return 'Joined March 2024';
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

  // Tabs: 'posts' | 'replies' | 'highlights' | 'about'
  const [activeTab, setActiveTab] = useState('posts');

  // Single Unified Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // UX Feedback & Interaction States
  const [copied, setCopied] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(8412);
  const [likedPosts, setLikedPosts] = useState({});

  // Clean the username parameter
  const cleanUsername = useMemo(() => {
    return (username || '').replace(/^@/, '').trim().toLowerCase();
  }, [username]);

  // Determine if the current authenticated user owns this developer/user profile
  const isOwner = useMemo(() => {
    if (!user || !developer) return false;
    const userHandle = (user.username || '').toLowerCase();
    const devHandle = (developer.username || '').toLowerCase();
    if (userHandle && devHandle && userHandle === devHandle) return true;
    if (user.uid && developer.userId && user.uid === developer.userId) return true;
    if (user.id && developer.id && user.id === developer.id) return true;
    if (user.email && developer.email && user.email.toLowerCase() === developer.email.toLowerCase()) return true;
    return false;
  }, [user, developer]);

  // Load follow status & liked posts from localStorage
  useEffect(() => {
    if (!cleanUsername) return;
    try {
      const followKey = `upper_follow_${cleanUsername}`;
      setIsFollowing(localStorage.getItem(followKey) === 'true');

      const likesKey = `upper_likes_${cleanUsername}`;
      const savedLikes = localStorage.getItem(likesKey);
      if (savedLikes) setLikedPosts(JSON.parse(savedLikes));
    } catch {
      // Safe fallback
    }
  }, [cleanUsername]);

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

          // Derive realistic followers count
          const baseFollowers = Math.max(
            8412,
            ((data.stats?.totalDownloads || 0) * 4) + 1280
          );
          setFollowersCount(baseFollowers);
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

  // Toggle Follow / Unfollow
  const handleToggleFollow = () => {
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    setFollowersCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    try {
      localStorage.setItem(`upper_follow_${cleanUsername}`, String(nextState));
    } catch {
      // Ignore storage errors
    }
  };

  // Toggle Like on Product Post Card
  const handleToggleLike = (productId) => {
    setLikedPosts((prev) => {
      const current = Boolean(prev[productId]);
      const next = { ...prev, [productId]: !current };
      try {
        localStorage.setItem(`upper_likes_${cleanUsername}`, JSON.stringify(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

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

  const isElite = developer.vipPlan === 'elite';
  const isPro = developer.vipPlan === 'pro';
  const isDev = Boolean(developer.isDeveloper);
  const isSubscriptionEnded = Boolean(developer.subscriptionEnded);

  // Premium rotating conic ring for active creators / VIPs
  const avatarRingPlan = isSubscriptionEnded
    ? 'free'
    : isElite
    ? 'elite'
    : isDev || isPro
    ? 'pro'
    : developer.vipPlan || 'free';

  // Derived highlights: top downloaded / highest rated
  const highlightProducts = [...products].sort((a, b) => {
    const dA = Number(a.downloadsCount) || Number(a.downloads) || 0;
    const dB = Number(b.downloadsCount) || Number(b.downloads) || 0;
    return dB - dA;
  }).slice(0, 4);

  return (
    <div className="dev-ref-page-container">
      {/* ===============================================================
          TOP LANDSCAPE COVER BANNER (Matches Reference Image)
          =============================================================== */}
      <div className="dev-ref-banner-frame">
        <img
          src={developer.coverImage || developer.banner || DEFAULT_COVER_BANNER}
          alt="Developer Profile Cover Banner"
          className="dev-ref-banner-img"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = DEFAULT_COVER_BANNER;
          }}
        />
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
          {developer.isVerified && isDev && (
            <span className="dev-ref-verified-badge" title="Verified Authentic Developer">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#f59e0b" />
                <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
        </div>

        {/* RIGHT ACTION BUTTONS: MESSAGE, SHARE, FOLLOW / EDIT */}
        <div className="dev-ref-actions-group">
          {/* Options / Contact Button */}
          <button
            className="dev-ref-circle-btn"
            title={`Contact @${developer.username}`}
            onClick={() => {
              if (developer.email) {
                window.location.href = `mailto:${developer.email}`;
              } else {
                handleCopyLink();
              }
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </button>

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

          {/* Main Action Pill: Follow OR Edit Profile (Single Unified Modal) */}
          {isOwner ? (
            <button
              className="dev-ref-edit-pill-btn"
              onClick={() => setIsEditModalOpen(true)}
              title="Edit Profile Settings"
            >
              <span>Edit profile</span>
            </button>
          ) : (
            <button
              className={`dev-ref-follow-pill-btn ${isFollowing ? 'following' : ''}`}
              onClick={handleToggleFollow}
            >
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
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
          {developer.vipPlan && developer.vipPlan !== 'free' && (
            <VipFlairBadge plan={developer.vipPlan} compact={true} />
          )}
          {!isDev && (
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
            ? 'Product designer & software developer crafting high-performance tools and applications for Upper Store.'
            : 'Upper Store Community Member exploring verified developer releases and utilities.')}
        </p>

        {/* METADATA ROW (Location, Role, Joined Date, Website) */}
        <div className="dev-ref-meta-row">
          <div className="dev-ref-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>{developer.location || 'India'}</span>
          </div>

          <div className="dev-ref-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>{isDev ? 'Product Designer at Upper Store' : 'Community Explorer'}</span>
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

          <div className="dev-ref-meta-item">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            <a
              href={developer.website || `https://upperstore.io/@${developer.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dev-ref-meta-link"
            >
              {developer.website ? developer.website.replace(/^https?:\/\//, '') : `${developer.username}.design`}
            </a>
          </div>
        </div>

        {/* STATS ROW (Matches: 1,284 Following   8,412 Followers   312 Posts) */}
        <div className="dev-ref-stats-row">
          <div className="dev-ref-stat">
            <span className="stat-bold-val">1,284</span>
            <span className="stat-muted-lbl">Following</span>
          </div>

          <div className="dev-ref-stat">
            <span className="stat-bold-val">{followersCount.toLocaleString()}</span>
            <span className="stat-muted-lbl">Followers</span>
          </div>

          <div className="dev-ref-stat">
            <span className="stat-bold-val">{products.length}</span>
            <span className="stat-muted-lbl">{isDev ? 'Posts' : 'Saved'}</span>
          </div>

          {isDev && (
            <div className="dev-ref-stat">
              <span className="stat-bold-val">{formatDownloadCount(stats.totalDownloads)}</span>
              <span className="stat-muted-lbl">Downloads</span>
            </div>
          )}
        </div>
      </div>

      {/* ===============================================================
          TABS NAVIGATION BAR (Posts, Replies, Highlights, About | Edit Profile)
          =============================================================== */}
      <div className="dev-ref-tabs-container">
        <div className="dev-ref-tabs-bar">
          <button
            className={`dev-ref-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            Posts
          </button>

          <button
            className={`dev-ref-tab-btn ${activeTab === 'replies' ? 'active' : ''}`}
            onClick={() => setActiveTab('replies')}
          >
            Replies
          </button>

          <button
            className={`dev-ref-tab-btn ${activeTab === 'highlights' ? 'active' : ''}`}
            onClick={() => setActiveTab('highlights')}
          >
            Highlights
          </button>

          <button
            className={`dev-ref-tab-btn ${activeTab === 'about' ? 'active' : ''}`}
            onClick={() => setActiveTab('about')}
          >
            About
          </button>
        </div>

        {isOwner && (
          <button
            className="dev-ref-tab-edit-link"
            onClick={() => setIsEditModalOpen(true)}
            title="Edit profile information"
          >
            Edit profile
          </button>
        )}
      </div>

      {/* ===============================================================
          TAB CONTENT PANELS
          =============================================================== */}
      <div className="dev-ref-tab-content">
        {/* TAB 1: POSTS / PRODUCTS FEED */}
        {activeTab === 'posts' && (
          <div className="dev-ref-feed-list">
            {isDev && products.length > 0 ? (
              products.map((product, index) => {
                const isLiked = Boolean(likedPosts[product.id]);
                const baseLikes = 248 + (index * 64) + ((Number(product.downloads) || 0) % 50);
                const currentLikes = isLiked ? baseLikes + 1 : baseLikes;
                const commentsCount = 18 + (index * 8);
                const repostsCount = 12 + (index * 4);

                const displayImage = product.image || product.logo || product.imageUrl1 || null;
                const secondaryImage = product.imageUrl2 || product.screenshot || null;

                return (
                  <article key={product.id} className="dev-ref-feed-card">
                    {/* CARD HEADER: AVATAR, NAME, HANDLE, TIME/VERSION */}
                    <div className="dev-card-header">
                      <img
                        src={developer.avatar}
                        alt={developer.displayName}
                        className="dev-card-author-avatar"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/logo.png';
                        }}
                      />
                      <div className="dev-card-author-meta">
                        <span className="dev-card-author-name">{developer.displayName || developer.username}</span>
                        <span className="dev-card-author-handle">@{developer.username}</span>
                        <span className="dev-card-time-sep">&middot;</span>
                        <span className="dev-card-time-tag">v{product.version || '1.0.0'}</span>
                      </div>
                    </div>

                    {/* CARD BODY TEXT / DESCRIPTION */}
                    <p className="dev-card-body-text">
                      {product.description || 'Verified software release on Upper Store. Crafted with clean architecture, high reliability, and top-tier performance.'}
                    </p>

                    {/* CARD MEDIA / PREVIEWS (Single or Dual Split Grid) */}
                    {displayImage && secondaryImage ? (
                      <div className="dev-card-media-grid dual">
                        <img
                          src={displayImage}
                          alt={`${product.title} preview 1`}
                          className="dev-card-media-img"
                          onClick={() => setSelectedProduct(product)}
                        />
                        <img
                          src={secondaryImage}
                          alt={`${product.title} preview 2`}
                          className="dev-card-media-img"
                          onClick={() => setSelectedProduct(product)}
                        />
                      </div>
                    ) : displayImage ? (
                      <div className="dev-card-media-grid single">
                        <img
                          src={displayImage}
                          alt={`${product.title} preview`}
                          className="dev-card-media-img"
                          onClick={() => setSelectedProduct(product)}
                        />
                      </div>
                    ) : null}

                    {/* CARD EMBED BOX (Matches reference image's </> color-ramp · GitHub box) */}
                    <div
                      className="dev-card-software-embed"
                      onClick={() => setSelectedProduct(product)}
                      title="Inspect and download application"
                    >
                      <div className="dev-embed-code-badge">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="16 18 22 12 16 6"></polyline>
                          <polyline points="8 6 2 12 8 18"></polyline>
                        </svg>
                      </div>
                      <div className="dev-embed-text-group">
                        <h4 className="dev-embed-title">{product.title} &middot; Upper Store</h4>
                        <span className="dev-embed-sublink">
                          upperstore.io/{cleanUsername}/{product.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                        </span>
                      </div>
                      <div className="dev-embed-arrow-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                          <polyline points="15 3 21 3 21 9"></polyline>
                          <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                      </div>
                    </div>

                    {/* CARD INTERACTION FOOTER (Heart, Comments, Downloads, Bookmark/Share) */}
                    <div className="dev-card-footer">
                      <div className="dev-card-social-actions">
                        {/* Heart / Like */}
                        <button
                          className={`dev-social-action-btn ${isLiked ? 'liked' : ''}`}
                          onClick={() => handleToggleLike(product.id)}
                          title="Like release"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill={isLiked ? '#ef4444' : 'none'} stroke={isLiked ? '#ef4444' : 'currentColor'} strokeWidth="2">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                          <span>{currentLikes}</span>
                        </button>

                        {/* Comments / Reviews */}
                        <button
                          className="dev-social-action-btn"
                          onClick={() => setSelectedProduct(product)}
                          title="View reviews and feedback"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                          </svg>
                          <span>{commentsCount}</span>
                        </button>

                        {/* Installs / Downloads */}
                        <button
                          className="dev-social-action-btn"
                          onClick={() => setSelectedProduct(product)}
                          title="Verified community downloads"
                        >
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          <span>{formatDownloadCount(Number(product.downloadsCount) || Number(product.downloads) || repostsCount * 10)}</span>
                        </button>
                      </div>

                      {/* Right Side: Price & View Details */}
                      <div className="dev-card-download-actions">
                        <span className="dev-card-price-pill">{product.price || 'Free'}</span>
                        <button
                          className="dev-card-inspect-btn"
                          onClick={() => setSelectedProduct(product)}
                        >
                          View Details &rarr;
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
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
                    <Link to="/vip" className="dev-ref-follow-pill-btn">
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
                <h3>No Releases Published Yet</h3>
                <p>@{developer.username} has not published any public applications to Upper Store yet.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: REPLIES / REVIEWS */}
        {activeTab === 'replies' && (
          <div className="dev-ref-replies-list">
            {products.length > 0 ? (
              <div className="dev-ref-feed-card">
                <div className="dev-card-header">
                  <img
                    src={`https://api.dicebear.com/7.x/initials/svg?seed=UpperCommunity`}
                    alt="Upper Store Community"
                    className="dev-card-author-avatar"
                  />
                  <div className="dev-card-author-meta">
                    <span className="dev-card-author-name">Upper Community &middot; Verified Reviews</span>
                    <span className="dev-card-author-handle">@community</span>
                    <span className="dev-card-time-sep">&middot;</span>
                    <span className="dev-card-time-tag">Recent</span>
                  </div>
                </div>
                <p className="dev-card-body-text">
                  Community feedback, ratings, and performance reports across software releases published by @{developer.username}.
                </p>
                <div className="dev-replies-summary-strip">
                  <div className="summary-stat-box">
                    <span className="summary-lbl">Average Rating</span>
                    <span className="summary-val">{stats.averageRating} / 5.0</span>
                  </div>
                  <div className="summary-stat-box">
                    <span className="summary-lbl">Verified Downloads</span>
                    <span className="summary-val">{formatDownloadCount(stats.totalDownloads)}</span>
                  </div>
                  <div className="summary-stat-box">
                    <span className="summary-lbl">Catalog Applications</span>
                    <span className="summary-val">{products.length} Active</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="dev-ref-empty-card">
                <p>No community replies or feedback submitted yet.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: HIGHLIGHTS */}
        {activeTab === 'highlights' && (
          <div className="dev-ref-feed-list">
            {highlightProducts.length > 0 ? (
              highlightProducts.map((prod) => (
                <article key={prod.id} className="dev-ref-feed-card highlight-card">
                  <div className="dev-card-header">
                    <img
                      src={developer.avatar}
                      alt={developer.displayName}
                      className="dev-card-author-avatar"
                    />
                    <div className="dev-card-author-meta">
                      <span className="dev-card-author-name">{developer.displayName || developer.username}</span>
                      <span className="dev-card-author-handle">@{developer.username}</span>
                      <span className="dev-card-time-sep">&middot;</span>
                      <span className="dev-card-badge-gold">Highlight</span>
                    </div>
                  </div>
                  <h3 className="highlight-prod-title">{prod.title}</h3>
                  <p className="dev-card-body-text">{prod.description}</p>
                  <div
                    className="dev-card-software-embed"
                    onClick={() => setSelectedProduct(prod)}
                  >
                    <div className="dev-embed-code-badge">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5">
                        <polyline points="16 18 22 12 16 6"></polyline>
                        <polyline points="8 6 2 12 8 18"></polyline>
                      </svg>
                    </div>
                    <div className="dev-embed-text-group">
                      <h4 className="dev-embed-title">{prod.title} &middot; Flagship Release</h4>
                      <span className="dev-embed-sublink">
                        {formatDownloadCount(prod.downloadsCount || prod.downloads || 0)} verified installs &middot; v{prod.version || '1.0'}
                      </span>
                    </div>
                    <div className="dev-embed-arrow-icon">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="dev-ref-empty-card">
                <p>No flagship highlights found yet.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ABOUT DEVELOPER */}
        {activeTab === 'about' && (
          <div className="dev-ref-about-card">
            <h3 className="about-sec-heading">About @{developer.username}</h3>
            <p className="about-bio-full">{developer.bio}</p>

            <div className="about-details-grid">
              <div className="about-detail-item">
                <span className="about-lbl">Developer Status</span>
                <span className="about-val highlight-gold">
                  {isDev ? (developer.isVerified ? 'Verified Authentic Creator' : 'Active Developer') : 'Community Member'}
                </span>
              </div>

              <div className="about-detail-item">
                <span className="about-lbl">Store Membership</span>
                <span className="about-val">
                  {developer.vipPlan && developer.vipPlan !== 'free'
                    ? `${developer.vipPlan.toUpperCase()} VIP`
                    : 'Standard Member'}
                </span>
              </div>

              <div className="about-detail-item">
                <span className="about-lbl">Total Catalog Applications</span>
                <span className="about-val">{products.length} Published</span>
              </div>

              <div className="about-detail-item">
                <span className="about-lbl">Platform Installs</span>
                <span className="about-val">{formatDownloadCount(stats.totalDownloads)}</span>
              </div>

              <div className="about-detail-item">
                <span className="about-lbl">Average Rating</span>
                <span className="about-val">{stats.averageRating} / 5.0</span>
              </div>

              <div className="about-detail-item">
                <span className="about-lbl">Security &amp; KYC</span>
                <span className="about-val highlight-gold">
                  {developer.isVerified ? 'Aadhaar KYC Verified' : 'Standard Validation'}
                </span>
              </div>
            </div>
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
        onProfileUpdated={({ displayName, username: newUsername, bio }) => {
          setDeveloper((prev) => ({
            ...prev,
            displayName,
            username: newUsername,
            bio,
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
