import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isUserVipActive } from '../utils/vipValidator';
import { CrownIcon, DiamondIcon, SparkleIcon, ArrowRightIcon, CheckIcon } from './Icons';
import './VipPromoBanner.css';

const VipPromoBanner = ({ onOpenVipModal, compact = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Premium Members: Remove the promotional subscription banner completely
  if (isUserVipActive(user)) {
    return null;
  }

  const handleBannerClick = () => {
    navigate('/vip-club');
  };

  const handleQuickSubscribe = (e, plan = 'elite') => {
    e.stopPropagation();
    if (typeof onOpenVipModal === 'function') {
      onOpenVipModal(plan);
    } else {
      navigate('/vip-club');
    }
  };

  return (
    <div className={`vip-promo-banner-container ${compact ? 'compact' : ''}`} onClick={handleBannerClick}>
      {/* AMBIENT AURORA GLOWS */}
      <div className="vip-banner-glow-left" />
      <div className="vip-banner-glow-right" />

      <div className="vip-banner-inner">
        {/* LEFT COLUMN: BADGE HIGHLIGHT & HEADLINE */}
        <div className="vip-banner-content">
          <div className="vip-banner-eyebrow">
            <span className="vip-sparkle-icon">
              <SparkleIcon size={14} />
            </span>
            <span className="eyebrow-text">UPPER VIP CLUB &bull; OFFICIAL MEMBERSHIP</span>
            <span className="vip-fee-waive-tag">₹0 PLATFORM FEES</span>
          </div>

          <h3 className="vip-banner-headline">
            Unlock <span className="text-gold">Zero Platform Fees</span> &amp; <span className="text-purple">VIP Community Badges</span>
          </h3>

          <p className="vip-banner-subtext">
            Elevate your downloads with official <strong>Golden Crown</strong> and <strong>Royal Purple Diamond</strong> badges, pinned review placement, and 100% complimentary downloads.
          </p>

          <div className="vip-banner-perks-row">
            <span className="banner-perk-item">
              <CheckIcon size={13} className="perk-check" /> ₹0 Platform Fee
            </span>
            <span className="banner-perk-item">
              <CrownIcon size={13} className="perk-gold" /> Golden Pro Badge
            </span>
            <span className="banner-perk-item">
              <DiamondIcon size={13} className="perk-purple" /> Pinned Elite Reviews
            </span>
            <span className="banner-perk-item">
              <CheckIcon size={13} className="perk-check" /> Ultra-Speed CDN
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE PLAN CHIPS & CTA BUTTONS */}
        <div className="vip-banner-actions-wrapper">
          <div className="vip-banner-plans-chips">
            {/* PRO PILL */}
            <div className="vip-mini-chip pro" onClick={(e) => handleQuickSubscribe(e, 'pro')}>
              <div className="chip-badge-circle gold">
                <CrownIcon size={14} />
              </div>
              <div className="chip-info">
                <span className="chip-tier-name">Pro Member</span>
                <span className="chip-tier-price">₹99 <small>/ month</small></span>
              </div>
              <span className="chip-arrow">&rarr;</span>
            </div>

            {/* ELITE PILL (BEST VALUE) */}
            <div className="vip-mini-chip elite" onClick={(e) => handleQuickSubscribe(e, 'elite')}>
              <span className="chip-save-ribbon">SAVE 66%</span>
              <div className="chip-badge-circle purple">
                <DiamondIcon size={14} />
              </div>
              <div className="chip-info">
                <span className="chip-tier-name">Elite VIP</span>
                <span className="chip-tier-price">₹399 <small>/ year</small></span>
              </div>
              <span className="chip-arrow">&rarr;</span>
            </div>
          </div>

          {/* MAIN ACTION CTA */}
          <div className="vip-banner-btn-group">
            <button
              type="button"
              className="vip-banner-explore-btn"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/vip-club');
              }}
            >
              <span>Explore VIP Benefits</span>
              <ArrowRightIcon size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VipPromoBanner;
