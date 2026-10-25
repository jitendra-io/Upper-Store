import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShieldOffIcon,
  CrownIcon,
  DiamondIcon,
  AlertTriangleIcon,
  CloseIcon,
  CheckIcon
} from './Icons';
import './CancelSubscriptionModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CancelSubscriptionModal = ({ isOpen, onClose, onCancelled }) => {
  const { user, updateMembership } = useAuth();
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen]);

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: true }));
    } else {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
    }
    return () => {
      document.body.style.overflow = '';
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPlan = user?.membership?.plan || 'free';
  const isElite = currentPlan === 'elite';
  const isMatch = confirmText.trim().toLowerCase() === 'cancel';

  const handleCancelSubscription = async (e) => {
    e.preventDefault();
    if (!isMatch) {
      setErrorMsg('You must type "cancel" into the confirmation field to proceed.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const token = localStorage.getItem('upper_user_token');
      const res = await fetch(`${API_BASE}/api/payments/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ confirmation: confirmText.trim().toLowerCase() })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to cancel subscription.');
      }

      setSuccessMsg(data.message || 'Subscription successfully cancelled.');

      // Update global user membership state immediately in AuthContext
      if (typeof updateMembership === 'function') {
        updateMembership(data.membership || { plan: 'free', badge: null, validUntil: null });
      }

      if (typeof onCancelled === 'function') {
        onCancelled(data.membership);
      }

      // Close modal after brief delay to show confirmation
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err) {
      setErrorMsg(err.message || 'Error occurred while processing cancellation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cancel-modal-backdrop" onClick={onClose}>
      <div className="cancel-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* MODAL CLOSE BUTTON */}
        <button
          type="button"
          className="cancel-modal-close-btn"
          onClick={onClose}
          aria-label="Close cancel subscription dialog"
          disabled={loading}
        >
          <CloseIcon size={16} />
        </button>

        {/* HEADER */}
        <div className="cancel-modal-header">
          <div className="cancel-danger-icon-ring">
            <ShieldOffIcon size={26} />
          </div>
          <h2 className="cancel-modal-title">Cancel VIP Subscription</h2>
          <p className="cancel-modal-desc">
            Ending your subscription immediately terminates all VIP membership facilities and reverts your account to the Free Tier.
          </p>
        </div>

        {/* ACTIVE PLAN BADGE BOX */}
        <div className={`cancel-plan-box ${isElite ? 'elite' : 'pro'}`}>
          <div className="cancel-plan-icon">
            {isElite ? <DiamondIcon size={18} /> : <CrownIcon size={18} />}
          </div>
          <div className="cancel-plan-details">
            <span className="cancel-plan-name">
              {isElite ? 'Royal Purple Elite VIP' : 'Golden Pro Member'}
            </span>
            <span className="cancel-plan-validity">
              {user?.membership?.validUntil
                ? `Active until: ${new Date(user.membership.validUntil).toLocaleDateString()}`
                : 'Active VIP Standing'}
            </span>
          </div>
          <span className="cancel-plan-active-tag">Active</span>
        </div>

        {/* BENEFITS INVALIDATION LIST */}
        <div className="cancel-warning-box">
          <div className="cancel-warning-title">
            <AlertTriangleIcon size={15} />
            <span>Facilities Invalidation Notice:</span>
          </div>
          <ul className="cancel-revoked-list">
            <li>
              <span className="revoked-bullet">&times;</span>
              <span><strong>Platform Fee Waiver Invalidation:</strong> Free downloads will revert to the standard ₹19 INR platform fee.</span>
            </li>
            <li>
              <span className="revoked-bullet">&times;</span>
              <span><strong>Prestige Badge Removal:</strong> Your {isElite ? 'Royal Purple Diamond' : 'Golden Crown'} badge will be removed immediately from your profile and comments.</span>
            </li>
            <li>
              <span className="revoked-bullet">&times;</span>
              <span><strong>Review Standing Revocation:</strong> Your product reviews will no longer be pinned at the top of software pages.</span>
            </li>
            <li>
              <span className="revoked-bullet">&times;</span>
              <span><strong>VIP CDN Priority Revocation:</strong> High-bandwidth download servers will be disabled for your account.</span>
            </li>
          </ul>
        </div>

        {/* CONFIRMATION INPUT FORM */}
        <form onSubmit={handleCancelSubscription} className="cancel-form">
          <div className="cancel-input-group">
            <label htmlFor="confirm-cancel-input" className="cancel-input-label">
              Type <span className="highlight-cancel-keyword">cancel</span> to confirm:
            </label>
            <input
              id="confirm-cancel-input"
              type="text"
              className={`cancel-text-input ${isMatch ? 'valid' : confirmText ? 'invalid' : ''}`}
              placeholder="Type 'cancel' to unlock button"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setErrorMsg('');
              }}
              disabled={loading || !!successMsg}
              autoComplete="off"
              autoFocus
            />
            {confirmText && (
              <span className={`cancel-match-indicator ${isMatch ? 'match' : 'no-match'}`}>
                {isMatch ? (
                  <>
                    <CheckIcon size={13} strokeWidth={3} /> Confirmation recognized
                  </>
                ) : (
                  <>Must match 'cancel' exactly</>
                )}
              </span>
            )}
          </div>

          {/* ERROR ALERT */}
          {errorMsg && (
            <div className="cancel-error-alert">
              <AlertTriangleIcon size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SUCCESS ALERT */}
          {successMsg && (
            <div className="cancel-success-alert">
              <CheckIcon size={14} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* ACTION BUTTONS */}
          <div className="cancel-actions-row">
            <button
              type="button"
              className="cancel-keep-btn"
              onClick={onClose}
              disabled={loading}
            >
              Keep My Membership
            </button>

            <button
              type="submit"
              className={`cancel-confirm-btn ${isMatch ? 'unlocked' : 'locked'}`}
              disabled={!isMatch || loading || !!successMsg}
            >
              {loading ? (
                <span className="cancel-btn-loading">
                  <span className="cancel-spinner"></span>
                  Invalidating Facilities...
                </span>
              ) : (
                <span>Cancel My Subscription</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelSubscriptionModal;
