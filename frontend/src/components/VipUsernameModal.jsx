import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { isUserVipActive, getUserVipTier } from '../utils/vipValidator';
import './VipUsernameModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const VipUsernameModal = ({ isOpen, onClose, onOpenVipClub }) => {
  const { user, token, updateUsername } = useAuth();
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [availability, setAvailability] = useState(null); // { available: bool, message: string }
  const [statusLoading, setStatusLoading] = useState(true);
  const [quotaStatus, setQuotaStatus] = useState(null); // { changesUsed, changesRemaining, canChange, nextEligibleDate }
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isVip = isUserVipActive(user);
  const vipTier = getUserVipTier(user);
  const currentUsername = user?.username || user?.email?.split('@')[0] || '';

  // Fetch live quota status from server
  const fetchQuotaStatus = async () => {
    if (!token) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/user/username/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setQuotaStatus(data);
      }
    } catch (err) {
      console.warn('Could not fetch username quota:', err);
    } finally {
      setStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setNewUsername('');
      setErrorMsg('');
      setSuccessMsg('');
      setAvailability(null);
      fetchQuotaStatus();
    }
  }, [isOpen]);

  // Debounced live availability check
  useEffect(() => {
    const clean = newUsername.trim().toLowerCase().replace(/^@+/, '');
    if (!clean || clean.length < 3) {
      setAvailability(null);
      return;
    }

    if (clean === currentUsername.toLowerCase()) {
      setAvailability({ available: true, message: 'This is your current handle.', isCurrent: true });
      return;
    }

    // Format validation
    if (!/^[a-z0-9_.]+$/.test(clean)) {
      setAvailability({
        available: false,
        message: 'Only small letters (a-z), numbers (0-9), underscores (_), and dots (.) are allowed.',
      });
      return;
    }

    setCheckingAvailability(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/username/check/${encodeURIComponent(clean)}`);
        if (res.ok) {
          const data = await res.json();
          setAvailability(data);
        }
      } catch (err) {
        console.warn('Availability check failed:', err);
      } finally {
        setCheckingAvailability(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [newUsername, currentUsername]);

  // Handle Input Changes with auto-formatting
  const handleInputChange = (e) => {
    let val = e.target.value.toLowerCase();
    // If user starts with '@', strip it automatically
    if (val.startsWith('@')) {
      val = val.replace(/^@+/, '');
    }
    // Filter out disallowed characters on the fly
    val = val.replace(/[^a-z0-9_.]/g, '');
    if (val.length <= 30) {
      setNewUsername(val);
      setErrorMsg('');
    }
  };

  // Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const clean = newUsername.trim().toLowerCase().replace(/^@+/, '');

    if (!isVip) {
      setErrorMsg('Custom username personalization is an exclusive Upper VIP perk.');
      return;
    }

    if (quotaStatus && quotaStatus.changesRemaining <= 0) {
      setErrorMsg('You have already used your 2 annual username changes.');
      return;
    }

    if (!clean || clean.length < 3) {
      setErrorMsg('Username must be at least 3 characters long.');
      return;
    }

    if (clean === currentUsername.toLowerCase()) {
      setErrorMsg('Please choose a different username than your current one.');
      return;
    }

    if (!/^[a-z0-9_.]+$/.test(clean)) {
      setErrorMsg('Username can only contain small letters (a-z), numbers (0-9), underscores (_), and dots (.).');
      return;
    }

    setLoading(true);
    try {
      const data = await updateUsername(clean);
      setSuccessMsg(data.message || `Username successfully updated to @${clean}.`);
      setNewUsername('');
      await fetchQuotaStatus();
      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update username.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const changesUsed = quotaStatus?.changesUsed ?? 0;
  const changesRemaining = quotaStatus?.changesRemaining ?? 2;
  const isAtLimit = quotaStatus && quotaStatus.changesRemaining <= 0;

  return (
    <div className="vip-username-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="vip-username-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vip-username-header">
          <div className="vip-username-title-wrap">
            <div className={`vip-username-crown-badge ${vipTier}`}>
              {vipTier === 'elite' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h12l4 6-10 12L2 9z"/>
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14"/>
                </svg>
              )}
            </div>
            <div>
              <h3>VIP Custom Handle</h3>
              <p>Personalize your verified @username across Upper Store</p>
            </div>
          </div>
          <button className="vip-username-close" onClick={onClose} title="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Current Handle Box */}
        <div className="vip-username-current-card">
          <div className="current-card-left">
            <span className="current-card-label">Current Handle</span>
            <span className="current-card-handle">@{currentUsername}</span>
          </div>
          <span className={`current-vip-badge ${vipTier}`}>
            {vipTier === 'elite' ? 'Elite VIP' : vipTier === 'pro' ? 'Pro VIP' : 'Free Member'}
          </span>
        </div>

        {/* Non-VIP Notice */}
        {!isVip && (
          <div className="vip-username-locked-card">
            <div className="locked-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
            </div>
            <div className="locked-info">
              <h4>VIP Member Privilege</h4>
              <p>Custom username personalization is an exclusive perk for verified VIP members, who may update their handle up to twice per year.</p>
            </div>
            <button
              type="button"
              className="vip-unlock-btn"
              onClick={() => {
                onClose();
                if (onOpenVipClub) onOpenVipClub();
              }}
            >
              Join VIP Club &rarr;
            </button>
          </div>
        )}

        {/* VIP Rate Limit Quota Card */}
        {isVip && (
          <div className="vip-quota-card">
            <div className="quota-header">
              <span className="quota-title">Annual Change Allowance</span>
              <span className={`quota-pill ${isAtLimit ? 'limit-reached' : ''}`}>
                {changesUsed} of 2 Used ({changesRemaining} Remaining)
              </span>
            </div>
            <div className="quota-bar-track">
              <div
                className={`quota-bar-fill ${isAtLimit ? 'full' : ''}`}
                style={{ width: `${(changesUsed / 2) * 100}%` }}
              />
            </div>
            <p className="quota-hint">
              VIP members are permitted to update their verified @username twice in any 12-month period to protect identity integrity.
            </p>

            {isAtLimit && quotaStatus?.nextEligibleDate && (
              <div className="quota-limit-alert">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>
                  Annual limit reached. Next change eligible on{' '}
                  <strong>
                    {new Date(quotaStatus.nextEligibleDate).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </strong>.
                </span>
              </div>
            )}
          </div>
        )}

        {/* Input Form */}
        {isVip && (
          <form onSubmit={handleSubmit} className="vip-username-form">
            <div className="form-field-wrapper">
              <label htmlFor="vip-handle-input">
                New Handle <span className="req-star">*</span>
              </label>

              <div className={`handle-input-box ${errorMsg ? 'has-error' : availability?.available && !availability?.isCurrent ? 'is-valid' : ''}`}>
                <span className="handle-at-symbol">@</span>
                <input
                  id="vip-handle-input"
                  type="text"
                  placeholder="alex_dev.99"
                  value={newUsername}
                  onChange={handleInputChange}
                  disabled={loading || isAtLimit || statusLoading}
                  maxLength={30}
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                />
                {checkingAvailability && (
                  <span className="handle-spinner" title="Checking availability..." />
                )}
              </div>

              {/* Live Availability & Rule Feedback */}
              {availability && !checkingAvailability && (
                <div className={`handle-feedback ${availability.available ? (availability.isCurrent ? 'info' : 'success') : 'error'}`}>
                  {availability.available ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  )}
                  <span>{availability.message}</span>
                </div>
              )}

              <small className="handle-rules-note">
                Allowed: lowercase letters (a-z), numbers (0-9), underscores (_), and dots (.). Length: 3-30 chars.
              </small>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="vip-username-banner error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Banner */}
            {successMsg && (
              <div className="vip-username-banner success">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="vip-username-actions">
              <button
                type="button"
                className="vip-btn-cancel"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="vip-btn-save"
                disabled={
                  loading ||
                  isAtLimit ||
                  !newUsername ||
                  newUsername.length < 3 ||
                  (availability && !availability.available) ||
                  availability?.isCurrent
                }
              >
                {loading ? 'Saving Handle...' : 'Update Handle'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

