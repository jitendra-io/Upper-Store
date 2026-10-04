// =========================================================
// DOWNLOAD TRACKER UTILITY (DATABASE SYNC & REAL USER HISTORY)
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

// Sync download record to backend database & update local product count
export const incrementProductDownloadCount = async (productId, userEmail = '') => {
  if (!productId) return;
  try {
    const map = getProductDownloadCountMap();
    map[productId] = (Number(map[productId]) || 0) + 1;
    localStorage.setItem('upper_product_downloads', JSON.stringify(map));

    // Dispatch instant local reactive event
    window.dispatchEvent(
      new CustomEvent('productDownloadsUpdated', { detail: { productId, newCount: map[productId] } })
    );

    // Send async backend counter increment to Firestore
    fetch(`${API_BASE}/api/products/${productId}/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail }),
    }).catch((err) => {
      console.warn('Failed to sync download count to server:', err);
    });
  } catch (err) {
    console.warn('Failed to update download count in localStorage:', err);
  }
};

// Record download in database & local storage cache
export const recordUserDownload = async (userEmail, product) => {
  if (!userEmail || !product) return;
  const cleanEmail = userEmail.trim().toLowerCase();
  const storageKey = `upper_user_download_history_${cleanEmail}`;

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

  try {
    // 1. Instant local cache update for zero UI latency
    const existingStr = localStorage.getItem(storageKey);
    const history = existingStr ? JSON.parse(existingStr) : [];
    const updatedHistory = [newRecord, ...history];
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory));

    // Instant product download count increment
    if (product && product.id) {
      const prodMap = getProductDownloadCountMap();
      prodMap[product.id] = (Number(prodMap[product.id]) || 0) + 1;
      localStorage.setItem('upper_product_downloads', JSON.stringify(prodMap));
      window.dispatchEvent(
        new CustomEvent('productDownloadsUpdated', { detail: { productId: product.id, newCount: prodMap[product.id] } })
      );
    }

    // Dispatch local reactive event for history
    window.dispatchEvent(
      new CustomEvent('downloadHistoryUpdated', { detail: { userEmail: cleanEmail, record: newRecord } })
    );

    // 2. Persist download history record to backend database (Firestore)
    fetch(`${API_BASE}/api/downloads/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: cleanEmail,
        productId: product.id,
        title: product.title,
        category: product.category,
        version: product.version,
        image: product.image || product.logo,
        apkFile: product.apkFile,
        price: product.price,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.record) {
          fetchUserDownloadHistoryFromDB(cleanEmail);
        }
        if (data.newDownloadCount && product?.id) {
          window.dispatchEvent(
            new CustomEvent('productDownloadsUpdated', { detail: { productId: product.id, newCount: data.newDownloadCount } })
          );
        }
      })
      .catch((err) => {
        console.warn('Failed to persist user download history to database:', err);
      });
  } catch (err) {
    console.warn('Failed to record user download history:', err);
  }
};

// Fetch user's download history array from backend database
export const fetchUserDownloadHistoryFromDB = async (userEmail) => {
  if (!userEmail) return [];
  const cleanEmail = userEmail.trim().toLowerCase();
  const storageKey = `upper_user_download_history_${cleanEmail}`;

  try {
    const res = await fetch(`${API_BASE}/api/downloads/history/${encodeURIComponent(cleanEmail)}`);
    if (res.ok) {
      const dbHistory = await res.json();
      if (Array.isArray(dbHistory)) {
        localStorage.setItem(storageKey, JSON.stringify(dbHistory));
        window.dispatchEvent(
          new CustomEvent('downloadHistoryUpdated', { detail: { userEmail: cleanEmail, history: dbHistory } })
        );
        return dbHistory;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch download history from DB:', err);
  }

  return getUserDownloadHistory(cleanEmail);
};

// Fetch user's download history array from local cache synchronously
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

// Clear user's download history in local cache & database
export const clearUserDownloadHistory = async (userEmail) => {
  if (!userEmail) return;
  const cleanEmail = userEmail.trim().toLowerCase();
  const storageKey = `upper_user_download_history_${cleanEmail}`;
  try {
    localStorage.removeItem(storageKey);
    window.dispatchEvent(new CustomEvent('downloadHistoryUpdated', { detail: { userEmail: cleanEmail } }));

    // Delete history in backend database
    fetch(`${API_BASE}/api/downloads/history/${encodeURIComponent(cleanEmail)}`, {
      method: 'DELETE',
    }).catch((err) => {
      console.warn('Failed to clear download history in DB:', err);
    });
  } catch (err) {
    console.warn('Failed to clear user download history:', err);
  }
};
