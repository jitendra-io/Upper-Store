/**
 * Centralized VIP Membership Validator for Upper Store
 * Validates whether a user has an active, valid, non-cancelled VIP membership.
 */

/**
 * @param {object|null} user - The user object from AuthContext
 * @returns {boolean}
 */
export const isUserVipActive = (user) => {
  if (!user || typeof user !== 'object') return false;
  const membership = user.membership;
  if (!membership || typeof membership !== 'object') return false;
  if (membership.isCancelled) return false;
  if (membership.plan !== 'pro' && membership.plan !== 'elite') return false;
  if (!membership.validUntil) return false;
  const expiry = new Date(membership.validUntil).getTime();
  if (isNaN(expiry)) return false;
  return expiry > Date.now();
};

/**
 * Returns the validated active plan ('elite' | 'pro' | 'free').
 * @param {object|null} user
 * @returns {'elite'|'pro'|'free'}
 */
export const getUserVipTier = (user) => {
  return isUserVipActive(user) ? user.membership.plan : 'free';
};

