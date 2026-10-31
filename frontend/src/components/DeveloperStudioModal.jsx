import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { VipAvatar, VipFlairBadge } from './VipAvatar';
import { getUserVipTier } from '../utils/vipValidator';
import { CrownIcon, DiamondIcon, CloseIcon, ArrowRightIcon, CheckIcon, AlertTriangleIcon } from './Icons';
import './DeveloperStudioModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  'Mobile App',
  'Windows Software',
  'Mac App',
  'Web Tool',
  'Game',
  'Developer Library',
  'AI Model',
  'Other',
];

export const DeveloperStudioModal = ({ isOpen, onClose, onProductPublished }) => {
  const { user, token, isLoggedIn } = useAuth();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'products', 'broadcast', 'kyc'
  const [loading, setLoading] = useState(true);
  const [devProfile, setDevProfile] = useState(null);
  const [myProducts, setMyProducts] = useState([]);
  const [submittingKyc, setSubmittingKyc] = useState(false);
  const [submittingProduct, setSubmittingProduct] = useState(false);
  const [submittingBroadcast, setSubmittingBroadcast] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [editingProductId, setEditingProductId] = useState(null);

  // KYC Form State
  const [kycForm, setKycForm] = useState({
    legalName: '',
    displayName: '',
    username: '',
    phone: '',
    aadhaarNumber: '',
    aadhaarDriveLink: '',
    agreed: false,
  });

  // Product Form State
  const [productForm, setProductForm] = useState({
    title: '',
    category: 'Mobile App',
    version: '1.0.0',
    price: 'Free',
    description: '',
    releaseNotes: '',
    directApkUrl: '',
    imageUrl1: '',
    imageUrl2: '',
    imageUrl3: '',
    logoUrl: '',
    customTags: '',
    hasLicenseKey: false,
    licensePrice: '',
  });

  // Broadcast Form State
  const [broadcastForm, setBroadcastForm] = useState({
    title: '',
    message: '',
    category: 'Release',
    link: '',
  });

  const vipTier = getUserVipTier(user);
  const isVipActive = vipTier === 'elite' || vipTier === 'pro';

  // Fetch developer profile & products
  const fetchDevData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch Developer KYC Profile
      const devRes = await fetch(`${API_BASE}/api/developers/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (devRes.ok) {
        const dData = await devRes.json();
        if (dData.isRegistered && dData.developer) {
          setDevProfile(dData.developer);
          setKycForm({
            legalName: dData.developer.legalName || '',
            displayName: dData.developer.displayName || user?.displayName || '',
            username: dData.developer.username || user?.username || '',
            phone: dData.developer.phone || '',
            aadhaarNumber: dData.developer.aadhaarNumber || '',
            aadhaarDriveLink: dData.developer.aadhaarDriveLink || '',
            agreed: true,
          });
        } else {
          setDevProfile(null);
          setKycForm((prev) => ({
            ...prev,
            displayName: user?.displayName || prev.displayName || '',
            username: user?.username || prev.username || '',
          }));
        }
      }

      // 2. Fetch all products to filter current developer's products
      const prodRes = await fetch(`${API_BASE}/api/products`);
      if (prodRes.ok) {
        const allProds = await prodRes.json();
        const userEmail = (user?.email || '').toLowerCase();
        const userId = user?.uid;
        const owned = allProds.filter(
          (p) =>
            (p.developerEmail && p.developerEmail.toLowerCase() === userEmail) ||
            (p.developerId && p.developerId === userId)
        );
        setMyProducts(owned);
      }
    } catch (err) {
      console.error('Error loading developer data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && isLoggedIn) {
      fetchDevData();
    }
  }, [isOpen, isLoggedIn]);

  // Handle escape key & background scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 1. Aadhaar KYC Submission Handler
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    const cleanAadhaar = kycForm.aadhaarNumber.replace(/[\s-]/g, '');
    if (!/^\d{12}$/.test(cleanAadhaar)) {
      setFeedback({ type: 'error', message: 'Please enter a valid 12-digit Indian Aadhaar number.' });
      return;
    }

    const cleanPhone = kycForm.phone.replace(/[\s-+()]/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      setFeedback({ type: 'error', message: 'Please enter a valid 10-digit mobile phone number.' });
      return;
    }

    if (!kycForm.aadhaarDriveLink.includes('http')) {
      setFeedback({ type: 'error', message: 'Please provide a valid Google Drive sharing URL.' });
      return;
    }

    const cleanUsername = (kycForm.username || user?.username || '').trim().toLowerCase();
    if (!cleanUsername || cleanUsername.length < 3 || cleanUsername.length > 30) {
      setFeedback({ type: 'error', message: 'Developer username must be between 3 and 30 characters.' });
      return;
    }
    if (!/^[a-z0-9_.]+$/.test(cleanUsername)) {
      setFeedback({
        type: 'error',
        message: 'Developer username can only contain small letters (a-z), numbers (0-9), underscores (_), and dots (.). No other special characters are allowed.',
      });
      return;
    }

    if (!kycForm.agreed) {
      setFeedback({ type: 'error', message: 'You must agree to the developer publishing terms.' });
      return;
    }

    setSubmittingKyc(true);
    try {
      const res = await fetch(`${API_BASE}/api/developers/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          legalName: kycForm.legalName,
          displayName: kycForm.displayName || user?.displayName || user?.email?.split('@')[0],
          username: cleanUsername,
          phone: cleanPhone,
          aadhaarNumber: cleanAadhaar,
          aadhaarDriveLink: kycForm.aadhaarDriveLink,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Verification submission failed.');
      }

      setDevProfile(data.developer);
      setFeedback({
        type: 'success',
        message: 'Aadhaar verification submitted successfully! Publishing privileges are now unlocked.',
      });
      setActiveTab('upload');
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmittingKyc(false);
    }
  };

  // Start editing a product
  const startEditProduct = (product) => {
    setEditingProductId(product.id);
    setProductForm({
      title: product.title || '',
      category: product.category || 'Mobile App',
      version: product.version || '1.0.0',
      price: product.price || 'Free',
      description: product.description || '',
      releaseNotes: product.releaseNotes || '',
      directApkUrl: product.directApkUrl || product.apkUrl || '',
      imageUrl1: product.images && product.images[0] ? product.images[0] : (product.image || ''),
      imageUrl2: product.images && product.images[1] ? product.images[1] : '',
      imageUrl3: product.images && product.images[2] ? product.images[2] : '',
      logoUrl: product.logo || '',
      customTags: Array.isArray(product.tags) ? product.tags.join(', ') : (product.tags || ''),
      hasLicenseKey: Boolean(product.hasLicenseKey),
      licensePrice: product.licensePrice || '',
    });
    setActiveTab('upload');
    setFeedback(null);
  };

  // Cancel editing mode
  const cancelEditProduct = () => {
    setEditingProductId(null);
    setProductForm({
      title: '',
      category: 'Mobile App',
      version: '1.0.0',
      price: 'Free',
      description: '',
      releaseNotes: '',
      directApkUrl: '',
      imageUrl1: '',
      imageUrl2: '',
      imageUrl3: '',
      logoUrl: '',
      customTags: '',
      hasLicenseKey: false,
      licensePrice: '',
    });
  };

  // 2. Product Upload / Update Handler
  const handleProductSubmit = async (e) => {
    if (e) e.preventDefault();
    setFeedback(null);

    if (!devProfile) {
      setActiveTab('kyc');
      setFeedback({
        type: 'error',
        message: 'Please complete your Aadhaar identity verification first to unlock software publishing.',
      });
      return;
    }

    if (devProfile.isSuspended) {
      setFeedback({
        type: 'error',
        message: 'Your developer account is suspended. Publishing releases is restricted.',
      });
      return;
    }

    if (!productForm.title.trim() || !productForm.description.trim() || !productForm.directApkUrl.trim()) {
      setFeedback({ type: 'error', message: 'Product Title, Description, and GitHub Download URL are required.' });
      return;
    }

    const apk = productForm.directApkUrl.trim();
    if (!apk || (!apk.toLowerCase().includes('github.com') && !apk.toLowerCase().includes('githubusercontent.com'))) {
      setFeedback({
        type: 'error',
        message: 'A valid GitHub Release download URL is required (e.g. https://github.com/user/repo/releases/download/v1.0/app.apk).',
      });
      return;
    }

    setSubmittingProduct(true);
    try {
      const url = editingProductId ? `${API_BASE}/api/products/${editingProductId}` : `${API_BASE}/api/products`;
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(productForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || (editingProductId ? 'Failed to update product.' : 'Failed to upload product.'));
      }

      setFeedback({
        type: 'success',
        message: editingProductId
          ? `Product "${productForm.title}" updated successfully!`
          : `Product "${productForm.title}" published successfully to Upper Store!`,
      });

      cancelEditProduct();
      fetchDevData();
      setActiveTab('products');
      if (typeof onProductPublished === 'function') onProductPublished(data);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmittingProduct(false);
    }
  };

  // 3. Product Delete Handler
  const handleDeleteProduct = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete your product "${title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || 'Failed to delete product.');
      }
      setFeedback({ type: 'success', message: `Product "${title}" deleted successfully.` });
      if (editingProductId === id) cancelEditProduct();
      fetchDevData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    }
  };

  // 4. Community Broadcast Handler
  const handleBroadcastSubmit = async (e) => {
    if (e) e.preventDefault();
    setFeedback(null);

    if (!devProfile) {
      setActiveTab('kyc');
      setFeedback({
        type: 'error',
        message: 'Aadhaar identity verification required before sending community broadcasts.',
      });
      return;
    }

    if (devProfile.isSuspended) {
      setFeedback({
        type: 'error',
        message: 'Your developer account is suspended. Broadcast notifications are restricted.',
      });
      return;
    }

    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      setFeedback({ type: 'error', message: 'Notification Title and Message are required.' });
      return;
    }

    setSubmittingBroadcast(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(broadcastForm),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to broadcast notification.');
      }

      setFeedback({
        type: 'success',
        message: 'Notification broadcast sent successfully with your VIP tier ring to all users!',
      });

      setBroadcastForm({
        title: '',
        message: '',
        category: 'Release',
        link: '',
      });
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmittingBroadcast(false);
    }
  };

  return createPortal(
    <div className="dev-modal-backdrop" onClick={onClose}>
      <div className="dev-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* MODAL HEADER */}
        <div className="dev-modal-header">
          <div className="dev-header-left">
            <div className="dev-modal-icon-badge">
              <CrownIcon size={20} />
            </div>
            <div>
              <div className="dev-title-row">
                <h3 className="dev-modal-title">VIP Developer Studio</h3>
                <VipFlairBadge plan={vipTier} compact={true} />
              </div>
              <p className="dev-modal-sub">
                Publish software releases, manage catalog products, and broadcast community alerts
              </p>
            </div>
          </div>
          <button className="dev-close-btn" onClick={onClose} title="Close Studio (Esc)" aria-label="Close">
            <CloseIcon size={16} />
          </button>
        </div>

        {/* SUSPENSION ALERT (IF ACCOUNT SUSPENDED BY ADMIN) */}
        {devProfile?.isSuspended && (
          <div className="dev-suspended-alert">
            <AlertTriangleIcon size={18} />
            <div>
              <strong>Developer Account Suspended</strong>
              <p>
                Your publishing access has been suspended by an administrator.{' '}
                {devProfile.suspensionReason && `Reason: "${devProfile.suspensionReason}"`}
              </p>
            </div>
          </div>
        )}

        {/* FEEDBACK TOAST */}
        {feedback && (
          <div className={`dev-feedback-toast ${feedback.type}`}>
            <span className="toast-icon">
              {feedback.type === 'success' ? <CheckIcon size={15} /> : <AlertTriangleIcon size={15} />}
            </span>
            <span className="toast-text">{feedback.message}</span>
            <button onClick={() => setFeedback(null)} className="feedback-dismiss-btn" title="Dismiss">
              <CloseIcon size={12} />
            </button>
          </div>
        )}

        {/* SEGMENTED TAB NAVIGATION - NEVER HARD-DISABLED */}
        <div className="dev-tabs-container">
          <div className="dev-segmented-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'upload'}
              className={`dev-segmented-tab ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              <span className="tab-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </span>
              <span>{editingProductId ? 'Edit Product' : 'Publish Product'}</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'products'}
              className={`dev-segmented-tab ${activeTab === 'products' ? 'active' : ''}`}
              onClick={() => setActiveTab('products')}
            >
              <span className="tab-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                  <line x1="12" y1="22.08" x2="12" y2="12"/>
                </svg>
              </span>
              <span>My Releases ({myProducts.length})</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'broadcast'}
              className={`dev-segmented-tab ${activeTab === 'broadcast' ? 'active' : ''}`}
              onClick={() => setActiveTab('broadcast')}
            >
              <span className="tab-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 11 18-5v12L3 14v-3z"/>
                  <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                </svg>
              </span>
              <span>Broadcast</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'kyc'}
              className={`dev-segmented-tab ${activeTab === 'kyc' ? 'active' : ''}`}
              onClick={() => setActiveTab('kyc')}
            >
              <span className="tab-icon">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="16" rx="3"/>
                  <circle cx="9" cy="10" r="2"/>
                  <line x1="15" y1="8" x2="17" y2="8"/>
                  <line x1="15" y1="12" x2="17" y2="12"/>
                  <line x1="7" y1="16" x2="17" y2="16"/>
                </svg>
              </span>
              <span>Aadhaar KYC</span>
              {devProfile && <CheckIcon size={12} style={{ color: '#10b981', marginLeft: '5px' }} />}
            </button>
          </div>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <div className="dev-modal-body">
          {loading ? (
            <div className="dev-loading-state">
              <div className="dev-spinner" />
              <p>Authenticating VIP Publisher Workspace...</p>
            </div>
          ) : activeTab === 'upload' ? (
            /* ===============================================================
               TAB 1: PUBLISH / UPDATE PRODUCT
               =============================================================== */
            <div className="dev-pane-content">
              {!devProfile && (
                <div className="dev-kyc-gate-card">
                  <div className="gate-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                  </div>
                  <div className="gate-text">
                    <h4>Aadhaar Identity Verification Required</h4>
                    <p>
                      To ensure security and authenticity across Upper Store, VIP developers must verify their Aadhaar card photo via Google Drive before uploading releases.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="gate-action-btn"
                    onClick={() => setActiveTab('kyc')}
                  >
                    Complete Aadhaar KYC (2 mins) →
                  </button>
                </div>
              )}

              {editingProductId && (
                <div className="dev-edit-active-banner">
                  <div className="edit-banner-info">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span>Currently Editing Product: <strong>{productForm.title || 'Untitled'}</strong></span>
                  </div>
                  <button
                    type="button"
                    className="dev-cancel-edit-btn"
                    onClick={cancelEditProduct}
                  >
                    Cancel Edit
                  </button>
                </div>
              )}

              <form id="dev-product-form" onSubmit={handleProductSubmit} className="dev-form-grid">
                
                {/* SECTION 1: CORE METADATA */}
                <div className="dev-form-card">
                  <div className="card-header-bar">
                    <span className="card-step-badge">1</span>
                    <h4 className="card-heading">Application Overview</h4>
                  </div>

                  <div className="form-fields-grid grid-3">
                    <div className="dev-field-group">
                      <label>Product Title <span className="req-star">*</span></label>
                      <input
                        type="text"
                        placeholder="e.g. AI Prompt Engine"
                        value={productForm.title}
                        onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="dev-field-group">
                      <label>Category <span className="req-star">*</span></label>
                      <div className="select-wrap">
                        <select
                          value={productForm.category}
                          onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                          required
                        >
                          {CATEGORIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="dev-field-group">
                      <label>Version <span className="req-star">*</span></label>
                      <input
                        type="text"
                        placeholder="1.0.0"
                        value={productForm.version}
                        onChange={(e) => setProductForm({ ...productForm, version: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="dev-field-group">
                    <label>Short Description <span className="req-star">*</span></label>
                    <textarea
                      rows={2}
                      placeholder="Briefly describe what your app or tool does..."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      required
                    />
                  </div>

                  <div className="dev-field-group">
                    <label>Release Notes / What's New</label>
                    <textarea
                      rows={2}
                      placeholder="Highlight changes, improvements, or new features in this version..."
                      value={productForm.releaseNotes}
                      onChange={(e) => setProductForm({ ...productForm, releaseNotes: e.target.value })}
                    />
                  </div>
                </div>

                {/* SECTION 2: BINARY & DISTRIBUTION */}
                <div className="dev-form-card">
                  <div className="card-header-bar">
                    <span className="card-step-badge">2</span>
                    <h4 className="card-heading">Distribution Source &amp; Pricing</h4>
                  </div>

                  <div className="form-fields-grid grid-2">
                    <div className="dev-field-group">
                      <label>Price Display <span className="req-star">*</span></label>
                      <input
                        type="text"
                        placeholder="Free or ₹199"
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        required
                      />
                    </div>

                    <div className="dev-field-group">
                      <label>GitHub Release Package URL <span className="req-star">*</span></label>
                      <input
                        type="url"
                        placeholder="https://github.com/owner/repo/releases/download/v1.0.0/app.apk"
                        value={productForm.directApkUrl}
                        onChange={(e) => setProductForm({ ...productForm, directApkUrl: e.target.value })}
                        required
                      />
                      <small className="field-hint">
                        Direct download link hosted on GitHub Releases (CDN fast downloads).
                      </small>
                    </div>
                  </div>

                  {/* LICENSE KEY OPTION */}
                  <div className="dev-license-toggle-box">
                    <label className="toggle-label-row">
                      <input
                        type="checkbox"
                        checked={productForm.hasLicenseKey}
                        onChange={(e) => setProductForm({ ...productForm, hasLicenseKey: e.target.checked })}
                      />
                      <span>Require License Key Activation for this Software</span>
                    </label>

                    {productForm.hasLicenseKey && (
                      <div className="dev-field-group license-subfield">
                        <label>License Key Price (₹)</label>
                        <input
                          type="number"
                          placeholder="e.g. 499"
                          value={productForm.licensePrice}
                          onChange={(e) => setProductForm({ ...productForm, licensePrice: e.target.value })}
                          min="0"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* SECTION 3: MEDIA & BRANDING */}
                <div className="dev-form-card">
                  <div className="card-header-bar">
                    <span className="card-step-badge">3</span>
                    <h4 className="card-heading">Media Assets &amp; Official Attribution</h4>
                  </div>

                  <div className="form-fields-grid grid-3">
                    <div className="dev-field-group">
                      <label>Primary Screenshot URL</label>
                      <input
                        type="url"
                        placeholder="Image URL"
                        value={productForm.imageUrl1}
                        onChange={(e) => setProductForm({ ...productForm, imageUrl1: e.target.value })}
                      />
                    </div>

                    <div className="dev-field-group">
                      <label>Screenshot 2 URL</label>
                      <input
                        type="url"
                        placeholder="Image URL"
                        value={productForm.imageUrl2}
                        onChange={(e) => setProductForm({ ...productForm, imageUrl2: e.target.value })}
                      />
                    </div>

                    <div className="dev-field-group">
                      <label>Screenshot 3 URL</label>
                      <input
                        type="url"
                        placeholder="Image URL"
                        value={productForm.imageUrl3}
                        onChange={(e) => setProductForm({ ...productForm, imageUrl3: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="form-fields-grid grid-2">
                    <div className="dev-field-group">
                      <label>App Logo / Icon URL</label>
                      <input
                        type="url"
                        placeholder="Direct square image URL"
                        value={productForm.logoUrl}
                        onChange={(e) => setProductForm({ ...productForm, logoUrl: e.target.value })}
                      />
                    </div>

                    <div className="dev-field-group">
                      <label>Custom Tags (comma-separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. AI Tool, Productivity"
                        value={productForm.customTags}
                        onChange={(e) => setProductForm({ ...productForm, customTags: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* PUBLISHER BRANDING PREVIEW (WITHOUT HARDWARE-ACCELERATED TAG) */}
                  <div className="dev-brand-preview-card">
                    <span className="brand-preview-tag">Official Catalog Attribution:</span>
                    <div className="brand-preview-identity">
                      <VipAvatar
                        src={user?.photoURL}
                        plan={vipTier}
                        size="sm"
                        fallbackSeed={user?.email || 'dev'}
                      />
                      <div className="brand-preview-meta">
                        <span className="brand-dev-name">{devProfile?.displayName || user?.displayName || 'VIP Developer'}</span>
                        <span className="brand-dev-handle">@{kycForm.username || devProfile?.username || user?.username || 'handle'}</span>
                        <VipFlairBadge plan={vipTier} compact={true} />
                      </div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          ) : activeTab === 'products' ? (
            /* ===============================================================
               TAB 2: MY RELEASES
               =============================================================== */
            <div className="dev-pane-content">
              {myProducts.length === 0 ? (
                <div className="dev-empty-box">
                  <div className="empty-graphic">
                    <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/>
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                      <line x1="12" y1="22.08" x2="12" y2="12"/>
                    </svg>
                  </div>
                  <h4>No Products Uploaded Yet</h4>
                  <p>You haven't published any software packages under this account.</p>
                  <button
                    type="button"
                    className="dev-primary-btn"
                    onClick={() => {
                      cancelEditProduct();
                      setActiveTab('upload');
                    }}
                  >
                    Upload Your First Release →
                  </button>
                </div>
              ) : (
                <div className="dev-releases-list">
                  {myProducts.map((p) => (
                    <div key={p.id} className="dev-release-card">
                      <img src={p.image || p.logo || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200'} alt="" className="release-thumbnail" />
                      <div className="release-info">
                        <div className="release-header-line">
                          <h4 className="release-title">{p.title}</h4>
                          <span className="release-ver-pill">v{p.version || '1.0.0'}</span>
                          <span className="release-price-pill">{p.price}</span>
                        </div>
                        <p className="release-desc">{p.description}</p>
                        <div className="release-meta-line">
                          <span>{p.category}</span>
                          <span>&bull;</span>
                          <span>{p.downloadCount || 0} Downloads</span>
                          <span>&bull;</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#fbbf24" stroke="none">
                              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                            </svg>
                            <span>{p.averageRating ? p.averageRating.toFixed(1) : '5.0'}</span>
                          </span>
                        </div>
                      </div>
                      <div className="release-actions">
                        <button
                          type="button"
                          className="release-edit-btn"
                          onClick={() => startEditProduct(p)}
                          title="Edit product details"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="release-del-btn"
                          onClick={() => handleDeleteProduct(p.id, p.title)}
                          title="Delete product release"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'broadcast' ? (
            /* ===============================================================
               TAB 3: COMMUNITY BROADCAST
               =============================================================== */
            <div className="dev-pane-content">
              {!devProfile && (
                <div className="dev-kyc-gate-card">
                  <div className="gate-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 11 18-5v12L3 14v-3z"/>
                      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                    </svg>
                  </div>
                  <div className="gate-text">
                    <h4>Aadhaar Identity Verification Required</h4>
                    <p>
                      To prevent spam and protect users, community notification broadcasts require verified Aadhaar identification.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="gate-action-btn"
                    onClick={() => setActiveTab('kyc')}
                  >
                    Verify Aadhaar Now →
                  </button>
                </div>
              )}

              <div className="dev-broadcast-layout">
                <form id="dev-broadcast-form" onSubmit={handleBroadcastSubmit} className="broadcast-form-col">
                  <div className="dev-field-group">
                    <label>Broadcast Title <span className="req-star">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Major v2.0 Release Out Now!"
                      value={broadcastForm.title}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                      required
                    />
                  </div>

                  <div className="form-fields-grid grid-2">
                    <div className="dev-field-group">
                      <label>Category <span className="req-star">*</span></label>
                      <div className="select-wrap">
                        <select
                          value={broadcastForm.category}
                          onChange={(e) => setBroadcastForm({ ...broadcastForm, category: e.target.value })}
                          required
                        >
                          <option value="Release">Release</option>
                          <option value="Update">Update</option>
                          <option value="Announcement">Announcement</option>
                          <option value="Notice">Notice</option>
                        </select>
                      </div>
                    </div>

                    <div className="dev-field-group">
                      <label>Action Link (Optional)</label>
                      <input
                        type="url"
                        placeholder="https://..."
                        value={broadcastForm.link}
                        onChange={(e) => setBroadcastForm({ ...broadcastForm, link: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="dev-field-group">
                    <label>Announcement Message <span className="req-star">*</span></label>
                    <textarea
                      rows={3}
                      placeholder="Enter announcement details for the Upper Store community..."
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                      required
                    />
                  </div>
                </form>

                {/* LIVE BROADCAST PREVIEW */}
                <div className="broadcast-preview-col">
                  <span className="preview-super-tag">Live In-App Notification Preview:</span>
                  <div className={`live-broadcast-card ${vipTier}`}>
                    <div className="live-author-row">
                      <VipAvatar
                        src={user?.photoURL}
                        alt={devProfile?.displayName || user?.displayName}
                        plan={vipTier}
                        size="sm"
                        fallbackSeed={user?.email || 'user'}
                      />
                      <div className="live-author-meta">
                        <span className="live-name">{devProfile?.displayName || user?.displayName || 'VIP Developer'}</span>
                        <span className="brand-dev-handle">@{kycForm.username || devProfile?.username || user?.username || 'handle'}</span>
                        <VipFlairBadge plan={vipTier} compact={true} />
                      </div>
                      <span className={`live-cat-badge ${vipTier}`}>
                        {broadcastForm.category || 'Release'}
                      </span>
                    </div>

                    <h5 className="live-title">{broadcastForm.title || 'Your Notification Title'}</h5>
                    <p className="live-msg">
                      {broadcastForm.message || 'Your message will appear here styled with your official VIP tier glow and animated ring.'}
                    </p>

                    {broadcastForm.link && (
                      <span className="live-link">
                        Open Link <ArrowRightIcon size={12} />
                      </span>
                    )}
                  </div>
                  <small className="preview-note">
                    * Appears in every Upper Store user's notification center with your {vipTier.toUpperCase()} VIP styling.
                  </small>
                </div>
              </div>
            </div>
          ) : (
            /* ===============================================================
               TAB 4: AADHAAR VERIFICATION (KYC)
               =============================================================== */
            <div className="dev-pane-content">
              {devProfile ? (
                <div className="dev-verified-status-banner">
                  <div className="status-badge-circle">
                    <CheckIcon size={16} />
                  </div>
                  <div className="status-text">
                    <h4>Aadhaar Identity Verified</h4>
                    <p>
                      Legal Name: <strong>{devProfile.legalName}</strong> &bull; Aadhaar: <strong>XXXX-XXXX-{devProfile.aadhaarNumber?.slice(-4)}</strong>
                    </p>
                    <a
                      href={devProfile.aadhaarDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="status-proof-link"
                    >
                      View Submitted Google Drive Document ↗
                    </a>
                  </div>
                </div>
              ) : (
                <div className="dev-kyc-intro-card">
                  <div className="intro-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="3"/>
                      <circle cx="9" cy="10" r="2"/>
                      <line x1="15" y1="8" x2="17" y2="8"/>
                      <line x1="15" y1="12" x2="17" y2="12"/>
                      <line x1="7" y1="16" x2="17" y2="16"/>
                    </svg>
                  </div>
                  <div className="intro-text">
                    <h4>Government Identity Linkage (Aadhaar Card)</h4>
                    <p>
                      To ensure trust across the Upper Store ecosystem, VIP publishers submit a clear photo of their Aadhaar card via Google Drive. Your details are securely accessible only by platform administrators.
                    </p>
                  </div>
                </div>
              )}

              <form id="dev-kyc-form" onSubmit={handleKycSubmit} className="dev-form-grid">
                <div className="form-fields-grid grid-3">
                  <div className="dev-field-group">
                    <label>Full Legal Name (on Aadhaar) <span className="req-star">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Jitendra Kumar"
                      value={kycForm.legalName}
                      onChange={(e) => setKycForm({ ...kycForm, legalName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="dev-field-group">
                    <label>Public Developer / Studio Name <span className="req-star">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Upper Studio"
                      value={kycForm.displayName}
                      onChange={(e) => setKycForm({ ...kycForm, displayName: e.target.value })}
                      required
                    />
                  </div>

                  <div className="dev-field-group">
                    <label>
                      Developer Username <span className="req-star">*</span>
                      <small className="dev-hint-inline">(small letters, numbers, _, . only)</small>
                    </label>
                    <div className="dev-username-wrap">
                      <span className="dev-username-prefix">@</span>
                      <input
                        type="text"
                        placeholder="alex.dev_99"
                        value={kycForm.username}
                        onChange={(e) => {
                          const val = e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '');
                          setKycForm({ ...kycForm, username: val });
                        }}
                        maxLength={30}
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-fields-grid grid-2">
                  <div className="dev-field-group">
                    <label>Mobile Contact Number <span className="req-star">*</span></label>
                    <input
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={kycForm.phone}
                      onChange={(e) => setKycForm({ ...kycForm, phone: e.target.value })}
                      maxLength={10}
                      required
                    />
                  </div>

                  <div className="dev-field-group">
                    <label>12-Digit Aadhaar Card Number <span className="req-star">*</span></label>
                    <input
                      type="text"
                      placeholder="XXXX XXXX XXXX"
                      value={kycForm.aadhaarNumber}
                      onChange={(e) => setKycForm({ ...kycForm, aadhaarNumber: e.target.value })}
                      maxLength={14}
                      required
                    />
                  </div>
                </div>

                <div className="dev-field-group">
                  <label>Clear Aadhaar Card Photo (Google Drive Link) <span className="req-star">*</span></label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                    value={kycForm.aadhaarDriveLink}
                    onChange={(e) => setKycForm({ ...kycForm, aadhaarDriveLink: e.target.value })}
                    required
                  />
                  <small className="field-hint">
                    Upload a clear photo or scan of your Aadhaar card to Google Drive, set access to <strong>"Anyone with the link can view"</strong>, and paste the link here.
                  </small>
                </div>

                <div className="dev-terms-agreement">
                  <input
                    type="checkbox"
                    id="dev-kyc-agree"
                    checked={kycForm.agreed}
                    onChange={(e) => setKycForm({ ...kycForm, agreed: e.target.checked })}
                    required
                  />
                  <label htmlFor="dev-kyc-agree">
                    I certify under penalty of account termination that the submitted Aadhaar identity and software releases are authentic, lawful, and free of malicious code.
                  </label>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* PINNED STICKY FOOTER */}
        <div className="dev-modal-footer">
          <div className="footer-left-meta">
            <span className="footer-status-pill">
              {devProfile ? 'Verified Developer' : 'Verification Required'}
            </span>
            <span className="footer-user-email">{user?.email}</span>
          </div>

          <div className="footer-right-actions">
            <button
              type="button"
              className="dev-cancel-btn"
              onClick={() => {
                if (editingProductId) cancelEditProduct();
                onClose();
              }}
            >
              Close
            </button>

            {activeTab === 'upload' && (
              <button
                type="submit"
                form="dev-product-form"
                className="dev-primary-btn"
                disabled={submittingProduct || devProfile?.isSuspended}
              >
                {submittingProduct
                  ? (editingProductId ? 'Saving Changes...' : 'Publishing Release...')
                  : (editingProductId ? 'Save Product Changes' : 'Publish Product to Store')}
              </button>
            )}

            {activeTab === 'broadcast' && (
              <button
                type="submit"
                form="dev-broadcast-form"
                className="dev-primary-btn"
                disabled={submittingBroadcast || devProfile?.isSuspended}
              >
                {submittingBroadcast ? 'Broadcasting...' : 'Send Community Broadcast'}
              </button>
            )}

            {activeTab === 'kyc' && (
              <button
                type="submit"
                form="dev-kyc-form"
                className="dev-primary-btn"
                disabled={submittingKyc}
              >
                {submittingKyc ? 'Submitting...' : devProfile ? 'Update Verification Details' : 'Submit & Unlock Publishing'}
              </button>
            )}

            {activeTab === 'products' && (
              <button
                type="button"
                className="dev-primary-btn"
                onClick={() => {
                  cancelEditProduct();
                  setActiveTab('upload');
                }}
              >
                Upload New Product
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};

export default DeveloperStudioModal;
