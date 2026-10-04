import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserDownloadHistory, fetchUserDownloadHistoryFromDB } from '../utils/downloadTracker';
import './AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'users', 'appeals', 'inbox'

  // Products State
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State (GitHub Release + YouTube Video + Google Photos Links)
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Mobile App');
  const [price, setPrice] = useState('Free');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [directApkUrl, setDirectApkUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoPosterUrl, setVideoPosterUrl] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [imageUrl1, setImageUrl1] = useState('');
  const [imageUrl2, setImageUrl2] = useState('');
  const [imageUrl3, setImageUrl3] = useState('');

  // Users State
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [userReviewsMap, setUserReviewsMap] = useState({});
  const [userDownloadsMap, setUserDownloadsMap] = useState({});

  // Appeals State
  const [appeals, setAppeals] = useState([]);
  const [loadingAppeals, setLoadingAppeals] = useState(false);
  const [actionId, setActionId] = useState(null);

  // Inbox Messages State
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Broadcast Notifications State
  const [broadcastNotifications, setBroadcastNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifCategory, setNotifCategory] = useState('Update');
  const [notifLink, setNotifLink] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // UI Feedback
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('adminToken');
    if (!savedToken) {
      navigate('/admin');
    } else {
      setToken(savedToken);
      fetchProducts();
      fetchUsers(savedToken);
      fetchAppeals(savedToken);
      fetchMessages(savedToken);
      fetchBroadcastNotifications();
    }
  }, [navigate]);

  const fetchBroadcastNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications`);
      if (res.ok) {
        const data = await res.json();
        setBroadcastNotifications(data);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoadingNotifications(false);
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) return;

    setSendingNotif(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: notifTitle,
          message: notifMessage,
          category: notifCategory,
          link: notifLink,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to send notification.');

      setMessage({ type: 'success', text: 'Broadcast notification sent successfully to all users!' });
      setNotifTitle('');
      setNotifMessage('');
      setNotifCategory('Update');
      setNotifLink('');
      fetchBroadcastNotifications();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSendingNotif(false);
    }
  };

  const handleDeleteNotification = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notification broadcast?')) return;
    try {
      const res = await fetch(`${API_BASE}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Notification deleted successfully.' });
        fetchBroadcastNotifications();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete notification.' });
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchUsers = async (authToken = token) => {
    if (!authToken) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/users`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setUsers(data);

        // Fetch all reviews to build complete real-time user reviews map
        try {
          const revRes = await fetch(`${API_BASE}/api/reviews/all`);
          if (revRes.ok) {
            const allRevs = await revRes.json();
            const map = {};
            allRevs.forEach((r) => {
              const cleanE = (r.userEmail || '').trim().toLowerCase();
              if (cleanE) {
                if (!map[cleanE]) map[cleanE] = [];
                map[cleanE].push(r);
              }
            });
            setUserReviewsMap(map);
          }
        } catch (rErr) {
          console.warn('Failed to fetch reviews map:', rErr);
        }
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchAppeals = async (authToken = token) => {
    if (!authToken) return;
    setLoadingAppeals(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact/appeals`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setAppeals(data);
      }
    } catch (err) {
      console.error('Failed to fetch appeals:', err);
    } finally {
      setLoadingAppeals(false);
    }
  };

  const fetchMessages = async (authToken = token) => {
    if (!authToken) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Are you sure you want to delete this contact message?')) return;
    setActionId(msgId);
    try {
      const res = await fetch(`${API_BASE}/api/contact/${msgId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Message deleted successfully.' });
        fetchMessages();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete message.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionId(null);
    }
  };

  const handleMarkMessageRead = async (msgId) => {
    setActionId(msgId);
    try {
      const res = await fetch(`${API_BASE}/api/contact/${msgId}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Message marked as read.' });
        fetchMessages();
      }
    } catch (err) {
      console.error('Failed to mark message read:', err);
    } finally {
      setActionId(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  // BAN / UNBAN USER HANDLER
  const handleToggleBan = async (userObj) => {
    const isCurrentlyBanned = userObj.isBanned;
    const endpoint = isCurrentlyBanned
      ? `${API_BASE}/api/auth/users/${userObj.uid}/unban`
      : `${API_BASE}/api/auth/users/${userObj.uid}/ban`;

    if (!window.confirm(`Are you sure you want to ${isCurrentlyBanned ? 'UNBAN' : 'BAN'} ${userObj.email}?`)) return;

    setActionId(userObj.uid);
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({
          type: 'success',
          text: `User ${userObj.email} has been ${isCurrentlyBanned ? 'unbanned' : 'banned'} successfully.`,
        });
        fetchUsers();
      } else {
        const data = await res.json();
        throw new Error(data.message || 'Action failed.');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setActionId(null);
    }
  };

  // RESOLVE / REJECT APPEALS HANDLERS
  const handleResolveAppeal = async (appealId) => {
    if (!window.confirm('Mark this appeal as resolved?')) return;
    setActionId(appealId);
    try {
      const res = await fetch(`${API_BASE}/api/contact/appeals/${appealId}/resolve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Appeal marked as resolved.' });
        fetchAppeals();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to resolve appeal.' });
    } finally {
      setActionId(null);
    }
  };

  const handleRejectAppeal = async (appealId) => {
    if (!window.confirm('Reject this appeal?')) return;
    setActionId(appealId);
    try {
      const res = await fetch(`${API_BASE}/api/contact/appeals/${appealId}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Appeal marked as rejected.' });
        fetchAppeals();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to reject appeal.' });
    } finally {
      setActionId(null);
    }
  };

  const handleDeleteAppeal = async (appealId) => {
    if (!window.confirm('Are you sure you want to delete this appeal record?')) return;
    setActionId(appealId);
    try {
      const res = await fetch(`${API_BASE}/api/contact/appeals/${appealId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Appeal record deleted successfully.' });
        fetchAppeals();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete appeal.' });
    } finally {
      setActionId(null);
    }
  };

  // VIEW USER DETAILS (DOWNLOAD HISTORY & REVIEWS)
  const handleViewUserDetail = async (userObj) => {
    setSelectedUserDetail(userObj);
    const cleanEmail = (userObj.email || '').trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE}/api/reviews/user/${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const userReviews = await res.json();
        setUserReviewsMap((prev) => ({
          ...prev,
          [cleanEmail]: userReviews,
          [userObj.email]: userReviews,
        }));
      }
    } catch (err) {
      console.warn('Error fetching user reviews:', err);
    }

    try {
      const dbHistory = await fetchUserDownloadHistoryFromDB(cleanEmail);
      if (dbHistory) {
        setUserDownloadsMap((prev) => ({
          ...prev,
          [cleanEmail]: dbHistory,
          [userObj.email]: dbHistory,
        }));
      }
    } catch (err) {
      console.warn('Error fetching user download history:', err);
    }
  };

  // PRODUCT FORM HANDLER
  const startEditProduct = (p) => {
    setEditingProduct(p);
    setTitle(p.title || '');
    setCategory(p.category || 'Mobile App');
    setPrice(p.price || 'Free');
    setVersion(p.version || '1.0.0');
    setDescription(p.description || '');
    setReleaseNotes(p.releaseNotes || '');
    setDirectApkUrl(p.apkFile || '');
    setVideoUrl(p.videoUrl || '');
    setVideoPosterUrl(p.videoPoster || '');
    setLogoUrl(p.logo || '');
    setImageUrl1(p.images?.[0] || p.image || '');
    setImageUrl2(p.images?.[1] || '');
    setImageUrl3(p.images?.[2] || '');
    setMessage({ type: '', text: '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingProduct(null);
    setTitle('');
    setCategory('Mobile App');
    setPrice('Free');
    setVersion('1.0.0');
    setDescription('');
    setReleaseNotes('');
    setDirectApkUrl('');
    setVideoUrl('');
    setVideoPosterUrl('');
    setLogoUrl('');
    setImageUrl1('');
    setImageUrl2('');
    setImageUrl3('');
    setMessage({ type: '', text: '' });
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    if (!directApkUrl || (!directApkUrl.toLowerCase().includes('github.com') && !directApkUrl.toLowerCase().includes('githubusercontent.com'))) {
      setMessage({ type: 'error', text: 'GitHub Release URL is required for product download source (e.g. https://github.com/owner/repo/releases/download/v1.0.0/app.apk).' });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const isEditing = Boolean(editingProduct);
      const url = isEditing
        ? `${API_BASE}/api/products/${editingProduct.id}`
        : `${API_BASE}/api/products`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          category,
          price,
          version,
          description,
          releaseNotes,
          directApkUrl,
          videoUrl,
          videoPosterUrl,
          logoUrl,
          imageUrl1,
          imageUrl2,
          imageUrl3,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save product.');

      setMessage({ type: 'success', text: `Product ${isEditing ? 'updated' : 'published'} successfully via GitHub Release!` });
      cancelEdit();
      fetchProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Product deleted successfully.' });
        fetchProducts();
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete product.' });
    } finally {
      setDeletingId(null);
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;
  const pendingAppealsCount = appeals.filter((a) => a.status === 'pending').length;

  return (
    <div className="admin-container">
      
      {/* HEADER NAVBAR */}
      <header className="admin-header">
        <div className="admin-header-brand">
          <div className="admin-logo-badge">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
          </div>
          <div>
            <h1>Upper Official <span className="highlight-gold">Admin Panel</span></h1>
            <span className="admin-subtext">System Control & Management Console</span>
          </div>
        </div>

        <button className="admin-logout-btn" onClick={handleLogout}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
          <span>Sign Out</span>
        </button>
      </header>

      {/* NAVIGATION TABS (ZERO EMOJIS - VECTOR ICONS ONLY) */}
      <div className="admin-tabs-bar">
        <button
          className={`admin-tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          </svg>
          <span>Products ({products.length})</span>
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <span>User Accounts ({users.length})</span>
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'appeals' ? 'active' : ''}`}
          onClick={() => setActiveTab('appeals')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>
          <span>Appeals</span>
          {pendingAppealsCount > 0 && <span className="tab-badge warning">{pendingAppealsCount}</span>}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'inbox' ? 'active' : ''}`}
          onClick={() => setActiveTab('inbox')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <span>Inbox</span>
          {unreadCount > 0 && <span className="tab-badge alert">{unreadCount}</span>}
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('notifications');
            fetchBroadcastNotifications();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span>Broadcasts ({broadcastNotifications.length})</span>
        </button>
      </div>

      {/* FEEDBACK ALERT MESSAGE */}
      {message.text && (
        <div className={`admin-alert ${message.type}`}>
          {message.type === 'error' ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* TAB 1: PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="admin-grid-layout">
          {/* UPLOAD FORM (GITHUB RELEASE ONLY + GOOGLE PHOTOS LINKS) */}
          <div className="admin-form-card">
            <h3>{editingProduct ? 'Edit Product' : 'Add New Product (GitHub Release)'}</h3>
            
            <form onSubmit={handleSubmitProduct} className="admin-form">
              <div className="form-row">
                <div className="form-group flex-2">
                  <label>Product Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Upper Mobile Client"
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Category *</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Mobile App">Mobile App (.apk)</option>
                    <option value="Windows App">Windows App (.exe)</option>
                    <option value="Design Asset">Design Asset (.zip)</option>
                    <option value="Software Tool">Software Tool</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Price *</label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Free or $29"
                  />
                </div>
                <div className="form-group flex-1">
                  <label>Version *</label>
                  <input
                    type="text"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              {/* REQUIREMENT: GITHUB RELEASE URL REQUIREMENT */}
              <div className="form-group highlight-box">
                <label>GitHub Release Package URL *</label>
                <input
                  type="url"
                  required
                  value={directApkUrl}
                  onChange={(e) => setDirectApkUrl(e.target.value)}
                  placeholder="https://github.com/owner/repo/releases/download/v1.0.0/app.apk"
                />
                <span className="field-hint">Specify direct release package URL for this product deployment.</span>
              </div>

              {/* OPTIONAL PRODUCT DEMO VIDEO URL (YOUTUBE VIDEO LINK) */}
              <div className="form-group highlight-box" style={{ borderColor: 'rgba(56, 189, 248, 0.3)', background: 'rgba(56, 189, 248, 0.05)' }}>
                <label style={{ color: '#38bdf8' }}>Product Demo Video URL (Optional - YouTube Video Link)</label>
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                />
                <span className="field-hint">Paste YouTube video link (watch, shorts, or share URL) for interactive playback in the Video Demos section.</span>
              </div>

              {/* OPTIONAL VIDEO THUMBNAIL / POSTER URL */}
              <div className="form-group highlight-box" style={{ borderColor: 'rgba(212, 175, 55, 0.3)', background: 'rgba(212, 175, 55, 0.05)' }}>
                <label style={{ color: '#d4af37' }}>Video Thumbnail / Poster Image URL (Optional - Google Photos / Direct Image Link)</label>
                <input
                  type="url"
                  value={videoPosterUrl}
                  onChange={(e) => setVideoPosterUrl(e.target.value)}
                  placeholder="https://photos.app.goo.gl/... or direct image thumbnail link"
                />
                <span className="field-hint">Optional thumbnail poster image displayed on the video card and preview deck.</span>
              </div>

              {/* REQUIREMENT: LOGO & SCREENSHOT LINKS (GOOGLE PHOTOS / WEB LINKS) */}
              <div className="form-group">
                <label>Logo / App Icon URL (Google Photos / Direct Image Link)</label>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://lh3.googleusercontent.com/... or direct image URL"
                />
              </div>

              <div className="form-group">
                <label>Screenshot Image URLs (Up to 3 Google Photos / Web Image Links)</label>
                <input
                  type="url"
                  value={imageUrl1}
                  onChange={(e) => setImageUrl1(e.target.value)}
                  placeholder="Screenshot 1 URL..."
                  style={{ marginBottom: '0.4rem' }}
                />
                <input
                  type="url"
                  value={imageUrl2}
                  onChange={(e) => setImageUrl2(e.target.value)}
                  placeholder="Screenshot 2 URL..."
                  style={{ marginBottom: '0.4rem' }}
                />
                <input
                  type="url"
                  value={imageUrl3}
                  onChange={(e) => setImageUrl3(e.target.value)}
                  placeholder="Screenshot 3 URL..."
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  rows="3"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detailed description..."
                />
              </div>

              <div className="form-group">
                <label>Release Notes</label>
                <textarea
                  rows="2"
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                  placeholder="v1.0.0 - Initial release notes..."
                />
              </div>

              <div className="form-actions">
                {editingProduct && (
                  <button type="button" onClick={cancelEdit} className="admin-btn secondary">
                    Cancel Edit
                  </button>
                )}
                <button type="submit" className="admin-btn primary" disabled={submitting}>
                  {submitting ? 'Saving Product...' : editingProduct ? 'Update Product' : 'Publish Product'}
                </button>
              </div>
            </form>
          </div>

          {/* PRODUCTS LIST TABLE */}
          <div className="admin-list-card">
            <h3>Catalog Products ({products.length})</h3>
            
            {loadingProducts ? (
              <div className="admin-loading">Loading catalog...</div>
            ) : products.length === 0 ? (
              <div className="admin-empty">No products found. Add your first release above!</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Version</th>
                      <th>Download Link</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="product-cell">
                          <img src={p.logo || p.image} alt="" className="admin-prod-thumb" referrerPolicy="no-referrer" />
                          <div>
                            <strong>{p.title}</strong>
                            <span className="sub-text">{p.price}</span>
                          </div>
                        </td>
                        <td><span className="cat-pill">{p.category}</span></td>
                        <td><code>v{p.version}</code></td>
                        <td className="link-cell">
                          <a href={p.apkFile} target="_blank" rel="noreferrer" title={p.apkFile}>
                            GitHub Release
                          </a>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button onClick={() => startEditProduct(p)} className="action-btn edit" title="Edit">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="action-btn delete" title="Delete" disabled={deletingId === p.id}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: USER ACCOUNTS & BAN/UNBAN MODERATION */}
      {activeTab === 'users' && (
        <div className="admin-section-block">
          <h3>Registered User Accounts & Moderation ({users.length})</h3>
          
          {loadingUsers ? (
            <div className="admin-loading">Loading users list...</div>
          ) : users.length === 0 ? (
            <div className="admin-empty">No registered users found.</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Profile</th>
                    <th>Email</th>
                    <th>Provider</th>
                    <th>Status</th>
                    <th>Details</th>
                    <th>Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => {
                    const cleanUserEmail = (u.email || '').trim().toLowerCase();
                    const history = getUserDownloadHistory(u.email);
                    const reviews = userReviewsMap[cleanUserEmail] || userReviewsMap[u.email] || [];
                    return (
                      <tr key={u.uid} className={u.isBanned ? 'row-banned' : ''}>
                        <td className="user-profile-cell">
                          <img
                            src={u.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.email)}`}
                            alt={u.displayName || u.email}
                            className="admin-user-avatar"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.email)}`;
                            }}
                          />
                          <div>
                            <strong>{u.displayName || u.email.split('@')[0]}</strong>
                            <span className="sub-text">Registered: {new Date(u.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </td>
                        <td>{u.email}</td>
                        <td><span className="provider-pill">{u.provider || 'email'}</span></td>
                        <td>
                          {u.isBanned ? (
                            <span className="status-badge banned">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                              </svg>
                              <span>BANNED</span>
                            </span>
                          ) : (
                            <span className="status-badge active">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                              </svg>
                              <span>ACTIVE</span>
                            </span>
                          )}
                        </td>
                        <td>
                          <button className="admin-btn outline-sm" onClick={() => handleViewUserDetail(u)}>
                            View Activity ({history.length} DLs, {reviews.length} Reviews)
                          </button>
                        </td>
                        <td>
                          <button
                            className={`ban-action-btn ${u.isBanned ? 'unban' : 'ban'}`}
                            disabled={actionId === u.uid}
                            onClick={() => handleToggleBan(u)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {u.isBanned ? (
                                <>
                                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </>
                              ) : (
                                <>
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </>
                              )}
                            </svg>
                            <span>{actionId === u.uid ? 'Updating...' : u.isBanned ? 'UNBAN USER' : 'BAN USER'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* USER ACTIVITY MODAL DETAIL */}
          {selectedUserDetail && (
            <div className="admin-modal-backdrop" onClick={() => setSelectedUserDetail(null)}>
              <div className="admin-modal-box" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                  <h4>User Activity: {selectedUserDetail.email}</h4>
                  <button className="modal-close-icon" onClick={() => setSelectedUserDetail(null)}>✕</button>
                </div>
                <div className="admin-modal-body">
                  {(() => {
                    const clean = (selectedUserDetail.email || '').trim().toLowerCase();
                    const dlList = userDownloadsMap[clean] || getUserDownloadHistory(clean);
                    return (
                      <>
                        <h5>Download History ({dlList.length})</h5>
                        {dlList.length === 0 ? (
                          <p className="no-data">No recorded downloads for this user in database.</p>
                        ) : (
                          <ul className="activity-list">
                            {dlList.map((dl, idx) => (
                              <li key={idx}>
                                <strong>{dl.title}</strong> (v{dl.version}) — {new Date(dl.downloadedAt).toLocaleDateString()}
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    );
                  })()}

                  <h5 style={{ marginTop: '1.2rem' }}>Review Comments ({userReviewsMap[selectedUserDetail.email]?.length || 0})</h5>
                  {(!userReviewsMap[selectedUserDetail.email] || userReviewsMap[selectedUserDetail.email].length === 0) ? (
                    <p className="no-data">No submitted product reviews for this user.</p>
                  ) : (
                    <div className="activity-reviews-stack">
                      {userReviewsMap[selectedUserDetail.email].map((rev) => (
                        <div key={rev.id} className="activity-review-item">
                          <div className="rev-head">
                            <span className="prod-name">{rev.productTitle}</span>
                            <span className="score">★ {rev.rating} / 5</span>
                          </div>
                          <p className="rev-body">"{rev.comment}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: BAN APPEALS REVIEW */}
      {activeTab === 'appeals' && (
        <div className="admin-section-block">
          <h3>Appeals ({appeals.length})</h3>

          {loadingAppeals ? (
            <div className="admin-loading">Loading appeals...</div>
          ) : appeals.length === 0 ? (
            <div className="admin-empty">No appeals submitted yet.</div>
          ) : (
            <div className="appeals-stack">
              {appeals.map((app) => (
                <div key={app.id} className={`appeal-card ${app.status}`}>
                  <div className="appeal-header">
                    <div>
                      <h4>{app.name} <span className="appeal-email">({app.email})</span></h4>
                      <span className="appeal-date">Submitted: {new Date(app.createdAt).toLocaleString()}</span>
                    </div>
                    <span className={`appeal-status-badge ${app.status}`}>{app.status.toUpperCase()}</span>
                  </div>

                  <div className="appeal-body">
                    <p className="appeal-subject"><strong>Subject:</strong> {app.subject}</p>
                    <p className="appeal-commitment"><strong>Commitment / Explanation:</strong> "{app.commitment}"</p>
                  </div>

                  <div className="appeal-actions">
                    {app.status === 'pending' && (
                      <>
                        <button
                          className="admin-btn primary-sm"
                          disabled={actionId === app.id}
                          onClick={() => handleResolveAppeal(app.id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          <span>{actionId === app.id ? 'Updating...' : 'Resolve Appeal'}</span>
                        </button>

                        <button
                          className="admin-btn outline-sm"
                          disabled={actionId === app.id}
                          onClick={() => handleRejectAppeal(app.id)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                          <span>{actionId === app.id ? 'Updating...' : 'Reject Appeal'}</span>
                        </button>
                      </>
                    )}

                    <button
                      className="admin-btn delete-sm"
                      disabled={actionId === app.id}
                      onClick={() => handleDeleteAppeal(app.id)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>{actionId === app.id ? 'Deleting...' : 'Delete Appeal'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: INBOX MESSAGES */}
      {activeTab === 'inbox' && (
        <div className="admin-section-block">
          <h3>Inbox Messages ({messages.length})</h3>

          {loadingMessages ? (
            <div className="admin-loading">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="admin-empty">No contact messages received.</div>
          ) : (
            <div className="inbox-messages-stack">
              {messages.map((m) => (
                <div key={m.id} className={`message-item ${m.read ? 'read' : 'unread'}`}>
                  <div className="msg-header">
                    <div>
                      <strong>{m.name}</strong> <span className="msg-email">&lt;{m.email}&gt;</span>
                      <span className="msg-date">{new Date(m.createdAt).toLocaleString()}</span>
                    </div>
                    {!m.read ? (
                      <span className="msg-status-badge unread">NEW MESSAGE</span>
                    ) : (
                      <span className="msg-status-badge read">READ</span>
                    )}
                  </div>
                  <p className="msg-content">{m.message}</p>
                  <div className="msg-actions">
                    {!m.read && (
                      <button
                        className="admin-btn outline-sm"
                        disabled={actionId === m.id}
                        onClick={() => handleMarkMessageRead(m.id)}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <span>Mark as Read</span>
                      </button>
                    )}
                    <button
                      className="admin-btn delete-sm"
                      disabled={actionId === m.id}
                      onClick={() => handleDeleteMessage(m.id)}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                      <span>{actionId === m.id ? 'Deleting...' : 'Delete Mail'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: BROADCAST NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="admin-grid-layout">
          {/* COMPOSE BROADCAST FORM */}
          <div className="admin-form-card">
            <h3>Send Broadcast Notification</h3>
            <p className="sub-hint">Send live update, release, or announcement alerts to all users via the Navbar blue notification bell.</p>

            <form onSubmit={handleSendNotification} className="admin-form">
              <div className="form-group">
                <label>Notification Title *</label>
                <input
                  type="text"
                  required
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                  placeholder="e.g., Upper Store 2.1 Release Live!"
                />
              </div>

              <div className="form-row">
                <div className="form-group flex-1">
                  <label>Category *</label>
                  <select value={notifCategory} onChange={(e) => setNotifCategory(e.target.value)}>
                    <option value="Update">Update (Blue)</option>
                    <option value="Release">Release (Green)</option>
                    <option value="Notice">Notice (Amber)</option>
                    <option value="Announcement">Announcement (Gold)</option>
                  </select>
                </div>
                <div className="form-group flex-1">
                  <label>Link / URL (Optional)</label>
                  <input
                    type="url"
                    value={notifLink}
                    onChange={(e) => setNotifLink(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Message Content *</label>
                <textarea
                  required
                  rows="4"
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                  placeholder="Type the update details or announcement message here..."
                ></textarea>
              </div>

              <button type="submit" className="admin-btn primary-full" disabled={sendingNotif}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                </svg>
                <span>{sendingNotif ? 'Sending Broadcast...' : 'Send Broadcast Alert'}</span>
              </button>
            </form>
          </div>

          {/* ACTIVE BROADCASTS LIST */}
          <div className="admin-list-card">
            <h3>Active Broadcasts ({broadcastNotifications.length})</h3>

            {loadingNotifications ? (
              <div className="admin-loading">Loading broadcasts...</div>
            ) : broadcastNotifications.length === 0 ? (
              <div className="admin-empty">No broadcast notifications sent yet.</div>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Title & Message</th>
                      <th>Category</th>
                      <th>Sent Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {broadcastNotifications.map((n) => (
                      <tr key={n.id}>
                        <td>
                          <strong>{n.title}</strong>
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#aaa' }}>{n.message}</p>
                          {n.link && (
                            <a href={n.link} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.75rem', color: '#38bdf8' }}>
                              {n.link}
                            </a>
                          )}
                        </td>
                        <td>
                          <span className={`notif-cat-tag ${(n.category || 'Update').toLowerCase()}`}>
                            {n.category || 'Update'}
                          </span>
                        </td>
                        <td>
                          {new Date(n.createdAt || Date.now()).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </td>
                        <td>
                          <button
                            className="admin-btn delete-sm"
                            onClick={() => handleDeleteNotification(n.id)}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
