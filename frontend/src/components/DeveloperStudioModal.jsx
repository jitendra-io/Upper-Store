import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { VipAvatar, VipFlairBadge } from './VipAvatar';
import { getUserVipTier } from '../utils/vipValidator';
import { CrownIcon, DiamondIcon, CloseIcon, ArrowRightIcon, CheckIcon, AlertTriangleIcon } from './Icons';
import './DeveloperStudioModal.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const parseYouTubeVideoId = (url) => {
  if (!url || typeof url !== 'string') return null;
  const clean = url.trim();
  const match = clean.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match && match[1] ? match[1] : null;
};

const CATEGORIES = [
  'Mobile App',
  'Windows App',
  'Mac App',
  'AI Tool',
  'Game',
  'Developer Library',
  'Web Tool',
  'Software Tool',
  'Design Asset',
  'Others',
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
    bio: '',
    phone: '',
    agreed: false,
  });
  const [showConsentNoticeModal, setShowConsentNoticeModal] = useState(false);
  const [withdrawingConsent, setWithdrawingConsent] = useState(false);
  const [previousDevConsent, setPreviousDevConsent] = useState(null);

  // Product Form State
  const [productForm, setProductForm] = useState({
    title: '',
    category: 'Mobile App',
    version: '1.0.0',
    price: 'Free',
    description: '',
    releaseNotes: '',
    directApkUrl: '',
    videoUrl: '',
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
  const isPro = vipTier === 'pro';
  const isElite = vipTier === 'elite';
  const isProAtLimit = isPro && myProducts.length >= 3;

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
          setPreviousDevConsent(null);
          setKycForm({
            legalName: dData.developer.legalName || '',
            displayName: dData.developer.displayName || user?.displayName || '',
            username: dData.developer.username || user?.username || '',
            bio: dData.developer.bio || '',
            phone: dData.developer.phone || '',
            agreed: true,
          });
        } else {
          setDevProfile(null);
          if (dData.previousConsent) {
            setPreviousDevConsent(dData.previousConsent);
          }
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
        const userHandle = (user?.username || '').toLowerCase();
        const owned = allProds.filter(
          (p) =>
            (p.developerId && p.developerId === userId) ||
            (p.developerUsername && p.developerUsername.toLowerCase() === userHandle) ||
            (p.developerEmail && p.developerEmail.toLowerCase() === userEmail)
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

  // 1. Developer Onboarding & Consent Submission Handler
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    setFeedback(null);

    if (!kycForm.legalName.trim()) {
      setFeedback({ type: 'error', message: 'Full Legal Name is required.' });
      return;
    }

    if (!kycForm.displayName.trim()) {
      setFeedback({ type: 'error', message: 'Public Developer / Studio Name is required.' });
      return;
    }

    const cleanPhone = kycForm.phone.replace(/[\s-+()]/g, '');
    if (!/^\d{10}$/.test(cleanPhone)) {
      setFeedback({ type: 'error', message: 'Please enter a valid 10-digit mobile phone number.' });
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
      setFeedback({ type: 'error', message: 'Please review and accept the consent notice before registering.' });
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
          legalName: kycForm.legalName.trim(),
          displayName: kycForm.displayName.trim(),
          username: cleanUsername,
          bio: (kycForm.bio || '').trim(),
          phone: cleanPhone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Developer registration failed.');
      }

      setDevProfile(data.developer);
      setFeedback({
        type: 'success',
        message: 'Developer profile registered successfully! Publishing privileges are now unlocked.',
      });
      fetchDevData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmittingKyc(false);
    }
  };

  // 1b. Withdraw Consent Handler
  const handleWithdrawConsent = async () => {
    const confirmWithdraw = window.confirm(
      'Withdraw Developer Consent:\n\nAre you sure you want to withdraw your consent? Withdrawing consent will deregister your developer profile and revoke direct software publishing privileges.\n\nDo you wish to proceed?'
    );
    if (!confirmWithdraw) return;

    setWithdrawingConsent(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/api/developers/withdraw-consent`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to withdraw developer consent.');
      }

      setDevProfile(null);
      setKycForm({
        legalName: '',
        displayName: user?.displayName || '',
        username: user?.username || '',
        bio: '',
        phone: '',
        agreed: false,
      });

      setFeedback({
        type: 'success',
        message: 'Consent successfully withdrawn and developer profile deregistered.',
      });
      fetchDevData();
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setWithdrawingConsent(false);
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
      videoUrl: product.videoUrl || '',
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
      videoUrl: '',
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
        message: 'Please complete your developer registration first to unlock software publishing.',
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

    if (!editingProductId && isProAtLimit) {
      setFeedback({
        type: 'error',
        message: 'Publishing Limit Reached: Pro VIP members can publish up to 3 products. Upgrade to Elite VIP for unlimited product publishing!',
      });
      return;
    }

    if (!productForm.title.trim() || !productForm.description.trim() || !productForm.directApkUrl.trim()) {
      setFeedback({ type: 'error', message: 'Product Title, Description, and GitHub Download URL are required.' });
      return;
    }

    const cleanTitle = productForm.title.trim();
    if (cleanTitle.length < 2 || cleanTitle.length > 80) {
      setFeedback({ type: 'error', message: 'Product title must be between 2 and 80 characters.' });
      return;
    }

    const cleanDesc = productForm.description.trim();
    if (cleanDesc.length < 10 || cleanDesc.length > 5000) {
      setFeedback({ type: 'error', message: 'Product description must be between 10 and 5000 characters.' });
      return;
    }

    if (productForm.version && productForm.version.trim().length > 20) {
      setFeedback({ type: 'error', message: 'Version cannot exceed 20 characters.' });
      return;
    }

    if (productForm.releaseNotes && productForm.releaseNotes.trim().length > 2000) {
      setFeedback({ type: 'error', message: 'Release notes cannot exceed 2000 characters.' });
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

    if (productForm.videoUrl && productForm.videoUrl.trim()) {
      const vUrl = productForm.videoUrl.trim();
      const isYt = parseYouTubeVideoId(vUrl);
      const isGPhotos = /^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\/[^\s]+/i.test(vUrl);
      const isDirectVid = /^https?:\/\/[^\s]+\.(mp4|webm|ogg)(\?[^\s]*)?$/i.test(vUrl);
      if (!isYt && !isGPhotos && !isDirectVid) {
        setFeedback({
          type: 'error',
          message: 'Invalid video link. Please provide a valid YouTube watch/embed/shorts URL, Google Photos link, or direct MP4 link.',
        });
        return;
      }
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
        message: 'Developer registration required before sending community broadcasts.',
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

    const cleanBroadTitle = broadcastForm.title.trim();
    if (!cleanBroadTitle || cleanBroadTitle.length < 3 || cleanBroadTitle.length > 120) {
      setFeedback({ type: 'error', message: 'Notification title must be between 3 and 120 characters.' });
      return;
    }

    const cleanBroadMsg = broadcastForm.message.trim();
    if (!cleanBroadMsg || cleanBroadMsg.length < 5 || cleanBroadMsg.length > 1000) {
      setFeedback({ type: 'error', message: 'Notification message must be between 5 and 1000 characters.' });
      return;
    }

    if (broadcastForm.link && broadcastForm.link.trim()) {
      const bLink = broadcastForm.link.trim();
      if (bLink.length > 500) {
        setFeedback({ type: 'error', message: 'Link URL cannot exceed 500 characters.' });
        return;
      }
      if (!/^https?:\/\//i.test(bLink)) {
        setFeedback({ type: 'error', message: 'Link must be a valid web URL starting with http:// or https://.' });
        return;
      }
    }

    setSubmittingBroadcast(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...broadcastForm,
          authorAvatar: user?.photoURL || devProfile?.avatar || '',
        }),
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
                Publish and manage catalog products<br />and broadcast community alerts
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
              <span>{editingProductId ? 'Edit Product' : isProAtLimit ? 'Publish Product (3/3 Limit)' : 'Publish Product'}</span>
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
              <span>My Releases ({myProducts.length}{isPro ? '/3' : ''})</span>
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
              <span>Developer Profile &amp; Consent</span>
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
              {!editingProductId && isProAtLimit && (
                <div className="dev-limit-alert-card">
                  <div className="limit-alert-icon">
                    <AlertTriangleIcon size={24} style={{ color: '#ffd700' }} />
                  </div>
                  <div className="limit-alert-content">
                    <h4>Pro VIP Publishing Limit Reached (3 of 3 Products)</h4>
                    <p>
                      Your Pro VIP tier allows publishing up to 3 verified software products in Upper Store. Upgrade to Elite VIP for UNLIMITED product publishing, highest catalog ranking, and dedicated CDN distribution!
                    </p>
                  </div>
                  <a
                    href="/vip"
                    className="limit-upgrade-btn"
                    onClick={() => onClose()}
                  >
                    Upgrade to Elite VIP (Unlimited) &rarr;
                  </a>
                </div>
              )}

              {!devProfile && (
                <div className="dev-kyc-gate-card">
                  <div className="gate-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <path d="m9 12 2 2 4-4"/>
                    </svg>
                  </div>
                  <div className="gate-text">
                    <h4>Developer Registration &amp; Consent Required</h4>
                    <p>
                      To ensure creator transparency and software accountability across Upper Store, VIP developers complete developer registration and consent before publishing software releases.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="gate-action-btn"
                    onClick={() => setActiveTab('kyc')}
                  >
                    Register Developer Profile & Consent →
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
                        maxLength={80}
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
                        maxLength={20}
                        required
                      />
                    </div>
                  </div>

                  <div className="dev-field-group">
                    <label>Short Description <span className="req-star">*</span></label>
                    <textarea
                      rows={2}
                      placeholder="Briefly describe what your app or tool does (10 to 5000 characters)..."
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      maxLength={5000}
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
                      maxLength={2000}
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

                  {/* OPTIONAL PRODUCT DEMO VIDEO URL (YOUTUBE VIDEO LINK) */}
                  <div className="dev-field-group dev-video-highlight-box">
                    <label style={{ color: '#38bdf8' }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '5px' }}>
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      Product Demo Video URL (Optional - YouTube Video Link)
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                      value={productForm.videoUrl}
                      onChange={(e) => setProductForm({ ...productForm, videoUrl: e.target.value })}
                      maxLength={500}
                    />
                    <small className="field-hint">
                      Paste YouTube video link (watch, shorts, or share URL) for interactive showcase playback in the Video Demos section.
                    </small>

                    {/* LIVE YOUTUBE SHOWCASE PREVIEW */}
                    {(() => {
                      const ytId = parseYouTubeVideoId(productForm.videoUrl);
                      if (!ytId) return null;
                      return (
                        <div className="dev-video-preview-row">
                          <img
                            src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                            alt="YouTube Video Preview Thumbnail"
                            className="dev-video-thumb-preview"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          <div className="dev-video-meta-preview">
                            <span className="dev-video-status-tag">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              Verified YouTube Demo Showcase
                            </span>
                            <span className="dev-video-link-preview">Video ID: {ytId}</span>
                          </div>
                        </div>
                      );
                    })()}
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
                        <a href={'/developer/' + (kycForm.username || devProfile?.username || user?.username || 'upperstore')} target="_blank" rel="noopener noreferrer" className="brand-dev-handle dev-profile-preview-link" title="Open your public developer profile in new tab">@{kycForm.username || devProfile?.username || user?.username || 'handle'} ↗</a>
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
              <div className="dev-allowance-strip">
                <div className="allowance-info">
                  <span className="allowance-badge">{isElite ? 'Elite VIP' : 'Pro VIP'}</span>
                  <span className="allowance-text">
                    {isElite
                      ? <><strong>UNLIMITED</strong> Products Enabled &bull; {myProducts.length} Currently Active in Catalog</>
                      : <><strong>{myProducts.length} of 3</strong> Product Slots Used &bull; {Math.max(0, 3 - myProducts.length)} Remaining</>}
                  </span>
                </div>
                {isPro && (
                  <a href="/vip" className="allowance-upgrade-link" onClick={() => onClose()}>
                    Unlock Unlimited with Elite VIP &rarr;
                  </a>
                )}
              </div>
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
                          {p.videoUrl && (
                            <>
                              <span>&bull;</span>
                              <span style={{ color: '#38bdf8', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                </svg>
                                Video Demo
                              </span>
                            </>
                          )}
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
                    <h4>Developer Registration &amp; Consent Required</h4>
                    <p>
                      To prevent spam and protect users, community notification broadcasts require an active developer registration.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="gate-action-btn"
                    onClick={() => setActiveTab('kyc')}
                  >
                    Register as Developer Now →
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
                      maxLength={120}
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
                        maxLength={500}
                      />
                    </div>
                  </div>

                  <div className="dev-field-group">
                    <label>Announcement Message <span className="req-star">*</span></label>
                    <textarea
                      rows={3}
                      placeholder="Enter announcement details for the Upper Store community (5 to 1000 characters)..."
                      value={broadcastForm.message}
                      onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                      maxLength={1000}
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
                        <a href={'/developer/' + (kycForm.username || devProfile?.username || user?.username || 'upperstore')} target="_blank" rel="noopener noreferrer" className="brand-dev-handle dev-profile-preview-link" title="Open your public developer profile in new tab">@{kycForm.username || devProfile?.username || user?.username || 'handle'} ↗</a>
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
               TAB 4: DEVELOPER PROFILE & CONSENT
               =============================================================== */
            <div className="dev-pane-content">
              {devProfile ? (
                <div className="dev-verified-status-banner" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(20, 16, 32, 0.5) 100%)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="status-badge-circle" style={{ background: '#10b981', color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <CheckIcon size={18} />
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#ffffff' }}>Developer Registration: Active &amp; Verified</h4>
                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#a7f3d0' }}>
                          Developer registration consent is active.
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => setShowConsentNoticeModal(true)}
                        className="admin-btn outline-sm"
                        style={{ background: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.25)', color: '#ffffff', padding: '0.5rem 0.95rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                      >
                        Read Consent Notice
                      </button>

                      <button
                        type="button"
                        onClick={handleWithdrawConsent}
                        disabled={withdrawingConsent}
                        style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#fca5a5', padding: '0.5rem 0.95rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}
                        title="Withdraw consent and deregister developer profile"
                      >
                        {withdrawingConsent ? 'Withdrawing...' : 'Withdraw Consent & Deregister'}
                      </button>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem', fontSize: '0.85rem' }}>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Full Legal Name</span>
                      <strong style={{ color: '#ffffff' }}>{devProfile.legalName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Developer / Studio Name</span>
                      <strong style={{ color: '#ffffff' }}>{devProfile.displayName}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Public Username</span>
                      <strong style={{ color: '#ffd700' }}>@{devProfile.username || user?.username}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Contact Phone</span>
                      <strong style={{ color: '#ffffff' }}>{devProfile.phone}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Consent Status</span>
                      <strong style={{ color: '#10b981' }}>Active</strong>
                    </div>
                    <div>
                      <span style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Consent Accepted On</span>
                      <strong style={{ color: '#ffffff' }}>
                        {devProfile.consentAcceptedAt || devProfile.createdAt
                          ? new Date(devProfile.consentAcceptedAt || devProfile.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : 'Recorded on registration'}
                      </strong>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {(previousDevConsent || user?.developerConsentWithdrawnAt) && (
                    <div className="dev-kyc-intro-card" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <div className="intro-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                          </svg>
                        </div>
                        <div>
                          <h4 style={{ margin: 0, color: '#fca5a5', fontSize: '1rem' }}>Developer Consent Status: Withdrawn</h4>
                          <p style={{ margin: '0.2rem 0 0 0', color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.45 }}>
                            Developer consent was previously accepted on{' '}
                            <strong>{new Date(previousDevConsent?.acceptedAt || user?.developerConsentAcceptedAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                            {' '}and withdrawn on{' '}
                            <strong>{new Date(previousDevConsent?.withdrawnAt || user?.developerConsentWithdrawnAt || Date.now()).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</strong>
                            . You may re-register with consent below at any time to resume verified software publishing.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="dev-kyc-intro-card" style={{ background: 'rgba(212, 175, 55, 0.08)', border: '1px solid rgba(212, 175, 55, 0.25)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="intro-icon" style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#ffd700', width: '38px', height: '38px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                          <circle cx="9" cy="7" r="4" />
                          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        </svg>
                      </div>
                      <div>
                        <h4 style={{ margin: 0, color: '#ffd700', fontSize: '1rem' }}>Developer Registration &amp; Consent</h4>
                        <p style={{ margin: '0.2rem 0 0 0', color: '#cbd5e1', fontSize: '0.82rem', lineHeight: 1.45 }}>
                          To maintain transparent creator accountability across Upper Store, please provide your legal name, public developer name, phone number, and username. <strong>No identity documents, government numbers, or verification URLs are collected.</strong>
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              <form id="dev-kyc-form" onSubmit={handleKycSubmit} className="dev-form-grid">
                <div className="form-fields-grid grid-3">
                  <div className="dev-field-group">
                    <label>Full Legal Name <span className="req-star">*</span></label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Morgan"
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
                    <label>Developer Bio &amp; Overview (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Building lightweight tools and creative suites..."
                      value={kycForm.bio || ''}
                      onChange={(e) => setKycForm({ ...kycForm, bio: e.target.value })}
                      maxLength={300}
                    />
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                      <input
                        type="checkbox"
                        id="dev-kyc-agree"
                        checked={kycForm.agreed}
                        onChange={(e) => setKycForm({ ...kycForm, agreed: e.target.checked })}
                        style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#ffd700' }}
                        required
                      />
                      <label htmlFor="dev-kyc-agree" style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.5, cursor: 'pointer' }}>
                        I have read the Developer Consent Notice and give affirmative consent to process my legal name, developer name, and contact phone number for developer publishing and platform accountability. I understand that I may withdraw this consent at any time.
                      </label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConsentNoticeModal(true)}
                      style={{ background: 'rgba(212, 175, 55, 0.15)', border: '1px solid rgba(212, 175, 55, 0.4)', color: '#ffd700', borderRadius: '8px', padding: '0.45rem 0.85rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      Read Consent Notice
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  {devProfile && (
                    <button
                      type="button"
                      onClick={handleWithdrawConsent}
                      disabled={withdrawingConsent}
                      style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.45)', color: '#fca5a5', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
                    >
                      {withdrawingConsent ? 'Withdrawing...' : 'Withdraw Consent'}
                    </button>
                  )}

                  <button
                    type="submit"
                    className="dev-primary-btn"
                    disabled={submittingKyc}
                  >
                    {submittingKyc ? 'Saving...' : devProfile ? 'Update Developer Profile' : 'Accept Consent & Register'}
                  </button>
                </div>
              </form>

              {/* STATUTORY CONSENT NOTICE MODAL POPUP */}
              {showConsentNoticeModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                  <div style={{ background: '#18181b', border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '16px', maxWidth: '580px', width: '100%', padding: '1.75rem', maxHeight: '90vh', overflowY: 'auto', color: '#e2e8f0', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, color: '#ffd700', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Developer Consent Notice
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowConsentNoticeModal(false)}
                        style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.25rem', cursor: 'pointer', padding: '0 4px' }}
                      ><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                    </div>

                    <div style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#cbd5e1', spaceY: '0.75rem' }}>
                      <p style={{ margin: '0 0 0.6rem 0' }}>
                        <strong>1. Personal Data Collected:</strong> Full Legal Name, Public Developer Name, Mobile Phone Number, Developer Username, and Account Email.
                      </p>
                      <p style={{ margin: '0 0 0.6rem 0' }}>
                        <strong>2. Zero Identity Document Policy:</strong> Upper Store does not collect, demand, or store government identity cards, Aadhaar numbers, or verification documents.
                      </p>
                      <p style={{ margin: '0 0 0.6rem 0' }}>
                        <strong>3. Purpose of Processing:</strong> Your details are processed strictly to associate uploaded software releases with an authentic creator, provide public attribution on product pages, and ensure platform security against deceptive binaries.
                      </p>
                      <p style={{ margin: '0 0 0.6rem 0' }}>
                        <strong>4. Right to Withdraw Consent:</strong> You have the right to withdraw your consent at any time. When you click the &quot;Withdraw Consent&quot; button in your Developer Studio, your developer profile and associated data will be immediately removed.
                      </p>
                      <p style={{ margin: '0 0 0.6rem 0' }}>
                        <strong>5. Grievance Redressal:</strong> Grievance Officer: Upper Store Compliance Team (upper.official.in@gmail.com).
                      </p>
                    </div>

                    <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={() => setShowConsentNoticeModal(false)}
                        style={{ background: '#ffd700', color: '#111827', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
                      >
                        I Understand &amp; Close
                      </button>
                    </div>
                  </div>
                </div>
              )}
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
                disabled={submittingProduct || devProfile?.isSuspended || (!editingProductId && isProAtLimit)}
                title={!editingProductId && isProAtLimit ? 'Pro VIP limit reached (3/3 products). Upgrade to Elite VIP for unlimited uploads.' : ''}
              >
                {submittingProduct
                  ? (editingProductId ? 'Saving Changes...' : 'Publishing Release...')
                  : (editingProductId ? 'Save Product Changes' : isProAtLimit ? 'Publishing Limit Reached (3/3)' : 'Publish Product to Store')}
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
