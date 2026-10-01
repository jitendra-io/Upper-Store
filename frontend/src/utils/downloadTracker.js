// =========================================================
// DOWNLOAD TRACKER UTILITY (REAL USER HISTORY & DATABASE SYNC)
// =========================================================

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Retrieve all local product download increments from localStorage
export const getProductDownloadCountMap = () => {
  try {
    const data = localStorage.getItem('upper_product_downloads');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.warn('Failed to parse product downloads from localStorage:', err);
    return {};
  }
};

// Get single product's real download count (DB count + local session increments)
export const getProductDownloadCount = (productId, backendCount = 0) => {
  if (!productId) return 0;
  const map = getProductDownloadCountMap();
  const base = Number(backendCount || 0);
  const localExtra = Number(map[productId] || 0);
  return base + localExtra;
};

// Format count for display (e.g., 1420 -> "1.4k")
export const formatDownloadCount = (count) => {
  const num = Number(count) || 0;
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toLocaleString();
};

// Increment product download count locally and sync with backend DB
export const incrementProductDownloadCount = async (productId) => {
  if (!productId) return;
  try {
    const map = getProductDownloadCountMap();
    map[productId] = (Number(map[productId]) || 0) + 1;
    localStorage.setItem('upper_product_downloads', JSON.stringify(map));
    
    // Dispatch instant local reactive event
    window.dispatchEvent(new CustomEvent('productDownloadsUpdated', { detail: { productId, newCount: map[productId] } }));

    // Send async backend counter increment to Firestore
    fetch(`${API_BASE}/api/products/${productId}/download`, { method: 'POST' }).catch((err) => {
      console.warn('Failed to sync download count to server:', err);
    });
  } catch (err) {
    console.warn('Failed to update download count in localStorage:', err);
  }
};

// Record download in user's browser localStorage history
export const recordUserDownload = (userEmail, product) => {
  if (!userEmail || !product) return;
  const cleanEmail = userEmail.trim().toLowerCase();
  const storageKey = `upper_user_download_history_${cleanEmail}`;

  try {
    const existingStr = localStorage.getItem(storageKey);
    const history = existingStr ? JSON.parse(existingStr) : [];

    const newRecord = {
      downloadId: `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      productId: product.id || 'custom',
      title: product.title || 'Downloaded Item',
      category: product.category || 'Digital Asset',
      version: product.version || '1.0.0',
      image: product.image || product.logo || '',
      apkFile: product.apkFile || '#',
      price: product.price || 'Free',
      downloadedAt: new Date().toISOString(),
    };

    // Prepend to history
    const updatedHistory = [newRecord, ...history];
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory));

    // Increment global product download count
    if (product.id) {
      incrementProductDownloadCount(product.id);
    }

    // Trigger reactive update event
    window.dispatchEvent(new CustomEvent('downloadHistoryUpdated', { detail: { userEmail: cleanEmail, record: newRecord } }));
  } catch (err) {
    console.warn('Failed to record user download history:', err);
  }
};

// Fetch user's download history array
export const getUserDownloadHistory = (userEmail) => {
  if (!userEmail) return [];
  const cleanEmail = userEmail.trim().toLowerCase();
  const storageKey = `upper_user_download_history_${cleanEmail}`;
  try {
    const existingStr = localStorage.getItem(storageKey);
    return existingStr ? JSON.parse(existingStr) : [];
  } catch (err) {
    console.warn('Failed to fetch user download history:', err);
    return [];
  }
};

// Clear user's download history
export const clearUserDownloadHistory = (userEmail) => {
  if (!userEmail) return;
  const cleanEmail = userEmail.trim().toLowerCase();
  const storageKey = `upper_user_download_history_${cleanEmail}`;
  try {
    localStorage.removeItem(storageKey);
    window.dispatchEvent(new CustomEvent('downloadHistoryUpdated', { detail: { userEmail: cleanEmail } }));
  } catch (err) {
    console.warn('Failed to clear user download history:', err);
  }
};
