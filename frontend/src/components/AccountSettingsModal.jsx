import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { VipAvatar } from './VipAvatar';
import { getUserVipTier } from '../utils/vipValidator';
import {
  GearIcon,
  CrownIcon,
  DiamondIcon,
  CloseIcon,
  ArrowRightIcon,
} from './Icons';
import './AccountSettingsModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function AccountSettingsModal({
  isOpen,
  onClose,
  currentUser = null,
  onOpenVipClub,
  onOpenCancelSub,
  onOpenHistory,
  onOpenLicenses,
  downloadCount = 0,
  licenseCount = 0,
}) {
  const { user: authUser, token, logout, withdrawConsent } = useAuth();
  const user = currentUser || authUser;

  // Lock background scroll when modal is active
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: true }));
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
    };
  }, [isOpen]);

  // Handle ESC key to dismiss modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isVipActive =
    (user?.membership?.plan === 'pro' || user?.membership?.plan === 'elite') &&
    user?.membership?.validUntil &&
    new Date(user.membership.validUntil) > new Date();

  const userAvatar =
    user?.photoURL ||
    `https://unavatar.io/${encodeURIComponent(
      user?.email ? user.email.trim().toLowerCase() : 'user'
    )}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(
      user?.email || 'user'
    )}`;

  const handleWithdrawConsent = async () => {
    if (user?.consentStatus === 'withdrawn') {
      alert('Your consent is currently withdrawn. You may re-grant consent at any time.');
      return;
    }
    if (
      window.confirm(
        'Withdraw Consent:\n\nAre you sure you want to withdraw your consent? Withdrawing consent will pause non-essential personal data processing and deactivate developer publishing privileges (if registered).\n\nYou may re-grant consent at any time in your profile settings.\n\nDo you wish to proceed?'
      )
    ) {
      try {
        const res = await withdrawConsent();
        alert(res.message || 'Consent successfully withdrawn.');
      } catch (err) {
        alert(err.message || 'Failed to withdraw consent. Please contact support.');
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        'Delete Account & Erase Data: Are you sure you want to permanently delete your account and erase all associated personal data from Upper Store? This action is irreversible.'
      )
    ) {
      try {
        const activeToken =
          token ||
          localStorage.getItem('upper_user_token') ||
          localStorage.getItem('adminToken');
        const res = await fetch(`${API_BASE}/api/auth/user/delete-account`, {
          method: 'DELETE',
          headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
        });
        const data = await res.json();
        alert(data.message || 'Your account and data have been erased successfully.');
        logout();
        onClose();
      } catch {
        alert('Failed to erase account data. Please contact support.');
      }
    }
  };

  const handleSignOut = () => {
    if (window.confirm('Are you sure you want to sign out of your account?')) {
      logout();
      onClose();
    }
  };

  const modalContent = (
    <div
      className="settings-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div className="settings-modal-container">
        {/* Header */}
        <div className="settings-modal-header">
          <div className="settings-modal-title-row">
            <span className="settings-modal-title-icon">
              <GearIcon size={18} />
            </span>
            <h2 className="settings-modal-title">Account Settings</h2>
          </div>
          <button
            type="button"
            className="settings-modal-close-btn"
            onClick={onClose}
            aria-label="Close settings"
          >
            <CloseIcon size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="settings-modal-body">
          {/* 1. Profile Identity Card */}
          <div className="settings-profile-card">
            <VipAvatar
              src={userAvatar}
              alt={user?.displayName || 'User'}
              plan={getUserVipTier(user)}
              size="lg"
              fallbackSeed={user?.email || 'user'}
            />
            <div className="settings-profile-info">
              <div className="settings-profile-name-row">
                <span className="settings-profile-name">{user?.displayName || 'User'}</span>
              </div>
              <Link
                to={`/developer/${user?.username || user?.email?.split('@')[0]}`}
                className="settings-profile-handle"
                onClick={onClose}
                title="View your public developer profile"
              >
                @{user?.username || user?.email?.split('@')[0]}
              </Link>
              <p className="settings-profile-email" title={user?.email}>
                {user?.email}
              </p>
              {isVipActive && (
                <div className="settings-profile-badges">
                  {user?.membership?.plan === 'elite' ? (
                    <span className="dropdown-vip-status-badge elite">
                      <DiamondIcon size={12} /> Elite VIP
                    </span>
                  ) : user?.membership?.plan === 'pro' ? (
                    <span className="dropdown-vip-status-badge pro">
                      <CrownIcon size={12} /> Pro VIP
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          {/* 2. VIP Membership Section */}
          <div className="settings-section-card">
            <h3 className="settings-section-heading">Membership &amp; Subscription</h3>

            {isVipActive && user?.membership?.validUntil && (
              <div className="settings-vip-well">
                <div className="settings-vip-well-info">
                  <span className="settings-vip-well-label">VIP Active Until</span>
                  <span className="settings-vip-well-date">
                    {new Date(user.membership.validUntil).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  className="settings-vip-cancel-btn"
                  onClick={() => {
                    onClose();
                    if (onOpenCancelSub) onOpenCancelSub();
                  }}
                  title="Cancel VIP membership subscription"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              type="button"
              className="settings-action-row vip-card-highlight"
              onClick={() => {
                onClose();
                if (onOpenVipClub) onOpenVipClub();
              }}
            >
              <div className="settings-action-left">
                <span className="settings-action-icon vip">
                  {user?.membership?.plan === 'elite' ? (
                    <DiamondIcon size={16} />
                  ) : (
                    <CrownIcon size={16} />
                  )}
                </span>
                <div className="settings-action-texts">
                  <span className="settings-action-label">Upper VIP Club</span>
                  <span className="settings-action-desc">
                    Priority access, verified badges &amp; unlimited downloads
                  </span>
                </div>
              </div>
              <div className="settings-action-right">
                {isVipActive && user?.membership?.plan && (
                  <span className="settings-badge-pill active">
                    {user.membership.plan.toUpperCase()}
                  </span>
                )}
                <ArrowRightIcon size={15} style={{ color: '#94a3b8' }} />
              </div>
            </button>
          </div>

          {/* 3. Library & Activity */}
          <div className="settings-section-card">
            <h3 className="settings-section-heading">Library &amp; History</h3>

            <button
              type="button"
              className="settings-action-row"
              onClick={() => {
                onClose();
                if (onOpenHistory) onOpenHistory();
              }}
            >
              <div className="settings-action-left">
                <span className="settings-action-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </span>
                <div className="settings-action-texts">
                  <span className="settings-action-label">Download History</span>
                  <span className="settings-action-desc">
                    View previous software and tool installations
                  </span>
                </div>
              </div>
              <div className="settings-action-right">
                <span className="settings-count-tag">{downloadCount}</span>
                <ArrowRightIcon size={15} style={{ color: '#94a3b8' }} />
              </div>
            </button>

            <button
              type="button"
              className="settings-action-row"
              onClick={() => {
                onClose();
                if (onOpenLicenses) onOpenLicenses();
              }}
            >
              <div className="settings-action-left">
                <span className="settings-action-icon">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 2l-2 2m-1-1l-3 3m1 1l-2 2m-1-1l-2 2m-1-1l-2 2m-1-1l-3 3" />
                    <circle cx="7.5" cy="15.5" r="5.5" />
                  </svg>
                </span>
                <div className="settings-action-texts">
                  <span className="settings-action-label">My Licenses</span>
                  <span className="settings-action-desc">
                    Commercial activations &amp; software keys
                  </span>
                </div>
              </div>
              <div className="settings-action-right">
                <span className="settings-count-tag">{licenseCount}</span>
                <ArrowRightIcon size={15} style={{ color: '#94a3b8' }} />
              </div>
            </button>
          </div>

          {/* 4. Privacy & Data Governance */}
          <div className="settings-section-card">
            <h3 className="settings-section-heading">Privacy &amp; Data</h3>
            <div className="settings-privacy-list">
              <button
                type="button"
                className="settings-privacy-btn"
                onClick={handleWithdrawConsent}
              >
                <span>
                  {user?.consentStatus === 'withdrawn'
                    ? 'Consent Status: Withdrawn'
                    : 'Withdraw Personal Data Consent'}
                </span>
                <ArrowRightIcon size={14} style={{ color: '#94a3b8' }} />
              </button>

              <button
                type="button"
                className="settings-privacy-btn danger"
                onClick={handleDeleteAccount}
              >
                <span>Delete Account &amp; Erase Personal Data</span>
                <ArrowRightIcon size={14} style={{ color: '#ef4444' }} />
              </button>

              <button
                type="button"
                className="settings-privacy-btn danger signout-row-btn"
                onClick={handleSignOut}
              >
                <span>Sign Out of Account</span>
                <ArrowRightIcon size={14} style={{ color: '#ef4444' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="settings-modal-footer">
          <button
            type="button"
            className="settings-signout-btn"
            onClick={handleSignOut}
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
