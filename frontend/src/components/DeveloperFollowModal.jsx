import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { VipAvatar } from './VipAvatar';
import { useAuth } from '../context/AuthContext';
import './DeveloperFollowModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Global in-memory cache to eliminate UI freezing and provide 0ms instant tab switching
const followListsCache = {
  followers: {},
  following: {},
};

const DeveloperFollowModal = ({
  isOpen,
  onClose,
  username,
  initialTab = 'followers',
  followersCount = 0,
  followingCount = 0,
  isOwner = false,
  onFollowerRemoved,
  onFollowingChanged,
}) => {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = useState(initialTab || 'followers');
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [removingUsername, setRemovingUsername] = useState(null);
  const [confirmRemoveUser, setConfirmRemoveUser] = useState(null);
  const [unfollowingUsername, setUnfollowingUsername] = useState(null);
  const [confirmUnfollowUser, setConfirmUnfollowUser] = useState(null);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [localFollowersCount, setLocalFollowersCount] = useState(followersCount);
  const [localFollowingCount, setLocalFollowingCount] = useState(followingCount);

  useEffect(() => {
    setLocalFollowersCount(followersCount);
  }, [followersCount]);

  useEffect(() => {
    setLocalFollowingCount(followingCount);
  }, [followingCount]);

  const modalHistoryKeyRef = useRef(`upper-follow-modal-${Date.now()}`);
  const closedByPopstateRef = useRef(false);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const cleanUsername = useMemo(() => {
    return (username || '').replace(/^@/, '').trim().toLowerCase();
  }, [username]);

  const isProfileOwner = useMemo(() => {
    if (isOwner) return true;
    if (!user || !cleanUsername) return false;
    const uHandle = (user.username || '').toLowerCase().trim();
    const uEmailPrefix = (user.email || '').toLowerCase().trim().split('@')[0];
    return uHandle === cleanUsername || uEmailPrefix === cleanUsername;
  }, [isOwner, user, cleanUsername]);

  // Sync initial tab and pre-populate from instant memory cache
  useEffect(() => {
    if (isOpen) {
      const tabToUse = initialTab || 'followers';
      setActiveTab(tabToUse);
      setSearchQuery('');
      setError(null);

      // Hydrate immediately from cache if available (0ms instant response)
      if (cleanUsername) {
        if (followListsCache.followers[cleanUsername]) {
          setFollowers(followListsCache.followers[cleanUsername]);
        }
        if (followListsCache.following[cleanUsername]) {
          setFollowing(followListsCache.following[cleanUsername]);
        }
      }
    }
  }, [isOpen, initialTab, cleanUsername]);

  // Fetch list helper with background revalidation and cache update
  const fetchList = useCallback(async (tabToFetch) => {
    if (!cleanUsername) return;

    const cachedData = followListsCache[tabToFetch]?.[cleanUsername];
    if (cachedData) {
      if (tabToFetch === 'followers') {
        setFollowers(cachedData);
      } else {
        setFollowing(cachedData);
      }
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const endpoint = tabToFetch === 'followers'
        ? `${API_BASE}/api/developers/${cleanUsername}/followers`
        : `${API_BASE}/api/developers/${cleanUsername}/following`;

      const res = await fetch(endpoint);
      const data = await res.json();

      if (res.ok && data.success) {
        const list = Array.isArray(data[tabToFetch]) ? data[tabToFetch] : [];
        if (!followListsCache[tabToFetch]) {
          followListsCache[tabToFetch] = {};
        }
        followListsCache[tabToFetch][cleanUsername] = list;

        if (tabToFetch === 'followers') {
          setFollowers(list);
        } else {
          setFollowing(list);
        }
      } else if (!cachedData) {
        setError(data.message || `Unable to load ${tabToFetch}.`);
      }
    } catch (_) {
      if (!cachedData) {
        setError(`Network error loading ${tabToFetch}. Please check your connection.`);
      }
    } finally {
      setLoading(false);
    }
  }, [cleanUsername]);

  useEffect(() => {
    if (isOpen && cleanUsername) {
      fetchList(activeTab);
    }
  }, [isOpen, cleanUsername, activeTab, fetchList]);

  // Remove a follower (Profile owner only)
  const handleRemoveFollower = async (followerItem) => {
    const fUsername = (followerItem?.username || '').trim().toLowerCase();
    if (!cleanUsername || !fUsername) return;

    setRemovingUsername(fUsername);
    setActionFeedback(null);

    try {
      const activeToken = localStorage.getItem('upper_user_token');
      const res = await fetch(`${API_BASE}/api/developers/${cleanUsername}/followers/${encodeURIComponent(fUsername)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ followerId: followerItem.id, followerUsername: fUsername }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Remove from local followers state
        const updatedList = followers.filter(
          (f) => (f.username || '').toLowerCase() !== fUsername && f.id !== followerItem.id
        );
        setFollowers(updatedList);

        // Update in-memory cache
        if (followListsCache.followers && followListsCache.followers[cleanUsername]) {
          followListsCache.followers[cleanUsername] = updatedList;
        }

        // Notify parent developer profile to update followersCount stat
        if (onFollowerRemoved && typeof data.followersCount === 'number') {
          onFollowerRemoved(data.followersCount);
        } else if (onFollowerRemoved) {
          onFollowerRemoved(Math.max(0, followersCount - 1));
        }

        setActionFeedback({ type: 'success', message: `Removed @${fUsername} from your followers.` });
        setTimeout(() => setActionFeedback(null), 3000);
      } else {
        setActionFeedback({ type: 'error', message: data.message || 'Failed to remove follower.' });
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (_) {
      setActionFeedback({ type: 'error', message: 'Network error. Please try again.' });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setRemovingUsername(null);
      setConfirmRemoveUser(null);
    }
  };

  // Unfollow a creator from following list (Profile owner only)
  const handleUnfollow = async (targetUser) => {
    const targetUsername = (targetUser?.username || '').trim().toLowerCase();
    if (!targetUsername) return;

    setUnfollowingUsername(targetUsername);
    setActionFeedback(null);

    try {
      const activeToken = token || localStorage.getItem('upper_user_token');
      const res = await fetch(`${API_BASE}/api/developers/follow/${encodeURIComponent(targetUsername)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}),
        },
        body: JSON.stringify({ action: 'unfollow' }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        // Remove from following list state
        const updatedList = following.filter(
          (f) => (f.username || '').toLowerCase() !== targetUsername && f.id !== targetUser.id
        );
        setFollowing(updatedList);

        // Update in-memory cache
        if (followListsCache.following && followListsCache.following[cleanUsername]) {
          followListsCache.following[cleanUsername] = updatedList;
        }

        // Decrement local and parent following counts
        const nextCount = Math.max(0, (localFollowingCount ?? following.length) - 1);
        setLocalFollowingCount(nextCount);
        if (onFollowingChanged) {
          onFollowingChanged(nextCount);
        }

        setActionFeedback({ type: 'success', message: `Unfollowed @${targetUsername}.` });
        setTimeout(() => setActionFeedback(null), 3000);
      } else {
        setActionFeedback({ type: 'error', message: data.message || 'Failed to unfollow.' });
        setTimeout(() => setActionFeedback(null), 4000);
      }
    } catch (_) {
      setActionFeedback({ type: 'error', message: 'Network error while unfollowing. Please try again.' });
      setTimeout(() => setActionFeedback(null), 4000);
    } finally {
      setUnfollowingUsername(null);
      setConfirmUnfollowUser(null);
    }
  };

  // Notify global app that a modal popup is open (matches site-wide standard)
  useEffect(() => {
    if (isOpen) {
      window.dispatchEvent(new CustomEvent('modalToggle', { detail: true }));
      return () => {
        window.dispatchEvent(new CustomEvent('modalToggle', { detail: false }));
      };
    }
  }, [isOpen]);

  // Phone & Browser Back button synchronization (popstate listener)
  useEffect(() => {
    if (!isOpen) return;

    closedByPopstateRef.current = false;
    window.history.pushState(
      { upperModal: 'developer-follow-modal', key: modalHistoryKeyRef.current },
      ''
    );

    const handlePopState = () => {
      if (window.__upperIgnoreNextPopState) return;
      closedByPopstateRef.current = true;
      if (onCloseRef.current) {
        onCloseRef.current();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (!closedByPopstateRef.current && window.history.state?.upperModal === 'developer-follow-modal') {
        window.__upperIgnoreNextPopState = true;
        window.history.back();
        setTimeout(() => {
          window.__upperIgnoreNextPopState = false;
        }, 120);
      }
    };
  }, [isOpen]);

  // Complete background scroll freeze while preserving responsive touch scrolling inside modal
  useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevDocOverflow = document.documentElement.style.overflow;
      const prevBodyTouch = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevDocOverflow;
        document.body.style.touchAction = prevBodyTouch;
      };
    }
  }, [isOpen]);

  // Close on ESC key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const currentList = activeTab === 'followers' ? followers : following;

  // Filtered list by search query (instant client-side filtering)
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentList;
    return currentList.filter((item) => {
      const uName = (item.username || '').toLowerCase();
      const dName = (item.displayName || '').toLowerCase();
      return uName.includes(q) || dName.includes(q);
    });
  }, [currentList, searchQuery]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="dev-follow-modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="dev-follow-modal-title"
    >
      <div
        className="dev-follow-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div className="dev-follow-modal-header">
          <div className="dev-follow-modal-title-wrap">
            <div className="dev-follow-header-icon-box" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff2a2a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div>
              <h2 id="dev-follow-modal-title" className="dev-follow-modal-title">
                @{cleanUsername}
              </h2>
              <span className="dev-follow-modal-sub">Community Audience</span>
            </div>
          </div>
          <button
            type="button"
            className="dev-follow-modal-close-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* TABS NAVIGATION */}
        <div className="dev-follow-tabs-nav" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'followers'}
            className={`dev-follow-tab-btn ${activeTab === 'followers' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('followers');
              setSearchQuery('');
            }}
          >
            <span>Followers</span>
            <span className="dev-follow-tab-count">
              {localFollowersCount !== undefined ? localFollowersCount : followers.length}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'following'}
            className={`dev-follow-tab-btn ${activeTab === 'following' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('following');
              setSearchQuery('');
            }}
          >
            <span>Following</span>
            <span className="dev-follow-tab-count">
              {localFollowingCount !== undefined ? localFollowingCount : following.length}
            </span>
          </button>
        </div>

        {/* SEARCH FILTER */}
        <div className="dev-follow-search-wrap">
          <svg className="dev-follow-search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            className="dev-follow-search-input"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="dev-follow-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        {/* FEEDBACK STATUS BAR */}
        {actionFeedback && (
          <div className={`dev-follow-feedback-bar ${actionFeedback.type}`}>
            <span>{actionFeedback.message}</span>
          </div>
        )}

        {/* MODAL BODY / USER LIST */}
        <div className="dev-follow-list-container">
          {loading && currentList.length === 0 ? (
            <div className="dev-follow-loading-state">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="dev-follow-skeleton-row">
                  <div className="dev-follow-skeleton-avatar"></div>
                  <div className="dev-follow-skeleton-text-wrap">
                    <div className="dev-follow-skeleton-line short"></div>
                    <div className="dev-follow-skeleton-line tiny"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : error && currentList.length === 0 ? (
            <div className="dev-follow-error-state">
              <p>{error}</p>
              <button
                type="button"
                className="dev-follow-retry-btn"
                onClick={() => fetchList(activeTab)}
              >
                Retry
              </button>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="dev-follow-empty-state">
              <div className="dev-follow-empty-icon">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                  <circle cx="9" cy="7" r="4"></circle>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                </svg>
              </div>
              <p className="dev-follow-empty-title">
                {searchQuery
                  ? `No matches found for "${searchQuery}"`
                  : activeTab === 'followers'
                  ? 'No followers yet'
                  : 'Not following anyone yet'}
              </p>
              <span className="dev-follow-empty-sub">
                {activeTab === 'followers'
                  ? 'When users follow this profile, they will appear here.'
                  : 'When this creator follows others, they will be listed here.'}
              </span>
            </div>
          ) : (
            <ul className="dev-follow-items-list">
              {filteredList.map((item) => (
                <li key={item.id || item.username} className="dev-follow-item-row">
                  <div className="dev-follow-user-meta">
                    {/* AVATAR WITH CONDITIONAL PREMIUM RING (NO VIP TAGS) */}
                    <div className="dev-follow-avatar-wrap">
                      <VipAvatar
                        src={item.avatar}
                        alt={item.displayName || item.username}
                        plan={item.vipPlan || 'free'}
                        size="md"
                        fallbackSeed={item.username || item.displayName}
                        className="dev-follow-vip-avatar"
                      />
                    </div>

                    {/* USER DETAILS: CLICKABLE USERNAME AND DISPLAY NAME ONLY (NO VIP TAGS) */}
                    <div className="dev-follow-text-info">
                      <div className="dev-follow-display-name-wrap">
                        <span className="dev-follow-display-name">
                          {item.displayName || item.username}
                        </span>
                      </div>
                      <div className="dev-follow-username-wrap">
                        <Link
                          to={`/developer/${item.username}`}
                          onClick={onClose}
                          className="dev-follow-username-link"
                          title={`View @${item.username}'s profile`}
                        >
                          @{item.username}
                        </Link>
                      </div>
                    </div>
                  </div>

                  <div className="dev-follow-actions-cluster">
                    {/* OWNER ONLY: REMOVE FOLLOWER BUTTON ON FOLLOWERS TAB */}
                    {activeTab === 'followers' && isProfileOwner && (
                      confirmRemoveUser === (item.username || '').toLowerCase() ? (
                        <div className="dev-follow-confirm-cluster">
                          <button
                            type="button"
                            className="dev-follow-confirm-btn"
                            onClick={() => handleRemoveFollower(item)}
                            disabled={removingUsername === (item.username || '').toLowerCase()}
                            title="Confirm removal of this follower"
                          >
                            {removingUsername === (item.username || '').toLowerCase() ? 'Removing...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            className="dev-follow-cancel-btn"
                            onClick={() => setConfirmRemoveUser(null)}
                            disabled={removingUsername === (item.username || '').toLowerCase()}
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="dev-follow-remove-btn"
                          onClick={() => setConfirmRemoveUser((item.username || '').toLowerCase())}
                          disabled={Boolean(removingUsername || unfollowingUsername)}
                          title={`Remove @${item.username} from your followers`}
                        >
                          Remove
                        </button>
                      )
                    )}

                    {/* OWNER ONLY: UNFOLLOW BUTTON ON FOLLOWING TAB */}
                    {activeTab === 'following' && isProfileOwner && (
                      confirmUnfollowUser === (item.username || '').toLowerCase() ? (
                        <div className="dev-follow-confirm-cluster">
                          <button
                            type="button"
                            className="dev-follow-confirm-btn"
                            onClick={() => handleUnfollow(item)}
                            disabled={unfollowingUsername === (item.username || '').toLowerCase()}
                            title="Confirm unfollow"
                          >
                            {unfollowingUsername === (item.username || '').toLowerCase() ? 'Unfollowing...' : 'Confirm'}
                          </button>
                          <button
                            type="button"
                            className="dev-follow-cancel-btn"
                            onClick={() => setConfirmUnfollowUser(null)}
                            disabled={unfollowingUsername === (item.username || '').toLowerCase()}
                            title="Cancel"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="dev-follow-unfollow-btn"
                          onClick={() => setConfirmUnfollowUser((item.username || '').toLowerCase())}
                          disabled={Boolean(unfollowingUsername || removingUsername)}
                          title={`Unfollow @${item.username}`}
                        >
                          Unfollow
                        </button>
                      )
                    )}

                    <Link
                      to={`/developer/${item.username}`}
                      onClick={onClose}
                      className="dev-follow-view-btn"
                      title={`Visit @${item.username}`}
                    >
                      <span>View</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};

export default DeveloperFollowModal;
