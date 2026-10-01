import { useState, useEffect } from 'react';
import ProductDetailModal from '../components/ProductDetailModal';
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
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory ||
      (selectedCategory === 'Mobile App' && p.category?.toLowerCase().includes('mobile')) ||
      (selectedCategory === 'Windows App' && (p.category?.toLowerCase().includes('windows') || p.category?.toLowerCase().includes('exe')));
    
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="products-container" style={{ zIndex: 1, position: 'relative' }}>
      <header className="products-header">
        <span className="products-pill-badge">Official Software Catalog</span>
        <h1>Product <span className="highlight">Catalog</span></h1>
        <p>Explore our curated collection of verified applications, desktop software, and developer assets.</p>

        {/* Search Bar */}
        <div className="catalog-search-box">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="catalog-search-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search products by name or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="catalog-clear-btn">✕</button>
          )}
        </div>
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
          <p>No products match your selected category or search filter.</p>
        </div>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
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
                    <div className="product-logo-placeholder-sm">📦</div>
                  )}
                  <div>
                    <h3>{product.title}</h3>
                    {product.version && <span className="catalog-ver-tag">v{product.version}</span>}
                  </div>
                </div>
                <p>{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">{product.price}</span>
                  <button className="view-btn" onClick={() => setSelectedProduct(product)}>
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product Detail Modal Overlay */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

export default Products;
