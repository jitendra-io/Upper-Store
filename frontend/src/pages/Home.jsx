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
    apkFile: 'https://github.com/Upper-Official/Store-Releases/releases',
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

const PRODUCT_VIDEOS = [
  {
    id: 'vid-1',
    productId: 'feat-1',
    title: 'Upper Store Mobile Client Walkthrough',
    category: 'Mobile App',
    badge: '4K App Demo',
    duration: '0:45',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-software-developer-working-on-code-41551-large.mp4',
    poster: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=800',
    description: 'Experience real-time direct downloads, SHA-256 integrity verification, and instant push updates in action.',
    features: ['Direct APK Installation', 'Dark Gold Interface', 'Real-Time Sync']
  },
  {
    id: 'vid-2',
    productId: 'feat-2',
    title: 'Luxury Glassmorphism UI Kit Showcase',
    category: 'Design Asset',
    badge: 'UI Design Reel',
    duration: '0:32',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-hands-holding-a-smartphone-with-a-green-screen-41529-large.mp4',
    poster: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=800',
    description: 'A complete tour of modern dark-mode components, CSS blur effects, and gold accent micro-interactions.',
    features: ['React & CSS Modules', 'Glassmorphism Tokens', 'Responsive Grids']
  },
  {
    id: 'vid-3',
    productId: 'feat-3',
    title: 'Canvas Animation Engine 60FPS Test',
    category: 'Software Tool',
    badge: '60FPS Performance',
    duration: '0:50',
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-code-on-a-computer-screen-2512-large.mp4',
    poster: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
    description: 'Live stress-testing of hardware-accelerated particle systems running smoothly at 60 FPS under peak load.',
  }
];

const getVideoPlayerSource = (url) => {
  if (!url || typeof url !== 'string') return { type: 'video', src: '' };
  const clean = url.trim();

  // 1. YouTube link
  const ytMatch = clean.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&controls=1&rel=0`
    };
  }

  // 2. Google Drive video
  const driveMatch = clean.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
  if (driveMatch && driveMatch[1]) {
    return {
      type: 'iframe',
      src: `https://drive.google.com/file/d/${driveMatch[1]}/preview`
    };
  }

  // 3. Direct Google Photos Stream or Direct Video File (lh3.googleusercontent.com, video-downloads, .mp4)
  if (clean.includes('lh3.googleusercontent.com') || clean.includes('video-downloads.googleusercontent.com') || clean.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
    return { type: 'video', src: clean };
  }

  // 4. Raw Google Photos share link (photos.app.goo.gl or photos.google.com)
  if (clean.includes('photos.app.goo.gl') || clean.includes('photos.google.com')) {
    return { type: 'gphotos_link', src: clean };
  }

  // 5. Standard Direct MP4 / Video Link
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

const Home = () => {
  const [featuredProducts, setFeaturedProducts] = useState(FEATURED_FALLBACKS);
  const [totalProductsCount, setTotalProductsCount] = useState(4);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [reviewModalProduct, setReviewModalProduct] = useState(null);
  const [activeVideoId, setActiveVideoId] = useState(PRODUCT_VIDEOS[0].id);
  const [, setRefreshDownloads] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshDownloads((prev) => prev + 1);
    window.addEventListener('productDownloadsUpdated', handleUpdate);
    return () => window.removeEventListener('productDownloadsUpdated', handleUpdate);
  }, []);

  useEffect(() => {
    const fetchCatalogProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setTotalProductsCount(data.length);
            setFeaturedProducts(data.slice(0, 3));
          } else {
            setFeaturedProducts(FEATURED_FALLBACKS);
          }
        }
      } catch (err) {
        setTotalProductsCount(4);
        setFeaturedProducts(FEATURED_FALLBACKS);
      }
    };
    fetchCatalogProducts();
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
                    referrerPolicy="no-referrer"
                  />
                  <span className="product-category">{prod.category}</span>
                </div>
                <div className="product-info">
                  <div className="product-title-row">
                    {prod.logo ? (
                      <img src={prod.logo} alt="" className="product-app-logo" referrerPolicy="no-referrer" />
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

      {/* PRODUCT VIDEO SHOWCASE & VISUAL EXPERIENCE */}
      <section className="home-section video-showcase-section">
        <div className="section-header-center">
          <span className="section-eyebrow">Visual Experience</span>
          <h2>Product <span className="gold-gradient-text">Video Demos</span></h2>
          <p>Watch hands-on video walkthroughs, live feature demonstrations, and UI animations of our software and digital assets.</p>
        </div>

        <div className="video-showcase-container">
          {/* Main Active Video Player */}
          {(() => {
            // Dynamic video list (uses admin-defined videoUrl from products catalog if available)
            const customVideoProducts = featuredProducts.filter((p) => p.videoUrl && p.videoUrl.trim() !== '');
            let videoList = PRODUCT_VIDEOS;

            if (customVideoProducts.length > 0) {
              const customList = customVideoProducts.map((p) => ({
                id: `custom-vid-${p.id}`,
                productId: p.id,
                title: `${p.title} - Video Demo`,
                category: p.category || 'Product Showcase',
                badge: 'Official Demo',
                duration: 'Demo Reel',
                videoUrl: p.videoUrl,
                hasCustomPoster: Boolean(p.videoPoster && p.videoPoster.trim() !== ''),
                poster: (p.videoPoster && p.videoPoster.trim() !== '') ? p.videoPoster : '',
                description: p.description || 'Watch hands-on video demonstration of this software package.',
                features: ['SHA-256 Verified', p.version ? `v${p.version}` : 'Latest Release', 'Direct Download Available']
              }));

              if (customList.length < 3) {
                PRODUCT_VIDEOS.forEach((fallback) => {
                  if (customList.length < 3 && !customList.some((v) => v.category === fallback.category)) {
                    customList.push(fallback);
                  }
                });
              }
              videoList = customList;
            }

            const currentVideo = videoList.find((v) => v.id === activeVideoId) || videoList[0];
            const matchingProduct = featuredProducts.find((p) => p.id === currentVideo.productId || (p.title && p.title.toLowerCase().includes(currentVideo.category.toLowerCase()))) || featuredProducts[0];
            const playerSrc = getVideoPlayerSource(currentVideo.videoUrl);
            const safePoster = getSafeImageUrl(currentVideo.poster);

            return (
              <div className="main-video-player-card">
                <div className="video-viewport-wrapper">
                  {playerSrc.type === 'gphotos_link' ? (
                    <div className="gphotos-card-overlay">
                      <img src={safePoster} alt={currentVideo.title} className="gphotos-poster-img" />
                      <div className="gphotos-card-body">
                        <div className="gphotos-icon-badge">
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                        <h4>Google Photos Video Demo</h4>
                        <p>Click below to stream the official high-resolution product demo video directly on Google Photos.</p>
                        <a href={playerSrc.src} target="_blank" rel="noopener noreferrer" className="gphotos-open-btn">
                          <span>Watch Video on Google Photos</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '6px' }}>
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </a>
                      </div>
                    </div>
                  ) : playerSrc.type === 'iframe' ? (
                    <iframe
                      key={currentVideo.id}
                      src={playerSrc.src}
                      title={currentVideo.title}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                      className="featured-video-element"
                      style={{ border: 'none', width: '100%', height: '100%', minHeight: '340px' }}
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
                      referrerPolicy="no-referrer"
                      className="featured-video-element"
                    />
                  )}
                  <div className="video-badge-tag">{currentVideo.badge}</div>
                  <div className="video-duration-tag">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    {currentVideo.duration}
                  </div>
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
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        {feat}
                      </span>
                    ))}
                  </div>

                  {matchingProduct && (
                    <button className="video-action-btn" onClick={() => setSelectedProduct(matchingProduct)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                      View Product Details & Downloads
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Video Selector Thumbnails Deck */}
          <div className="video-deck-grid">
            {(() => {
              const customVideoProducts = featuredProducts.filter((p) => p.videoUrl && p.videoUrl.trim() !== '');
              let videoList = PRODUCT_VIDEOS;

              if (customVideoProducts.length > 0) {
                const customList = customVideoProducts.map((p) => ({
                  id: `custom-vid-${p.id}`,
                  productId: p.id,
                  title: `${p.title} - Video Demo`,
                  category: p.category || 'Product Showcase',
                  badge: 'Official Demo',
                  duration: 'Demo Reel',
                  videoUrl: p.videoUrl,
                  hasCustomPoster: Boolean(p.videoPoster && p.videoPoster.trim() !== ''),
                  poster: (p.videoPoster && p.videoPoster.trim() !== '') ? p.videoPoster : '',
                  description: p.description || 'Watch hands-on video demonstration of this software package.',
                  features: ['SHA-256 Verified', p.version ? `v${p.version}` : 'Latest Release', 'Direct Download Available']
                }));

                if (customList.length < 3) {
                  PRODUCT_VIDEOS.forEach((fallback) => {
                    if (customList.length < 3 && !customList.some((v) => v.category === fallback.category)) {
                      customList.push(fallback);
                    }
                  });
                }
                videoList = customList;
              }

              const currentActiveId = videoList.find((v) => v.id === activeVideoId) ? activeVideoId : videoList[0]?.id;

              return videoList.map((vid) => {
                const isActive = vid.id === currentActiveId;
                const safeDeckPoster = getSafeImageUrl(vid.poster);
                const deckPlayerSrc = getVideoPlayerSource(vid.videoUrl);
                const useVideoFrame = deckPlayerSrc.type === 'video' && !vid.hasCustomPoster;

                return (
                  <div
                    key={vid.id}
                    className={`video-deck-card ${isActive ? 'active' : ''}`}
                    onClick={() => setActiveVideoId(vid.id)}
                  >
                    <div className="deck-thumb-frame">
                      {useVideoFrame ? (
                        <video
                          src={`${deckPlayerSrc.src}#t=0.5`}
                          preload="metadata"
                          muted
                          playsInline
                          referrerPolicy="no-referrer"
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
                        />
                      ) : (
                        <img
                          src={safeDeckPoster}
                          alt={vid.title}
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_POSTER;
                          }}
                        />
                      )}
                      <div className="deck-play-overlay">
                        <div className="play-icon-circle">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                        </div>
                      </div>
                      <span className="deck-duration">{vid.duration}</span>
                    </div>
                    <div className="deck-card-info">
                      <span className="deck-cat">{vid.category}</span>
                      <h4>{vid.title}</h4>
                    </div>
                  </div>
                );
              });
            })()}
          </div>
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
