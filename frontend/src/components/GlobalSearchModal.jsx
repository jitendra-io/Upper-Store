import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { VipAvatar } from './VipAvatar';
import { formatDownloadCount } from '../utils/downloadTracker';
import './GlobalSearchModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const RECENT_SEARCHES_KEY = 'upper_recent_searches';

const GlobalSearchModal = ({ isOpen, onClose, onSelectProduct }) => {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const resultsContainerRef = useRef(null);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ products: [], developers: [] });
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentSearches, setRecentSearches] = useState(() => {
    try {
      const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save a search term to localStorage
  const saveRecentSearch = useCallback((term) => {
    const clean = String(term || '').trim();
    if (!clean || clean.length < 2) return;

    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => item.toLowerCase() !== clean.toLowerCase());
      const updated = [clean, ...filtered].slice(0, 6);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  }, []);

  // Clear all recent searches
  const clearRecentSearches = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (_) {}
  };

  // Lock body & document scroll while search modal is active (prevents background sliding)
  useEffect(() => {
    if (!isOpen) return;

    const scrollY = window.scrollY || window.pageYOffset || 0;
    const prevBodyOverflow = document.body.style.overflow;
    const prevDocOverflow = document.documentElement.style.overflow;
    const prevBodyPosition = document.body.style.position;
    const prevBodyTop = document.body.style.top;
    const prevBodyWidth = document.body.style.width;
    const prevTouchAction = document.body.style.touchAction;

    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.touchAction = 'none';

    // Prevent background touch dragging on touch devices
    const handleTouchMove = (e) => {
      if (!e.target.closest('.search-results-viewport')) {
        e.preventDefault();
      }
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.dispatchEvent(new CustomEvent('modalToggle', { detail: true }));

    // Focus search input on open
    const focusTimer = setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 50);

    return () => {
      document.documentElement.style.overflow = prevDocOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.position = prevBodyPosition;
      document.body.style.top = prevBodyTop;
      document.body.style.width = prevBodyWidth;
      document.body.style.touchAction = prevTouchAction;
      window.scrollTo(0, scrollY);
      window.removeEventListener('touchmove', handleTouchMove);
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
      clearTimeout(focusTimer);
    };
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setResults({ products: [], developers: [] });
      setSelectedIndex(-1);
      setActiveTab('all');
      setLoading(false);
    }
  }, [isOpen]);

  // Debounced search query execution
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setResults({ products: [], developers: [] });
      setLoading(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/search?q=${encodeURIComponent(trimmed)}&type=${activeTab}&limit=12`
        );
        const data = await res.json();
        if (data && data.results) {
          setResults(data.results);
          if (data.totalMatches > 0) {
            saveRecentSearch(trimmed);
          }
        } else {
          setResults({ products: [], developers: [] });
        }
      } catch (err) {
        console.warn('Search query error:', err.message);
        setResults({ products: [], developers: [] });
      } finally {
        setLoading(false);
        setSelectedIndex(-1);
      }
    }, 220);

    return () => clearTimeout(handler);
  }, [query, activeTab, saveRecentSearch]);

  // Combined flat list of selectable items for keyboard navigation
  const flatItems = useMemo(() => {
    const list = [];
    if (activeTab === 'all' || activeTab === 'developers') {
      (results.developers || []).forEach((dev) => list.push({ type: 'developer', data: dev }));
    }
    if (activeTab === 'all' || activeTab === 'products') {
      (results.products || []).forEach((prod) => list.push({ type: 'product', data: prod }));
    }
    return list;
  }, [results, activeTab]);

  // Action on item selection
  const handleItemSelect = useCallback(
    (item) => {
      if (!item) return;
      if (onClose) onClose(true);
      if (item.type === 'developer') {
        navigate(`/developer/${item.data.username}`, { replace: true });
      } else if (item.type === 'product') {
        if (onSelectProduct) {
          onSelectProduct(item.data);
        } else {
          navigate(`/products/${item.data.id}`, { replace: true });
        }
      }
    },
    [navigate, onClose, onSelectProduct]
  );

  // Keyboard navigation listener (ArrowUp, ArrowDown, Enter, Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (flatItems.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1));
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < flatItems.length) {
          e.preventDefault();
          handleItemSelect(flatItems[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, flatItems, selectedIndex, handleItemSelect, onClose]);

  // Auto-scroll focused item into view in results list
  useEffect(() => {
    if (selectedIndex < 0 || !resultsContainerRef.current) return;
    const activeEl = resultsContainerRef.current.querySelector('.search-hit-row.selected');
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const totalMatches = (results.products?.length || 0) + (results.developers?.length || 0);
  const hasTypedQuery = query.trim().length >= 2;

  return (
    <div
      className="global-search-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Global Search"
    >
      <div className="global-search-modal-card">
        {/* TOP SEARCH INPUT BAR */}
        <div className="search-input-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="search-lead-icon">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>

          <input
            ref={inputRef}
            type="text"
            className="search-main-input"
            placeholder="Search software, apps, or developers..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
            spellCheck="false"
          />

          {loading ? (
            <div className="search-spinner" aria-label="Loading search results"></div>
          ) : query ? (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setQuery('');
                if (inputRef.current) inputRef.current.focus();
              }}
              title="Clear search"
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          ) : (
            <button
              type="button"
              className="search-close-btn"
              onClick={onClose}
              title="Close search"
              aria-label="Close search"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* FILTER CATEGORY TABS (Shown when searching) */}
        {hasTypedQuery && (
          <div className="search-filter-tabs">
            <button
              type="button"
              className={`search-tab-pill ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All</span>
              <span className="tab-count-tag">{totalMatches}</span>
            </button>
            <button
              type="button"
              className={`search-tab-pill ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <span>Applications</span>
              <span className="tab-count-tag">{results.products?.length || 0}</span>
            </button>
            <button
              type="button"
              className={`search-tab-pill ${activeTab === 'developers' ? 'active' : ''}`}
              onClick={() => setActiveTab('developers')}
            >
              <span>Developers</span>
              <span className="tab-count-tag">{results.developers?.length || 0}</span>
            </button>
          </div>
        )}

        {/* SEARCH BODY CONTENT */}
        <div className="search-results-viewport" ref={resultsContainerRef}>
          {!hasTypedQuery ? (
            /* EMPTY QUERY STATE: RECENT SEARCHES & SUGGESTIONS */
            <div className="search-suggestions-section">
              {recentSearches.length > 0 && (
                <div className="search-group-block">
                  <div className="search-group-title-row">
                    <span className="group-title-label">Recent Searches</span>
                    <button type="button" className="clear-recents-btn" onClick={clearRecentSearches}>
                      Clear
                    </button>
                  </div>
                  <div className="recent-tags-wrapper">
                    {recentSearches.map((term, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="recent-query-chip"
                        onClick={() => setQuery(term)}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="1 4 1 10 7 10"></polyline>
                          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                        </svg>
                        <span>{term}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="search-intro-banner">
                <div className="intro-icon-circle">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <h4 className="intro-heading">Search Upper Store</h4>
                <p className="intro-subtext">Find applications, developer tools, verified software packages, and creator accounts.</p>
              </div>
            </div>
          ) : totalMatches === 0 && !loading ? (
            /* ZERO RESULTS STATE */
            <div className="search-empty-state">
              <div className="empty-search-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
              </div>
              <p className="empty-main-text">No results found for "{query}"</p>
              <p className="empty-sub-text">Check your spelling or try searching for another app name, creator handle, or category.</p>
            </div>
          ) : (
            /* RESULTS PRESENTATION */
            <div className="search-hits-flow">
              {/* DEVELOPERS SECTION */}
              {(activeTab === 'all' || activeTab === 'developers') && results.developers?.length > 0 && (
                <div className="search-hit-category-group">
                  <div className="category-group-header">
                    <span>Developers</span>
                    <span className="category-count">{results.developers.length}</span>
                  </div>

                  <div className="category-items-list">
                    {results.developers.map((dev) => {
                      const itemIndex = flatItems.findIndex((fi) => fi.type === 'developer' && fi.data.id === dev.id);
                      const isSelected = itemIndex === selectedIndex;

                      return (
                        <div
                          key={`dev-${dev.id}`}
                          className={`search-hit-row developer-hit ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleItemSelect({ type: 'developer', data: dev })}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="hit-avatar-box">
                            <VipAvatar
                              src={dev.avatar}
                              alt={dev.displayName}
                              plan={dev.isOfficial ? 'official' : dev.vipPlan || 'free'}
                              size="md"
                              fallbackSeed={dev.username}
                            />
                          </div>

                          <div className="hit-details-main">
                            <div className="hit-title-line">
                              <span className="hit-title-name">{dev.displayName}</span>
                              <span className="hit-handle-tag">@{dev.username}</span>
                              {dev.isOfficial ? (
                                <span className="hit-official-pill">OFFICIAL</span>
                              ) : dev.isVerified ? (
                                <span className="hit-verified-icon" title="Verified Authentic Developer">
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                    <circle cx="12" cy="12" r="10" fill="#f59e0b" />
                                    <path d="M8.5 12.5L10.5 14.5L15.5 9.5" stroke="#000" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                </span>
                              ) : null}
                            </div>
                            <span className="hit-subtitle-bio">{dev.bio || 'Upper Store Developer'}</span>
                          </div>

                          <div className="hit-meta-stats">
                            <span className="hit-meta-badge">
                              {dev.productsCount} {dev.productsCount === 1 ? 'Product' : 'Products'}
                            </span>
                            {dev.totalDownloads > 0 && (
                              <span className="hit-meta-badge highlight-gold">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ marginRight: '3px' }}>
                                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                  <polyline points="7 10 12 15 17 10"></polyline>
                                  <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                {formatDownloadCount(dev.totalDownloads)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* PRODUCTS SECTION */}
              {(activeTab === 'all' || activeTab === 'products') && results.products?.length > 0 && (
                <div className="search-hit-category-group">
                  <div className="category-group-header">
                    <span>Applications &amp; Tools</span>
                    <span className="category-count">{results.products.length}</span>
                  </div>

                  <div className="category-items-list">
                    {results.products.map((prod) => {
                      const itemIndex = flatItems.findIndex((fi) => fi.type === 'product' && fi.data.id === prod.id);
                      const isSelected = itemIndex === selectedIndex;
                      const displayImg = prod.logo || prod.image || '/logo.png';

                      return (
                        <div
                          key={`prod-${prod.id}`}
                          className={`search-hit-row product-hit ${isSelected ? 'selected' : ''}`}
                          onClick={() => handleItemSelect({ type: 'product', data: prod })}
                          role="button"
                          tabIndex={0}
                        >
                          <div className="hit-app-icon-frame">
                            <img
                              src={displayImg}
                              alt={prod.title}
                              className="hit-app-img"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = '/logo.png';
                              }}
                            />
                          </div>

                          <div className="hit-details-main">
                            <div className="hit-title-line">
                              <span className="hit-title-name">{prod.title}</span>
                              <span className="hit-version-tag">v{prod.version || '1.0.0'}</span>
                              <span className="hit-price-pill">{prod.price || 'Free'}</span>
                            </div>
                            <span className="hit-subtitle-cat">{prod.category} &middot; by @{prod.developerUsername}</span>
                          </div>

                          <div className="hit-meta-stats">
                            <span className="hit-meta-badge highlight-gold">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ marginRight: '3px' }}>
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                              </svg>
                              {formatDownloadCount(prod.downloadCount || 0)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearchModal;

