import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductReviewsModal from '../components/ProductReviewsModal';
import VipPromoBanner from '../components/VipPromoBanner';
import StarRatingBadge from '../components/StarRatingBadge';
import { getProductDownloadCount, formatDownloadCount } from '../utils/downloadTracker';
import './Products.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  'All',
  'Android Tools',
  'Windows & Desktop',
  'Developer Utilities',
  'Design Assets',
  'Privacy Clean'
];

const renderBadgeIcon = (type) => {
  switch (type) {
    case 'android':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
          <line x1="12" y1="18" x2="12.01" y2="18"></line>
        </svg>
      );
    case 'desktop':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
          <line x1="8" y1="21" x2="16" y2="21"></line>
          <line x1="12" y1="17" x2="12" y2="21"></line>
        </svg>
      );
    case 'dev':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
      );
    case 'design':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
          <circle cx="11" cy="11" r="2"></circle>
        </svg>
      );
    case 'privacy':
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          <polyline points="9 12 11 14 15 10"></polyline>
        </svg>
      );
    default:
      return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
        </svg>
      );
  }
};

const getProductTags = (product) => {
  if (!product || !Array.isArray(product.tags)) return [];
  return product.tags.filter(Boolean).slice(0, 2).map((tag) => {
    const lower = tag.toLowerCase();
    let type = 'general';
    if (lower.includes('android') || lower.includes('apk') || lower.includes('mobile')) type = 'android';
    else if (lower.includes('windows') || lower.includes('exe') || lower.includes('desktop')) type = 'desktop';
    else if (lower.includes('sha') || lower.includes('verified') || lower.includes('tool') || lower.includes('dev')) type = 'dev';
    else if (lower.includes('design') || lower.includes('vector') || lower.includes('asset') || lower.includes('ui')) type = 'design';
    else if (lower.includes('privacy') || lower.includes('offline') || lower.includes('telemetry')) type = 'privacy';

    return { label: tag, className: `badge-${type}`, type };
  });
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [, setRefreshDownloads] = useState(0);

  const loadProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          setProducts(data);
        } else {
          setProducts([]);
        }
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
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const filteredProducts = products.filter((p) => {
    // 1. Category matching aligned to Target Personas
    const catLower = (p.category || '').toLowerCase();
    const titleLower = (p.title || '').toLowerCase();
    const descLower = (p.description || '').toLowerCase();
    const apkLower = (p.apkFile || '').toLowerCase();

    const matchesCategory =
      selectedCategory === 'All' ||
      p.category === selectedCategory ||
      (selectedCategory === 'Android Tools' && (catLower.includes('mobile') || catLower.includes('android') || apkLower.endsWith('.apk'))) ||
      (selectedCategory === 'Windows & Desktop' && (catLower.includes('windows') || catLower.includes('desktop') || catLower.includes('exe') || apkLower.endsWith('.exe'))) ||
      (selectedCategory === 'Developer Utilities' && (catLower.includes('developer') || catLower.includes('tool') || catLower.includes('software') || titleLower.includes('dev') || descLower.includes('api'))) ||
      (selectedCategory === 'Design Assets' && (catLower.includes('design') || catLower.includes('vector') || catLower.includes('asset') || catLower.includes('graphic') || apkLower.endsWith('.zip'))) ||
      (selectedCategory === 'Privacy Clean' && (catLower.includes('privacy') || catLower.includes('offline') || descLower.includes('offline') || descLower.includes('privacy') || !catLower.includes('ad')));
    
    // 2. Word-level description & title search matching
    const queryToUse = activeSearch || searchQuery;
    const searchWords = queryToUse
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    
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

  return (
    <div className="products-container" style={{ zIndex: 1, position: 'relative' }}>
      <header className="products-header">
        <div className="products-header-action-row">
          <span className="products-pill-badge">Official Software Catalog</span>
          <Link to="/about#publish" className="publish-product-btn">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <path d="M12 5v14M5 12h14"/>
            </svg>
            Publish Your Product
          </Link>
        </div>
        <h1>Product <span className="highlight">Catalog</span></h1>
        <p>Explore our curated collection of verified applications, desktop software, and developer assets.</p>

        {/* Search Bar */}
        <form className="catalog-search-form" onSubmit={handleSearchSubmit}>
          <div className="catalog-search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="catalog-search-icon">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="text"
              placeholder="Search by keywords (e.g. mobile, dark mode, particle, gold)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" onClick={handleClearSearch} className="catalog-clear-btn" title="Clear Search">
                ✕
              </button>
            )}
            <button type="submit" className="catalog-search-submit-btn">
              Search
            </button>
          </div>
        </form>
      </header>

      {/* COMPACT VIP PROMO BANNER */}
      <div style={{ maxWidth: '1200px', margin: '0 auto 1.5rem auto' }}>
        <VipPromoBanner compact={true} />
      </div>

      {/* Category Filter Tabs */}
      <div className="catalog-category-bar">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`catalog-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#d4af37' }}>
          Loading products...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="catalog-empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          <h3>No products found</h3>
          <p>No products matched any search keywords in title or description.</p>
          {(searchQuery || activeSearch) && (
            <button onClick={handleClearSearch} className="catalog-reset-btn">
              Reset Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => {
            const downloadsCount = getProductDownloadCount(product.id, product.downloadCount);
            return (
              <div key={product.id} className="product-card">
                <div className="product-image" onClick={() => setSelectedProduct(product)} style={{ cursor: 'pointer' }}>
                  <img
                    src={product.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=500'}
                    alt={product.title}
                    referrerPolicy="no-referrer"
                  />
                  <span className="product-category">{product.category}</span>
                </div>
                <div className="product-info">
                  <div className="product-title-row">
                    {product.logo ? (
                      <img src={product.logo} alt="" className="product-app-logo" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="product-logo-placeholder-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3>{product.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                        {product.version && <span className="catalog-ver-tag">v{product.version}</span>}
                        {/* 5-Star Rating Badge next to version tag */}
                        <StarRatingBadge
                          productId={product.id}
                          initialRating={product.averageRating || 5.0}
                          initialCount={product.reviewsCount || 0}
                          onClick={() => setReviewModalProduct(product)}
                        />
                      </div>
                    </div>
                  </div>
                  {/* Product Custom Tags (Only rendered if added in Admin Panel - Max 2) */}
                  {getProductTags(product).length > 0 && (
                    <div className="product-persona-badges">
                      {getProductTags(product).map((badge, idx) => (
                        <span key={idx} className={`persona-tag ${badge.className}`}>
                          <span className="persona-tag-icon">{renderBadgeIcon(badge.type)}</span>
                          {badge.label}
                        </span>
                      ))}
                    </div>
                  )}
                  <p>{product.description}</p>
                  <div className="product-footer">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span className="product-price">{product.price}</span>
                      <span className="product-downloads-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {formatDownloadCount(downloadsCount)} Downloads
                      </span>
                    </div>
                    <button className="view-btn" onClick={() => setSelectedProduct(product)}>
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Product Detail Modal Overlay */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* Product Reviews & User Comments Modal Popup (Without Background Blur) */}
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
