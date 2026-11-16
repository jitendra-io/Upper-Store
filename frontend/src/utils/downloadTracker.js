// =========================================================
// DOWNLOAD TRACKER UTILITY (DATABASE SYNC & REAL USER HISTORY)
// =========================================================

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000';

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

// Record download in database & local storage cache (supports signed-in and anonymous users)
export const recordUserDownload = async (userEmail, product) => {
  if (!product) return;
  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : '';
  const storageKey = cleanEmail ? `upper_user_download_history_${cleanEmail}` : null;

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
    // 1. Instant local user history cache update (if signed in)
    if (storageKey) {
      const existingStr = localStorage.getItem(storageKey);
      const history = existingStr ? JSON.parse(existingStr) : [];
      const updatedHistory = [newRecord, ...history];
      localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
      window.dispatchEvent(
        new CustomEvent('downloadHistoryUpdated', { detail: { userEmail: cleanEmail, record: newRecord } })
      );
    }

    // 2. Instant local product download count increment
    if (product && product.id) {
      const prodMap = getProductDownloadCountMap();
      prodMap[product.id] = (Number(prodMap[product.id]) || 0) + 1;
      localStorage.setItem('upper_product_downloads', JSON.stringify(prodMap));
      window.dispatchEvent(
        new CustomEvent('productDownloadsUpdated', { detail: { productId: product.id, newCount: prodMap[product.id] } })
      );
    }

    // 3. ALWAYS persist download record & increment product count in backend database (Firestore)
    fetch(`${API_BASE}/api/downloads/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: cleanEmail || 'anonymous',
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
        if (cleanEmail && data.record) {
          fetchUserDownloadHistoryFromDB(cleanEmail);
        }
        if (data.newDownloadCount && product?.id) {
          window.dispatchEvent(
            new CustomEvent('productDownloadsUpdated', { detail: { productId: product.id, newCount: data.newDownloadCount } })
          );
        }
      })
      .catch((err) => {
        console.warn('Failed to persist download to database:', err);
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
    const token = localStorage.getItem('upper_user_token') || localStorage.getItem('adminToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}/api/downloads/history/${encodeURIComponent(cleanEmail)}`, {
      headers,
    });
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

    const token = localStorage.getItem('upper_user_token') || localStorage.getItem('adminToken');
    const headers = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Delete history in backend database
    fetch(`${API_BASE}/api/downloads/history/${encodeURIComponent(cleanEmail)}`, {
      method: 'DELETE',
      headers,
    }).catch((err) => {
      console.warn('Failed to clear download history in DB:', err);
    });
  } catch (err) {
    console.warn('Failed to clear user download history:', err);
  }
};


// =========================================================
// CLOUDFLARE EDGE SECURE DOWNLOAD PROXY
// Hides original GitHub URL completely - Chrome shows "upperstore.pages.dev"
// =========================================================

// Extract filename from URL (stripping query string and hash)
export const getFilenameFromUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  try {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const p = cleanUrl.includes('://') ? new URL(cleanUrl).pathname : cleanUrl;
    const last = p.substring(p.lastIndexOf('/') + 1);
    return decodeURIComponent(last).trim();
  } catch (_) {
    const cleanUrl = url.split('?')[0].split('#')[0];
    const last = cleanUrl.substring(cleanUrl.lastIndexOf('/') + 1);
    return last.trim();
  }
};

// Check if an extension is a known non-package web page format
const isWebPageExtension = (ext) => {
  const cleanExt = (ext || '').toLowerCase().replace(/^\./, '');
  return ['html', 'htm', 'php', 'asp', 'aspx', 'jsp', 'cgi'].includes(cleanExt);
};

// Extracts exact authentic file extension from a URL, filename, or path
export const getFileExtensionFromUrl = (url) => {
  if (!url || typeof url !== 'string') return '';
  const fn = getFilenameFromUrl(url) || url.split('?')[0].split('#')[0];
  const clean = fn.trim().toLowerCase();

  // Compound extensions check (e.g. .tar.gz, .tar.bz2, .tar.xz)
  const compoundMatch = clean.match(/\.tar\.(gz|bz2|xz|zst|br)$/i);
  if (compoundMatch) {
    return compoundMatch[0].toLowerCase();
  }

  // General extension check: 1 to 15 alphanumeric characters with dash/underscore
  const match = clean.match(/\.([a-zA-Z0-9_-]{1,15})$/i);
  if (match) {
    const ext = match[0].toLowerCase();
    if (!isWebPageExtension(ext)) {
      return ext;
    }
  }
  return '';
};

// Detect if a URL is a direct downloadable binary vs a GitHub release/web page
export const isDirectDownloadFile = (url) => {
  if (!url || url === '#') return false;
  if (url.startsWith('/uploads/') || url.startsWith('/')) return true;
  if (!url.startsWith('http')) return false;
  const clean = url.split('?')[0].toLowerCase();
  if (clean.includes('/releases/tag/') || clean.endsWith('/releases') || clean.includes('/tree/') || clean.includes('/blob/')) {
    return false;
  }
  const ext = getFileExtensionFromUrl(clean);
  if (ext && !isWebPageExtension(ext)) {
    return true;
  }
  return clean.includes('/releases/download/');
};

// Generates the proper clean file name with authentic extension (.vsix, .apk, .exe, .zip, etc.)
export const getProductDownloadFilename = (product) => {
  if (!product) return 'download.bin';
  const rawUrl = product.apkFile || '';
  const metaFileName = (
    product.originalFilename ||
    product.securityDetails?.fileName ||
    product.downloadName ||
    product.fileName ||
    ''
  ).trim();

  // 1. If product metadata has the exact uploaded filename from developer, preserve it exactly!
  if (metaFileName && getFileExtensionFromUrl(metaFileName)) {
    const sanitizedMeta = metaFileName.replace(/["\r\n\\]/g, '_').trim();
    if (sanitizedMeta.length > 2) {
      return sanitizedMeta;
    }
  }

  // 2. If the URL has an authentic package filename from developer's release, preserve it exactly!
  const urlFilename = getFilenameFromUrl(rawUrl);
  if (urlFilename && getFileExtensionFromUrl(urlFilename)) {
    const sanitizedUrlFn = urlFilename.replace(/["\r\n\\]/g, '_').trim();
    if (sanitizedUrlFn.length > 2) {
      return sanitizedUrlFn;
    }
  }

  // 3. Extract authentic extension from URL, metadata, or title
  const extFromUrl = getFileExtensionFromUrl(rawUrl);
  const extFromMeta = getFileExtensionFromUrl(metaFileName);
  const extFromTitle = getFileExtensionFromUrl(product.title || '');

  const category = String(product.category || '').toLowerCase();
  const ext =
    extFromUrl ||
    extFromMeta ||
    extFromTitle ||
    (category.includes('android') || category.includes('mobile') ? '.apk' : '') ||
    (category.includes('windows') || category.includes('desktop') ? '.exe' : '') ||
    (category.includes('mac') || category.includes('apple') ? '.dmg' : '') ||
    (category.includes('linux') ? '.tar.gz' : '') ||
    (category.includes('extension') || category.includes('plugin') ? '.vsix' : '') ||
    '';

  // 4. Construct from product title with authentic extension
  let safeTitle = (product.title || 'package').replace(/[^a-zA-Z0-9._-]/g, '_');
  if (ext) {
    if (!safeTitle.toLowerCase().endsWith(ext.toLowerCase())) {
      safeTitle = safeTitle.replace(/\.[a-zA-Z0-9_-]{1,10}$/i, '');
      return `${safeTitle}${ext}`;
    }
    return safeTitle;
  }

  // 5. Absolute fallback only if no extension can be detected anywhere
  return safeTitle.includes('.') ? safeTitle : `${safeTitle}.bin`;
};

export const getSecureDownloadUrl = (product) => {
  if (!product) return '#';
  const rawUrl = product.apkFile || '';
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const filename = getProductDownloadFilename(product);
  
  const targetId = (product.productId && product.productId !== 'custom')
    ? product.productId
    : (product.id && product.id !== 'custom' ? product.id : '');

  // If the product is stored in the database, always route through the secure download endpoint.
  // This guarantees the original upstream storage or release link is 100% hidden from the user.
  if (targetId) {
    return `${baseUrl}/api/download?id=${encodeURIComponent(targetId)}&name=${encodeURIComponent(filename)}`;
  }

  // If the link is simply a GitHub release page or web tool (not a direct file),
  // return direct link so browser navigates directly without forcing an asset download.
  if (rawUrl && !isDirectDownloadFile(rawUrl)) {
    return rawUrl;
  }
  
  if (rawUrl && rawUrl !== '#' && rawUrl.startsWith('http')) {
    try {
      const b64 = btoa(rawUrl).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      return `${baseUrl}/api/download?file=${b64}&name=${encodeURIComponent(filename)}`;
    } catch (e) {
      return rawUrl;
    }
  }

  return rawUrl || '#';
};
