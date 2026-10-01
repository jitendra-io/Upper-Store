import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import ProductDetailModal from '../components/ProductDetailModal';
import ProductReviewsModal from '../components/ProductReviewsModal';
import StarRatingBadge from '../components/StarRatingBadge';
import { getProductDownloadCount, formatDownloadCount } from '../utils/downloadTracker';
import './Home.css';
import './Products.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FEATURED_FALLBACKS = [
  {
    id: 'feat-1',
    title: 'Upper Store Mobile Client',
    category: 'Mobile App',
    version: '1.4.2',
    description: 'Official Android application for browsing, updating, and managing your software assets on the go.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=600',
    price: 'Free',
    apkFile: 'https://github.com/YourJITENDRA/Upper-Official/releases',
    features: ['Instant Push Alerts', 'SHA-256 Verified Downloads', 'Dark Mode UI']
  },
  {
    id: 'feat-2',
    title: 'Premium Web UI Kit',
    category: 'Design Asset',
    version: '2.1.0',
    description: 'A dark-mode first, luxury glassmorphism UI system engineered for modern web applications.',
    image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=600',
    price: '$29',
    features: ['React & CSS Modules', 'Figma Source Tokens', 'Responsive Grids']
  },
  {
    id: 'feat-3',
    title: 'React Canvas Animation Engine',
    category: 'Software Tool',
    version: '3.0.1',
    description: 'High-performance interactive particle canvas engine built for silky smooth 60fps web experiences.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=600',
    price: '$15',
    features: ['60 FPS Hardware Accelerated', 'Zero External Dependencies', 'Customizable Emitters']
  }
];

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [totalProductsCount, setTotalProductsCount] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [, setRefreshDownloads] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshDownloads((prev) => prev + 1);
    window.addEventListener('productDownloadsUpdated', handleUpdate);
    return () => window.removeEventListener('productDownloadsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setFeaturedProducts(data.slice(0, 3));
            setTotalProductsCount(data.length);
          } else {
            setFeaturedProducts(FEATURED_FALLBACKS);
            setTotalProductsCount(4);
          }
        } else {
          setFeaturedProducts(FEATURED_FALLBACKS);
          setTotalProductsCount(4);
        }
      } catch (err) {
        setFeaturedProducts(FEATURED_FALLBACKS);
        setTotalProductsCount(4);
      }
    };
    fetchFeatured();
  }, []);

  return (
    <div className="home-wrapper" style={{ zIndex: 1, position: 'relative' }}>
      
      {/* HERO SECTION */}
      <section className="home-hero">
        <div className="hero-badge-pill">
          <span className="hero-badge-dot"></span>
          Official Software & Developer Asset Platform
        </div>
        
        <h1 className="home-hero-title">
          Empowering Creators with <br />
          <span className="gold-gradient-text">Premier Software & Assets</span>
        </h1>
        
        <p className="home-hero-desc">
          Explore cryptographic SHA-256 verified applications, desktop utilities, developer tools, and luxury design systems—crafted with precision for modern creators.
        </p>
        
        <div className="home-hero-actions">
          <Link to="/products" className="home-btn-primary">
            Explore Catalog
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </Link>
          <Link to="/about" className="home-btn-secondary">
            About Us
          </Link>
        </div>

        {/* METRICS STATS RIBBON */}
        <div className="home-stats-ribbon">
          <div className="stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-label">Verified Releases</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-card">
            <span className="stat-number">99.9%</span>
            <span className="stat-label">System Uptime</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-card">
            <span className="stat-number">ImageKit</span>
            <span className="stat-label">Global CDN Engine</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-card">
            <span className="stat-number">SHA-256</span>
            <span className="stat-label">Package Protection</span>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS SPOTLIGHT */}
      <section className="home-section featured-section">
        <div className="section-header-center">
          <span className="section-eyebrow">Curated Selection</span>
          <h2>Featured <span className="gold-gradient-text">Product Spotlight</span></h2>
          <p>Hand-picked software releases and essential digital tools ready for instant deployment.</p>
        </div>

        <div className="products-grid">
          {featuredProducts.map((prod) => {
            const downloadsCount = getProductDownloadCount(prod.id, prod.downloadCount);
            return (
              <div key={prod.id} className="product-card">
                <div className="product-image" onClick={() => setSelectedProduct(prod)} style={{ cursor: 'pointer' }}>
                  <img
                    src={prod.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=500'}
                    alt={prod.title}
                  />
                  <span className="product-category">{prod.category}</span>
                </div>
                <div className="product-info">
                  <div className="product-title-row">
                    {prod.logo ? (
                      <img src={prod.logo} alt="" className="product-app-logo" />
                    ) : (
                      <div className="product-logo-placeholder-sm">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        </svg>
                      </div>
                    )}
                    <div>
                      <h3>{prod.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.15rem' }}>
                        {prod.version && <span className="catalog-ver-tag">v{prod.version}</span>}
                        {/* 5-Star Rating Badge next to version */}
                        <StarRatingBadge
                          productId={prod.id}
                          initialRating={prod.averageRating || 5.0}
                          initialCount={prod.reviewsCount || 0}
                          onClick={() => setReviewModalProduct(prod)}
                        />
                      </div>
                    </div>
                  </div>
                  <p>{prod.description}</p>
                  <div className="product-footer">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <span className="product-price">{prod.price}</span>
                      <span className="product-downloads-badge">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '3px' }}>
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="7 10 12 15 17 10"></polyline>
                          <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        {formatDownloadCount(downloadsCount)} Downloads
                      </span>
                    </div>
                    <button className="view-btn" onClick={() => setSelectedProduct(prod)}>
                      Details
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="section-cta-row">
          <Link to="/products" className="view-all-link-btn">
            View Complete Product Catalog ({totalProductsCount} {totalProductsCount === 1 ? 'Item' : 'Items'}) ➔
          </Link>
        </div>
      </section>

      {/* CORE PLATFORM PILLARS */}
      <section className="home-section pillars-section">
        <div className="section-header-center">
          <span className="section-eyebrow">Technical Excellence</span>
          <h2>Built for Speed, <span className="gold-gradient-text">Security & Elegance</span></h2>
          <p>Our infrastructure guarantees high availability, cryptographic integrity, and zero latency.</p>
        </div>

        <div className="pillars-grid">
          <div className="pillar-card">
            <div className="pillar-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
              </svg>
            </div>
            <h3>High-Speed CDN Mirroring</h3>
            <p>Visual assets and branding media are optimized dynamically via global ImageKit CDN edge locations for sub-millisecond load times.</p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
            </div>
            <h3>Cryptographic Integrity</h3>
            <p>Executable installers (.exe & .apk) are mirrored directly via verified GitHub Release tags with cryptographic SHA-256 verification.</p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>
            <h3>Real-Time Cloud Synchronization</h3>
            <p>Customer inquiries and support messages are synchronized in real time via encrypted Firebase Firestore databases to ensure fast inbox response.</p>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 8l4 4-4 4M8 12h8"></path>
              </svg>
            </div>
            <h3>Luxury Glassmorphism Aesthetic</h3>
            <p>Designed with an Antique Gold visual design system, high-contrast dark modes, and subtle interactive micro-animations.</p>
          </div>
        </div>
      </section>

      {/* OFFICIAL BRAND SHOWCASE CARD */}
      <section className="home-section brand-showcase-section">
        <div className="brand-logo-showcase-box">
          <img src={logoImg} alt="Upper Store Official Logo" className="brand-showcase-logo" />
          <h3 className="brand-showcase-title">UPPER STORE</h3>
          <p className="brand-showcase-subtitle">Verified Software Assets & Developer Enterprise Platform</p>
          <div className="brand-showcase-actions">
            <Link to="/about" className="brand-btn-gold">About Us</Link>
            <Link to="/press" className="brand-btn-outline">Official Press Kit</Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA HERO BANNER */}
      <section className="home-section cta-banner-section">
        <div className="cta-banner-box">
          <h2>Ready to Elevate Your Digital Experience?</h2>
          <p>Browse our catalog of software applications or reach out to our team for custom enterprise solutions.</p>
          <div className="cta-banner-buttons">
            <Link to="/products" className="cta-btn-gold">
              Explore Products Catalog
            </Link>
            <Link to="/contact" className="cta-btn-outline">
              Contact Support & Licensing
            </Link>
          </div>
        </div>
      </section>

      {/* PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      {/* PRODUCT REVIEWS & USER COMMENTS MODAL */}
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

export default Home;
