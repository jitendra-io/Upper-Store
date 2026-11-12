import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductReviewsModal from '../components/ProductReviewsModal';
import VipPromoBanner from '../components/VipPromoBanner';
import StarRatingBadge from '../components/StarRatingBadge';
import { getProductDownloadCount, formatDownloadCount } from '../utils/downloadTracker';
import { useAuth } from '../context/AuthContext';
import { isUserVipActive, getUserVipTier } from '../utils/vipValidator';
import { VipAvatar, VipFlairBadge } from '../components/VipAvatar';
import { LayersIcon, ArrowRightIcon } from '../components/Icons';
import './Products.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  'All',
  'Android Tools',
  'Windows & Desktop',
  'AI Tools',
  'Games',
  'Developer Utilities',
  'Design Assets',
  'Privacy Clean',
  'Others'
];

const parseYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const match = clean.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? match[1] : null;
};

const getVideoPlayerSource = (url) => {
  if (!url || typeof url !== 'string') return { type: 'none', src: '' };
  const clean = url.trim();

  const ytId = parseYouTubeVideoId(clean);
  if (ytId) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytId}?autoplay=1&mute=1&controls=1&rel=0&enablejsapi=1`
    };
  }

  const driveMatch = clean.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return {
      type: 'iframe',
      src: `https://drive.google.com/file/d/${driveMatch[1]}/preview`
    };
  }

  return { type: 'video', src: clean };
};

const FALLBACK_POSTER = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=800';

const getSafeImageUrl = (url) => {
  if (!url || typeof url !== 'string') return FALLBACK_POSTER;
  const clean = url.trim();
  if ((clean.includes('photos.app.goo.gl') || clean.includes('photos.google.com')) && !clean.includes('lh3.googleusercontent.com')) {
    return FALLBACK_POSTER;
  }
  return clean;
};

const Products = () => {
  const { user } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialSection = searchParams.get('tab') === 'videos' || location.hash === '#videos' ? 'videos' : 'products';

  const getInitialViewMode = () => {
    const urlView = searchParams.get('view');
    if (urlView === 'list' || urlView === 'grid') return urlView;
    try {
      const saved = localStorage.getItem('upper_products_view_mode');
      if (saved === 'list' || saved === 'grid') return saved;
    } catch (_) {}
    return 'grid';
  };

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeSection, setActiveSection] = useState(initialSection); // 'products' | 'videos'
  const [viewMode, setViewMode] = useState(getInitialViewMode); // 'grid' | 'list'
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const deckTrackRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('upper_products_view_mode', mode);
    } catch (_) {}
  };

  const handleCloseProductModal = useCallback(() => {
    setSelectedProduct(null);
    try {
      const currentParams = new URLSearchParams(window.location.search);
      if (currentParams.get('product') || currentParams.get('productId')) {
        currentParams.delete('product');
        currentParams.delete('productId');
        const newQuery = currentParams.toString();
        const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`;
        window.history.replaceState(null, '', newUrl);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!mobileFilterOpen) return;
    const handleClickOutside = (e) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setMobileFilterOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [mobileFilterOpen]);

  useEffect(() => {
    const prodId = searchParams.get('product') || searchParams.get('productId');
    if (prodId && products.length > 0) {
      const found = products.find(p => String(p.id) === String(prodId) || String(p._id) === String(prodId));
      if (found) setSelectedProduct(found);
    }
    if (searchParams.get('tab') === 'videos' || location.hash === '#videos') {
      setActiveSection('videos');
    }
    const urlView = searchParams.get('view');
    if (urlView === 'list' || urlView === 'grid') {
      setViewMode(urlView);
      try {
        localStorage.setItem('upper_products_view_mode', urlView);
      } catch (_) {}
    }
  }, [products, location.search, location.hash]);

  const ITEMS_PER_PAGE = 10;
  const MAX_PAGES_LIMIT = 10;
  const [, setRefreshDownloads] = useState(0);

  const getProductDevTier = (product) => {
    if (!product.developerUsername || product.developerUsername === 'upperstore' || product.isStoreOfficial) {
      return 'official';
    }
    const rawTier = String(product.developerTier || '').toLowerCase().trim();
    if (rawTier === 'elite' || rawTier === 'pro') return rawTier;
    if (user && isUserVipActive(user)) {
      const isOwnerProduct =
        (product.developerId && user.uid && String(product.developerId) === String(user.uid)) ||
        (product.developerUsername && user.username && product.developerUsername.toLowerCase() === user.username.toLowerCase()) ||
        (product.developerEmail && user.email && product.developerEmail.toLowerCase() === user.email.toLowerCase()) ||
        (user.email && product.developerUsername && user.email.split('@')[0].toLowerCase() === product.developerUsername.toLowerCase());
      if (isOwnerProduct) {
        return getUserVipTier(user);
      }
    }
    return 'free';
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } else {
        setProducts([]);
      }
    } catch (err) {
      console.warn('Backend API offline or unreachable:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const handleUpdate = () => setRefreshDownloads((prev) => prev + 1);
    const handleProductsUpdated = () => loadProducts();

    window.addEventListener('productDownloadsUpdated', handleUpdate);
    window.addEventListener('productsUpdated', handleProductsUpdated);
    window.addEventListener('focus', handleProductsUpdated);
    return () => {
      window.removeEventListener('productDownloadsUpdated', handleUpdate);
      window.removeEventListener('productsUpdated', handleProductsUpdated);
      window.removeEventListener('focus', handleProductsUpdated);
    };
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      const fresh = products.find(p => p.id === selectedProduct.id);
      if (fresh) setSelectedProduct(fresh);
    }
  }, [products]);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setActiveSearch(searchQuery);
    setCurrentPage(1);
    setActiveSection('products');
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
    setCurrentPage(1);
  };

  const scrollDeck = (direction) => {
    if (deckTrackRef.current) {
      const scrollAmount = 340;
      deckTrackRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Video Demo List Derived from Products
  const videoProducts = products.filter((p) => p.videoUrl && p.videoUrl.trim() !== '');
  const videoList = videoProducts.map((p) => {
    const ytId = parseYouTubeVideoId(p.videoUrl);
    const ytThumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : '';
    const posterUrl = (p.videoPoster && p.videoPoster.trim() !== '') ? p.videoPoster : ytThumbnail;

    return {
      id: `custom-vid-${p._id || p.id}`,
      productId: p._id || p.id,
      title: p.title ? `${p.title} - Video Demo` : 'Product Video Demo',
      category: p.category || 'Product Showcase',
      badge: p.version ? `v${p.version}` : 'Official Demo',
      videoUrl: p.videoUrl,
      hasCustomPoster: Boolean(posterUrl),
      poster: posterUrl,
      description: p.description || 'Watch hands-on video demonstration of this software package.',
      features: ['SHA-256 Verified', p.version ? `v${p.version}` : 'Latest Release', 'Direct Download Available']
    };
  });

  const filteredProducts = products.filter((p) => {
    const catLower = (p.category || '').toLowerCase();
    const titleLower = (p.title || '').toLowerCase();
    const descLower = (p.description || '').toLowerCase();
    const apkLower = (p.apkFile || '').toLowerCase();

    const matchesCategory =
      selectedCategory === 'All' ||
      p.category === selectedCategory ||
      (selectedCategory === 'Android Tools' && (catLower.includes('mobile') || catLower.includes('android') || apkLower.endsWith('.apk'))) ||
      (selectedCategory === 'Windows & Desktop' && (catLower.includes('windows') || catLower.includes('desktop') || catLower.includes('exe') || apkLower.endsWith('.exe'))) ||
      (selectedCategory === 'AI Tools' && (catLower.includes('ai') || titleLower.includes('ai') || descLower.includes('ai') || catLower.includes('model'))) ||
      (selectedCategory === 'Games' && (catLower.includes('game') || titleLower.includes('game') || descLower.includes('game'))) ||
      (selectedCategory === 'Developer Utilities' && (catLower.includes('developer') || catLower.includes('tool') || catLower.includes('software') || titleLower.includes('dev') || descLower.includes('api') || catLower.includes('library'))) ||
      (selectedCategory === 'Design Assets' && (catLower.includes('design') || catLower.includes('vector') || catLower.includes('asset') || catLower.includes('graphic') || apkLower.endsWith('.zip'))) ||
      (selectedCategory === 'Privacy Clean' && (catLower.includes('privacy') || catLower.includes('offline') || descLower.includes('offline') || descLower.includes('privacy') || !catLower.includes('ad'))) ||
      (selectedCategory === 'Others' && (catLower.includes('other') || (!catLower.includes('mobile') && !catLower.includes('windows') && !catLower.includes('desktop') && !catLower.includes('ai') && !catLower.includes('game') && !catLower.includes('developer'))));
    
    const queryToUse = activeSearch || searchQuery;
    const searchWords = queryToUse.toLowerCase().trim().split(/\s+/).filter(Boolean);
    
    let matchesSearch = true;
    if (searchWords.length > 0) {
      const fullProductContent = `
        ${p.title || ''} 
        ${p.description || ''} 
        ${p.category || ''} 
        ${p.version || ''} 
        ${Array.isArray(p.features) ? p.features.join(' ') : ''}
      `.toLowerCase();
      
      matchesSearch = searchWords.some((word) => fullProductContent.includes(word));
    }
    
    return matchesCategory && matchesSearch;
  });

  const totalItems = filteredProducts.length;
  const rawTotalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const totalPages = Math.min(rawTotalPages, MAX_PAGES_LIMIT);
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * ITEMS_PER_PAGE;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const currentVideo = videoList.find((v) => v.id === activeVideoId) || videoList[0];
  const matchingVideoProduct = currentVideo ? products.find((p) => (p._id || p.id) === currentVideo.productId) : null;
  const playerSrc = currentVideo ? getVideoPlayerSource(currentVideo.videoUrl) : { type: 'none', src: '' };
  const safePoster = currentVideo ? getSafeImageUrl(currentVideo.poster) : FALLBACK_POSTER;

  return (
    <div className="products-container">
      <header className="products-header">
        <div className="products-header-action-row">
          <span className="products-crimson-badge">
            <span className="crimson-dot-pulse" />
            Official Software Catalog & Demos
          </span>
          <Link to="/about#publish" className="publish-product-btn">
            Publish Your Product
          </Link>
        </div>

        <h1 className="products-title">
          Product <span className="text-crimson-glow">Ecosystem</span>
        </h1>
        <p className="products-sub">
          Explore our curated collection of verified applications, desktop utilities, developer tools, and live video demonstrations.
        </p>

        {/* CONTROLS BAR: SECTIONS SWITCHER + VIEW MODE TOGGLE (CARDS / LIST) */}
        <div className="products-controls-bar">
          <div className="products-section-switcher">
            <button
              type="button"
              className={`section-tab-btn ${activeSection === 'products' ? 'active' : ''}`}
              onClick={() => setActiveSection('products')}
            >
              <span className="section-tab-title">All Products ({products.length})</span>
            </button>
            <button
              type="button"
              className={`section-tab-btn ${activeSection === 'videos' ? 'active' : ''}`}
              onClick={() => setActiveSection('videos')}
            >
              <span className="section-tab-title">Video Demos ({videoList.length})</span>
            </button>
          </div>

          {activeSection === 'products' && (
            <div className="products-view-toggle" role="group" aria-label="Catalog View Mode">
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('grid')}
                title="Cards View"
                aria-label="Cards View"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7"></rect>
                  <rect x="14" y="3" width="7" height="7"></rect>
                  <rect x="14" y="14" width="7" height="7"></rect>
                  <rect x="3" y="14" width="7" height="7"></rect>
                </svg>
                <span>Cards</span>
              </button>
              <button
                type="button"
                className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => handleViewModeChange('list')}
                title="List View"
                aria-label="List View"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6"></line>
                  <line x1="8" y1="12" x2="21" y2="12"></line>
                  <line x1="8" y1="18" x2="21" y2="18"></line>
                  <line x1="3" y1="6" x2="3.01" y2="6"></line>
                  <line x1="3" y1="12" x2="3.01" y2="12"></line>
                  <line x1="3" y1="18" x2="3.01" y2="18"></line>
                </svg>
                <span>List</span>
              </button>
            </div>
          )}
        </div>

        {/* Search Bar */}
        <form className="catalog-search-form" onSubmit={handleSearchSubmit}>
          <div className="catalog-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="catalog-search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search software, frameworks, APKs, tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" onClick={handleClearSearch} className="catalog-clear-btn" title="Clear Search">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            )}
            <button type="submit" className="catalog-search-submit-btn">
              Search
            </button>
          </div>
        </form>
      </header>

      {/* COMPACT VIP PROMO BANNER */}
      {!isUserVipActive(user) && (
        <div className="catalog-vip-banner-wrap">
          <VipPromoBanner compact={true} />
        </div>
      )}

      {/* ========================================================
          SECTION 1: PRODUCTS CATALOG (BENTO CARDS GRID)
          ======================================================== */}
      {activeSection === 'products' && (
        <section className="catalog-main-section">
          {/* Category Filter Tabs (Desktop) */}
          <div className="catalog-category-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`catalog-tab ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => { setSelectedCategory(cat); setCurrentPage(1); }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Combined Category Filter Button (Phone Screen Only) */}
          <div className="mobile-filter-container" ref={filterDropdownRef}>
            <button
              type="button"
              className={`mobile-filter-btn ${mobileFilterOpen ? 'active' : ''} ${selectedCategory !== 'All' ? 'has-active-filter' : ''}`}
              onClick={() => setMobileFilterOpen((prev) => !prev)}
              aria-expanded={mobileFilterOpen}
              aria-label="Filter products by category"
            >
              <div className="mobile-filter-btn-left">
                <span className="mobile-filter-icon">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                </span>
                <span className="mobile-filter-label">Filter</span>
                <span className="mobile-filter-selected-pill">
                  {selectedCategory === 'All' ? 'All' : selectedCategory}
                </span>
              </div>
              <div className="mobile-filter-btn-right">
                {selectedCategory !== 'All' && (
                  <span
                    className="mobile-filter-reset-icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedCategory('All');
                      setCurrentPage(1);
                    }}
                    title="Reset to All"
                    aria-label="Reset Filter"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </span>
                )}
                <svg
                  className={`mobile-filter-chevron ${mobileFilterOpen ? 'rotated' : ''}`}
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </button>

            {/* Filter Selection Dropdown Menu */}
            {mobileFilterOpen && (
              <div className="mobile-filter-dropdown" role="menu">
                <div className="mobile-filter-dropdown-header">
                  <span>Select Category</span>
                  <span className="mobile-filter-count-label">{CATEGORIES.length} categories</span>
                </div>
                <div className="mobile-filter-options-grid">
                  {CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        role="menuitem"
                        className={`mobile-filter-option ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setCurrentPage(1);
                          setMobileFilterOpen(false);
                        }}
                      >
                        <span className="mobile-filter-option-name">{cat}</span>
                        {isSelected && (
                          <span className="mobile-filter-check">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="catalog-loading-state">
              <div className="crimson-spinner" />
              <span>Loading verified products...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="catalog-empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
              </svg>
              <h3>No products found</h3>
              <p>No products matched any search keywords or category filters.</p>
              {(searchQuery || activeSearch) && (
                <button onClick={handleClearSearch} className="catalog-reset-btn">
                  Reset Search Filter
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <div className="products-list-view">
              {paginatedProducts.map((product) => {
                const safeLogo = getSafeImageUrl(product.logo);
                return (
                  <div
                    key={product.id}
                    className="product-list-row"
                    onClick={() => setSelectedProduct(product)}
                  >
                    <div className="product-list-left">
                      {product.logo ? (
                        <img
                          src={safeLogo}
                          alt=""
                          className="product-list-logo"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const sibling = e.currentTarget.parentElement?.querySelector('.product-list-logo-fallback');
                            if (sibling) sibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div
                        className="product-list-logo-fallback"
                        style={{ display: product.logo ? 'none' : 'flex' }}
                      >
                        <LayersIcon size={16} />
                      </div>
                      <span className="product-list-title" title={product.title}>
                        {product.title}
                      </span>
                    </div>

                    <div className="product-list-right">
                      <div className="product-list-ratings">
                        <StarRatingBadge
                          productId={product.id}
                          initialRating={product.averageRating || 5.0}
                          initialCount={product.reviewsCount || 0}
                          onClick={(e) => {
                            e?.stopPropagation?.();
                            setReviewModalProduct(product);
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        className="product-list-details-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProduct(product);
                        }}
                      >
                        <span>Details</span>
                        <ArrowRightIcon size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="products-grid">
              {paginatedProducts.map((product) => {
                const downloadsCount = getProductDownloadCount(product.id, product.downloadCount);
                return (
                  <div key={product.id} className="bento-product-card" onClick={() => setSelectedProduct(product)}>
                    {/* Top Media Frame */}
                    <div className="bento-card-media">
                      <img
                        src={product.image || FALLBACK_POSTER}
                        alt={product.title}
                        referrerPolicy="no-referrer"
                      />
                      <div className="bento-card-badge-row">
                        <span className="bento-category-tag">{product.category}</span>
                        {product.version && <span className="bento-version-tag">v{product.version}</span>}
                      </div>
                    </div>

                    {/* Card Content Body */}
                    <div className="bento-card-body">
                      <div className="bento-card-header">
                        {product.logo ? (
                          <img src={product.logo} alt="" className="bento-app-logo" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="bento-logo-fallback">
                            <LayersIcon size={16} />
                          </div>
                        )}
                        <div className="bento-title-col">
                          <h3 className="bento-product-title">{product.title}</h3>
                          <div className="bento-ratings-row">
                            <StarRatingBadge
                              productId={product.id}
                              initialRating={product.averageRating || 5.0}
                              initialCount={product.reviewsCount || 0}
                              onClick={(e) => {
                                e?.stopPropagation?.();
                                setReviewModalProduct(product);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Developer Attribution Link */}
                      <Link
                        to={'/developer/' + (product.developerUsername || 'upperstore')}
                        className="bento-developer-link"
                        onClick={(e) => e.stopPropagation()}
                        title={'View @' + (product.developerUsername || 'upperstore') + ' Profile'}
                      >
                        <VipAvatar
                          src={product.developerAvatar || '/logo.png'}
                          alt={product.developerName || 'Upper Store'}
                          plan={getProductDevTier(product)}
                          size="sm"
                          fallbackSeed={product.developerUsername || product.developerEmail || product.developerName || 'upperstore'}
                        />
                        <span className="bento-dev-name">
                          {product.developerName || 'Upper Store'}
                        </span>
                        <VipFlairBadge plan={getProductDevTier(product)} compact={true} />
                      </Link>

                      <p className="bento-product-desc">{product.description}</p>

                      {/* Card Footer: Downloads and CTA */}
                      <div className="bento-card-footer">
                        <div className="bento-meta-left">
                          <span className="bento-price-tag">{product.price || 'Free'}</span>
                          <span className="bento-downloads-chip">
                            {formatDownloadCount(downloadsCount)} Downloads
                          </span>
                        </div>
                        <button
                          type="button"
                          className="bento-action-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedProduct(product);
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="catalog-pagination-wrap">
              <div className="pagination-info">
                Showing <strong>{startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, totalItems)}</strong> of <strong>{totalItems}</strong> products
              </div>

              <div className="pagination-nav-bar">
                <button
                  type="button"
                  className="pagination-btn nav-btn prev"
                  disabled={activePage <= 1}
                  onClick={() => {
                    setCurrentPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                >
                  Previous
                </button>

                <div className="pagination-page-pills">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      className={`page-pill-btn ${activePage === pageNum ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        window.scrollTo({ top: 300, behavior: 'smooth' });
                      }}
                    >
                      {pageNum}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="pagination-btn nav-btn next"
                  disabled={activePage >= totalPages}
                  onClick={() => {
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ========================================================
          SECTION 2: PRODUCT VIDEO DEMOS (SHIFTED FROM HOME)
          ======================================================== */}
      {activeSection === 'videos' && (
        <section className="catalog-videos-section">
          <div className="videos-section-header">
            <span className="videos-eyebrow">Visual Telemetry & Walkthroughs</span>
            <h2>Product <span className="text-crimson-glow">Video Demos</span></h2>
            <p>Watch hands-on video walkthroughs, live feature demonstrations, and UI animations of our software and digital assets.</p>
          </div>

          {videoList.length === 0 ? (
            <div className="catalog-empty-state">
              <h3>No Product Video Demos Uploaded Yet</h3>
              <p>Add YouTube video URLs for your products in the Admin Dashboard to feature interactive walkthroughs here.</p>
            </div>
          ) : (
            <div className="video-showcase-container">
              {/* Main Active Video Player */}
              <div className="main-video-player-card">
                <div className="video-viewport-wrapper">
                  {playerSrc.type === 'iframe' ? (
                    <iframe
                      key={currentVideo.id}
                      src={playerSrc.src}
                      title={currentVideo.title}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      className="featured-video-element"
                      style={{ border: 'none', width: '100%', height: '100%', minHeight: '380px' }}
                    />
                  ) : (
                    <video
                      key={currentVideo.id}
                      src={playerSrc.src}
                      poster={safePoster}
                      controls
                      autoPlay
                      muted
                      loop
                      playsInline
                      className="featured-video-element"
                    />
                  )}
                  <div className="video-badge-tag">{currentVideo.badge}</div>
                </div>

                <div className="video-details-panel">
                  <div className="video-meta-header">
                    <span className="video-category-pill">{currentVideo.category}</span>
                    <h3 className="video-title">{currentVideo.title}</h3>
                    <p className="video-desc">{currentVideo.description}</p>
                  </div>

                  <div className="video-features-chips">
                    {currentVideo.features.map((feat, idx) => (
                      <span key={idx} className="video-feature-chip">
                        &bull; {feat}
                      </span>
                    ))}
                  </div>

                  {matchingVideoProduct && (
                    <button
                      type="button"
                      className="btn-crimson-primary"
                      onClick={() => setSelectedProduct(matchingVideoProduct)}
                      style={{ marginTop: '1.2rem', width: 'fit-content' }}
                    >
                      View Product Details & Downloads
                    </button>
                  )}
                </div>
              </div>

              {/* Slidable Video Deck Carousel */}
              {videoList.length > 1 && (
                <div className="video-deck-slider-wrapper">
                  <button
                    type="button"
                    className="deck-scroll-btn deck-scroll-left"
                    onClick={() => scrollDeck('left')}
                    aria-label="Scroll left"
                  >
                    &larr;
                  </button>

                  <div className="video-deck-scroll-track" ref={deckTrackRef}>
                    {videoList.map((vid) => {
                      const isActive = vid.id === (activeVideoId || videoList[0]?.id);
                      return (
                        <div
                          key={vid.id}
                          className={`video-deck-card ${isActive ? 'active' : ''}`}
                          onClick={() => setActiveVideoId(vid.id)}
                        >
                          <div className="deck-thumb-frame">
                            <img
                              src={vid.poster || FALLBACK_POSTER}
                              alt={vid.title}
                              referrerPolicy="no-referrer"
                            />
                            <div className="deck-play-overlay">
                              <span className="play-triangle">&#9658;</span>
                            </div>
                          </div>
                          <div className="deck-card-info">
                            <span className="deck-cat">{vid.category}</span>
                            <h4>{vid.title}</h4>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    className="deck-scroll-btn deck-scroll-right"
                    onClick={() => scrollDeck('right')}
                    aria-label="Scroll right"
                  >
                    &rarr;
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Product Detail Modal Overlay */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={handleCloseProductModal}
        />
      )}

      {/* Product Reviews & User Comments Modal Popup */}
      {reviewModalProduct && (
        <ProductReviewsModal
          product={reviewModalProduct}
          isOpen={!!reviewModalProduct}
          onClose={() => setReviewModalProduct(null)}
        />
      )}
    </div>
  );
};

export default Products;
