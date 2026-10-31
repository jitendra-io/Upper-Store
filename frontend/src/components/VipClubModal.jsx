import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import {
  CrownIcon,
  DiamondIcon,
  SparkleIcon,
  CheckIcon,
  StarIcon,
  CloseIcon,
  AlertTriangleIcon,
  ShieldOffIcon,
  QrCodeIcon,
  CreditCardIcon,
  LockIcon,
} from './Icons';
import CancelSubscriptionModal from './CancelSubscriptionModal';
import upperUpiQr from '../assets/upper-upi-qr.png';
import './VipClubModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const VipClubModal = ({ isOpen, onClose, defaultPlan = 'elite' }) => {
  const { user, isLoggedIn, openAuthModal, updateMembership } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(defaultPlan); // 'pro' | 'elite'
  const [gateway, setGateway] = useState('upi_qr'); // 'upi_qr' | 'stripe'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [celebrationData, setCelebrationData] = useState(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [eligibility, setEligibility] = useState(null);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  // UPI QR Payment State
  const [upiUtr, setUpiUtr] = useState('');
  const [payerUpiId, setPayerUpiId] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [paymentConfig, setPaymentConfig] = useState({
    paymentMode: 'upi_qr',
    upiId: '9692093386@naviaxis',
    payeeName: 'JITENDRA KUMAR MISHRA',
    autoApproveUpi: false,
  });

  // Fetch Eligibility Status from Backend
  const fetchEligibility = async () => {
    if (!isLoggedIn) {
      setEligibility(null);
      return;
    }
    setCheckingEligibility(true);
    try {
      const token = localStorage.getItem('upper_user_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`${API_BASE}/api/payments/subscription-eligibility`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEligibility(data);
      }
    } catch (err) {
      console.warn('Could not fetch subscription eligibility:', err);
    } finally {
      setCheckingEligibility(false);
    }
  };

  // Fetch Payment Settings & User Eligibility
  useEffect(() => {
    if (!isOpen) return;

    fetchEligibility();

    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/settings/payment-config`);
        if (res.ok) {
          const data = await res.json();
          setPaymentConfig({
            paymentMode: data.paymentMode || 'upi_qr',
            upiId: data.upiId || '9692093386@naviaxis',
            payeeName: data.payeeName || 'JITENDRA KUMAR MISHRA',
            autoApproveUpi: Boolean(data.autoApproveUpi),
          });
        }
      } catch (err) {
        console.warn('Could not fetch payment config:', err);
      }
    };
    fetchConfig();
  }, [isOpen, isLoggedIn]);

  if (!isOpen) return null;

  const planDetails = {
    pro: {
      id: 'pro',
      name: 'Pro Member',
      billing: 'Monthly Pass',
      priceINR: 99,
      priceUSD: 1.25,
      badgeName: 'Golden VIP Badge',
      badgeClass: 'badge-gold',
      perks: [
        '₹0 Platform Fee on all free app downloads',
        'Official Golden VIP Badge beside your name',
        'Priority high-speed CDN bandwidth',
        'VIP Developer Studio: Publish up to 3 products in Store',
        'Gold-highlighted community product reviews',
        'Direct developer feature requests',
      ],
    },
    elite: {
      id: 'elite',
      name: 'Elite VIP',
      billing: 'Annual All-Access (Save 66%)',
      priceINR: 399,
      priceUSD: 4.99,
      badgeName: 'Royal Purple Badge',
      badgeClass: 'badge-purple',
      perks: [
        '₹0 Platform Fee on all downloads for 1 full year',
        'Official Royal Purple VIP Badge on profile & reviews',
        'VIP Developer Studio: Publish UNLIMITED products in Store',
        'Top-Ranked Pinned Comments in all review sections',
        'Ultra VIP dedicated CDN download servers',
        'Exclusive early-access to new apps & updates',
        'Zero marketplace commission on developer purchases',
      ],
    },
  };

  const activePlan = planDetails[selectedPlan];
  const isBanned = Boolean(user?.isBanned);

  // Copy UPI ID to clipboard
  const handleCopyUpiId = () => {
    navigator.clipboard.writeText(paymentConfig.upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2200);
  };

  // UPI Deep link for Mobile Devices
  const upiDeepLink = `upi://pay?pa=${encodeURIComponent(paymentConfig.upiId)}&pn=${encodeURIComponent(paymentConfig.payeeName)}&am=${activePlan.priceINR}&cu=INR&tn=${encodeURIComponent(`Upper VIP ${activePlan.name}`)}`;

  // Handle Subscription Submission with Strict Validation
  const handleSubscribe = async () => {
    if (!isLoggedIn) {
      onClose();
      openAuthModal('Please sign in or create an account to activate your Upper VIP Membership.');
      return;
    }

    if (isBanned) {
      setError('Your account is currently restricted. Banned accounts cannot purchase or renew subscriptions.');
      return;
    }

    if (eligibility?.hasActiveSubscription) {
      setError('Active Subscription Exists: You currently have an active plan. Under store rules, you cannot request another subscription unless you cancel your current plan first.');
      return;
    }

    if (eligibility?.hasPendingRequest) {
      setError('Subscription Request Pending: You already have a subscription request awaiting verification. Please wait for it to be approved or rejected.');
      return;
    }

    setError(null);

    // ==========================================
    // 1. REAL UPI QR PAYMENT FLOW
    // ==========================================
    if (gateway === 'upi_qr') {
      const cleanUtr = upiUtr.trim().toUpperCase();
      if (!cleanUtr) {
        setError('Please enter the 12-digit UPI UTR / Transaction Reference Number from your payment app receipt.');
        return;
      }
      if (cleanUtr.length < 6) {
        setError('Invalid UTR format. Please enter a valid 12-digit UPI Reference Number.');
        return;
      }

      setLoading(true);
      try {
        const token = localStorage.getItem('upper_user_token');
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/api/payments/submit-upi-payment`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productId: `upper-vip-${selectedPlan}`,
            plan: selectedPlan,
            amount: activePlan.priceINR,
            utrNumber: cleanUtr,
            payerUpiId: payerUpiId.trim(),
            payerName: user?.displayName || '',
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          if (data.code === 'ACTIVE_SUBSCRIPTION_EXISTS' || data.code === 'PENDING_SUBSCRIPTION_EXISTS') {
            fetchEligibility();
          }
          throw new Error(data.message || 'Payment submission failed.');
        }

        if (data.status === 'approved' && data.membership) {
          updateMembership(data.membership);
          setCelebrationData(data.membership);
          fetchEligibility();
        } else {
          setPendingSubmission({
            utrNumber: cleanUtr,
            planName: activePlan.name,
            amount: activePlan.priceINR,
            orderId: data.orderId,
          });
          fetchEligibility();
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
    // 2. STRIPE CHECKOUT (USD / International)
    // ==========================================
    setLoading(true);
    try {
      const token = localStorage.getItem('upper_user_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/api/payments/create-checkout-session`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: `upper-vip-${selectedPlan}`,
          plan: selectedPlan,
          gateway: 'stripe',
          currency: 'USD',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.code === 'ACTIVE_SUBSCRIPTION_EXISTS' || data.code === 'PENDING_SUBSCRIPTION_EXISTS') {
          fetchEligibility();
        }
        throw new Error(data.message || 'Failed to initialize payment.');
      }

      if (data.checkoutUrl && !data.isMock) {
        window.location.href = data.checkoutUrl;
        return;
      }

      // If mock/sandbox fallback
      if (paymentConfig.paymentMode === 'sandbox') {
        const mockRes = await fetch(`${API_BASE}/api/payments/complete-sandbox-checkout`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productId: `upper-vip-${selectedPlan}`,
            plan: selectedPlan,
            gateway: 'stripe',
          }),
        });
        const mockData = await mockRes.json();
        if (mockRes.ok && mockData.membership) {
          updateMembership(mockData.membership);
          setCelebrationData(mockData.membership);
          fetchEligibility();
          return;
        }
      }

      throw new Error('International gateway is temporarily in maintenance. Please use UPI QR payment.');
    } catch (err) {
      console.error('Subscription error:', err);
      setError(err.message || 'Subscription processing failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const modalContent = (
    <div className="vip-modal-backdrop" onClick={onClose}>
      <div className="vip-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="vip-modal-header">
          <div className="vip-header-title">
            <span className="vip-sparkle">
              <SparkleIcon size={20} />
            </span>
            <div>
              <h3>Upper VIP Club</h3>
              <span className="vip-subtitle">Elevate Your Platform Experience &amp; Unlock ₹0 Platform Fees</span>
            </div>
          </div>
          <button className="vip-close-btn" onClick={onClose} aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="vip-modal-body">
          {celebrationData ? (
            /* CELEBRATION / WELCOME STATE */
            <div className="vip-celebration-state">
              <div className={`celebration-badge-ring ${celebrationData.badge === 'purple' ? 'ring-purple' : 'ring-gold'}`}>
                <span className="celebration-badge-icon">
                  {celebrationData.badge === 'purple' ? <DiamondIcon size={34} /> : <CrownIcon size={34} />}
                </span>
              </div>
              <h3 className="celebration-title">
                Welcome to Upper {celebrationData.plan === 'elite' ? 'Elite' : 'Pro'}!
              </h3>
              <p className="celebration-subtext">
                Your account <strong>{user?.email}</strong> is now verified as an official{' '}
                <strong className={celebrationData.badge === 'purple' ? 'text-purple' : 'text-gold'} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  {celebrationData.plan === 'elite' ? (
                    <>
                      <DiamondIcon size={16} /> Royal Purple Elite VIP
                    </>
                  ) : (
                    <>
                      <CrownIcon size={16} /> Golden Pro VIP
                    </>
                  )}
                </strong>.
              </p>

              <div className="celebration-perks-box">
                <div className="celebration-perk-item">
                  <span className="check-gold">
                    <CheckIcon size={13} />
                  </span>
                  <span><strong>₹0 Platform Fee:</strong> All free software downloads are 100% complimentary.</span>
                </div>
                <div className="celebration-perk-item">
                  <span className="check-gold">
                    <CheckIcon size={13} />
                  </span>
                  <span><strong>Cryptographic License:</strong> Stored securely in your official account registry.</span>
                </div>
                <div className="celebration-perk-item">
                  <span className="check-gold">
                    <CheckIcon size={13} />
                  </span>
                  <span><strong>Valid Until:</strong> {new Date(celebrationData.validUntil).toLocaleDateString()}</span>
                </div>
              </div>

              <button
                type="button"
                className="celebration-continue-btn"
                onClick={() => {
                  setCelebrationData(null);
                  onClose();
                }}
              >
                <span>Access Premium Features</span>
              </button>
            </div>
          ) : pendingSubmission ? (
            /* PENDING SUBMISSION CONFIRMATION STATE */
            <div className="vip-pending-state">
              <div className="pending-badge-ring">
                <QrCodeIcon size={36} style={{ color: '#ffd700' }} />
              </div>
              <h3 className="pending-title">Payment Submitted for Verification!</h3>
              <p className="pending-subtext">
                Thank you for subscribing to <strong>Upper {pendingSubmission.planName}</strong>! Your transaction reference has been securely registered in our database.
              </p>

              <div className="pending-details-box">
                <div className="pending-detail-row">
                  <span className="detail-label">Order Reference:</span>
                  <span className="detail-val">{pendingSubmission.orderId}</span>
                </div>
                <div className="pending-detail-row">
                  <span className="detail-label">Submitted UTR / Ref No:</span>
                  <span className="detail-val highlight-mono">{pendingSubmission.utrNumber}</span>
                </div>
                <div className="pending-detail-row">
                  <span className="detail-label">Amount Transferred:</span>
                  <span className="detail-val font-gold">₹{pendingSubmission.amount} INR</span>
                </div>
                <div className="pending-detail-row">
                  <span className="detail-label">Verification Status:</span>
                  <span className="status-pill pending-pill">
                    <span className="pulse-dot"></span> Pending Admin Verification
                  </span>
                </div>
              </div>

              <div className="pending-notice-card">
                <CheckIcon size={14} style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Our administration team checks bank receipts regularly. Once confirmed, your official VIP badge, ₹0 platform fee waiver, and cryptographic license key will activate automatically on your account.
                </span>
              </div>

              <div className="pending-actions-row">
                <button
                  type="button"
                  className="pending-done-btn"
                  onClick={() => {
                    setPendingSubmission(null);
                    onClose();
                  }}
                >
                  Done
                </button>
              </div>
            </div>
          ) : eligibility?.hasActiveSubscription ? (
            /* ACTIVE SUBSCRIPTION GUARD: USER CANNOT REQUEST ANOTHER PLAN UNLESS CANCELLED */
            <div className="vip-active-state">
              <div className={`active-badge-ring ${eligibility.activeSubscription?.plan === 'elite' ? 'ring-purple' : 'ring-gold'}`}>
                <span className="active-badge-icon">
                  {eligibility.activeSubscription?.plan === 'elite' ? <DiamondIcon size={36} /> : <CrownIcon size={36} />}
                </span>
              </div>

              <div className="active-status-badge-row">
                <span className="status-pill active-pill">
                  <span className="pulse-dot active-dot"></span> Active VIP Membership
                </span>
              </div>

              <h3 className="active-title">
                Active {eligibility.activeSubscription?.plan === 'elite' ? 'Royal Purple Elite VIP' : 'Golden Pro Member'} Pass
              </h3>

              <p className="active-subtext">
                Your account already holds an active VIP membership valid until{' '}
                <strong>{new Date(eligibility.activeSubscription?.validUntil).toLocaleDateString()}</strong>.
                Under store validation rules, one user can hold 1 premium plan at a time. You cannot request or purchase another subscription unless you cancel your current active plan first.
              </p>

              <div className="active-perks-box">
                <div className="active-perk-item">
                  <span className="check-gold">
                    <CheckIcon size={13} />
                  </span>
                  <span><strong>₹0 Platform Fee:</strong> Full waiver active on all free community software.</span>
                </div>
                <div className="active-perk-item">
                  <span className="check-gold">
                    <CheckIcon size={13} />
                  </span>
                  <span><strong>Prestige Badge:</strong> Official verified badge displayed across comments &amp; profile.</span>
                </div>
                <div className="active-perk-item">
                  <span className="check-gold">
                    <CheckIcon size={13} />
                  </span>
                  <span><strong>Priority Delivery:</strong> Dedicated high-speed download CDN active.</span>
                </div>
              </div>

              <div className="active-actions-row">
                <button
                  type="button"
                  className="active-cancel-btn"
                  onClick={() => setCancelModalOpen(true)}
                >
                  <ShieldOffIcon size={15} />
                  <span>Cancel Current Subscription</span>
                </button>

                <button
                  type="button"
                  className="active-done-btn"
                  onClick={onClose}
                >
                  Keep Plan &amp; Close
                </button>
              </div>
            </div>
          ) : eligibility?.hasPendingRequest ? (
            /* PENDING SUBSCRIPTION GUARD: USER CANNOT REQUEST ANOTHER PLAN WHILE PENDING */
            <div className="vip-pending-state">
              <div className="pending-badge-ring">
                <QrCodeIcon size={36} style={{ color: '#ffd700' }} />
              </div>

              <div className="pending-status-badge-row">
                <span className="status-pill pending-pill">
                  <span className="pulse-dot"></span> Awaiting Admin Verification
                </span>
              </div>

              <h3 className="pending-title">Subscription Verification in Progress</h3>

              <p className="pending-subtext">
                You already have a subscription request for <strong>Upper {eligibility.pendingSubscription?.plan?.toUpperCase()}</strong> awaiting verification by our administrative team.
              </p>

              <div className="pending-details-box">
                <div className="pending-detail-row">
                  <span className="detail-label">Order Reference:</span>
                  <span className="detail-val">{eligibility.pendingSubscription?.orderId}</span>
                </div>
                <div className="pending-detail-row">
                  <span className="detail-label">Submitted 12-Digit UTR:</span>
                  <span className="detail-val highlight-mono">{eligibility.pendingSubscription?.utrNumber}</span>
                </div>
                <div className="pending-detail-row">
                  <span className="detail-label">Amount Transferred:</span>
                  <span className="detail-val font-gold">₹{eligibility.pendingSubscription?.amount} INR</span>
                </div>
                <div className="pending-detail-row">
                  <span className="detail-label">Submission Date:</span>
                  <span className="detail-val">{new Date(eligibility.pendingSubscription?.submittedAt || Date.now()).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pending-notice-card">
                <AlertTriangleIcon size={15} style={{ color: '#f59e0b', flexShrink: 0, marginTop: '2px' }} />
                <span>
                  Under store validation rules, one user can request 1 premium plan at a time. You cannot submit another plan request until your pending request is approved or rejected by the admin.
                </span>
              </div>

              <div className="pending-actions-row">
                <button
                  type="button"
                  className="pending-done-btn"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* NORMAL PLAN SELECTION & CHECKOUT STATE (USER CAN REQUEST A PLAN) */
            <div>
              {/* PREVIOUS REJECTION NOTICE (IF PREVIOUS REQUEST WAS REJECTED) */}
              {eligibility?.hasRejectedRequest && (
                <div className="vip-rejection-warning-banner">
                  <div className="rej-banner-icon">
                    <CloseIcon size={16} />
                  </div>
                  <div className="rej-banner-content">
                    <span className="rej-banner-title">Previous Payment Not Verified</span>
                    <p className="rej-banner-desc">
                      Your previous request for <strong>{eligibility.rejectedSubscription?.plan?.toUpperCase()}</strong> (UTR: <code>{eligibility.rejectedSubscription?.utrNumber}</code>) was rejected: &ldquo;<em>{eligibility.rejectedSubscription?.rejectReason || 'UTR not found in bank records'}</em>&rdquo;. You can now select your plan and submit a new payment request with your correct 12-digit UTR below.
                    </p>
                  </div>
                </div>
              )}

              {/* PLAN SELECTION TABS */}
              <div className="vip-plan-selector">
                <div
                  className={`vip-plan-card ${selectedPlan === 'pro' ? 'active active-pro' : ''}`}
                  onClick={() => setSelectedPlan('pro')}
                >
                  <div className="vip-plan-header">
                    <span className="plan-badge-icon badge-pro">
                      <CrownIcon size={18} />
                    </span>
                    <div>
                      <h4 className="plan-name">Pro Member</h4>
                      <span className="plan-billing">Monthly VIP Access</span>
                    </div>
                  </div>
                  <div className="plan-price-tag">
                    <span className="price-amount">₹99</span>
                    <span className="price-period">/ month</span>
                  </div>
                  <span className="plan-sub-tag">Golden Community Badge</span>
                </div>

                <div
                  className={`vip-plan-card ${selectedPlan === 'elite' ? 'active active-elite' : ''}`}
                  onClick={() => setSelectedPlan('elite')}
                >
                  <div className="plan-ribbon">BEST VALUE • SAVE 66%</div>
                  <div className="vip-plan-header">
                    <span className="plan-badge-icon badge-elite">
                      <DiamondIcon size={18} />
                    </span>
                    <div>
                      <h4 className="plan-name">Elite VIP</h4>
                      <span className="plan-billing">Annual All-Access Pass</span>
                    </div>
                  </div>
                  <div className="plan-price-tag">
                    <span className="price-amount">₹399</span>
                    <span className="price-period">/ year</span>
                  </div>
                  <span className="plan-sub-tag">Royal Purple Badge + Priority CDN</span>
                </div>
              </div>

              {/* ACTIVE PERKS BOX */}
              <div className="vip-active-perks-box">
                <span className="perks-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Included with {activePlan.name} ({selectedPlan === 'elite' ? <DiamondIcon size={14} /> : <CrownIcon size={14} />} {activePlan.badgeName}):
                </span>
                <div className="vip-perks-list">
                  {activePlan.perks.map((perk, i) => (
                    <div key={i} className="vip-perk-row">
                      <span className="vip-perk-check">
                        <CheckIcon size={12} />
                      </span>
                      <span>{perk}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PAYMENT GATEWAY SELECTOR */}
              <div className="vip-gateway-row">
                <span className="gateway-title">Select Payment Mode:</span>
                <div className="vip-gateway-buttons">
                  <label className={`vip-gateway-chip ${gateway === 'upi_qr' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="vip-gateway"
                      value="upi_qr"
                      checked={gateway === 'upi_qr'}
                      onChange={() => setGateway('upi_qr')}
                    />
                    <QrCodeIcon size={15} style={{ color: '#ffd700' }} />
                    <span>Instant UPI QR (GPay • PhonePe • Paytm • BHIM)</span>
                  </label>
                  <label className={`vip-gateway-chip ${gateway === 'stripe' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="vip-gateway"
                      value="stripe"
                      checked={gateway === 'stripe'}
                      onChange={() => setGateway('stripe')}
                    />
                    <CreditCardIcon size={15} />
                    <span>International Cards (USD $4.99)</span>
                  </label>
                </div>
              </div>

              {/* REAL UPI QR PAYMENT BOX */}
              {gateway === 'upi_qr' && (
                <div className="vip-upi-box">
                  <div className="upi-box-header">
                    <div className="upi-badge-tag">
                      <LockIcon size={12} style={{ color: '#22c55e' }} />
                      <span>DIRECT BANK TRANSFER • ZERO TRANSACTION FEES</span>
                    </div>
                    <span className="upi-exact-amount">
                      Pay Exact Amount: <strong>₹{activePlan.priceINR} INR</strong>
                    </span>
                  </div>

                  <div className="upi-qr-display-grid">
                    {/* QR Code Container */}
                    <div className="upi-qr-frame">
                      <img src={upperUpiQr} alt="Upper Store Official UPI QR Code" className="upi-qr-img" />
                      <span className="qr-scan-label">Scan with Any UPI App</span>
                    </div>

                    {/* Payee Info & Copy Action */}
                    <div className="upi-info-col">
                      <div className="upi-field-group">
                        <span className="upi-field-label">Official Payee:</span>
                        <span className="upi-payee-name">{paymentConfig.payeeName}</span>
                      </div>

                      <div className="upi-field-group">
                        <span className="upi-field-label">Official UPI ID (VPA):</span>
                        <div className="upi-vpa-copy-wrap">
                          <code className="upi-vpa-code">{paymentConfig.upiId}</code>
                          <button
                            type="button"
                            className="upi-copy-btn"
                            onClick={handleCopyUpiId}
                            title="Copy UPI ID"
                          >
                            {copiedUpi ? (
                              <>
                                <CheckIcon size={12} style={{ color: '#22c55e' }} />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <span>Copy UPI</span>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Mobile One-Tap Payment Deep-link */}
                      <a
                        href={upiDeepLink}
                        className="mobile-upi-launch-btn"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <QrCodeIcon size={16} />
                        <span>Tap to Pay via UPI App (PhonePe / GPay)</span>
                      </a>

                      <p className="upi-step-hint">
                        <strong>Step 1:</strong> Scan the QR or open your UPI app and pay <strong>₹{activePlan.priceINR}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* STEP 2: UTR SUBMISSION FORM */}
                  <div className="upi-utr-form-section">
                    <div className="utr-section-title">
                      <span className="step-num-pill">Step 2</span>
                      <span className="step-num-text">Enter Your 12-Digit UPI Reference Number (UTR):</span>
                    </div>

                    <div className="utr-input-row">
                      <input
                        type="text"
                        className="utr-text-input"
                        placeholder="e.g. 428901234567 or UPI Ref ID"
                        value={upiUtr}
                        onChange={(e) => setUpiUtr(e.target.value)}
                        maxLength={35}
                      />
                      <input
                        type="text"
                        className="utr-payer-input"
                        placeholder="Your UPI ID or Name (Optional)"
                        value={payerUpiId}
                        onChange={(e) => setPayerUpiId(e.target.value)}
                        maxLength={50}
                      />
                    </div>
                    <span className="utr-helper-text">
                      * Look in your Google Pay, PhonePe, or Paytm receipt for the 12-digit &quot;UPI Ref No&quot; or &quot;UTR&quot;.
                    </span>
                  </div>
                </div>
              )}

              {/* VALIDATION NOTICES & STATUS */}
              {isBanned && (
                <div className="vip-error-banner" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <AlertTriangleIcon size={16} />
                  <span>Your account is currently restricted. Banned accounts cannot purchase or renew subscriptions.</span>
                </div>
              )}

              {error && <div className="vip-error-banner">{error}</div>}

              {/* SUBSCRIBE CTA */}
              <button
                type="button"
                className={`vip-subscribe-btn ${selectedPlan === 'elite' ? 'btn-elite' : 'btn-pro'} ${isBanned ? 'disabled' : ''}`}
                onClick={handleSubscribe}
                disabled={loading || isBanned}
              >
                {loading ? (
                  <span className="vip-spinner-wrap">
                    <span className="vip-spinner"></span>
                    Submitting Payment for Verification...
                  </span>
                ) : gateway === 'upi_qr' ? (
                  <span>Verify &amp; Activate VIP Membership (₹{activePlan.priceINR})</span>
                ) : (
                  <span>Upgrade via Stripe ($4.99 USD)</span>
                )}
              </button>

              <div className="vip-trust-footer">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>Zero Platform Fee Unlocked Immediately Upon Verification • Cancel Anytime</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CANCEL SUBSCRIPTION MODAL */}
      <CancelSubscriptionModal
        isOpen={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        onCancelled={() => {
          setCancelModalOpen(false);
          fetchEligibility();
        }}
      />
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default VipClubModal;
