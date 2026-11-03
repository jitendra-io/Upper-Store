import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import './EditProfileModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const EditProfileModal = ({
  isOpen,
  onClose,
  developer,
  products = [],
  onProfileUpdated,
  onProductDeleted,
}) => {
  const { user, token, updateUserProfile } = useAuth();
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('details'); // 'details' | 'products'
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [location, setLocation] = useState('None');
  const [isLocationLocked, setIsLocationLocked] = useState(false);

  // Form State
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Product Deletion State
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [deleteError, setDeleteError] = useState('');

  // Sync initial values when modal opens
  useEffect(() => {
    if (isOpen && developer) {
      setDisplayName(developer.displayName || '');
      setUsername(developer.username || '');
      setBio(developer.bio || '');

      const existingBg = developer.coverImage || developer.banner || user?.coverImage || user?.banner || '';
      setCoverImage(existingBg);
      setCoverPreview(existingBg);
      setUploadingCover(false);
      setDragActive(false);

      const existingLoc = (developer.location && developer.location.trim()) || (user?.location && user.location.trim()) || 'None';
      setLocation(existingLoc);

      const locked = Boolean(
        (existingLoc && existingLoc.toLowerCase() !== 'none') ||
        developer.locationLocked ||
        user?.locationLocked
      );
      setIsLocationLocked(locked);

      setErrorMessage('');
      setSuccessMessage('');
      setDeleteConfirmId(null);
      setDeleteError('');
      setActiveTab('details');
    }
  }, [isOpen, developer, user]);

  // Lock background scroll when open
  useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevDocOverflow = document.documentElement.style.overflow;
      const prevBodyTouch = document.body.style.touchAction;

      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevDocOverflow;
        document.body.style.touchAction = prevBodyTouch;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isDev = Boolean(developer?.isDeveloper && products && products.length > 0);
  const isOfficial = Boolean(
    developer?.isOfficial ||
    ['upperstore', 'upper-store', 'upper_store'].includes((developer?.username || '').toLowerCase())
  );
  const activeAuthToken = token || localStorage.getItem('adminToken') || localStorage.getItem('upper_user_token');

  // Direct ImageKit File Upload from local computer
  const handleFileSelected = async (file) => {
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setErrorMessage('Invalid file format. Please select an image file (JPG, PNG, WEBP, or GIF).');
      return;
    }

    const maxBytes = 8 * 1024 * 1024; // 8MB limit
    if (file.size > maxBytes) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`Selected image is too large (${sizeMB}MB). Maximum allowed size is 8MB.`);
      return;
    }

    // Instant local preview
    const localUrl = URL.createObjectURL(file);
    setCoverPreview(localUrl);
    setUploadingCover(true);

    try {
      const formData = new FormData();
      formData.append('coverImage', file);

      const uploadUrl = isOfficial
        ? `${API_BASE}/api/developers/official/cover-image`
        : `${API_BASE}/api/auth/user/cover-image`;

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeAuthToken}`,
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload background image to ImageKit.');
      }

      const cdnUrl = data.coverImage || localUrl;
      setCoverImage(cdnUrl);
      setCoverPreview(cdnUrl);
      setSuccessMessage('Background image uploaded to ImageKit CDN successfully!');

      if (!isOfficial && updateUserProfile) {
        updateUserProfile({ coverImage: cdnUrl, banner: cdnUrl });
      }

      if (onProfileUpdated) {
        onProfileUpdated({
          displayName: isOfficial ? (displayName || 'Upper Store Official') : displayName,
          username: isOfficial ? 'upperstore' : username,
          bio,
          coverImage: cdnUrl,
          banner: cdnUrl,
          location,
          locationLocked: isLocationLocked,
        });
      }
    } catch (err) {
      console.error('ImageKit upload error:', err);
      setErrorMessage(err.message || 'Error uploading background image.');
      setCoverPreview(coverImage);
    } finally {
      setUploadingCover(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove Cover Image (reverts back to luxury dark mesh)
  const handleRemoveCover = async () => {
    setErrorMessage('');
    setSuccessMessage('');
    setCoverImage('');
    setCoverPreview('');

    try {
      const deleteUrl = isOfficial
        ? `${API_BASE}/api/developers/official/cover-image`
        : `${API_BASE}/api/auth/user/cover-image`;

      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${activeAuthToken}`,
        },
      });

      if (!isOfficial && updateUserProfile) {
        updateUserProfile({ coverImage: '', banner: '' });
      }

      if (onProfileUpdated) {
        onProfileUpdated({
          displayName: isOfficial ? (displayName || 'Upper Store Official') : displayName,
          username: isOfficial ? 'upperstore' : username,
          bio,
          coverImage: '',
          banner: '',
          location,
          locationLocked: isLocationLocked,
        });
      }

      setSuccessMessage('Background image removed. Reverted to default cover.');
    } catch (err) {
      console.warn('Remove cover failed:', err);
    }
  };

  // Validate and submit unified profile changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanName = displayName.trim();
    if (!cleanName) {
      setErrorMessage('Display name is required.');
      return;
    }
    if (cleanName.length > 50) {
      setErrorMessage('Display name cannot exceed 50 characters.');
      return;
    }

    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    if (!cleanUser) {
      setErrorMessage('Username is required.');
      return;
    }
    if (cleanUser.length < 3 || cleanUser.length > 30) {
      setErrorMessage('Username must be between 3 and 30 characters.');
      return;
    }
    if (!/^[a-z0-9_.-]+$/.test(cleanUser)) {
      setErrorMessage('Username can only contain lowercase letters, numbers, underscores, dots, or hyphens.');
      return;
    }

    const cleanBio = bio.trim().slice(0, 500);
    const resolvedCover = (coverImage || '').trim();

    const payload = {
      displayName: cleanName,
      username: cleanUser,
      bio: cleanBio,
      coverImage: resolvedCover,
    };

    if (!isLocationLocked) {
      const cleanLoc = (location || '').trim();
      payload.location = cleanLoc ? cleanLoc.slice(0, 80) : 'None';
    }

    setSaving(true);
    try {
      const saveUrl = isOfficial
        ? `${API_BASE}/api/developers/official/profile`
        : `${API_BASE}/api/auth/user/profile`;

      const res = await fetch(saveUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeAuthToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      // Update AuthContext user so navbar and state stay in sync (personal profiles only)
      if (!isOfficial && updateUserProfile && data.user) {
        updateUserProfile({
          displayName: data.user.displayName,
          username: data.user.username,
          bio: data.user.bio,
          coverImage: data.user.coverImage,
          banner: data.user.coverImage,
          location: data.user.location,
          locationLocked: data.user.locationLocked,
        });
      }

      setSuccessMessage(isOfficial ? 'Upper Store Official profile updated successfully!' : 'Profile updated successfully!');

      if (onProfileUpdated) {
        onProfileUpdated({
          displayName: isOfficial ? (displayName || 'Upper Store Official') : cleanName,
          username: isOfficial ? 'upperstore' : cleanUser,
          bio: cleanBio,
          coverImage: resolvedCover,
          banner: resolvedCover,
          location: isOfficial ? location : (data.user?.location || (isLocationLocked ? location : (payload.location || 'None'))),
          locationLocked: isOfficial ? isLocationLocked : Boolean(data.user?.locationLocked || isLocationLocked || (payload.location && payload.location.toLowerCase() !== 'none')),
        });
      }

      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setErrorMessage(err.message || 'Error saving profile.');
    } finally {
      setSaving(false);
    }
  };

  // Remove / Delete a product from developer's profile
  const handleDeleteProduct = async (productId) => {
    setDeleteError('');
    setDeletingProductId(productId);

    try {
      const res = await fetch(`${API_BASE}/api/products/${productId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to remove product.');
      }

      if (onProductDeleted) {
        onProductDeleted(productId);
      }
      setDeleteConfirmId(null);
    } catch (err) {
      setDeleteError(err.message || 'Error removing product.');
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <div className="edit-profile-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="edit-profile-modal-box" onClick={(e) => e.stopPropagation()}>
        {/* HEADER */}
        <div className="edit-profile-header">
          <div className="edit-profile-title-wrap">
            <div className="edit-profile-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </div>
            <div>
              <h3 className="edit-profile-title">{isOfficial ? 'Edit Official Store Profile' : 'Edit Profile'}</h3>
              <p className="edit-profile-subtitle">
                {isOfficial
                  ? 'Update Upper Store Official page details, background banner, and bio.'
                  : 'Update your personal details, background image, location, and bio.'}
              </p>
            </div>
          </div>
          <button className="edit-profile-close-btn" onClick={onClose} aria-label="Close modal">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* TABS (If Developer has published products) */}
        {isDev && (
          <div className="edit-profile-tabs">
            <button
              type="button"
              className={`edit-profile-tab ${activeTab === 'details' ? 'active' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span>Profile Details</span>
            </button>
            <button
              type="button"
              className={`edit-profile-tab ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                <line x1="12" y1="22.08" x2="12" y2="12"></line>
              </svg>
              <span>Manage Software ({products.length})</span>
            </button>
          </div>
        )}

        {/* TAB 1: PROFILE DETAILS FORM */}
        {activeTab === 'details' && (
          <form className="edit-profile-body" onSubmit={handleSaveProfile}>
            {errorMessage && (
              <div className="edit-profile-alert error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="edit-profile-alert success">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Display Name */}
            <div className="edit-form-group">
              <label htmlFor="edit-profile-name" className="edit-form-label">
                Display Name
              </label>
              <input
                id="edit-profile-name"
                type="text"
                className="edit-form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                required
                placeholder="Your full name or organization"
              />
              <span className="edit-form-hint">Visible to all visitors on your public profile.</span>
            </div>

            {/* Username Handle */}
            <div className="edit-form-group">
              <label htmlFor="edit-profile-handle" className="edit-form-label">
                Username Handle
              </label>
              <div className="edit-handle-input-wrap">
                <span className="edit-handle-prefix">@</span>
                <input
                  id="edit-profile-handle"
                  type="text"
                  className={`edit-form-input handle-input ${isOfficial ? 'locked-input' : ''}`}
                  value={username}
                  onChange={(e) => {
                    if (!isOfficial) {
                      setUsername(e.target.value.replace(/[^a-zA-Z0-9_.-]/g, '').toLowerCase());
                    }
                  }}
                  disabled={isOfficial}
                  maxLength={30}
                  required
                  placeholder="username"
                />
              </div>
              <span className="edit-form-hint">
                {isOfficial
                  ? 'Official Upper Store system creator handle (Permanent).'
                  : 'Lowercase letters, numbers, underscores, dots, or hyphens (3 to 30 characters).'}
              </span>
            </div>

            {/* Background / Cover Image (ImageKit Computer Upload) */}
            <div className="edit-form-group">
              <div className="edit-form-label-row">
                <label className="edit-form-label">
                  Background / Cover Image
                </label>
                {coverImage && (
                  <span className="edit-cdn-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                    </svg>
                    ImageKit CDN
                  </span>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="edit-file-hidden-input"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleFileSelected(e.target.files[0]);
                }}
                disabled={uploadingCover}
              />

              {/* Uploading Progress Box */}
              {uploadingCover ? (
                <div className="edit-cover-uploading-card">
                  <div className="edit-spinner-ring"></div>
                  <div className="edit-uploading-info">
                    <span className="edit-uploading-title">Uploading to ImageKit CDN</span>
                    <span className="edit-uploading-sub">Optimizing resolution and streaming banner from computer...</span>
                  </div>
                </div>
              ) : coverPreview ? (
                /* Preview Card with Image and Replace / Remove actions */
                <div className="edit-cover-preview-card">
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="edit-cover-preview-banner"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="edit-cover-preview-overlay">
                    <div className="edit-cover-preview-actions">
                      <button
                        type="button"
                        className="edit-cover-action-btn replace"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>Replace from computer</span>
                      </button>
                      <button
                        type="button"
                        className="edit-cover-action-btn remove"
                        onClick={handleRemoveCover}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                /* Upload Dropzone (When no custom image is set) */
                <div
                  className={`edit-cover-dropzone ${dragActive ? 'drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    if (e.dataTransfer.files?.[0]) handleFileSelected(e.dataTransfer.files[0]);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <div className="edit-dropzone-icon">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                      <circle cx="8.5" cy="8.5" r="1.5"></circle>
                      <polyline points="21 15 16 10 5 21"></polyline>
                    </svg>
                  </div>
                  <div className="edit-dropzone-text">
                    <span className="edit-dropzone-headline">Upload background image from computer</span>
                    <span className="edit-dropzone-subline">Click to browse or drag and drop an image</span>
                  </div>
                  <span className="edit-dropzone-meta">JPG, PNG, WEBP, GIF · Up to 8MB</span>
                </div>
              )}
              <span className="edit-form-hint">
                Personalize your profile header banner with an image from your computer. Uploads directly to ImageKit CDN with global delivery.
              </span>
            </div>

            {/* Location (Default None, Can be updated only ONCE) */}
            <div className="edit-form-group">
              <div className="edit-form-label-row">
                <label htmlFor="edit-profile-location" className="edit-form-label">
                  Location
                </label>
                {isLocationLocked && (
                  <span className="edit-locked-badge">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                    </svg>
                    Locked · Permanent
                  </span>
                )}
              </div>
              <input
                id="edit-profile-location"
                type="text"
                className={`edit-form-input ${isLocationLocked ? 'locked-input' : ''}`}
                value={location}
                onChange={(e) => {
                  if (!isLocationLocked) setLocation(e.target.value);
                }}
                disabled={isLocationLocked}
                maxLength={80}
                placeholder="e.g. India or California, USA (Default is None)"
              />
              <span className="edit-form-hint">
                {isLocationLocked
                  ? 'Your account location has already been verified and locked. It cannot be altered.'
                  : 'Notice: Location by default is None. You can set it ONCE throughout the lifetime of this account.'}
              </span>
            </div>

            {/* Bio */}
            <div className="edit-form-group">
              <div className="edit-form-label-row">
                <label htmlFor="edit-profile-bio" className="edit-form-label">
                  Bio / Summary
                </label>
                <span className="edit-char-counter">{bio.length} / 500</span>
              </div>
              <textarea
                id="edit-profile-bio"
                className="edit-form-textarea"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={500}
                placeholder="Share a short summary about your engineering skills, applications, or interests..."
              />
            </div>

            {/* ACTIONS */}
            <div className="edit-profile-footer">
              <button type="button" className="edit-btn secondary" onClick={onClose} disabled={saving || uploadingCover}>
                Cancel
              </button>
              <button type="submit" className="edit-btn primary" disabled={saving || uploadingCover}>
                {saving ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: MANAGE PUBLISHED SOFTWARE */}
        {activeTab === 'products' && (
          <div className="edit-profile-body">
            {deleteError && (
              <div className="edit-profile-alert error">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{deleteError}</span>
              </div>
            )}

            <p className="edit-products-subtitle">
              Manage the software releases published under your profile. You can permanently remove any application from your profile and store catalog.
            </p>

            {products && products.length > 0 ? (
              <div className="edit-products-list">
                {products.map((p) => {
                  const displayImg = p.logo || p.image || p.imageUrl1 || '/logo.png';
                  const isConfirming = deleteConfirmId === p.id;
                  const isDeleting = deletingProductId === p.id;

                  return (
                    <div key={p.id} className="edit-product-item">
                      <div className="edit-product-item-left">
                        <img
                          src={displayImg}
                          alt={p.title}
                          className="edit-product-icon"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/logo.png';
                          }}
                        />
                        <div className="edit-product-meta">
                          <h4 className="edit-product-title">{p.title}</h4>
                          <div className="edit-product-tags">
                            <span className="edit-p-tag">{p.category || 'App'}</span>
                            <span className="edit-p-tag">v{p.version || '1.0.0'}</span>
                            <span className="edit-p-tag">{p.downloadsCount || p.downloads || 0} downloads</span>
                          </div>
                        </div>
                      </div>

                      <div className="edit-product-item-actions">
                        {!isConfirming ? (
                          <button
                            type="button"
                            className="edit-product-delete-btn"
                            onClick={() => {
                              setDeleteConfirmId(p.id);
                              setDeleteError('');
                            }}
                            title="Remove this application from profile"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              <line x1="10" y1="11" x2="10" y2="17"></line>
                              <line x1="14" y1="11" x2="14" y2="17"></line>
                            </svg>
                            <span>Remove</span>
                          </button>
                        ) : (
                          <div className="edit-confirm-group">
                            <span className="edit-confirm-msg">Delete release?</span>
                            <button
                              type="button"
                              className="edit-confirm-btn delete"
                              onClick={() => handleDeleteProduct(p.id)}
                              disabled={isDeleting}
                            >
                              {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                            </button>
                            <button
                              type="button"
                              className="edit-confirm-btn cancel"
                              onClick={() => setDeleteConfirmId(null)}
                              disabled={isDeleting}
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="edit-no-products">
                <p>No published applications in your profile.</p>
              </div>
            )}

            <div className="edit-profile-footer">
              <button type="button" className="edit-btn secondary" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditProfileModal;
