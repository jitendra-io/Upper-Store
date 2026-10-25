import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { CheckIcon, CloseIcon, QrCodeIcon, CreditCardIcon, LockIcon } from './Icons';
import upperUpiQr from '../assets/upper-upi-qr.png';
import './CheckoutModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CheckoutModal = ({ isOpen, onClose, product, plan = 'pro', onLicenseIssued, platformFeeAmount = 19 }) => {
  const { user, isLoggedIn } = useAuth();
  const [gateway, setGateway] = useState('upi_qr'); // 'upi_qr' | 'stripe'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [issuedLicense, setIssuedLicense] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [upiUtr, setUpiUtr] = useState('');
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({
    upiId: '9692093386@naviaxis',
    payeeName: 'JITENDRA KUMAR MISHRA',
  });

  useEffect(() => {
    if (!isOpen) return;
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/payment-config`);
        if (res.ok) {
          const data = await res.json();
          setPaymentConfig({
            upiId: data.upiId || '9692093386@naviaxis',
            payeeName: data.payeeName || 'JITENDRA KUMAR MISHRA',
          });
        }
      } catch (err) {
        console.warn('Could not fetch payment config:', err);
      }
    };
    fetchConfig();
  }, [isOpen]);

  if (!isOpen || !product) return null;

  const isFeeOnly = plan === 'download_fee';
  const feeINR = typeof platformFeeAmount === 'number' ? Math.max(0, platformFeeAmount) : 19;
  const feeUSD = Math.max(0.1, Math.round((feeINR / 85) * 100) / 100);
  const parsedPrice = product.price ? parseFloat(String(product.price).replace(/[^0-9.]/g, '')) : 19;
  const priceUSD = isFeeOnly ? feeUSD : (!isNaN(parsedPrice) && parsedPrice > 0 ? parsedPrice : 19);
  const priceINR = isFeeOnly ? feeINR : Math.round(priceUSD * 85);

  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(paymentConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2200);
  };

  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(paymentConfig.payeeName)}&am=${priceINR}&cu=INR&tn=${encodeURIComponent(`${product.title} ${isFeeOnly ? 'Fee' : 'Pro'}`)}`;

  const handleCheckout = async () => {
    if (!isLoggedIn) {
      alert('Please sign in to your Upper Store account before proceeding.');
      return;
    }

    setLoading(true);
    setError(null);

    // ==========================================
    // 1. REAL UPI QR PAYMENT FLOW
    // ==========================================
    if (gateway === 'upi_qr') {
      const cleanUtr = upiUtr.trim().toUpperCase();
      if (!cleanUtr || cleanUtr.length < 6) {
        setError('Please enter the 12-digit UPI UTR / Transaction Reference Number from your payment receipt.');
        setLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('upper_user_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/api/payments/submit-upi-payment`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productId: product.id,
            plan,
            amount: priceINR,
            utrNumber: cleanUtr,
            payerName: user?.displayName || '',
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Payment submission failed.');

        if (data.status === 'approved' && data.license) {
          setIssuedLicense(data.license);
          if (isFeeOnly) {
            localStorage.setItem(`upper_paid_fee_${product.id}`, 'true');
            window.dispatchEvent(new CustomEvent('downloadFeePaid', { detail: { productId: product.id } }));
          } else {
            window.dispatchEvent(new CustomEvent('licenseIssued', { detail: { license: data.license } }));
          }
          if (onLicenseIssued) onLicenseIssued(data.license);
        } else {
          setPendingSubmission({
            utrNumber: cleanUtr,
            orderId: data.orderId,
            amount: priceINR,
          });
        }
      } catch (err) {
        console.error('UPI submit error:', err);
        setError(err.message || 'Payment submission failed. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    // ==========================================
    // 2. STRIPE INTERNATIONAL CHECKOUT
    // ==========================================
    try {
      const token = localStorage.getItem('upper_user_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: product.id,
          plan,
          gateway: 'stripe',
          currency: 'USD',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create checkout session.');

      if (data.checkoutUrl && !data.isMock) {
        window.location.href = data.checkoutUrl;
        return;
      }

      throw new Error('International gateway is temporarily unavailable. Please use UPI QR payment.');
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLicense = () => {
    if (issuedLicense?.licenseKey) {
      navigator.clipboard.writeText(issuedLicense.licenseKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const modalContent = (
    <div className="checkout-modal-backdrop" onClick={onClose}>
      <div className="checkout-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="checkout-modal-header">
          <div className="checkout-title-wrap">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              {isFeeOnly ? (
                <>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </>
              ) : (
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
              )}
            </svg>
            <div>
              <h3>{isFeeOnly ? 'Platform Download Fee' : 'Upgrade to Pro License'}</h3>
              <span className="checkout-subtitle">
                {isFeeOnly ? 'Bandwidth, Cloud CDN & Virus-Check Inspection Fee' : 'Official Cryptographic Software License'}
              </span>
            </div>
          </div>
          <button className="checkout-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* BODY */}
        <div className="checkout-modal-body">
          {issuedLicense ? (
            /* SUCCESS CONFIRMATION STATE */
            <div className="checkout-success-view">
              <div className="success-icon-ring">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              </div>
              <h3 className="success-headline">
                {isFeeOnly ? 'Platform Fee Cleared!' : 'License Issued Successfully!'}
              </h3>
              <p className="success-subtext">
                {isFeeOnly ? (
                  <>Platform download fee cleared for <strong>{product.title}</strong> under <strong>{user?.email}</strong>. You may now download immediately.</>
                ) : (
                  <>Your cryptographic Pro license for <strong>{product.title}</strong> is now registered under <strong>{user?.email}</strong>.</>
                )}
              </p>

              {!isFeeOnly && (
                <div className="issued-key-container">
                  <span className="issued-key-label">Your Digital License Key:</span>
                  <div className="issued-key-box">
                    <code>{issuedLicense.licenseKey}</code>
                    <button type="button" className="copy-issued-btn" onClick={handleCopyLicense}>
                      {copiedKey ? (
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

              <button className="checkout-finish-btn" onClick={onClose}>
                {isFeeOnly ? 'Proceed to Download' : 'Done • View in My Licenses'}
              </button>
            </div>
          ) : pendingSubmission ? (
            /* PENDING CONFIRMATION STATE */
            <div className="checkout-success-view">
              <div className="success-icon-ring" style={{ background: 'rgba(245, 158, 11, 0.15)', borderColor: '#f59e0b' }}>
                <QrCodeIcon size={36} style={{ color: '#ffd700' }} />
              </div>
              <h3 className="success-headline">Payment Submitted for Verification!</h3>
              <p className="success-subtext">
                Your payment reference has been recorded. Reference UTR: <strong style={{ color: '#ffd700', fontFamily: 'monospace' }}>{pendingSubmission.utrNumber}</strong>.
              </p>
              <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '12px 16px', margin: '14px 0', textAlign: 'left', fontSize: '13px', color: '#cbd5e1' }}>
                <div><strong>Order ID:</strong> {pendingSubmission.orderId}</div>
                <div style={{ marginTop: '4px' }}><strong>Amount:</strong> ₹{pendingSubmission.amount} INR</div>
                <div style={{ marginTop: '4px', color: '#fbbf24' }}><strong>Status:</strong> Pending Admin Bank Match</div>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: '10px 0 16px' }}>
                Once verified by our administrator, your download/license will be activated automatically.
              </p>
              <button className="checkout-finish-btn" onClick={onClose}>
                Done
              </button>
            </div>
          ) : (
            /* CHECKOUT CONFIGURATION STATE */
            <div className="checkout-form-content">
              {/* Product summary card */}
              <div className="checkout-item-summary">
                <img
                  src={product.logo || product.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200'}
                  alt=""
                  className="checkout-item-thumb"
                  referrerPolicy="no-referrer"
                />
                <div className="checkout-item-info">
                  <h4>{product.title} {isFeeOnly ? '• Download Fee' : '• Pro Edition'}</h4>
                  <span className="checkout-item-meta">
                    {isFeeOnly ? 'Verified Virus-Free • High Speed Cloud CDN' : `v${product.version || '1.0.0'} • Lifetime Commercial License`}
                  </span>
                </div>
                <div className="checkout-price-tag">
                  <span className="price-amount">{gateway === 'upi_qr' ? `₹${priceINR}` : `$${priceUSD}`}</span>
                  <span className="price-type">One-time</span>
                </div>
              </div>

              {/* Perks List */}
              <div className="checkout-perks-box">
                <span className="perks-heading">{isFeeOnly ? 'Platform Service Includes:' : 'Pro Features Unlocked:'}</span>
                <div className="perks-grid">
                  {isFeeOnly ? (
                    <>
                      <div className="perk-item">
                        <span className="perk-check"><CheckIcon size={12} /></span>
                        <span>High-Speed Direct Binary Mirror CDN</span>
                      </div>
                      <div className="perk-item">
                        <span className="perk-check"><CheckIcon size={12} /></span>
                        <span>Automated SHA-256 Integrity Verification</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="perk-item">
                        <span className="perk-check"><CheckIcon size={12} /></span>
                        <span>Unlimited Commercial Use License</span>
                      </div>
                      <div className="perk-item">
                        <span className="perk-check"><CheckIcon size={12} /></span>
                        <span>Lifetime Updates & Priority Delivery</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Gateway Selector */}
              <div className="checkout-gateways-container">
                <span className="gateway-heading">Select Payment Method:</span>
                <div className="gateway-selection-grid">
                  <label className={`gateway-card ${gateway === 'upi_qr' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="gateway"
                      value="upi_qr"
                      checked={gateway === 'upi_qr'}
                      onChange={() => setGateway('upi_qr')}
                    />
                    <div className="gateway-content">
                      <div className="gateway-title-row">
                        <strong>Instant UPI QR (India)</strong>
                        <span className="gateway-badge inr">₹{priceINR} INR</span>
                      </div>
                      <span className="gateway-desc">GPay, PhonePe, Paytm, BHIM, CRED</span>
                    </div>
                  </label>

                  <label className={`gateway-card ${gateway === 'stripe' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="gateway"
                      value="stripe"
                      checked={gateway === 'stripe'}
                      onChange={() => setGateway('stripe')}
                    />
                    <div className="gateway-content">
                      <div className="gateway-title-row">
                        <strong>Stripe (Global / USD)</strong>
                        <span className="gateway-badge">${priceUSD} USD</span>
                      </div>
                      <span className="gateway-desc">Cards, Apple Pay, Google Pay</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* REAL UPI QR PAYMENT BOX */}
              {gateway === 'upi_qr' && (
                <div className="checkout-upi-box" style={{ background: 'rgba(20, 16, 32, 0.75)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '12px', padding: '14px', margin: '14px 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#22c55e', background: 'rgba(34, 197, 94, 0.12)', padding: '3px 8px', borderRadius: '999px', fontWeight: 800 }}>
                      <LockIcon size={11} /> DIRECT UPI TRANSFER
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Pay Exact: <strong style={{ color: '#ffd700' }}>₹{priceINR} INR</strong>
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '14px', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ background: '#ffffff', padding: '6px', borderRadius: '10px', textAlign: 'center' }}>
                      <img src={upperUpiQr} alt="UPI QR" style={{ width: '100%', display: 'block', borderRadius: '4px' }} />
                      <span style={{ fontSize: '10px', color: '#0f172a', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginTop: '2px' }}>Scan & Pay</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ fontSize: '12px', color: '#cbd5e1' }}>
                        Payee: <strong>{paymentConfig.payeeName}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '6px' }}>
                        <code style={{ color: '#ffd700', fontSize: '12px', fontWeight: 700, flex: 1, wordBreak: 'break-all' }}>{paymentConfig.upiId}</code>
                        <button type="button" onClick={handleCopyUpiId} style={{ background: 'rgba(255,215,0,0.15)', border: '1px solid rgba(255,215,0,0.4)', color: '#ffd700', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer' }}>
                          {copiedUpi ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <a href={upiDeepLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '6px 10px', borderRadius: '6px', textDecoration: 'none' }}>
                        <QrCodeIcon size={13} /> Open UPI App (GPay/PhonePe)
                      </a>
                    </div>
                  </div>

                  {/* UTR Input */}
                  <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#f1f5f9', marginBottom: '5px' }}>
                      Enter 12-Digit UPI Reference / UTR Number:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 428901234567"
                      value={upiUtr}
                      onChange={(e) => setUpiUtr(e.target.value)}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', padding: '7px 10px', borderRadius: '6px', fontFamily: 'monospace', fontWeight: 700, fontSize: '13px' }}
                    />
                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'block', marginTop: '3px' }}>
                      * Found in your UPI app receipt under "UPI Ref No" or "UTR".
                    </span>
                  </div>
                </div>
              )}

              {error && <div className="checkout-error-banner">{error}</div>}

              {/* Submit CTA */}
              <button
                type="button"
                className="checkout-pay-cta-btn"
                onClick={handleCheckout}
                disabled={loading}
              >
                {loading ? (
                  <span className="btn-spinner-wrap">
                    <span className="mini-spinner"></span>
                    Submitting Payment for Verification...
                  </span>
                ) : (
                  <>
                    <LockIcon size={16} />
                    <span>
                      {gateway === 'upi_qr'
                        ? `Verify & Submit Payment (₹${priceINR} INR)`
                        : `Pay $${priceUSD} USD via Stripe`}
                    </span>
                  </>
                )}
              </button>

              <div className="checkout-guarantee-row">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Direct Bank Transfer • Zero Hidden Charges • Official Cryptographic Receipt</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default CheckoutModal;
