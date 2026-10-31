import React from 'react';
import { CrownIcon, DiamondIcon } from './Icons';
import './VipAvatar.css';

/**
 * VipAvatar Component
 * Renders user avatar with optional animated rotating conic border & breathing ambient glow.
 *
 * @param {string} src - Avatar image URL
 * @param {string} alt - Alt text
 * @param {'elite'|'pro'|'free'} plan - Validated membership tier
 * @param {'sm'|'md'|'lg'|'xl'} size - Avatar size (sm: 32px, md: 44px, lg: 64px, xl: 84px)
 * @param {string} className - Optional container class
 * @param {string} fallbackSeed - Optional seed for avatar fallback
 */
export const VipAvatar = ({
  src,
  alt = 'User profile',
  plan = 'free',
  size = 'md',
  className = '',
  fallbackSeed = 'user',
}) => {
  const isElite = plan === 'elite';
  const isPro = plan === 'pro';
  const tierClass = isElite ? 'elite' : isPro ? 'pro' : 'standard';

  const defaultAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
    fallbackSeed || 'user'
  )}&backgroundColor=d4af37&textColor=000000`;

  return (
    <div className={`vip-avatar-wrap ${tierClass} ${size} ${className}`} title={isElite ? 'Elite VIP' : isPro ? 'Pro VIP' : 'Member'}>
      <img
        src={src || defaultAvatar}
        alt={alt}
        className="vip-avatar-inner-img"
        referrerPolicy="no-referrer"
        onError={(e) => {
          e.target.onerror = null;
          e.target.src = defaultAvatar;
        }}
      />
    </div>
  );
};

/**
 * VipFlairBadge Component
 * Renders an iridescent animated status flair badge beside user names.
 *
 * @param {'elite'|'pro'|'free'} plan - Validated membership tier
 * @param {boolean} compact - Compact padding for dense mobile toolbars
 * @param {string} className - Additional CSS class
 */
export const VipFlairBadge = ({ plan = 'free', compact = false, className = '' }) => {
  if (plan !== 'elite' && plan !== 'pro') return null;

  const isElite = plan === 'elite';

  return (
    <span
      className={`vip-flair-badge ${isElite ? 'elite' : 'pro'} ${compact ? 'compact' : ''} ${className}`}
      title={isElite ? 'Official Royal Purple Elite VIP' : 'Official Golden Crown Pro VIP'}
    >
      <span className="vip-flair-icon">
        {isElite ? <DiamondIcon size={12} /> : <CrownIcon size={12} />}
      </span>
      <span>
        {isElite ? 'Elite' : 'Pro'}{' '}
        <span className="flair-long-text">VIP</span>
      </span>
    </span>
  );
};

export default VipAvatar;

