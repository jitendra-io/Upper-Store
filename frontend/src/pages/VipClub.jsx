import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import VipClubModal from '../components/VipClubModal';
import CancelSubscriptionModal from '../components/CancelSubscriptionModal';
import DeveloperStudioModal from '../components/DeveloperStudioModal';
import { CrownIcon, DiamondIcon, SparkleIcon, CheckIcon, StarIcon, ArrowRightIcon, CloseIcon, ShieldOffIcon, LockIcon } from '../components/Icons';
import eliteBadgeScreenshot from '../assets/elite-badge-preview.png';
import proBadgeScreenshot from '../assets/pro-badge-preview.png';
import './VipClub.css';

const VipClub = () => {
  const { user, isLoggedIn, openAuthModal } = useAuth();
  const [billingCycle, setBillingCycle] = useState('annual'); // 'monthly' | 'annual'
  const [modalOpen, setModalOpen] = useState(false);
  const [modalPlan, setModalPlan] = useState('elite');
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [devStudioOpen, setDevStudioOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [eligibility, setEligibility] = useState(null);

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
  const [platformFee, setPlatformFee] = useState({ enabled: true, amount: 19 });

  const fetchEligibility = async () => {
    if (!isLoggedIn) {
      setEligibility(null);
      return;
    }
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
    }
  };

  useEffect(() => {
    fetchEligibility();
  }, [isLoggedIn, user]);

  useEffect(() => {
    fetch(`${API_BASE}/api/settings/platform-fee`)
      .then((r) => r.json())
      .then((d) => {
        if (d && d.success) {
          setPlatformFee({
            enabled: d.enabled !== false,
            amount: typeof d.amount === 'number' ? d.amount : 19,
          });
        }
      })
      .catch(() => {});
  }, [API_BASE]);

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'How does the ₹0 platform fee work for VIP members?',
      a: `Standard users pay a platform fee of ₹${platformFee.amount} INR when downloading free community and developer software. As a Pro or Elite VIP member, this platform fee is 100% waived (₹0 INR) on all eligible software downloads throughout your active subscription period.`,
    },
    {
      q: 'How do the Golden and Royal Purple badges work?',
      a: 'The moment your VIP membership is active, your user avatar and profile automatically receive your official badge—Golden Crown for Pro members and Royal Purple Diamond for Elite members. These badges appear beside your name across the platform, including product comment and review threads.',
    },
    {
      q: 'What is the Pinned Elite VIP Review privilege?',
      a: 'Elite VIP members enjoy automatic top-ranking priority in all product review sections. Whenever an Elite member publishes feedback or a review on any product, it is anchored at the very top of the review thread with a "PINNED ELITE VIP REVIEW" ribbon for maximum community and developer visibility.',
    },
    {
      q: 'What happens if I renew or extend my subscription early?',
      a: 'Our platform uses intelligent expiration stacking! If you renew your membership before it expires, the new 30 days (Pro) or 365 days (Elite) are seamlessly stacked on top of your existing expiration date. You will never lose any paid days.',
    },
    {
      q: 'What happens after my subscription expires?',
      a: 'If a subscription reaches its expiration date without renewal, the VIP badge and zero platform fee privileges are automatically removed in Firestore, and your account reverts to the Free Tier. All your past download records remain safe and accessible.',
    },
    {
      q: 'How do I cancel my VIP subscription?',
      a: 'You can cancel your VIP subscription anytime from the VIP page, the VIP modal, or your user profile menu. For security and to prevent accidental clicks, you must type "cancel" into the confirmation prompt. Upon confirmation, all VIP facilities (including badges, zero platform fee waivers, and pinned reviews) are immediately invalidated, and a cancellation confirmation receipt is sent to your email.',
    },
    {
      q: 'Which payment methods are supported?',
      a: 'We support instant domestic and international payments: UPI (Google Pay, PhonePe, Paytm, BHIM), Netbanking, Rupay cards, Debit/Credit Cards via Razorpay, and Visa/Mastercard/Apple Pay via Stripe.',
    },
  ];

  const currentPlan = user?.membership?.plan || 'free';
  const isVipActive =
    currentPlan !== 'free' &&
    user?.membership?.validUntil &&
    new Date(user?.membership?.validUntil) > new Date() &&
    !user?.membership?.isCancelled;
  const hasActiveSubscription = isVipActive || eligibility?.hasActiveSubscription;
  const activePlanKey = eligibility?.activeSubscription?.plan || currentPlan;
  const hasPendingRequest = eligibility?.hasPendingRequest;
  const hasRejectedRequest = eligibility?.hasRejectedRequest;

  const openCheckout = (plan) => {
    if (!isLoggedIn) {
      openAuthModal('Please sign in or create an account to activate your Upper VIP Membership.');
      return;
    }
    if (hasActiveSubscription) {
      setCancelModalOpen(true);
      return;
    }
    if (hasPendingRequest) {
      return;
    }
    setModalPlan(plan);
    setModalOpen(true);
  };

  const renderPlanButton = (planKey, defaultLabel, btnClass, defaultIcon = null) => {
    if (!isLoggedIn) {
      return (
        <button type="button" className={btnClass} onClick={() => openCheckout(planKey)}>
          {defaultIcon}
          <span>{defaultLabel}</span>
          <ArrowRightIcon size={14} />
        </button>
      );
    }

    if (hasActiveSubscription) {
      if (activePlanKey === planKey) {
        return (
          <div className="plan-active-actions-wrapper">
            <button type="button" className={`${btnClass} is-active-plan-btn`} disabled>
              <CheckIcon size={14} />
              <span>Current Active Plan</span>
            </button>
            <button
              type="button"
              className="plan-cancel-inline-btn"
              onClick={() => setCancelModalOpen(true)}
              title="Cancel active plan to switch or unsubscribe"
            >
              <ShieldOffIcon size={12} />
              <span>Cancel Plan</span>
            </button>
          </div>
        );
      } else {
        return (
          <button
            type="button"
            className={`${btnClass} is-locked-plan-btn`}
            onClick={() => setCancelModalOpen(true)}
            title="Cancel active plan first to switch subscriptions"
          >
            <LockIcon size={14} />
            <span>Cancel Active Plan to Switch</span>
          </button>
        );
      }
    }

    if (hasPendingRequest) {
      return (
        <button type="button" className={`${btnClass} is-pending-plan-btn`} disabled>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>Verification Pending</span>
        </button>
      );
    }

    return (
      <button type="button" className={btnClass} onClick={() => openCheckout(planKey)}>
        {defaultIcon}
        <span>{defaultLabel}</span>
        <ArrowRightIcon size={14} />
      </button>
    );
  };

  return (
    <div className="vip-page-wrapper">
      {/* ========================================================
          1. HERO SECTION
          ======================================================== */}
      <section className="vip-hero-section">
        <div className="vip-hero-ambient-glow" />
        <div className="vip-hero-container">
          <div className="vip-hero-badge">
            <span className="vip-badge-star">
              <SparkleIcon size={14} />
            </span>
            <span>UPPER STORE &bull; VIP PASS &amp; MEMBERSHIP CLUB</span>
          </div>

          <h1 className="vip-hero-title">
            The Ultimate Experience for <br />
            <span className="gold-text">Creators</span> &amp; <span className="purple-text">Power Users</span>
          </h1>

          <p className="vip-hero-subtitle">
            Say goodbye to platform fees. Unlock ₹0 download fees on all software, distinguish yourself with official Golden Crown &amp; Royal Purple Diamond badges, and pin your reviews at the top of every app page.
          </p>

          <div className="vip-hero-cta-row">
            {renderPlanButton(
              'elite',
              'Join Elite VIP • ₹399 / year (Save 66%)',
              'vip-hero-btn elite',
              <span className="btn-icon"><DiamondIcon size={18} /></span>
            )}

            {renderPlanButton(
              'pro',
              'Join Pro Member • ₹99 / month',
              'vip-hero-btn pro',
              <span className="btn-icon"><CrownIcon size={18} /></span>
            )}
          </div>

          <div className="vip-hero-guarantees">
            <span className="guarantee-item">
              <CheckIcon size={13} className="check-icon-green" /> ₹0 Platform Fee
            </span>
            <span className="guarantee-item">
              <CheckIcon size={13} className="check-icon-green" /> Instant Activation
            </span>
            <span className="guarantee-item">
              <CheckIcon size={13} className="check-icon-green" /> Official Verified Badges
            </span>
            <span className="guarantee-item">
              <CheckIcon size={13} className="check-icon-green" /> UPI &amp; Cards Supported
            </span>
          </div>

          {/* ACTIVE MEMBERSHIP STATUS & CANCELLATION TRIGGER */}
          {hasActiveSubscription && (
            <div className={`vip-active-membership-banner ${activePlanKey}`}>
              <div className="vip-active-info">
                <div className="vip-active-icon-box">
                  {activePlanKey === 'elite' ? <DiamondIcon size={20} /> : <CrownIcon size={20} />}
                </div>
                <div className="vip-active-text">
                  <h4>Your {activePlanKey === 'elite' ? 'Royal Purple Elite VIP' : 'Golden Pro Member'} Subscription is Active</h4>
                  <p>
                    Full VIP privileges active until <strong>{new Date(eligibility?.activeSubscription?.validUntil || user?.membership?.validUntil).toLocaleDateString()}</strong> &bull; Under platform policy, you cannot request another subscription unless you cancel your current plan first.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="vip-page-cancel-btn"
                onClick={() => setCancelModalOpen(true)}
              >
                <ShieldOffIcon size={14} />
                <span>Cancel Active Subscription</span>
              </button>
            </div>
          )}

          {/* PENDING VERIFICATION STATUS BANNER */}
          {hasPendingRequest && (
            <div className="vip-active-membership-banner is-pending-banner">
              <div className="vip-active-info">
                <div className="vip-active-icon-box pending-box">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>
                <div className="vip-active-text">
                  <h4>Subscription Verification Pending</h4>
                  <p>
                    Your UPI payment of <strong>₹{eligibility.pendingSubscription?.amount || '399'} INR</strong> (UTR: <code>{eligibility.pendingSubscription?.utrNumber}</code>) for <strong>{eligibility.pendingSubscription?.plan?.toUpperCase()}</strong> is under review by the store admin. You cannot request another subscription until this request is approved or rejected.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* REJECTED PAYMENT NOTICE (ALLOWS RESUBMISSION) */}
          {hasRejectedRequest && !hasActiveSubscription && !hasPendingRequest && (
            <div className="vip-active-membership-banner is-rejected-banner">
              <div className="vip-active-info">
                <div className="vip-active-icon-box rejected-box">
                  <CloseIcon size={20} style={{ color: '#ef4444' }} />
                </div>
                <div className="vip-active-text">
                  <h4>Previous Payment Not Verified</h4>
                  <p>
                    Your previous payment submission for {eligibility.rejectedSubscription?.plan?.toUpperCase()} was rejected: "<em>{eligibility.rejectedSubscription?.rejectReason || 'UTR not verified'}</em>". You can now request and submit a new payment with your correct 12-digit UTR.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ========================================================
          2. SCREENSHOTS & BADGE SPOTLIGHT (Direct User Requirement)
          ======================================================== */}
      <section className="vip-screenshots-section">
        <div className="vip-section-header">
          <span className="vip-section-eyebrow">Visual In-App Demonstration</span>
          <h2 className="vip-section-title">
            Verified Community <span className="purple-text">Badges</span> &amp; <span className="gold-text">Spotlight</span>
          </h2>
          <p className="vip-section-subtitle">
            See exactly how your prestige badge, avatar glowing aura, and pinned reviews appear across Upper Store discussion boards and software pages:
          </p>
        </div>

        <div className="vip-screenshots-grid">
          {/* ELITE BADGE SCREENSHOT CARD */}
          <div className="screenshot-card elite-card">
            <div className="screenshot-card-header">
              <div className="card-badge-pill purple">
                <DiamondIcon size={14} />
                <span>Royal Purple Elite VIP</span>
              </div>
              <span className="card-tag-pill pinned-tag">
                <StarIcon size={12} fill="currentColor" /> Pinned Review Feature
              </span>
            </div>

            <div className="screenshot-frame" onClick={() => setLightboxImg(eliteBadgeScreenshot)}>
              <img
                src={eliteBadgeScreenshot}
                alt="Elite VIP Pinned Review Badge Screenshot"
                className="screenshot-img"
              />
              <div className="screenshot-zoom-overlay">
                <span>Click to Zoom Screenshot</span>
              </div>
            </div>

            <div className="screenshot-details">
              <h4>Royal Purple Diamond Badge &amp; Pinned Review</h4>
              <ul className="screenshot-perks-list">
                <li>
                  <span className="perk-bullet purple">
                    <CheckIcon size={12} />
                  </span>
                  <div>
                    <strong>Top-Ranked Pinned Review:</strong> Your review is pinned with a purple ribbon at the very top of product threads for thousands of creators to see.
                  </div>
                </li>
                <li>
                  <span className="perk-bullet purple">
                    <CheckIcon size={12} />
                  </span>
                  <div>
                    <strong>Royal Purple Diamond Pill:</strong> Verified Elite badge displayed directly beside your display name.
                  </div>
                </li>
                <li>
                  <span className="perk-bullet purple">
                    <CheckIcon size={12} />
                  </span>
                  <div>
                    <strong>Purple Glowing Avatar Ring:</strong> Luminescent frame around your profile avatar that stands out in dark mode.
                  </div>
                </li>
                <li>
                  <span className="perk-bullet purple">
                    <CheckIcon size={12} />
                  </span>
                  <div>
                    <strong>1 Full Year of ₹0 Platform Fees:</strong> Download unlimited free software with zero download fees for 365 days.
                  </div>
                </li>
              </ul>

              {renderPlanButton('elite', 'Activate Elite VIP • ₹399/yr', 'card-cta-btn elite')}
            </div>
          </div>

          {/* PRO BADGE SCREENSHOT CARD */}
          <div className="screenshot-card pro-card">
            <div className="screenshot-card-header">
              <div className="card-badge-pill gold">
                <CrownIcon size={14} />
                <span>Golden Pro VIP</span>
              </div>
              <span className="card-tag-pill gold-tag">
                <CrownIcon size={12} /> Crown Prestige
              </span>
            </div>

            <div className="screenshot-frame" onClick={() => setLightboxImg(proBadgeScreenshot)}>
              <img
                src={proBadgeScreenshot}
                alt="Pro VIP Golden Crown Badge Screenshot"
                className="screenshot-img"
              />
              <div className="screenshot-zoom-overlay">
                <span>Click to Zoom Screenshot</span>
              </div>
            </div>

            <div className="screenshot-details">
              <h4>Golden Crown Badge &amp; Priority Standing</h4>
              <ul className="screenshot-perks-list">
                <li>
                  <span className="perk-bullet gold">
                    <CheckIcon size={12} />
                  </span>
                  <div>
                    <strong>Official Golden Crown Badge:</strong> Verified golden crown icon and prestige badge displayed beside your username.
                  </div>
                </li>
                <li>
                  <span className="perk-bullet gold">
                    <CheckIcon size={12} />
                  </span>
                  <div>
                    <strong>Golden Avatar Frame:</strong> Circular golden border with subtle glow around your profile photo.
                  </div>
                </li>
                <li>
                  <span className="perk-bullet gold">
                    <CheckIcon size={12} />
                  </span>
                  <div>
                    <strong>₹0 Platform Fee on Free Downloads:</strong> Save {platformFee.enabled && platformFee.amount > 0 ? `₹${platformFee.amount} INR` : 'download'} platform fee on every free software download for 30 days.
                  </div>
                </li>
                <li>
                  <span className="perk-bullet gold">
                    <CheckIcon size={12} />
                  </span>
                  <div>
                    <strong>Priority High-Speed CDN:</strong> Instant access to high-bandwidth download nodes.
                  </div>
                </li>
              </ul>

              {renderPlanButton('pro', 'Activate Pro Member • ₹99/mo', 'card-cta-btn pro')}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================
          3. INTERACTIVE PRICING TIERS
          ======================================================== */}
      <section className="vip-pricing-section">
        <div className="vip-section-header">
          <span className="vip-section-eyebrow">Transparent Pricing</span>
          <h2 className="vip-section-title">
            Choose Your <span className="gold-text">VIP Standing</span>
          </h2>
          <p className="vip-section-subtitle">
            Cancel or renew anytime. Instant activation with zero hidden fees.
          </p>

          {hasActiveSubscription && (
            <div className="vip-developer-portal-banner" style={{ margin: '1.5rem auto 2rem', maxWidth: '820px', background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(212, 175, 55, 0.12) 100%)', border: '1px solid rgba(212, 175, 55, 0.35)', borderRadius: '16px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5), 0 0 25px rgba(212, 175, 55, 0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 9v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff', fontWeight: 800 }}>VIP Developer Studio Unlocked!</h4>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: '#cbd5e1' }}>
                    Publish your own products to Upper Store &amp; broadcast notifications to all users with your official VIP animated ring.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="launch-dev-studio-btn"
                onClick={() => setDevStudioOpen(true)}
                style={{ background: 'linear-gradient(135deg, #ffd700 0%, #d4af37 100%)', color: '#090a0f', border: 'none', padding: '0.65rem 1.3rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(212, 175, 55, 0.35)' }}
              >
                Launch Developer Studio ↗
              </button>
            </div>
          )}

          {/* BILLING TOGGLE */}
          <div className="vip-billing-toggle-wrap">
            <button
              type="button"
              className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
              onClick={() => setBillingCycle('monthly')}
            >
              Monthly Billing
            </button>
            <button
              type="button"
              className={`toggle-option ${billingCycle === 'annual' ? 'active' : ''}`}
              onClick={() => setBillingCycle('annual')}
            >
              Annual Billing
              <span className="save-badge">Save 66%</span>
            </button>
          </div>
        </div>

        <div className="vip-pricing-cards-grid">
          {/* FREE PLAN */}
          <div className="pricing-card free-tier">
            <div className="pricing-card-top">
              <span className="tier-label">Free Tier</span>
              <h3>Guest &bull; Free User</h3>
              <p className="tier-desc">Standard access to Upper Store catalog downloads and community features.</p>
              <div className="tier-price-box">
                <span className="price-currency">₹</span>
                <span className="price-val">0</span>
                <span className="price-period">/ forever</span>
              </div>
            </div>

            <div className="pricing-perks-box">
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span>Browse &amp; view all software releases</span>
              </div>
              <div className="perk-line fee-notice">
                <span className="fee-bullet">&bull;</span>
                <span>
                  {platformFee.enabled && platformFee.amount > 0 ? (
                    <><strong>₹{platformFee.amount} Platform Fee</strong> on free app downloads</>
                  ) : (
                    <><strong>₹0 Platform Fee</strong> (Waived by Store Admin)</>
                  )}
                </span>
              </div>
              <div className="perk-line excluded">
                <span className="cross-icon">&times;</span>
                <span>No VIP badge beside profile name</span>
              </div>
              <div className="perk-line excluded">
                <span className="cross-icon">&times;</span>
                <span>No pinned placement in review discussions</span>
              </div>
              <div className="perk-line excluded">
                <span className="cross-icon">&times;</span>
                <span>Standard download queue priority</span>
              </div>
            </div>

            <button type="button" className="tier-btn free" disabled>
              Standard Tier Active
            </button>
          </div>

          {/* PRO PLAN */}
          <div className={`pricing-card pro-tier ${billingCycle === 'monthly' ? 'highlight-cycle' : ''}`}>
            <div className="pricing-card-top">
              <span className="tier-label gold">
                <CrownIcon size={13} /> Monthly VIP Pass
              </span>
              <h3>Pro Member</h3>
              <p className="tier-desc">Perfect for active power users who download apps regularly.</p>
              <div className="tier-price-box">
                <span className="price-currency">₹</span>
                <span className="price-val">99</span>
                <span className="price-period">/ month</span>
              </div>
            </div>

            <div className="pricing-perks-box">
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span><strong>₹0 Platform Fee</strong> on all free app downloads</span>
              </div>
              <div className="perk-line included">
                <CrownIcon size={13} className="check-icon-gold" />
                <span><strong>Golden Crown VIP Badge</strong> on your profile &amp; reviews</span>
              </div>
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span><strong>Golden Aura Frame</strong> on your avatar</span>
              </div>
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span>Highlighted placement in community reviews</span>
              </div>
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span>Priority high-speed CDN bandwidth</span>
              </div>
            </div>

            {renderPlanButton('pro', 'Get Pro • ₹99 / mo', 'tier-btn pro', <CrownIcon size={15} />)}
          </div>

          {/* ELITE PLAN (BEST VALUE) */}
          <div className={`pricing-card elite-tier ${billingCycle === 'annual' ? 'highlight-cycle' : ''}`}>
            <div className="best-value-ribbon">MOST POPULAR &bull; SAVE 66%</div>
            <div className="pricing-card-top">
              <span className="tier-label purple">
                <DiamondIcon size={13} /> Annual All-Access
              </span>
              <h3>Elite VIP</h3>
              <p className="tier-desc">The ultimate tier: complete zero fees for 1 full year, pinned comments, and purple prestige.</p>
              <div className="tier-price-box">
                <span className="price-currency">₹</span>
                <span className="price-val">399</span>
                <span className="price-period">/ year (~₹33/mo)</span>
              </div>
            </div>

            <div className="pricing-perks-box">
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span><strong>₹0 Platform Fee for 365 Days</strong> on all downloads</span>
              </div>
              <div className="perk-line included">
                <DiamondIcon size={13} className="check-icon-purple" />
                <span><strong>Royal Purple Diamond Badge</strong> beside your name</span>
              </div>
              <div className="perk-line included">
                <StarIcon size={13} fill="#c084fc" />
                <span><strong>Pinned Reviews:</strong> Anchored at the top of every app page</span>
              </div>
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span><strong>Purple Glowing Avatar Aura</strong> in dark mode</span>
              </div>
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span>Dedicated Ultra-VIP CDN download servers</span>
              </div>
              <div className="perk-line included">
                <CheckIcon size={13} className="check-icon-green" />
                <span>Early access to new app beta releases &amp; updates</span>
              </div>
            </div>

            {renderPlanButton('elite', 'Get Elite VIP • ₹399 / yr', 'tier-btn elite', <DiamondIcon size={15} />)}
          </div>
        </div>
      </section>

      {/* ========================================================
          4. FEATURE COMPARISON MATRIX TABLE
          ======================================================== */}
      <section className="vip-matrix-section">
        <div className="vip-section-header">
          <span className="vip-section-eyebrow">Comprehensive Breakdown</span>
          <h2 className="vip-section-title">Plan Comparison Table</h2>
          <p className="vip-section-subtitle">A side-by-side look at everything included in our membership tiers:</p>
        </div>

        <div className="vip-table-wrapper">
          <table className="vip-comparison-table">
            <thead>
              <tr>
                <th className="table-feature-col">Feature / Privilege</th>
                <th className="table-tier-col">Free Tier</th>
                <th className="table-tier-col pro-col">Pro Member (₹99)</th>
                <th className="table-tier-col elite-col">Elite VIP (₹399)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Platform Fee on Free Downloads</td>
                <td className="fee-text">{platformFee.enabled && platformFee.amount > 0 ? `₹${platformFee.amount} INR / download` : '₹0 INR (Waived)'}</td>
                <td className="zero-fee-text"><strong>₹0 INR (Free)</strong></td>
                <td className="zero-fee-text elite"><strong>₹0 INR (Free)</strong></td>
              </tr>
              <tr>
                <td>Official Profile Badge</td>
                <td>None</td>
                <td className="gold-text"><CrownIcon size={13} /> Golden Crown</td>
                <td className="purple-text"><DiamondIcon size={13} /> Royal Purple Diamond</td>
              </tr>
              <tr>
                <td>Avatar Glowing Aura Frame</td>
                <td>Standard</td>
                <td className="gold-text">Golden Glow Ring</td>
                <td className="purple-text">Royal Purple Glow Ring</td>
              </tr>
              <tr>
                <td>Review Placement in Product Pages</td>
                <td>Standard Order</td>
                <td>Highlighted Priority</td>
                <td className="purple-text"><strong>Top-Ranked Pinned Comment</strong></td>
              </tr>
              <tr>
                <td>Membership Duration</td>
                <td>Unlimited</td>
                <td>30 Days (Stackable)</td>
                <td>365 Days (Stackable)</td>
              </tr>
              <tr>
                <td>CDN Download Bandwidth Priority</td>
                <td>Standard Node</td>
                <td>High-Speed Node</td>
                <td className="purple-text"><strong>Dedicated Ultra-VIP CDN</strong></td>
              </tr>
              <tr>
                <td>Confirmation Receipt &amp; Badge Certificate</td>
                <td>None</td>
                <td>Full Email Receipt</td>
                <td>Full Email Receipt</td>
              </tr>
              <tr>
                <td>Early Beta Access &amp; Feature Voting</td>
                <td>&times;</td>
                <td>&times;</td>
                <td className="purple-text"><CheckIcon size={14} className="check-icon-purple" /> Included</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ========================================================
          5. FAQ ACCORDION SECTION
          ======================================================== */}
      <section className="vip-faq-section">
        <div className="vip-section-header">
          <span className="vip-section-eyebrow">Got Questions?</span>
          <h2 className="vip-section-title">Frequently Asked Questions</h2>
          <p className="vip-section-subtitle">Everything you need to know about Upper VIP Club memberships and badges:</p>
        </div>

        <div className="vip-faq-accordion">
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div key={index} className={`faq-card ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="faq-question-btn"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-q-text">{faq.q}</span>
                  <span className={`faq-toggle-icon ${isOpen ? 'rotated' : ''}`}>+</span>
                </button>
                {isOpen && (
                  <div className="faq-answer-content">
                    <p>{faq.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ========================================================
          6. BOTTOM CALL TO ACTION BANNER
          ======================================================== */}
      <section className="vip-bottom-cta-section">
        <div className="vip-bottom-cta-card">
          <div className="cta-sparkle-ring">
            <SparkleIcon size={32} />
          </div>
          <h2>Ready to Elevate Your Upper Store Experience?</h2>
          <p>Join hundreds of developers and creators enjoying ₹0 platform fees and official verified VIP badges.</p>
          <div className="cta-btn-pair">
            {renderPlanButton(
              'elite',
              'Activate Elite VIP • ₹399/yr',
              'vip-hero-btn elite',
              <DiamondIcon size={18} />
            )}
            {renderPlanButton(
              'pro',
              'Activate Pro Member • ₹99/mo',
              'vip-hero-btn pro',
              <CrownIcon size={18} />
            )}
          </div>
        </div>
      </section>

      {/* LIGHTBOX MODAL FOR SCREENSHOTS */}
      {lightboxImg && (
        <div className="vip-lightbox-backdrop" onClick={() => setLightboxImg(null)}>
          <div className="vip-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button className="vip-lightbox-close" onClick={() => setLightboxImg(null)}>
              <CloseIcon size={18} />
            </button>
            <img src={lightboxImg} alt="Enlarged screenshot preview" className="lightbox-img-full" />
            <p className="lightbox-caption">Official Upper Store Verified Badge &amp; Pinned Review Discussion</p>
          </div>
        </div>
      )}

      {/* VIP CHECKOUT MODAL */}
      <VipClubModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          fetchEligibility();
        }}
        defaultPlan={modalPlan}
      />

      {/* CANCEL SUBSCRIPTION CONFIRMATION MODAL */}
      <CancelSubscriptionModal
        isOpen={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          fetchEligibility();
        }}
        onCancelled={() => {
          fetchEligibility();
        }}
      />
    </div>
  );
};

export default VipClub;
