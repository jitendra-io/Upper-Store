import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, CloseIcon, ArrowRightIcon, LightbulbIcon, AlertTriangleIcon, ShieldOffIcon } from './Icons';
import './UserLicensesModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const UserLicensesModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [licenses, setLicenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState(null);

  const fetchLicenses = async () => {
    if (!user || !user.email) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('upper_user_token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/payments/my-licenses`, { headers });
      if (res.ok) {
        const data = await res.json();
        setLicenses(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.warn('Failed to fetch user licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLicenses();
    }
  }, [isOpen, user]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleBrowseCatalog = () => {
    onClose();
    navigate('/products');
  };

  const modalContent = (
    <div className="license-modal-backdrop" onClick={onClose}>
      <div className="license-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* MODAL HEADER */}
        <div className="license-modal-header">
          <div className="license-modal-title">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2l-2 2m-1-1l-3 3m1 1l-2 2m-1-1l-2 2m-1-1l-2 2m-1-1l-3 3"></path>
              <circle cx="7.5" cy="15.5" r="5.5"></circle>
            </svg>
            <div>
              <h3>My Cryptographic Licenses</h3>
              <span className="license-modal-subtitle">Official Pro Software Certificates & Key Registry</span>
            </div>
          </div>
          <button className="license-close-btn" onClick={onClose} aria-label="Close modal">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="license-modal-body">
          {loading ? (
            <div className="license-loading-state">
              <div className="license-spinner"></div>
              <p>Verifying cryptographic licenses...</p>
            </div>
          ) : licenses.length === 0 ? (
            <div className="license-empty-state">
              <div className="license-empty-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </div>
              <h4>No Active Licenses Found</h4>
              <p>
                Upgrade any application to <strong>Pro</strong> or get the <strong>Upper VIP Pass</strong> to unlock
                cryptographically signed lifetime licenses, priority CDN delivery, and unrestricted commercial usage.
              </p>
              <button className="license-explore-btn" onClick={handleBrowseCatalog} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                Browse Catalog & Pro Apps <ArrowRightIcon size={14} />
              </button>
            </div>
          ) : (
            <div className="license-list-grid">
              {licenses.map((lic) => {
                const isRejected = lic.status === 'rejected' || lic.isPaymentRejection === true;
                const isPending = lic.status === 'pending_verification' || lic.isPaymentPending === true;
                const isCancelled = !isRejected && !isPending && (lic.status === 'cancelled' || lic.isCancelled === true);
                const isExpired = !isRejected && !isPending && !isCancelled && lic.expiresAt && new Date(lic.expiresAt) < new Date();
                const isLifetime = !lic.expiresAt && !isRejected && !isPending;

                let statusLabel = 'VERIFIED';
                let statusClass = 'active';

                if (isRejected) {
                  statusLabel = 'PAYMENT REJECTED';
                  statusClass = 'rejected';
                } else if (isPending) {
                  statusLabel = 'AWAITING APPROVAL';
                  statusClass = 'pending';
                } else if (isCancelled) {
                  statusLabel = 'CANCELLED';
                  statusClass = 'cancelled';
                } else if (isExpired) {
                  statusLabel = 'EXPIRED';
                  statusClass = 'expired';
                }

                const expiryText = isRejected
                  ? `Rejected on ${new Date(lic.rejectedAt || lic.submittedAt || Date.now()).toLocaleDateString()}`
                  : isPending
                  ? `Submitted on ${new Date(lic.submittedAt || Date.now()).toLocaleDateString()}`
                  : isCancelled
                  ? `Subscription Cancelled${lic.cancelledAt ? ` on ${new Date(lic.cancelledAt).toLocaleDateString()}` : ''}`
                  : isExpired
                  ? `Expired on ${new Date(lic.expiresAt).toLocaleDateString()}`
                  : isLifetime
                  ? 'Lifetime License (Never Expires)'
                  : `Valid until ${new Date(lic.expiresAt).toLocaleDateString()}`;

                const handleRetryPayment = () => {
                  onClose();
                  if (lic.productId && lic.productId !== 'upper-vip' && !String(lic.productId).startsWith('upper-vip')) {
                    navigate('/products');
                  } else {
                    navigate('/vip-club');
                  }
                };

                return (
                  <div
                    key={lic.id || lic.licenseKey || lic.paymentId}
                    className={`license-card ${isRejected ? 'is-rejected' : isPending ? 'is-pending' : isCancelled ? 'is-cancelled' : ''} ${isExpired ? 'is-expired' : ''}`}
                  >
                    {/* Card Top: Product Info & Status */}
                    <div className="license-card-header">
                      <div>
                        <h4 className="license-product-name">{lic.productTitle}</h4>
                        <span className="license-order-ref">Order: {lic.orderId || 'Direct'}</span>
                      </div>
                      <div className="license-badges">
                        <span className="license-plan-badge">{lic.plan?.toUpperCase() || 'PRO'}</span>
                        <span className={`license-status-badge ${statusClass}`}>
                          <span className={`status-dot ${statusClass}-dot`}></span>
                          {statusLabel}
                        </span>
                      </div>
                    </div>

                    {/* SPECIAL CASE 1: REJECTED UPI PAYMENT DISPLAY */}
                    {isRejected ? (
                      <div className="license-rejection-box">
                        <div className="rejection-box-header">
                          <span className="rejection-box-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <AlertTriangleIcon size={14} style={{ color: '#ef4444' }} />
                            <span>Payment Verification Unsuccessful</span>
                          </span>
                          <span className="rejection-date-tag">
                            {lic.rejectedAt ? new Date(lic.rejectedAt).toLocaleDateString() : 'Recent'}
                          </span>
                        </div>

                        {/* HIGH-VISIBILITY REJECTION REASON CALLOUT */}
                        <div className="rejection-reason-callout">
                          <span className="rejection-reason-label">
                            <ShieldOffIcon size={13} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                            Admin Verification Note & Reason:
                          </span>
                          <p className="rejection-reason-text">
                            "{lic.rejectReason || 'Payment could not be verified in bank records. Please verify your 12-digit UTR.'}"
                          </p>
                        </div>

                        {/* REJECTION TRANSACTION METADATA */}
                        <div className="rejection-details-grid">
                          <div className="rejection-detail-item">
                            <span className="rej-detail-label">Submitted 12-Digit UTR:</span>
                            <span className="rej-detail-value utr-val">{lic.utrNumber || 'N/A'}</span>
                          </div>
                          <div className="rejection-detail-item">
                            <span className="rej-detail-label">Amount:</span>
                            <span className="rej-detail-value">₹{lic.amount || '399'} INR</span>
                          </div>
                          <div className="rejection-detail-item">
                            <span className="rej-detail-label">Gateway Mode:</span>
                            <span className="rej-detail-value">UPI Direct Bank Transfer</span>
                          </div>
                        </div>

                        {/* REJECTION ACTION ROW */}
                        <div className="rejection-action-row">
                          <span className="rejection-action-tip">
                            Your transaction could not be confirmed in bank records with this UTR. Check your UPI app receipt or retry with a valid payment.
                          </span>
                          <button
                            type="button"
                            className="rejection-retry-btn"
                            onClick={handleRetryPayment}
                          >
                            <span>Retry Payment</span>
                            <ArrowRightIcon size={12} />
                          </button>
                        </div>
                      </div>
                    ) : isPending ? (
                      /* SPECIAL CASE 2: PENDING APPROVAL DISPLAY */
                      <div className="license-pending-box">
                        <div className="pending-box-header">
                          <span className="pending-box-title" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span>Awaiting Admin Bank Verification</span>
                          </span>
                          <span className="pending-date-tag">
                            {lic.submittedAt ? new Date(lic.submittedAt).toLocaleDateString() : 'Today'}
                          </span>
                        </div>
                        <p className="pending-box-msg">
                          Your UPI payment of <strong>₹{lic.amount || '399'} INR</strong> (UTR: <code>{lic.utrNumber}</code>) is queued for manual bank transfer verification. Your cryptographic license will activate as soon as the admin verifies the deposit.
                        </p>
                      </div>
                    ) : (
                      /* STANDARD CASE: ISSUED OR CANCELLED LICENSE DISPLAY */
                      <>
                        {/* Serialized Key Display */}
                        <div className={`license-key-wrapper ${isCancelled ? 'key-wrapper-cancelled' : ''}`}>
                          <div className="key-header-row">
                            <span className="key-label">Digital License Key:</span>
                            {isCancelled && (
                              <span className="cancelled-pill-tag">
                                <CloseIcon size={11} style={{ marginRight: '3px' }} /> ACCESS REVOKED
                              </span>
                            )}
                          </div>
                          <div className="key-box">
                            <code className={`key-code ${isCancelled ? 'key-code-cancelled' : ''}`}>
                              {lic.licenseKey}
                            </code>
                            <button
                              type="button"
                              className={`copy-key-btn ${isCancelled ? 'copy-key-btn-cancelled' : ''}`}
                              onClick={() => handleCopyKey(lic.licenseKey)}
                              title={isCancelled ? 'Copy cancelled key' : 'Copy license key to clipboard'}
                            >
                              {copiedKey === lic.licenseKey ? (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                  </svg>
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                  </svg>
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Features & Metadata */}
                        <div className="license-meta-row">
                          <span className={`license-expiry ${isCancelled ? 'expiry-cancelled' : isExpired ? 'expiry-expired' : ''}`}>
                            {isCancelled ? (
                              <CloseIcon size={13} style={{ marginRight: '4px', color: '#f87171' }} />
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                            )}
                            {expiryText}
                          </span>
                          <span className="license-gateway-tag">Via {lic.gateway || 'UPI QR'}</span>
                        </div>

                        {/* If cancelled, show a helpful reactivation prompt */}
                        {isCancelled && (
                          <div className="license-cancelled-notice">
                            <span className="cancelled-notice-text">
                              This VIP subscription was cancelled. All associated privileges (zero platform fees, VIP badges, pinned reviews) have been invalidated.
                            </span>
                            <button
                              type="button"
                              className="reactivate-vip-btn"
                              onClick={() => {
                                onClose();
                                navigate('/vip-club');
                              }}
                            >
                              <span>Rejoin VIP Club</span>
                              <ArrowRightIcon size={12} />
                            </button>
                          </div>
                        )}

                        {Array.isArray(lic.features) && lic.features.length > 0 && (
                          <div className={`license-features-list ${isCancelled ? 'features-cancelled' : ''}`}>
                            {lic.features.map((feat, idx) => (
                              <span key={idx} className={`feature-pill ${isCancelled ? 'feature-pill-cancelled' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                {isCancelled ? (
                                  <CloseIcon size={10} style={{ color: '#ef4444' }} />
                                ) : (
                                  <CheckIcon size={11} />
                                )}
                                {feat.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="license-modal-footer">
          <span className="footer-tip" style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <LightbulbIcon size={16} style={{ color: '#ffd700', flexShrink: 0 }} />
            <span>Paste your key into the software’s <em>License Activation</em> dialog to unlock full features.</span>
          </span>
          <button className="license-done-btn" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default UserLicensesModal;
