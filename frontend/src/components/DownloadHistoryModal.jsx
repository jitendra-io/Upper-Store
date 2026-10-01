import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { getUserDownloadHistory, clearUserDownloadHistory, recordUserDownload } from '../utils/downloadTracker';
import './DownloadHistoryModal.css';

const DownloadHistoryModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (user && user.email) {
      setHistory(getUserDownloadHistory(user.email));
    }
  }, [user, isOpen]);

  // Listen for real-time history changes
  useEffect(() => {
    const handleHistoryUpdate = (e) => {
      if (user && user.email && (!e.detail?.userEmail || e.detail.userEmail === user.email.trim().toLowerCase())) {
        setHistory(getUserDownloadHistory(user.email));
      }
    };
    window.addEventListener('downloadHistoryUpdated', handleHistoryUpdate);
    return () => window.removeEventListener('downloadHistoryUpdated', handleHistoryUpdate);
  }, [user]);

  // Handle escape key & background scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !user) return null;

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your local download history?')) {
      clearUserDownloadHistory(user.email);
      setHistory([]);
    }
  };

  const handleRedownload = (item) => {
    recordUserDownload(user.email, {
      id: item.productId,
      title: item.title,
      category: item.category,
      version: item.version,
      image: item.image,
      apkFile: item.apkFile,
      price: item.price,
    });
  };

  const userAvatar = user.photoURL || `https://unavatar.io/${encodeURIComponent(user.email ? user.email.trim().toLowerCase() : 'user')}?fallback=https%3A%2F%2Fapi.dicebear.com%2F7.x%2Finitials%2Fsvg%3Fseed%3D${encodeURIComponent(user.email || 'user')}`;

  const formatDate = (isoString) => {
    if (!isoString) return 'Recent';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return createPortal(
    <div className="history-modal-backdrop" onClick={onClose}>
      <div className="history-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div className="history-modal-header">
          <div className="history-user-info">
            <img
              src={userAvatar}
              alt={user.displayName || 'User'}
              className="history-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.email)}&backgroundColor=d4af37&textColor=000000`;
              }}
            />
            <div>
              <h3>My Download History</h3>
              <p className="history-user-sub">{user.email} • {history.length} {history.length === 1 ? 'Item' : 'Items'} Downloaded</p>
            </div>
          </div>
          <button className="history-close-btn" onClick={onClose} title="Close History">✕</button>
        </div>

        {/* CONTROLS BAR */}
        {history.length > 0 && (
          <div className="history-actions-bar">
            <span className="history-badge-count">📥 Saved in local browser storage</span>
            <button className="history-clear-btn" onClick={handleClear}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              Clear History
            </button>
          </div>
        )}

        {/* BODY / HISTORY LIST */}
        <div className="history-modal-body">
          {history.length === 0 ? (
            <div className="history-empty-state">
              <div className="history-empty-icon">📥</div>
              <h4>No Downloads Recorded Yet</h4>
              <p>When you download apps, software tools, or design packages, your download activity will be stored locally right here in your profile.</p>
              <button className="history-browse-btn" onClick={onClose}>
                Browse Catalog & Downloads
              </button>
            </div>
          ) : (
            <div className="history-items-list">
              {history.map((item) => (
                <div key={item.downloadId} className="history-item-card">
                  <div className="history-item-thumb">
                    <img
                      src={item.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=200'}
                      alt={item.title}
                    />
                  </div>
                  <div className="history-item-details">
                    <div className="history-item-title-row">
                      <h4>{item.title}</h4>
                      {item.version && <span className="history-ver-tag">v{item.version}</span>}
                    </div>
                    <div className="history-item-meta">
                      <span className="history-cat-tag">{item.category}</span>
                      <span className="history-time-stamp">🕒 {formatDate(item.downloadedAt)}</span>
                    </div>
                  </div>
                  <div className="history-item-action">
                    <a
                      href={item.apkFile && item.apkFile !== '#' ? item.apkFile : '/products'}
                      target={item.apkFile && item.apkFile !== '#' ? '_blank' : '_self'}
                      rel="noopener noreferrer"
                      download
                      className="history-redownload-btn"
                      onClick={() => handleRedownload(item)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      Re-Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FOOTER NOTE */}
        <div className="history-modal-footer">
          <span>🔒 Download history is private and preserved locally in your browser.</span>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default DownloadHistoryModal;
