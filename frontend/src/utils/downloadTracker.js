// =========================================================
// DOWNLOAD TRACKER UTILITY (LOCAL STORAGE PER USER & PRODUCT COUNTS)
// =========================================================

// Baseline download counts for initial visual richness
const INITIAL_DOWNLOAD_BASELINES = {
  'demo-1': 1420,
  'demo-2': 3890,
  'demo-3': 855,
  'demo-4': 640,
  'feat-1': 3890,
  'feat-2': 1420,
  'feat-3': 855,
};

// Compute deterministic baseline count if not in initial baselines
const getBaselineCount = (productId) => {
  if (INITIAL_DOWNLOAD_BASELINES[productId]) {
    return INITIAL_DOWNLOAD_BASELINES[productId];
  }
  let hash = 0;
  const str = String(productId || 'default');
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return 100 + Math.abs(hash % 900);
};

// Retrieve all product download counts from localStorage
export const getProductDownloadCountMap = () => {
  try {
    const data = localStorage.getItem('upper_product_downloads');
    return data ? JSON.parse(data) : {};
  } catch (err) {
    console.warn('Failed to parse product downloads from localStorage:', err);
    return {};
  }
};

// Get single product's download count
export const getProductDownloadCount = (productId, backendCount = null) => {
  if (!productId) return 0;
  const map = getProductDownloadCountMap();
  const baseline = backendCount !== null && backendCount !== undefined ? Number(backendCount) : getBaselineCount(productId);
  const localIncrements = Number(map[productId] || 0);
  return baseline + localIncrements;
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

// Increment product download count in localStorage
export const incrementProductDownloadCount = (productId) => {
  if (!productId) return;
  try {
    const map = getProductDownloadCountMap();
    map[productId] = (Number(map[productId]) || 0) + 1;
    localStorage.setItem('upper_product_downloads', JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('productDownloadsUpdated', { detail: { productId, newCount: map[productId] } }));
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
