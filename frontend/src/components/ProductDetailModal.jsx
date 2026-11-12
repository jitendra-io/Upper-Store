import { Link } from 'react-router-dom';
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { recordUserDownload, getProductDownloadCount, formatDownloadCount, getSecureDownloadUrl, isDirectDownloadFile, getProductDownloadFilename } from '../utils/downloadTracker';
import TermsAcceptanceModal from './TermsAcceptanceModal';
import StarRatingBadge from './StarRatingBadge';
import ProductReviewsModal from './ProductReviewsModal';
import ProductPermissionsModal from './ProductPermissionsModal';
import CheckoutModal from './CheckoutModal';
import VipClubModal from './VipClubModal';
import { CrownIcon, DiamondIcon, SparkleIcon, LockIcon, CheckIcon, ArrowRightIcon, CloseIcon } from './Icons';
import { VipAvatar, VipFlairBadge } from './VipAvatar';
import { isUserVipActive, getUserVipTier } from '../utils/vipValidator';
import './ProductDetailModal.css';

const parseYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const match = clean.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? match[1] : null;
};

const ProductDetailModal = ({ product, onClose }) => {
  const { user, token, isLoggedIn, openAuthModal, regrantConsent } = useAuth();
  const [downloadCount, setDownloadCount] = useState(() => getProductDownloadCount(product?.id, product?.downloadCount));
  const [termsModalOpen, setTermsModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('terms') === '1';
    }
    return false;
  });
  const [reviewModalOpen, setReviewModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('reviews') === '1';
    }
    return false;
  });
  const [checkoutOpen, setCheckoutOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('checkout') === '1';
    }
    return false;
  });
  const [checkoutPlan, setCheckoutPlan] = useState('pro');
  const [vipModalOpen, setVipModalOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('vip') === '1';
    }
    return false;
  });
  const [feePaid, setFeePaid] = useState(() => localStorage.getItem(`upper_paid_fee_${product?.id}`) === 'true');
  const [copiedSha, setCopiedSha] = useState(false);
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  // Phone and PC browser Back button support and history synchronization
  const modalHistoryKeyRef = useRef(`upper-product-${product?.id || 'modal'}-${Date.now()}`);
  const closedByPopstateRef = useRef(false);
  const submodalPushedRef = useRef(false);
  const activeSubmodalRef = useRef(null);
  const savedScrollYRef = useRef(0);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const getProductDevTier = (prod) => {
    if (!prod) return 'free';
    if (!prod.developerUsername || prod.developerUsername === 'upperstore' || prod.isStoreOfficial) {
      return 'official';
    }
    const rawTier = String(prod.developerTier || '').toLowerCase().trim();
    if (rawTier === 'elite' || rawTier === 'pro') return rawTier;
    if (user && isUserVipActive(user)) {
      const isOwnerProduct =
        (prod.developerId && user.uid && String(prod.developerId) === String(user.uid)) ||
        (prod.developerUsername && user.username && prod.developerUsername.toLowerCase() === user.username.toLowerCase()) ||
        (prod.developerEmail && user.email && prod.developerEmail.toLowerCase() === user.email.toLowerCase()) ||
        (user.email && prod.developerUsername && user.email.split('@')[0].toLowerCase() === prod.developerUsername.toLowerCase());
      if (isOwnerProduct) {
        return getUserVipTier(user);
      }
    }
    return 'free';
  };

  useEffect(() => {
    setFeePaid(localStorage.getItem(`upper_paid_fee_${product?.id}`) === 'true');
  }, [product?.id]);

  useEffect(() => {
    const handleFeePaid = (e) => {
      if (e.detail?.productId === product?.id) {
        setFeePaid(true);
      }
    };
    window.addEventListener('downloadFeePaid', handleFeePaid);
    return () => window.removeEventListener('downloadFeePaid', handleFeePaid);
  }, [product?.id]);

  useEffect(() => {
    if (product?.id) {
      setDownloadCount(getProductDownloadCount(product.id, product.downloadCount));
    }
  }, [product]);

  useEffect(() => {
    const handleUpdate = () => {
      if (product?.id) {
        setDownloadCount(getProductDownloadCount(product.id, product.downloadCount));
      }
    };
    window.addEventListener('productDownloadsUpdated', handleUpdate);
    return () => window.removeEventListener('productDownloadsUpdated', handleUpdate);
  }, [product]);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [feeSettings, setFeeSettings] = useState({
    enabled: true,
    amount: 19,
    loaded: false,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchFeeSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/platform-fee`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setFeeSettings({
              enabled: data.enabled !== false,
              amount: typeof data.amount === 'number' ? data.amount : 19,
              loaded: true,
            });
          }
        }
      } catch (e) {
        // Fallback remains enabled: true, amount: 19
      }
    };
    fetchFeeSettings();

    const handleFeeSettingsUpdated = (e) => {
      if (e.detail) {
        setFeeSettings({
          enabled: e.detail.enabled !== false,
          amount: typeof e.detail.amount === 'number' ? e.detail.amount : 19,
          loaded: true,
        });
      } else {
        fetchFeeSettings();
      }
    };
    window.addEventListener('platformFeeUpdated', handleFeeSettingsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener('platformFeeUpdated', handleFeeSettingsUpdated);
    };
  }, [API_BASE]);

  const [isBanned, setIsBanned] = useState(Boolean(user?.isBanned));

  useEffect(() => {
    if (!user || !user.email) {
      setIsBanned(false);
      return;
    }
    setIsBanned(Boolean(user.isBanned));
    const checkBanStatus = async () => {
      try {
        const activeToken = token || localStorage.getItem('upper_user_token');
        const res = await fetch(`${API_BASE}/api/auth/user/status/${encodeURIComponent(user.email)}`, {
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setIsBanned(Boolean(data.isBanned));
        }
      } catch (err) {}
    };
    checkBanStatus();
  }, [user]);

  const isConsentWithdrawn = Boolean(user && user.consentStatus === 'withdrawn');

  const hasUserAcceptedTerms = () => {
    if (!user || !user.email) return false;
    if (user.consentStatus === 'withdrawn') return false;
    const cleanEmail = user.email.trim().toLowerCase();
    return localStorage.getItem(`upper_terms_accepted_${cleanEmail}`) === 'true';
  };

  const handleDownloadClick = (e) => {
    if (!isLoggedIn) {
      if (e) e.preventDefault();
      openAuthModal("Authentication Required: Please sign in to download this application or digital package.");
      return;
    }

    if (isBanned || user?.isBanned) {
      if (e) e.preventDefault();
      alert("Account Banned: Downloads and product reviews are restricted. Please submit an appeal on the Contact page.");
      return;
    }

    if (!hasUserAcceptedTerms() || isConsentWithdrawn) {
      if (e) e.preventDefault();
      setTermsModalOpen(true);
      return;
    }

    // Terms already accepted and consent active! Track download in database
    recordUserDownload(user?.email || '', product);
  };

  const handleAcceptTerms = async () => {
    try {
      if (isConsentWithdrawn && regrantConsent) {
        await regrantConsent();
      }
    } catch (err) {
      console.error('Failed to re-grant consent:', err);
    }
    if (user && user.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      localStorage.setItem(`upper_terms_accepted_${cleanEmail}`, 'true');
    }
    setTermsModalOpen(false);
    recordUserDownload(user?.email || '', product);

    // Trigger download programmatically via Cloudflare Edge Proxy
    const targetUrl = getSecureDownloadUrl(product);
    if (targetUrl && targetUrl !== '#') {
      window.location.href = targetUrl;
    }
  };

  const allImages = product?.images && product.images.length > 0
    ? product.images
    : (product?.image ? [product.image] : []);

  const ytVideoId = parseYouTubeVideoId(product?.videoUrl);
  const [activeImage, setActiveImage] = useState(allImages[0] || '');
  const [activeMediaMode, setActiveMediaMode] = useState('image');

  useEffect(() => {
    setActiveMediaMode('image');
    if (allImages.length > 0) setActiveImage(allImages[0]);
  }, [product]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modalToggle', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
    };
  }, []);

  const isAnySubmodalOpen = Boolean(permissionsModalOpen || reviewModalOpen || termsModalOpen || checkoutOpen || vipModalOpen);

  // Keep active submodal ref in sync for event listeners
  useEffect(() => {
    activeSubmodalRef.current = {
      permissions: permissionsModalOpen,
      reviews: reviewModalOpen,
      terms: termsModalOpen,
      checkout: checkoutOpen,
      vip: vipModalOpen,
    };
  }, [permissionsModalOpen, reviewModalOpen, termsModalOpen, checkoutOpen, vipModalOpen]);

  // Manage nested sub-modal history entries so back button closes top-most sub-modal first
  useEffect(() => {
    if (isAnySubmodalOpen && !submodalPushedRef.current) {
      submodalPushedRef.current = true;
      window.history.pushState(
        { upperModal: 'product-submodal', parentKey: modalHistoryKeyRef.current },
        ''
      );
    } else if (!isAnySubmodalOpen && submodalPushedRef.current) {
      submodalPushedRef.current = false;
      if (window.history.state?.upperModal === 'product-submodal') {
        window.__upperIgnoreNextPopState = true;
        window.history.back();
        setTimeout(() => {
          window.__upperIgnoreNextPopState = false;
        }, 150);
      }
    }
  }, [isAnySubmodalOpen]);

  // Main modal history entry, phone/PC popstate listener, and page scroll preservation
  useEffect(() => {
    const currentY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop || 0;
    savedScrollYRef.current = currentY;

    window.history.pushState(
      { upperModal: 'product-detail', key: modalHistoryKeyRef.current, productId: product?.id },
      ''
    );

    const handlePopState = () => {
      if (window.__upperIgnoreNextPopState) {
        return;
      }

      const activeSubs = activeSubmodalRef.current;
      if (activeSubs && (activeSubs.permissions || activeSubs.reviews || activeSubs.terms || activeSubs.checkout || activeSubs.vip)) {
        submodalPushedRef.current = false;
        if (activeSubs.terms) setTermsModalOpen(false);
        else if (activeSubs.permissions) setPermissionsModalOpen(false);
        else if (activeSubs.reviews) setReviewModalOpen(false);
        else if (activeSubs.checkout) setCheckoutOpen(false);
        else if (activeSubs.vip) setVipModalOpen(false);
        return;
      }

      closedByPopstateRef.current = true;
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      if (!closedByPopstateRef.current && window.history.state?.key === modalHistoryKeyRef.current) {
        window.__upperIgnoreNextPopState = true;
        window.history.back();
        setTimeout(() => {
          window.__upperIgnoreNextPopState = false;
        }, 150);
      }

      if (typeof window !== 'undefined' && typeof savedScrollYRef.current === 'number') {
        window.scrollTo(0, savedScrollYRef.current);
      }
    };
  }, []);

  // Keyboard navigation (Escape key closes sub-modal first, or closes main modal if no sub-modal open)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (termsModalOpen) {
          setTermsModalOpen(false);
        } else if (permissionsModalOpen) {
          setPermissionsModalOpen(false);
        } else if (reviewModalOpen) {
          setReviewModalOpen(false);
        } else if (checkoutOpen) {
          setCheckoutOpen(false);
        } else if (vipModalOpen) {
          setVipModalOpen(false);
        } else {
          if (onCloseRef.current) {
            onCloseRef.current();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [termsModalOpen, permissionsModalOpen, reviewModalOpen, checkoutOpen, vipModalOpen]);

  // Smooth scroll lock without resetting scroll position
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.touchAction = prevTouchAction;
    };
  }, []);

  if (!product) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop-overlay')) {
      onClose();
    }
  };

  const modalContent = (
    <div className="modal-backdrop-overlay" onClick={handleBackdropClick}>
      <div className="modal-card-container">
        {/* Mobile Drag Indicator */}
        <div className="modal-mobile-drag-bar" onClick={onClose} role="button" tabIndex={0} aria-label="Dismiss modal" />

        {/* Close Icon */}
        <button className="modal-close-icon" onClick={onClose} aria-label="Close modal">
          <CloseIcon size={16} />
        </button>

        <div className="modal-content-grid">
          {/* LEFT COLUMN: Media Preview & Persona Trust Highlights */}
          <div className="modal-media-column">
            {/* Cover Image or Embedded YouTube Video Showcase */}
            {activeMediaMode === 'video' && ytVideoId ? (
              <div className="modal-cover-frame modal-video-frame">
                <iframe
                  src={`https://www.youtube.com/embed/${ytVideoId}?autoplay=1&rel=0`}
                  title={`${product.title} Demo Showcase`}
                  className="modal-cover-video-iframe"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
                <span className="modal-category-badge video-badge">YouTube Showcase</span>
              </div>
            ) : activeImage ? (
              <div className="modal-cover-frame">
                <img
                  src={activeImage}
                  alt={product.title}
                  className="modal-cover-img"
                  referrerPolicy="no-referrer"
                />
                <span className="modal-category-badge">{product.category}</span>
              </div>
            ) : null}

            {/* Multiple Screenshots Gallery Thumbs & Video Showcase Switcher */}
            {(allImages.length > 1 || ytVideoId) && (
              <div className="modal-thumbs-row">
                {ytVideoId && (
                  <button
                    type="button"
                    className={`thumb-btn video-thumb-btn ${activeMediaMode === 'video' ? 'active' : ''}`}
                    onClick={() => setActiveMediaMode('video')}
                    title="Watch YouTube Product Demo Video"
                  >
                    <img
                      src={`https://img.youtube.com/vi/${ytVideoId}/hqdefault.jpg`}
                      alt="Demo Video"
                      referrerPolicy="no-referrer"
                    />
                    <span className="video-thumb-play-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5 3 19 12 5 21 5 3"></polygon>
                      </svg>
                    </span>
                  </button>
                )}
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`thumb-btn ${activeMediaMode === 'image' && activeImage === imgUrl ? 'active' : ''}`}
                    onClick={() => {
                      setActiveMediaMode('image');
                      setActiveImage(imgUrl);
                    }}
                  >
                    <img src={imgUrl} alt={`Screenshot ${idx + 1}`} referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Product Info & Actions */}
          <div className="modal-details-body">
            <div className="modal-header-row">
              {product.logo ? (
                <img src={product.logo} alt="" className="modal-app-logo" referrerPolicy="no-referrer" />
              ) : (
                <div className="modal-logo-placeholder">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
              )}
              <div className="modal-header-info">
                <h2 className="modal-product-title">{product.title}</h2>
                <div className="modal-meta-pills">
                  <span className="pill-item">v{product.version || '1.0.0'}</span>
                  {/* 5-Star Review Rating Button */}
                  <StarRatingBadge
                    productId={product.id}
                    initialRating={product.averageRating || 5.0}
                    initialCount={product.reviewsCount || 0}
                    onClick={() => setReviewModalOpen(true)}
                  />
                  <span className="pill-item download-count-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="7 10 12 15 17 10"></polyline>
                      <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    {formatDownloadCount(downloadCount)} Downloads
                  </span>
                  <span className="pill-item price-pill">{product.price}</span>
                </div>
                {(() => {
                  const devHandle = (product.developerUsername || (product.developerEmail ? product.developerEmail.split('@')[0] : '') || 'upperstore').replace(/^@/, '');
                  return (
                    <Link
                      to={'/developer/' + devHandle}
                      className="modal-developer-attribution clickable-dev-link"
                      title={'View @' + devHandle + ' Profile'}
                      onClick={() => { if (onClose) onClose(); }}
                    >
                      <VipAvatar
                        src={product.developerAvatar || '/logo.png'}
                        alt={'@' + devHandle}
                        plan={getProductDevTier(product)}
                        size="sm"
                        fallbackSeed={devHandle}
                      />
                      <span className="modal-dev-handle-text">@{devHandle}</span>
                      <VipFlairBadge plan={getProductDevTier(product)} compact={true} />
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="dev-redirect-icon" style={{ marginLeft: '4px' }}>
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </Link>
                  );
                })()}
                {Array.isArray(product.tags) && product.tags.filter(Boolean).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
                    {product.tags.filter(Boolean).slice(0, 2).map((tag, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#ff4d4d',
                        background: 'rgba(230, 25, 25, 0.1)',
                        border: '1px solid rgba(230, 25, 25, 0.3)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '6px'
                      }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Account Banned Restriction Banner */}
            {(isBanned || user?.isBanned) && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                color: '#fca5a5',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.65rem'
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                <span><strong>Account Restricted (Banned):</strong> You cannot download software or submit product reviews while your account is banned. Please submit an appeal on the Contact page.</span>
              </div>
            )}

            {/* Action Buttons: Free Download Gate + VIP Upsell + Buy Pro License */}
            {(() => {
              const isVip = Boolean(
                (user?.membership?.plan === 'pro' || user?.membership?.plan === 'elite') &&
                user?.membership?.validUntil &&
                new Date(user.membership.validUntil) > new Date()
              );
              const isFeeEnforced = Boolean(feeSettings.enabled && feeSettings.amount > 0 && !product.isPlatformFeeWaived);
              const feeAmount = feeSettings.amount || 19;
              const isFeeCleared = !isFeeEnforced || isVip || feePaid || (Array.isArray(user?.paidDownloads) && user.paidDownloads.includes(product.id));

              return (
                <div className="modal-actions modal-actions-group">
                  {product.apkFile ? (
                    isFeeCleared ? (
                      /* VIP OR FEE-PAID OR FEE REMOVED: UNRESTRICTED FREE DOWNLOAD */
                      <a
                        href={isLoggedIn && hasUserAcceptedTerms() && !isConsentWithdrawn ? getSecureDownloadUrl(product) : '#'}
                        target={isDirectDownloadFile(product?.apkFile) ? '_self' : '_blank'}
                        rel="noopener noreferrer"
                        download={isDirectDownloadFile(product?.apkFile) ? getProductDownloadFilename(product) : undefined}
                        className="modal-download-link"
                        onClick={handleDownloadClick}
                      >
                        <button className="modal-cta-button animated-download-btn vip-cleared-btn">
                          <span className="btn-icon">
                            {isVip ? (
                              user?.membership?.plan === 'elite' ? <DiamondIcon size={16} /> : <CrownIcon size={16} />
                            ) : (
                              <CheckIcon size={16} />
                            )}
                          </span>
                          <span className="btn-text">
                            {!isDirectDownloadFile(product?.apkFile) ? 'View GitHub Releases' : (isVip ? 'Free Download (₹0 Platform Fee)' : (isFeeEnforced ? 'Free Download (₹0 Platform Fee)' : 'Free Download (₹0 Fee)'))}
                          </span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.4rem', verticalAlign: 'middle' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          <span className="btn-shine"></span>
                        </button>
                      </a>
                    ) : (
                      /* NON-VIP: REQUIRE PLATFORM FEE + VIP UPSELL */
                      <>
                        <button
                          type="button"
                          className="modal-cta-button animated-download-btn fee-pay-btn"
                          onClick={() => {
                            if (!isLoggedIn) {
                              openAuthModal("Authentication Required: Sign in to your account before downloading this application.");
                              return;
                            }
                            setCheckoutPlan('download_fee');
                            setCheckoutOpen(true);
                          }}
                        >
                          <span className="btn-icon">
                            <LockIcon size={16} />
                          </span>
                          <span className="btn-text">Download (₹{feeAmount} Platform Fee)</span>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0.4rem', verticalAlign: 'middle' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          <span className="btn-shine"></span>
                        </button>

                        {/* UPSELL: GET ₹0 FEE ON ALL DOWNLOADS */}
                        <div className="fee-vip-upsell-box" onClick={() => setVipModalOpen(true)}>
                          <div className="upsell-badge">
                            <SparkleIcon size={12} style={{ marginRight: '4px' }} /> UPPER VIP CLUB
                          </div>
                          <div className="upsell-body">
                            <div className="upsell-title">
                              <span>Get <strong>₹0 Platform Fee</strong> on ALL downloads</span>
                              <span className="upsell-arrow">
                                <ArrowRightIcon size={14} />
                              </span>
                            </div>
                            <span className="upsell-desc" style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                              Pro (₹99/mo) &bull; Elite (₹399/yr) &bull; <CrownIcon size={13} /> Yellow &amp; White Ring / <DiamondIcon size={13} /> Crimson &amp; White Ring
                            </span>
                          </div>
                        </div>
                      </>
                    )
                  ) : (
                    <button className="modal-cta-button animated-download-btn" onClick={handleDownloadClick}>
                      <span className="btn-text">Get Now — {product.price}</span>
                      <span className="btn-shine"></span>
                    </button>
                  )}

                  {/* Buy Pro License Button - Only displayed on specific products enabled by Admin */}
                  {Boolean(product.hasLicenseKey) && (
                    <button
                      type="button"
                      className="buy-pro-license-btn"
                      onClick={() => {
                        if (!isLoggedIn) {
                          openAuthModal("Sign in to your account to purchase and register your Pro License certificate.");
                          return;
                        }
                        setCheckoutPlan('pro');
                        setCheckoutOpen(true);
                      }}
                      title="Unlock commercial rights, unlimited exports, and cryptographically verified key"
                    >
                      <div className="pro-btn-content">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                        <span className="pro-btn-text">Buy Pro License</span>
                      </div>
                      <span className="pro-price-tag">
                        {product.licensePrice || (product.price && !product.price.toLowerCase().includes('free') ? product.price : '$19')}
                      </span>
                      <span className="btn-shine"></span>
                    </button>
                  )}
                </div>
              );
            })()}

            {/* Product Description */}
            {product.description && (
              <div className="modal-section-card modal-description-box">
                <div className="section-card-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>Overview</span>
                </div>
                <p>{product.description}</p>
              </div>
            )}

            {/* Release Notes & Specs */}
            {product.releaseNotes && (
              <div className="modal-section-card modal-release-notes">
                <div className="section-card-header">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  <span>Release Notes & Specs</span>
                </div>
                <p>{product.releaseNotes}</p>
              </div>
            )}
          </div>

          {/* PRE-FLIGHT SECURITY & ARCHITECTURE AUDIT CARD */}
          {(product.sha256Checksum || product.securityDetails) && (
            <div className="modal-security-card">
              {product.securityDetails && (
                <>
                  <div className="sec-card-header">
                    <div className="sec-card-title">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                      </svg>
                      <span>Pre-Flight Security Audit</span>
                    </div>
                    <span className="sec-card-score">
                      {product.securityDetails.securityScore || 100}/100 Clean
                    </span>
                  </div>

                  <div className="sec-specs-grid">
                    <div className="sec-spec-item">
                      <span className="sec-spec-label">File Size</span>
                      <span className="sec-spec-val">{product.securityDetails.fileSize || 'Verified'}</span>
                    </div>
                    <div className="sec-spec-item">
                      <span className="sec-spec-label">Target OS</span>
                      <span className="sec-spec-val">{product.securityDetails.platform || 'Native'}</span>
                    </div>
                    <div className="sec-spec-item">
                      <span className="sec-spec-label">Inspection</span>
                      <span className="sec-spec-val" title={product.securityDetails.verifiedMethod || 'Upper Store Edge'}>
                        {product.securityDetails.verifiedMethod || 'Edge Range'}
                      </span>
                    </div>
                  </div>

                  {Array.isArray(product.securityDetails.badges) && product.securityDetails.badges.length > 0 && (
                    <div className="sec-badges-row">
                      {product.securityDetails.badges.map((b, idx) => (
                        <span key={idx} className="sec-badge-chip">
                          <CheckIcon size={11} />
                          {b}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Declared Permissions Button */}
                  {Array.isArray(product.securityDetails.permissions) && product.securityDetails.permissions.length > 0 && (
                    <button
                      type="button"
                      className="modal-sec-permissions-trigger-btn"
                      onClick={() => setPermissionsModalOpen(true)}
                      title="Open declared runtime permissions"
                    >
                      <div className="perm-trigger-left">
                        <div className="perm-trigger-icon-wrap">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                        </div>
                        <span className="perm-trigger-text">Declared Permissions</span>
                        <span className="perm-trigger-count-badge">
                          {product.securityDetails.permissions.length}
                        </span>
                      </div>
                      <div className="perm-trigger-right">
                        <span className="perm-trigger-action-text">Review</span>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </div>
                    </button>
                  )}
                </>
              )}

              {/* Cryptographic SHA-256 Checksum Row */}
              {product.sha256Checksum && (
                <div className="sec-checksum-row">
                  <div className="sec-checksum-left">
                    <span className="sec-checksum-label">SHA-256</span>
                    <code className="sec-checksum-code" title={product.sha256Checksum}>
                      {product.sha256Checksum.substring(0, 12)}...{product.sha256Checksum.substring(product.sha256Checksum.length - 8)}
                    </code>
                  </div>
                  <button
                    type="button"
                    className="sec-checksum-copy-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(product.sha256Checksum);
                      setCopiedSha(true);
                      setTimeout(() => setCopiedSha(false), 2000);
                    }}
                    title="Copy full cryptographic SHA-256 hash"
                  >
                    {copiedSha ? 'Copied' : 'Copy'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ONE-TIME TERMS & CONDITIONS ACCEPTANCE MODAL */}
      <TermsAcceptanceModal
        isOpen={termsModalOpen}
        isConsentWithdrawn={isConsentWithdrawn}
        onAccept={handleAcceptTerms}
        onCancel={() => setTermsModalOpen(false)}
        onClose={() => setTermsModalOpen(false)}
      />

      {/* PRODUCT REVIEWS POPUP FROM DETAILS */}
      {reviewModalOpen && (
        <ProductReviewsModal
          product={product}
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
        />
      )}

      {/* PRODUCT DECLARED PERMISSIONS POPUP FROM DETAILS */}
      {permissionsModalOpen && (
        <ProductPermissionsModal
          product={product}
          isOpen={permissionsModalOpen}
          onClose={() => setPermissionsModalOpen(false)}
        />
      )}

      {/* CHECKOUT MODAL: BUY PRO LICENSE OR PAY PLATFORM FEE */}
      {checkoutOpen && (
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          product={product}
          plan={checkoutPlan}
          platformFeeAmount={feeSettings.amount}
        />
      )}

      {/* VIP CLUB SUBSCRIPTION MODAL */}
      {vipModalOpen && (
        <VipClubModal
          isOpen={vipModalOpen}
          onClose={() => setVipModalOpen(false)}
        />
      )}
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default ProductDetailModal;

