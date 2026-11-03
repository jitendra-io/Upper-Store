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

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortBy, setSortBy] = useState('popular'); // 'popular' | 'rating' | 'newest' | 'title'

  // UX Feedback
  const [copied, setCopied] = useState(false);

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

  // Derive unique categories from products
  const availableCategories = useMemo(() => {
    const cats = new Set(['All']);
    products.forEach((p) => {
      if (p.category) cats.add(p.category.trim());
    });
    return Array.from(cats);
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory !== 'All' && p.category !== selectedCategory) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = (p.title || '').toLowerCase().includes(q);
          const matchDesc = (p.description || '').toLowerCase().includes(q);
          const matchCat = (p.category || '').toLowerCase().includes(q);
          const matchTags = Array.isArray(p.tags) && p.tags.some((t) => t.toLowerCase().includes(q));
          return matchTitle || matchDesc || matchCat || matchTags;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'popular') {
          const dA = Number(a.downloadsCount) || Number(a.downloads) || 0;
          const dB = Number(b.downloadsCount) || Number(b.downloads) || 0;
          return dB - dA;
        }
        if (sortBy === 'rating') {
          const rA = Number(a.rating) || Number(a.averageRating) || 0;
          const rB = Number(b.rating) || Number(b.averageRating) || 0;
          return rB - rA;
        }
        if (sortBy === 'newest') {
          return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
        }
        if (sortBy === 'title') {
          return (a.title || '').localeCompare(b.title || '');
        }
        return 0;
      });
  }, [products, selectedCategory, searchQuery, sortBy]);

  // Loading Skeleton State
  if (loading) {
    return (
      <div className="dev-profile-container">
        <div className="dev-profile-hero skeleton-pulse">
          <div className="skeleton-avatar"></div>
          <div className="skeleton-line lg"></div>
          <div className="skeleton-line md"></div>
          <div className="skeleton-line sm"></div>
        </div>
      </div>
    );
  }

  // Error / 404 Not Found State - Zero Emojis
  if (error || !developer) {
    return (
      <div className="dev-profile-container">
        <div className="dev-error-card">
          <div className="dev-error-icon">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h2 className="dev-error-title">Profile Not Found</h2>
          <p className="dev-error-text">
            {error || `The handle @${cleanUsername} does not exist or has been removed from Upper Store.`}
          </p>
          <div className="dev-error-actions">
            <button className="dev-btn primary-gold" onClick={() => navigate('/products')}>
              Browse All Products
            </button>
            <button className="dev-btn secondary-ghost" onClick={() => navigate('/')}>
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

  return (
    <div className="dev-profile-container">
      {/* ===============================================================
          TOP BREADCRUMB
          =============================================================== */}
      <nav className="dev-breadcrumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span className="crumb-sep">/</span>
        <Link to="/products">{isDev ? 'Creators' : 'Community'}</Link>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">@{developer.username}</span>
      </nav>

      {/* ===============================================================
          HERO PROFILE CARD (Obsidian & Antique Gold / Purple Halo)
          =============================================================== */}
      <header className={`dev-profile-hero ${isElite ? 'tier-elite' : isPro ? 'tier-pro' : 'tier-standard'}`}>
        <div className="hero-mesh-background"></div>

        <div className="dev-hero-content">
          {/* AVATAR WITH VIP CONIC RING */}
          <div className="dev-avatar-wrapper">
            <VipAvatar
              src={developer.avatar}
              alt={developer.displayName}
              plan={developer.vipPlan || 'free'}
              size="xl"
              fallbackSeed={developer.username || developer.displayName}
              className="dev-hero-vip-avatar"
            />
            {developer.isVerified && isDev && (
              <span className="dev-verified-shield" title="Verified Authentic Developer">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                </svg>
              </span>
            )}
          </div>

          {/* IDENTITY & METADATA */}
          <div className="dev-identity-block">
            <div className="dev-name-row">
              <h1 className="dev-display-name">{developer.displayName}</h1>
              {developer.vipPlan && developer.vipPlan !== 'free' && (
                <VipFlairBadge plan={developer.vipPlan} />
              )}
            </div>

            {/* HANDLE ROW - NO TAGS (Clean and Minimalist) */}
            <div className="dev-handle-row">
              <span className="dev-username-handle">@{developer.username}</span>
            </div>

            {/* EXPIRED SUBSCRIPTION NOTICE BANNER */}
            {isSubscriptionEnded && (
              <div className="dev-expired-sub-banner">
                <div className="expired-banner-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                  </svg>
                </div>
                <div className="expired-banner-content">
                  <h4 className="expired-banner-heading">VIP Creator Subscription Inactive</h4>
                  <p className="expired-banner-text">
                    {isOwner
                      ? 'Your VIP membership has ended. Your catalog applications remain active and accessible to users, but glowing creator halos and VIP broadcasting perks are paused.'
                      : 'This creator\'s VIP subscription has ended. Their verified applications remain accessible for community download.'}
                  </p>
                </div>
                {isOwner && (
                  <Link to="/vip" className="dev-renew-sub-btn">
                    Renew VIP
                  </Link>
                )}
              </div>
            )}

            {/* BIO BOX - Zero Emojis, No Inline Edit (Handled by Single Edit Profile Button) */}
            <div className="dev-bio-box">
              <p className="dev-bio-text">{developer.bio}</p>
            </div>

            {/* ACTION BUTTONS (Single Edit Profile Button for Owner) */}
            <div className="dev-hero-actions">
              {isOwner && (
                <button
                  className="dev-action-btn edit-profile-btn"
                  onClick={() => setIsEditModalOpen(true)}
                  title="Edit Profile Settings"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Edit Profile</span>
                </button>
              )}

              <button
                className={`dev-action-btn share-btn ${copied ? 'copied' : ''}`}
                onClick={handleCopyLink}
                title="Copy profile link"
              >
                {copied ? (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    <span>Share Profile</span>
                  </>
                )}
              </button>

              <Link to="/products" className="dev-action-btn store-btn">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <path d="M16 10a4 4 0 0 1-8 0"></path>
                </svg>
                <span>Explore Full Store</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ===============================================================
            FOUR-METRIC PERFORMANCE STRIP - Zero Emojis
            =============================================================== */}
        <div className="dev-stats-grid">
          {isDev ? (
            <>
              <div className="dev-stat-card">
                <span className="stat-label">Published Software</span>
                <span className="stat-value">{stats.productsCount}</span>
                <span className="stat-sub">Active in Catalog</span>
              </div>

              <div className="dev-stat-card">
                <span className="stat-label">Community Downloads</span>
                <span className="stat-value">{formatDownloadCount(stats.totalDownloads)}</span>
                <span className="stat-sub">Verified Installs</span>
              </div>

              <div className="dev-stat-card">
                <span className="stat-label">Developer Rating</span>
                <div className="stat-rating-value">
                  <span className="stat-value">{stats.averageRating}</span>
                  <span className="stat-star-svg">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#fbbf24">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                  </span>
                </div>
                <span className="stat-sub">Across All Releases</span>
              </div>

              <div className="dev-stat-card">
                <span className="stat-label">Verification Status</span>
                <span className="stat-value highlight-verified">
                  {developer.isSuspended ? 'Suspended' : 'Verified'}
                </span>
                <span className="stat-sub">
                  Aadhaar &amp; Store Status
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="dev-stat-card">
                <span className="stat-label">Account Type</span>
                <span className="stat-value">Community</span>
                <span className="stat-sub">Upper Store Member</span>
              </div>

              <div className="dev-stat-card">
                <span className="stat-label">Creator Status</span>
                <span className="stat-value highlight-inactive">Member</span>
                <span className="stat-sub">No Releases Published</span>
              </div>

              <div className="dev-stat-card">
                <span className="stat-label">Platform Role</span>
                <span className="stat-value">Explorer</span>
                <span className="stat-sub">Active Member</span>
              </div>

              <div className="dev-stat-card">
                <span className="stat-label">Membership</span>
                <span className="stat-value highlight-verified">
                  {developer.vipPlan && developer.vipPlan !== 'free'
                    ? `${developer.vipPlan.toUpperCase()} VIP`
                    : 'Standard'}
                </span>
                <span className="stat-sub">Store Tier</span>
              </div>
            </>
          )}
        </div>
      </header>

      {/* ===============================================================
          MAIN BODY: DEVELOPER RELEASES OR COMMUNITY MEMBER VIEW
          =============================================================== */}
      {isDev ? (
        <section className="dev-catalog-section">
          <div className="dev-catalog-header">
            <div className="dev-catalog-title-group">
              <h2 className="dev-catalog-title">
                Software Releases by <span className="dev-title-highlight">{developer.displayName}</span>
              </h2>
              <p className="dev-catalog-subtitle">
                Browse, inspect, and download applications crafted by @{developer.username}.
              </p>
            </div>

            {/* CATALOG TOOLBAR (Search & Sort) */}
            <div className="dev-catalog-toolbar">
              {/* Search Box */}
              <div className="dev-search-input-wrap">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="dev-search-icon">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input
                  type="text"
                  placeholder={`Search @${developer.username}'s products...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dev-search-input"
                />
                {searchQuery && (
                  <button className="dev-search-clear" onClick={() => setSearchQuery('')} aria-label="Clear search">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="dev-sort-wrap">
                <label htmlFor="dev-sort" className="dev-sort-label">Sort:</label>
                <select
                  id="dev-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="dev-sort-select"
                >
                  <option value="popular">Most Popular</option>
                  <option value="rating">Highest Rated</option>
                  <option value="newest">Newest Releases</option>
                  <option value="title">Title (A-Z)</option>
                </select>
              </div>
            </div>
          </div>

          {/* CATEGORY PILL FILTER */}
          {availableCategories.length > 2 && (
            <div className="dev-category-pills-row">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  className={`dev-cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* PRODUCTS GRID */}
          {filteredProducts.length > 0 ? (
            <div className="dev-products-grid">
              {filteredProducts.map((product) => {
                const displayImage = product.logo || product.image || product.imageUrl1 || '/logo.png';
                const downloadCount = Number(product.downloadsCount) || Number(product.downloadCount) || Number(product.downloads) || 0;

                return (
                  <article
                    key={product.id}
                    className="dev-product-card"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="card-top-row">
                      <div className="card-icon-wrap">
                        <img
                          src={displayImage}
                          alt={product.title}
                          className="card-product-icon"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/logo.png';
                          }}
                        />
                      </div>

                      <div className="card-header-meta">
                        <span className="card-category-tag">{product.category || 'Application'}</span>
                        <h3 className="card-product-title">{product.title}</h3>
                        <span className="card-version-tag">v{product.version || '1.0.0'}</span>
                      </div>
                    </div>

                    <p className="card-description">
                      {product.description || 'Verified release by developer.'}
                    </p>

                    <div className="card-footer-strip">
                      <div className="card-rating-downloads">
                        <StarRatingBadge rating={Number(product.rating || product.averageRating || 5)} count={Number(product.reviewsCount || 0)} />
                        <span className="card-download-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ marginRight: '3px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          {formatDownloadCount(downloadCount)}
                        </span>
                      </div>

                      <div className="card-action-wrap">
                        <span className="card-price-pill">{product.price || 'Free'}</span>
                        <button className="card-view-btn" onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                        }}>
                          View Details &rarr;
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* NO RELEASES FOUND - ZERO EMOJIS */
            <div className="dev-no-products-box">
              <div className="no-products-icon">
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="rgba(212, 175, 55, 0.45)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
              </div>
              <h3>No Releases Found</h3>
              <p>
                {searchQuery || selectedCategory !== 'All'
                  ? 'No software releases matched your active filter or search criteria.'
                  : `@${developer.username} has not published any public applications yet.`}
              </p>
              {(searchQuery || selectedCategory !== 'All') && (
                <button
                  className="dev-btn sm-ghost"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                >
                  Reset Filters
                </button>
              )}
            </div>
          )}
        </section>
      ) : (
        /* NON-DEVELOPER: COMMUNITY MEMBER SHOWCASE - ZERO EMOJIS */
        <section className="dev-community-section">
          <div className="dev-community-card">
            <div className="dev-community-icon-frame">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h2 className="dev-community-heading">Community Member Profile</h2>
            <p className="dev-community-desc">
              <strong>@{developer.username}</strong> is a registered member of Upper Store.
              This user has not applied for developer credentials or published software releases yet.
            </p>

            {isOwner ? (
              <div className="dev-owner-upgrade-box">
                <div className="upgrade-box-header">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                  </svg>
                  <span>Want to Publish Your Own Software on Upper Store?</span>
                </div>
                <p className="upgrade-box-text">
                  Unlock the full Developer Studio, get verified with Aadhaar KYC, and distribute your APKs, desktop applications, and developer utilities directly to the Upper Store community.
                </p>
                <div className="upgrade-box-actions">
                  <Link to="/vip" className="dev-btn primary-gold">
                    Join VIP &amp; Become Creator
                  </Link>
                  <Link to="/products" className="dev-btn secondary-ghost">
                    Browse Store Catalog
                  </Link>
                </div>
              </div>
            ) : (
              <div className="dev-community-actions">
                <Link to="/products" className="dev-btn primary-gold">
                  Explore Upper Store Software
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

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
