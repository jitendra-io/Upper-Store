import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Edit state
  const [editingProduct, setEditingProduct] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Mobile App');
  const [price, setPrice] = useState('Free');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [directApkUrl, setDirectApkUrl] = useState('');
  const [imageFiles, setImageFiles] = useState([]);
  const [logoFile, setLogoFile] = useState(null);
  const [apkFile, setApkFile] = useState(null);

  // Advanced GitHub Release Settings State
  const [showGhSettings, setShowGhSettings] = useState(false);
  const [githubOwner, setGithubOwner] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');

  // Inbox State
  const [messages, setMessages] = useState([]);
  const [showInboxModal, setShowInboxModal] = useState(false);
  const [deletingMsgId, setDeletingMsgId] = useState(null);

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
      fetchMessages(savedToken);

      const interval = setInterval(() => {
        fetchMessages(savedToken);
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [navigate]);

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

  const fetchMessages = async (authToken = token) => {
    if (!authToken) return;
    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to fetch inbox messages:', err);
    }
  };

  const handleMarkRead = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/contact/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages(messages.map((m) => (m.id === id ? { ...m, read: true } : m)));
      }
    } catch (err) {
      console.error('Failed to mark message read:', err);
    }
  };

  const handleDeleteMessage = async (id) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    setDeletingMsgId(id);
    try {
      const res = await fetch(`${API_BASE}/api/contact/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMessages(messages.filter((m) => m.id !== id));
      }
    } catch (err) {
      alert(`Error deleting message: ${err.message}`);
    } finally {
      setDeletingMsgId(null);
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const handleScreenshotChange = (e) => {
    const selected = Array.from(e.target.files).slice(0, 3);
    setImageFiles(selected);
  };

  const startEditProduct = (p) => {
    setEditingProduct(p);
    setTitle(p.title || '');
    setCategory(p.category || 'Mobile App');
    setPrice(p.price || 'Free');
    setVersion(p.version || '1.0.0');
    setDescription(p.description || '');
    setReleaseNotes(p.releaseNotes || '');
    setDirectApkUrl(p.apkFile || '');
    setLogoFile(null);
    setImageFiles([]);
    setApkFile(null);
    // Reset file inputs
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach((input) => (input.value = ''));
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
    setLogoFile(null);
    setImageFiles([]);
    setApkFile(null);
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach((input) => (input.value = ''));
    setMessage({ type: '', text: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('category', category);
      formData.append('price', price);
      formData.append('version', version);
      formData.append('description', description);
      formData.append('releaseNotes', releaseNotes);
      if (directApkUrl) formData.append('directApkUrl', directApkUrl);

      // GitHub custom settings if provided
      if (githubOwner) formData.append('githubOwner', githubOwner);
      if (githubRepo) formData.append('githubRepo', githubRepo);
      if (githubToken) formData.append('githubToken', githubToken);

      imageFiles.forEach((file) => formData.append('images', file));
      if (logoFile) formData.append('logo', logoFile);
      if (apkFile) formData.append('apk', apkFile);

      const isEditing = Boolean(editingProduct);
      const url = isEditing
        ? `${API_BASE}/api/products/${editingProduct.id}`
        : `${API_BASE}/api/products`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || `Failed to ${isEditing ? 'update' : 'upload'} product.`);
      }

      setMessage({
        type: 'success',
        text: `✨ Product successfully ${isEditing ? 'updated' : 'published'}!`,
      });
      cancelEdit();
      fetchProducts();
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete');
      }

      setProducts(products.filter((p) => p.id !== id));
      if (editingProduct?.id === id) {
        cancelEdit();
      }
    } catch (err) {
      alert(`Error deleting product: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const renderFileLink = (p) => {
    if (!p.apkFile) return <span className="no-file">—</span>;
    const fileUrl = p.apkFile.toLowerCase();
    const isGitHub = fileUrl.includes('github.com');
    let label = 'FILE ⬇';
    let className = 'file-link general-link';

    if (isGitHub) {
      label = 'GitHub Release ⬇';
      className = 'file-link github-link';
    } else if (
      fileUrl.endsWith('.exe') ||
      fileUrl.endsWith('.msi') ||
      p.category?.includes('.exe') ||
      p.category?.includes('Windows')
    ) {
      label = 'EXE ⬇';
      className = 'file-link exe-link';
    } else if (fileUrl.endsWith('.apk') || p.category?.includes('Mobile')) {
      label = 'APK ⬇';
      className = 'file-link apk-link';
    } else if (fileUrl.endsWith('.zip')) {
      label = 'ZIP ⬇';
      className = 'file-link zip-link';
    }

    return (
      <a href={p.apkFile} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  };

  return (
    <div className="admin-dashboard-container">
      {/* Header Bar (Full Scale) */}
      <header className="admin-nav">
        <div className="nav-brand">
          <h2>
            Upper <span className="gold-text">Store</span>
          </h2>
          <span className="admin-badge">Admin Control Center</span>
        </div>
        
        <div className="nav-actions">
          <button onClick={() => setShowInboxModal(true)} className="inbox-nav-btn" title="View Customer Messages">
            <span className="inbox-btn-icon">📥</span>
            <span>Customer Inbox</span>
            {unreadCount > 0 ? (
              <span className="unread-badge">{unreadCount}</span>
            ) : (
              <span className="msg-total-badge">{messages.length}</span>
            )}
          </button>

          <button onClick={handleLogout} className="logout-btn">
            <span>Logout</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </header>

      {/* Dashboard Body Content (Reduced by 25%) */}
      <div className="admin-dashboard-body">
        {/* Stats Bar */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-title">Total Live Products</div>
            <div className="stat-value">{products.length}</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Inbox Messages</div>
            <div className="stat-value gold-text">
              {messages.length} <span className="sub-unread">({unreadCount} unread)</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Package Storage</div>
            <div className="stat-value gold-text">GitHub Releases (2GB Max)</div>
          </div>
        </div>

        <div className="admin-main-grid">
          {/* Form Section */}
          <div className="dashboard-card form-section">
            <div className="form-header-row">
              <h3>{editingProduct ? `Edit Product: ${editingProduct.title}` : 'Publish New Product'}</h3>
              {editingProduct && (
                <button type="button" onClick={cancelEdit} className="cancel-edit-btn">
                  ✕ Cancel Edit
                </button>
              )}
            </div>
            <p className="section-desc">
              {editingProduct
                ? 'Update existing details, change category, or upload updated package files.'
                : 'Add a new digital asset, web application, or executable file to Upper Store.'}
            </p>

            {message.text && <div className={`alert-banner ${message.type}`}>{message.text}</div>}

            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="title">Product Title *</label>
                  <input
                    id="title"
                    type="text"
                    placeholder="e.g. Upper Task Manager Pro"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="category">Category *</label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="Mobile App">Mobile App (APK)</option>
                    <option value="Windows App (.exe)">Windows App (.exe)</option>
                    <option value="Web UI Kit">Web UI Kit</option>
                    <option value="SaaS Platform">SaaS Platform</option>
                    <option value="AI Tool">AI Tool</option>
                    <option value="Developer Script">Developer Script</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="price">Price / Badge *</label>
                  <input
                    id="price"
                    type="text"
                    placeholder="e.g. Free, $19, $49"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="version">Version</label>
                  <input
                    id="version"
                    type="text"
                    placeholder="1.0.0"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="description">Short Description *</label>
                <textarea
                  id="description"
                  rows="3"
                  placeholder="Brief summary of features, design system, and capabilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                ></textarea>
              </div>

              <div className="form-group">
                <label htmlFor="releaseNotes">Release Notes & System Requirements</label>
                <textarea
                  id="releaseNotes"
                  rows="3"
                  placeholder="List major changes, compatibility details, or download instructions..."
                  value={releaseNotes}
                  onChange={(e) => setReleaseNotes(e.target.value)}
                ></textarea>
              </div>

              {/* Direct URL OR File Upload for App Package */}
              <div className="form-group">
                <label htmlFor="direct-url">Direct Package Download URL (GitHub Release / CDN URL)</label>
                <input
                  id="direct-url"
                  type="text"
                  placeholder="e.g. https://github.com/YourJITENDRA/Upper-Official/releases/download/v4.0/UpperPlayer_v4.0.apk"
                  value={directApkUrl}
                  onChange={(e) => setDirectApkUrl(e.target.value)}
                />
                <span className="file-hint-text">
                  💡 Paste a direct GitHub Release URL above, OR attach a file below to auto-publish to GitHub Releases.
                </span>
              </div>

              <div className="form-row file-upload-row">
                <div className="form-group">
                  <label htmlFor="logo-file">
                    App / Product Logo Icon {editingProduct && <span className="optional-tag">(Optional replace)</span>}
                  </label>
                  <input
                    id="logo-file"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files[0])}
                  />
                  {logoFile && <span className="file-name">Selected: {logoFile.name}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="image-file">
                    Screenshots (Up to 3 images) {editingProduct && <span className="optional-tag">(Optional replace)</span>}
                  </label>
                  <input
                    id="image-file"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleScreenshotChange}
                  />
                  {imageFiles.length > 0 && (
                    <span className="file-name">
                      {imageFiles.length} file(s) selected: {imageFiles.map((f) => f.name).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="apk-file">
                  Upload Package File (.apk, .exe, .zip) {editingProduct && <span className="optional-tag">(Optional replace)</span>}
                </label>
                <input
                  id="apk-file"
                  type="file"
                  accept=".apk,.exe,.msi,.zip"
                  onChange={(e) => setApkFile(e.target.files[0])}
                />
                {apkFile && <span className="file-name">Selected: {apkFile.name}</span>}
              </div>

              {/* Custom GitHub Account Release Settings Toggle */}
              <div className="github-custom-toggle-container">
                <button
                  type="button"
                  className="gh-toggle-btn"
                  onClick={() => setShowGhSettings(!showGhSettings)}
                >
                  ⚙️ {showGhSettings ? 'Hide' : 'Configure'} GitHub Release Account (Optional)
                </button>

                {showGhSettings && (
                  <div className="gh-custom-settings-box">
                    <div className="form-row">
                      <div className="form-group">
                        <label>GitHub Username / Owner</label>
                        <input
                          type="text"
                          placeholder="e.g. YourJITENDRA"
                          value={githubOwner}
                          onChange={(e) => setGithubOwner(e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Repository Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Upper-Official"
                          value={githubRepo}
                          onChange={(e) => setGithubRepo(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Personal Access Token (PAT Token)</label>
                      <input
                        type="password"
                        placeholder="ghp_..."
                        value={githubToken}
                        onChange={(e) => setGithubToken(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <button type="submit" className="publish-btn" disabled={submitting}>
                {submitting
                  ? 'Publishing Package...'
                  : editingProduct
                  ? 'Update Product'
                  : 'Publish Product'}
              </button>
            </form>
          </div>

          {/* Existing Products List */}
          <div className="dashboard-card list-section">
            <h3>Manage Inventory ({products.length})</h3>
            <p className="section-desc">View, monitor, edit, and remove live products from your catalog.</p>

            {loadingProducts ? (
              <div className="loading-spinner">Loading product catalog...</div>
            ) : products.length === 0 ? (
              <div className="empty-catalog">
                <p>No products added yet. Use the form on the left to add your first product!</p>
              </div>
            ) : (
              <div className="products-table-wrapper">
                <table className="products-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Category</th>
                      <th>Price</th>
                      <th>Version</th>
                      <th>Files</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id} className={editingProduct?.id === p.id ? 'editing-row' : ''}>
                        <td className="product-info-cell">
                          {p.logo || p.image ? (
                            <img src={p.logo || p.image} alt={p.title} className="table-thumb" />
                          ) : (
                            <div className="table-thumb-placeholder">📦</div>
                          )}
                          <div className="product-title-group">
                            <div className="product-title-text">{p.title}</div>
                            <div className="product-date">
                              {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : 'Live'}
                            </div>
                          </div>
                        </td>
                        <td className="category-cell">
                          <span className="category-pill">{p.category}</span>
                        </td>
                        <td className="gold-text fw-bold price-cell">{p.price}</td>
                        <td className="version-cell">v{p.version}</td>
                        <td className="file-links-cell">{renderFileLink(p)}</td>
                        <td className="actions-cell">
                          <div className="action-btns">
                            <button
                              onClick={() => startEditProduct(p)}
                              className="edit-btn"
                              title="Edit Product"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              disabled={deletingId === p.id}
                              className="delete-btn"
                              title="Delete Product"
                            >
                              {deletingId === p.id ? 'Deleting...' : 'Delete'}
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
      </div>

      {/* Customer Contact Inbox Modal */}
      {showInboxModal && (
        <div
          className="inbox-modal-backdrop"
          onClick={(e) => e.target.classList.contains('inbox-modal-backdrop') && setShowInboxModal(false)}
        >
          <div className="inbox-modal-card">
            <div className="inbox-modal-header">
              <div className="inbox-header-title">
                <h3>📥 Customer Messages Inbox</h3>
                <span className="inbox-count-tag">{messages.length} Messages ({unreadCount} Unread)</span>
              </div>
              <button className="inbox-close-btn" onClick={() => setShowInboxModal(false)}>
                ✕
              </button>
            </div>

            <div className="inbox-modal-body">
              {messages.length === 0 ? (
                <div className="empty-inbox">
                  <p>📬 No customer messages received yet.</p>
                  <span className="empty-subtext">
                    Messages sent from your website's Contact page will appear here automatically!
                  </span>
                </div>
              ) : (
                <div className="inbox-messages-list">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`inbox-msg-card ${!msg.read ? 'unread-msg' : ''}`}>
                      <div className="inbox-msg-header">
                        <div className="sender-details">
                          <span className="sender-name">{msg.name}</span>
                          <a href={`mailto:${msg.email}`} className="sender-email">
                            ✉️ {msg.email}
                          </a>
                        </div>
                        <div className="msg-meta-row">
                          <span className="msg-date">
                            {msg.createdAt ? new Date(msg.createdAt).toLocaleString() : 'Recent'}
                          </span>
                          {!msg.read && <span className="unread-pill">NEW</span>}
                        </div>
                      </div>

                      <div className="inbox-msg-content">
                        <p>{msg.message}</p>
                      </div>

                      <div className="inbox-msg-actions">
                        {!msg.read && (
                          <button onClick={() => handleMarkRead(msg.id)} className="mark-read-btn">
                            ✓ Mark as Read
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={deletingMsgId === msg.id}
                          className="msg-delete-btn"
                        >
                          {deletingMsgId === msg.id ? 'Deleting...' : '🗑 Delete'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
