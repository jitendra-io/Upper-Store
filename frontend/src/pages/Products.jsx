import { useState, useEffect } from 'react';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductReviewsModal from '../components/ProductReviewsModal';
import StarRatingBadge from '../components/StarRatingBadge';
import { getProductDownloadCount, formatDownloadCount } from '../utils/downloadTracker';
import './Products.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FALLBACK_PRODUCTS = [
  {
    id: 'demo-1',
    title: 'Premium Web UI Kit',
    category: 'Design Asset',
    version: '2.1.0',
    description: 'A dark-mode first, glassmorphism UI kit designed for premium applications.',
    image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=500',
    price: '$29',
  },
  {
    id: 'demo-2',
    title: 'Upper Store Mobile App',
    category: 'Mobile App',
    version: '1.4.2',
    description: 'The official mobile client for managing your products and downloads on the go.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=500',
    price: 'Free',
    apkFile: 'https://github.com/YourJITENDRA/Upper-Official/releases',
  },
  {
    id: 'demo-3',
    title: 'React Animation Library',
    category: 'Software Tool',
    version: '3.0.1',
    description: 'A lightweight React library for creating stunning canvas particle effects.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=500',
    price: '$15',
  },
  {
    id: 'demo-4',
    title: 'Golden Icons Pack',
    category: 'Vector Graphics',
    version: '1.0.0',
    description: '200+ beautifully crafted scalable vector icons using the Antique Gold palette.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=500',
    price: '$10',
  }
];

const CATEGORIES = ['All', 'Mobile App', 'Windows App', 'Design Asset', 'Software Tool', 'Vector Graphics'];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [, setRefreshDownloads] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshDownloads((prev) => prev + 1);
    window.addEventListener('productDownloadsUpdated', handleUpdate);
    return () => window.removeEventListener('productDownloadsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setProducts(data);
          } else {
            setProducts(FALLBACK_PRODUCTS);
          }
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
      } catch (err) {
        console.warn('Backend API offline or unreachable, showing demo items:', err);
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    setActiveSearch(searchQuery);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setActiveSearch('');
  };

  const filteredProducts = products.filter((p) => {
    // 1. Category matching
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory ||
      (selectedCategory === 'Mobile App' && p.category?.toLowerCase().includes('mobile')) ||
      (selectedCategory === 'Windows App' && (p.category?.toLowerCase().includes('windows') || p.category?.toLowerCase().includes('exe')));
    
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
        <span className="products-pill-badge">Official Software Catalog</span>
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
                  />
                  <span className="product-category">{product.category}</span>
                </div>
                <div className="product-info">
                  <div className="product-title-row">
                    {product.logo ? (
                      <img src={product.logo} alt="" className="product-app-logo" />
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
