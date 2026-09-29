import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Mobile App');
  const [price, setPrice] = useState('Free');
  const [version, setVersion] = useState('1.0.0');
  const [description, setDescription] = useState('');
  const [releaseNotes, setReleaseNotes] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [apkFile, setApkFile] = useState(null);

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

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
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
      if (imageFile) formData.append('image', imageFile);
      if (apkFile) formData.append('apk', apkFile);

      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to upload product.');
      }

      setMessage({ type: 'success', text: '✨ Product successfully published!' });
      // Reset form
      setTitle('');
      setDescription('');
      setReleaseNotes('');
      setImageFile(null);
      setApkFile(null);
      // Reset file input elements
      const inputs = document.querySelectorAll('input[type="file"]');
      inputs.forEach(input => (input.value = ''));

      // Refresh products list
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
    } catch (err) {
      alert(`Error deleting product: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="admin-dashboard-container">
      {/* Header Bar */}
      <header className="admin-nav">
        <div className="nav-brand">
          <h2>Upper <span className="gold-text">Store</span></h2>
          <span className="admin-badge">Admin Control Center</span>
        </div>
        <button onClick={handleLogout} className="logout-btn">
          <span>Logout</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </header>

      {/* Stats Bar */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-title">Total Live Products</div>
          <div className="stat-value">{products.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Database Engine</div>
          <div className="stat-value status-online">Firebase Firestore</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Storage Provider</div>
          <div className="stat-value gold-text">ImageKit Cloud</div>
        </div>
      </div>

      <div className="admin-main-grid">
        {/* Publish Product Form */}
        <div className="dashboard-card form-section">
          <h3>Publish New Product</h3>
          <p className="section-desc">Add a new digital asset, web application, or APK file to Upper Store.</p>

          {message.text && (
            <div className={`alert-banner ${message.type}`}>
              {message.text}
            </div>
          )}

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

            <div className="form-row file-upload-row">
              <div className="form-group">
                <label htmlFor="image-file">Cover Screenshot (Image)</label>
                <input
                  id="image-file"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files[0])}
                />
                {imageFile && <span className="file-name">Selected: {imageFile.name}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="apk-file">APK / Package File</label>
                <input
                  id="apk-file"
                  type="file"
                  accept=".apk,.zip"
                  onChange={(e) => setApkFile(e.target.files[0])}
                />
                {apkFile && <span className="file-name">Selected: {apkFile.name}</span>}
              </div>
            </div>

            <button type="submit" className="publish-btn" disabled={submitting}>
              {submitting ? 'Uploading to Cloud...' : 'Publish Product'}
            </button>
          </form>
        </div>

        {/* Existing Products List */}
        <div className="dashboard-card list-section">
          <h3>Manage Inventory ({products.length})</h3>
          <p className="section-desc">View, monitor, and remove live products from your catalog.</p>

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
                    <tr key={p.id}>
                      <td className="product-info-cell">
                        {p.image ? (
                          <img src={p.image} alt={p.title} className="table-thumb" />
                        ) : (
                          <div className="table-thumb-placeholder">📦</div>
                        )}
                        <div>
                          <div className="product-title-text">{p.title}</div>
                          <div className="product-date">{new Date(p.createdAt).toLocaleDateString()}</div>
                        </div>
                      </td>
                      <td>
                        <span className="category-pill">{p.category}</span>
                      </td>
                      <td className="gold-text fw-bold">{p.price}</td>
                      <td>v{p.version}</td>
                      <td className="file-links">
                        {p.apkFile ? (
                          <a href={p.apkFile} target="_blank" rel="noopener noreferrer" className="file-link apk-link">
                            APK ⬇
                          </a>
                        ) : (
                          <span className="no-file">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="delete-btn"
                          title="Delete Product"
                        >
                          {deletingId === p.id ? 'Deleting...' : 'Delete'}
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
    </div>
  );
};

export default AdminDashboard;
