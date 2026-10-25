import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { recordUserDownload, getProductDownloadCount, formatDownloadCount } from '../utils/downloadTracker';
import TermsAcceptanceModal from './TermsAcceptanceModal';
import StarRatingBadge from './StarRatingBadge';
import ProductReviewsModal from './ProductReviewsModal';
import CheckoutModal from './CheckoutModal';
import VipClubModal from './VipClubModal';
import { CrownIcon, DiamondIcon, SparkleIcon, LockIcon, CheckIcon, ArrowRightIcon, CloseIcon } from './Icons';
import './ProductDetailModal.css';

const ProductDetailModal = ({ product, onClose }) => {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [downloadCount, setDownloadCount] = useState(() => getProductDownloadCount(product?.id, product?.downloadCount));
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState('pro');
  const [vipModalOpen, setVipModalOpen] = useState(false);
  const [feePaid, setFeePaid] = useState(() => localStorage.getItem(`upper_paid_fee_${product?.id}`) === 'true');
  const [copiedSha, setCopiedSha] = useState(false);

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
        const res = await fetch(`${API_BASE}/api/auth/user/status/${encodeURIComponent(user.email)}`);
        if (res.ok) {
          const data = await res.json();
          setIsBanned(Boolean(data.isBanned));
        }
      } catch (err) {}
    };
    checkBanStatus();
  }, [user]);

  const hasUserAcceptedTerms = () => {
    if (!user || !user.email) return false;
    const cleanEmail = user.email.trim().toLowerCase();
    return localStorage.getItem(`upper_terms_accepted_${cleanEmail}`) === 'true';
  };

  const handleDownloadClick = (e) => {
    if (!isLoggedIn) {
      e.preventDefault();
      openAuthModal("Authentication Required: Please sign in to download this application or digital package.");
      return;
    }

    if (isBanned || user?.isBanned) {
      e.preventDefault();
      alert("Account Banned: Downloads and product reviews are restricted. Please submit an appeal on the Contact page.");
      return;
    }

    if (!hasUserAcceptedTerms()) {
      e.preventDefault();
      setTermsModalOpen(true);
      return;
    }

    // Terms already accepted! Track download in database
    recordUserDownload(user?.email || '', product);
  };

  const handleAcceptTerms = () => {
    if (user && user.email) {
      const cleanEmail = user.email.trim().toLowerCase();
      localStorage.setItem(`upper_terms_accepted_${cleanEmail}`, 'true');
    }
    setTermsModalOpen(false);
    recordUserDownload(user?.email || '', product);

    // Trigger download programmatically
    const targetUrl = product.apkFile && product.apkFile !== '#' ? product.apkFile : '/products';
    if (targetUrl && targetUrl !== '#') {
      window.open(targetUrl, '_blank');
    }
  };

  const allImages = product?.images && product.images.length > 0
    ? product.images
    : (product?.image ? [product.image] : []);

  const [activeImage, setActiveImage] = useState(allImages[0] || '');

  useEffect(() => {
    if (allImages.length > 0) setActiveImage(allImages[0]);
  }, [product]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('modalToggle', { detail: true }));
    return () => {
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [onClose]);

  if (!product) return null;

  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop-overlay')) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop-overlay" onClick={handleBackdropClick}>
      <div className="modal-card-container">
        {/* Close Icon */}
        <button className="modal-close-icon" onClick={onClose} aria-label="Close modal">
          <CloseIcon size={16} />
        </button>

        <div className="modal-content-grid">
          {/* LEFT COLUMN: Media Preview & Persona Trust Highlights */}
          <div className="modal-media-column">
            {/* Cover Image with Preserved Aspect Ratio */}
            {activeImage && (
              <div className="modal-cover-frame">
                <img
                  src={activeImage}
                  alt={product.title}
                  className="modal-cover-img"
                  referrerPolicy="no-referrer"
                />
                <span className="modal-category-badge">{product.category}</span>
              </div>
            )}

            {/* Multiple Screenshots Gallery Thumbs */}
            {allImages.length > 1 && (
              <div className="modal-thumbs-row">
                {allImages.map((imgUrl, idx) => (
                  <button
                    key={idx}
                    className={`thumb-btn ${activeImage === imgUrl ? 'active' : ''}`}
                    onClick={() => setActiveImage(imgUrl)}
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
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                    <line x1="12" y1="22.08" x2="12" y2="12"></line>
                  </svg>
                </div>
              )}
              <div>
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
                {Array.isArray(product.tags) && product.tags.filter(Boolean).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginTop: '0.45rem' }}>
                    {product.tags.filter(Boolean).slice(0, 2).map((tag, idx) => (
                      <span key={idx} style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#d4af37',
                        background: 'rgba(212, 175, 55, 0.1)',
                        border: '1px solid rgba(212, 175, 55, 0.3)',
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

            {/* Product Description */}
            {product.description && (
              <div className="modal-description-box">
                <p>{product.description}</p>
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
                        href={isLoggedIn ? product.apkFile : '#'}
                        target={isLoggedIn ? '_blank' : '_self'}
                        rel="noopener noreferrer"
                        download
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
                            {isVip ? 'Free Download (₹0 Platform Fee)' : (isFeeEnforced ? 'Free Download (₹0 Platform Fee)' : 'Free Download (₹0 Fee)')}
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
                              Pro (₹99/mo) &bull; Elite (₹399/yr) &bull; <CrownIcon size={13} /> Gold / <DiamondIcon size={13} /> Purple Badges
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
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
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

            {/* Cryptographic SHA-256 Checksum Box */}
            {product.sha256Checksum && (
              <div className="modal-security-box">
                <div className="security-checksum-row">
                  <span className="checksum-label">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    </svg>
                    SHA-256:
                  </span>
                  <code className="checksum-code" title={product.sha256Checksum}>
                    {product.sha256Checksum.substring(0, 16)}...{product.sha256Checksum.substring(product.sha256Checksum.length - 8)}
                  </code>
                  <button
                    type="button"
                    className="copy-checksum-btn"
                    onClick={() => {
                      navigator.clipboard.writeText(product.sha256Checksum);
                      setCopiedSha(true);
                      setTimeout(() => setCopiedSha(false), 2000);
                    }}
                    title="Copy full cryptographic SHA-256 hash"
                  >
                    {copiedSha ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        Copied <CheckIcon size={12} />
                      </span>
                    ) : (
                      'Copy'
                    )}
                  </button>
                </div>
              </div>
            )}

            {product.releaseNotes && (
              <div className="modal-release-notes">
                <h4>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '0.4rem', verticalAlign: 'middle' }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                  </svg>
                  Release Notes & Specs
                </h4>
                <p>{product.releaseNotes}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ONE-TIME TERMS & CONDITIONS ACCEPTANCE MODAL */}
      <TermsAcceptanceModal
        isOpen={termsModalOpen}
        onAccept={handleAcceptTerms}
        onCancel={() => setTermsModalOpen(false)}
      />

      {/* PRODUCT REVIEWS POPUP FROM DETAILS */}
      {reviewModalOpen && (
        <ProductReviewsModal
          product={product}
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
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
};

export default ProductDetailModal;

