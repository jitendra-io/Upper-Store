import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUserDownloadHistory, fetchUserDownloadHistoryFromDB } from '../utils/downloadTracker';
import {
  AlertTriangleIcon,
  CheckIcon,
  CoinsIcon,
  SettingsSlidersIcon,
  ToggleOnIcon,
  ToggleOffIcon,
  SparkleIcon,
  CrownIcon,
  DiamondIcon,
  LockIcon,
  QrCodeIcon,
  CreditCardIcon,
  CloseIcon,
} from '../components/Icons';
import { VipAvatar, VipFlairBadge } from '../components/VipAvatar';
import './AdminDashboard.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('adminToken'));
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'platformFee', 'users', 'appeals', 'inbox'

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
  const [customTags, setCustomTags] = useState('');
  const [hasLicenseKey, setHasLicenseKey] = useState(false);
  const [licensePrice, setLicensePrice] = useState('');
  const [isPlatformFeeWaived, setIsPlatformFeeWaived] = useState(false);

  // Platform Fee Settings State
  const [platformFeeEnabled, setPlatformFeeEnabled] = useState(true);
  const [platformFeeAmount, setPlatformFeeAmount] = useState(19);
  const [originalFeeSettings, setOriginalFeeSettings] = useState({ enabled: true, amount: 19 });
  const [loadingFeeSettings, setLoadingFeeSettings] = useState(false);
  const [savingFeeSettings, setSavingFeeSettings] = useState(false);
  const [feeValidationError, setFeeValidationError] = useState('');

  // Developers State
  const [developers, setDevelopers] = useState([]);
  const [loadingDevelopers, setLoadingDevelopers] = useState(false);
  const [developerSearch, setDeveloperSearch] = useState('');
  const [suspendingDevId, setSuspendingDevId] = useState(null);

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

  // Download Analytics State
  const [allDownloads, setAllDownloads] = useState([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);

  // UPI QR Payments & Approvals State
  const [upiPayments, setUpiPayments] = useState([]);
  const [loadingUpiPayments, setLoadingUpiPayments] = useState(false);
  const [upiStats, setUpiStats] = useState({ total: 0, pending: 0, approved: 0, totalRevenueINR: 0 });
  const [paymentSettings, setPaymentSettings] = useState({
    paymentMode: 'upi_qr',
    upiId: '9692093386@naviaxis',
    payeeName: 'JITENDRA KUMAR MISHRA',
    autoApproveUpi: false,
    qrImageUrl: '/src/assets/upper-upi-qr.png',
  });
  const [loadingPaymentSettings, setLoadingPaymentSettings] = useState(false);
  const [savingPaymentSettings, setSavingPaymentSettings] = useState(false);
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState('all');
  const [processingPaymentId, setProcessingPaymentId] = useState(null);
  const [rejectPromptPaymentId, setRejectPromptPaymentId] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

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
      fetchDevelopers(savedToken);
      fetchAppeals(savedToken);
      fetchMessages(savedToken);
      fetchBroadcastNotifications();
      fetchAllDownloads(savedToken);
      fetchPlatformFeeSettings();
      fetchUpiPayments(savedToken);
      fetchPaymentSettings();
    }
  }, [navigate]);

  const fetchUpiPayments = async (currentToken) => {
    const activeTok = currentToken || token;
    if (!activeTok) return;
    setLoadingUpiPayments(true);
    try {
      const res = await fetch(`${API_BASE}/api/payments/admin/upi-payments`, {
        headers: { Authorization: `Bearer ${activeTok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUpiPayments(data.payments || []);
        if (data.stats) setUpiStats(data.stats);
      }
    } catch (err) {
      console.warn('Failed to fetch UPI payments:', err);
    } finally {
      setLoadingUpiPayments(false);
    }
  };

  const fetchPaymentSettings = async () => {
    setLoadingPaymentSettings(true);
    try {
      const res = await fetch(`${API_BASE}/api/settings/payment-config`);
      if (res.ok) {
        const data = await res.json();
        setPaymentSettings({
          paymentMode: data.paymentMode || 'upi_qr',
          upiId: data.upiId || '9692093386@naviaxis',
          payeeName: data.payeeName || 'JITENDRA KUMAR MISHRA',
          autoApproveUpi: Boolean(data.autoApproveUpi),
          qrImageUrl: data.qrImageUrl || '/src/assets/upper-upi-qr.png',
        });
      }
    } catch (err) {
      console.warn('Failed to fetch payment config:', err);
    } finally {
      setLoadingPaymentSettings(false);
    }
  };

  const handleSavePaymentSettings = async (updates) => {
    setSavingPaymentSettings(true);
    try {
      const payload = { ...paymentSettings, ...updates };
      const res = await fetch(`${API_BASE}/api/settings/payment-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update payment settings.');
      setPaymentSettings(data.settings);
      setMessage({ type: 'success', text: 'Payment settings successfully updated.' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to update payment settings.' });
    } finally {
      setSavingPaymentSettings(false);
    }
  };

  const handleVerifyUpiPayment = async (paymentId, action, rejectReason = '') => {
    setProcessingPaymentId(paymentId);
    try {
      const res = await fetch(`${API_BASE}/api/payments/admin/verify-upi-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token || localStorage.getItem('adminToken')}`,
        },
        body: JSON.stringify({ paymentId, action, rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification action failed.');
      setMessage({ type: 'success', text: data.message });
      setRejectPromptPaymentId(null);
      setRejectReasonInput('');
      fetchUpiPayments();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Error verifying payment.' });
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const fetchPlatformFeeSettings = async () => {
    setLoadingFeeSettings(true);
    setFeeValidationError('');
    try {
      const res = await fetch(`${API_BASE}/api/settings/platform-fee`);
      if (res.ok) {
        const data = await res.json();
        const isEn = data.enabled !== false;
        const amt = typeof data.amount === 'number' ? data.amount : 19;
        setPlatformFeeEnabled(isEn);
        setPlatformFeeAmount(amt);
        setOriginalFeeSettings({ enabled: isEn, amount: amt });
      }
    } catch (err) {
      console.warn('Error fetching platform fee in admin dashboard:', err);
    } finally {
      setLoadingFeeSettings(false);
    }
  };

  const handleSavePlatformFee = async (overrideEnabled, overrideAmount) => {
    const targetEnabled = overrideEnabled !== undefined ? overrideEnabled : platformFeeEnabled;
    const rawAmount = overrideAmount !== undefined ? overrideAmount : platformFeeAmount;
    const targetAmount = Number(rawAmount);

    // Production-grade validation
    if (isNaN(targetAmount)) {
      setFeeValidationError('Validation Error: Platform fee must be a valid number.');
      return;
    }
    if (targetAmount < 0) {
      setFeeValidationError('Validation Error: Platform fee cannot be negative.');
      return;
    }
    if (targetAmount > 999) {
      setFeeValidationError('Validation Error: Platform fee cannot exceed ₹999 INR.');
      return;
    }

    setSavingFeeSettings(true);
    setFeeValidationError('');
    setMessage({ type: '', text: '' });

    try {
      const activeToken = token || localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/settings/platform-fee`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeToken}`,
        },
        body: JSON.stringify({
          enabled: targetEnabled,
          amount: targetAmount,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update platform fee settings.');

      const updatedEn = data.settings?.enabled !== false;
      const updatedAmt = typeof data.settings?.amount === 'number' ? data.settings.amount : targetAmount;

      setPlatformFeeEnabled(updatedEn);
      setPlatformFeeAmount(updatedAmt);
      setOriginalFeeSettings({ enabled: updatedEn, amount: updatedAmt });

      setMessage({
        type: 'success',
        text: updatedEn
          ? `Platform fee successfully updated to ₹${updatedAmt} INR! Standard users must pay this fee on free downloads.`
          : 'Platform fee successfully removed! All free products can now be downloaded for ₹0 by any user.',
      });

      // Broadcast update event so any active modals react in real time
      window.dispatchEvent(new CustomEvent('platformFeeUpdated', {
        detail: { enabled: updatedEn, amount: updatedAmt },
      }));
    } catch (err) {
      setFeeValidationError(err.message || 'Failed to save settings.');
      setMessage({ type: 'error', text: err.message || 'Error updating platform fee settings.' });
    } finally {
      setSavingFeeSettings(false);
    }
  };

  const fetchAllDownloads = async (authToken = token) => {
    setLoadingDownloads(true);
    try {
      const activeToken = authToken || localStorage.getItem('adminToken');
      const headers = {};
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }
      const res = await fetch(`${API_BASE}/api/downloads/admin/all`, { headers });
      if (res.ok) {
        const data = await res.json();
        setAllDownloads(data || []);
      }
    } catch (err) {
      console.warn('Error fetching all download history for admin:', err);
    } finally {
      setLoadingDownloads(false);
    }
  };

  const fetchDevelopers = async (currentToken) => {
    const activeTok = currentToken || token || localStorage.getItem('adminToken');
    if (!activeTok) return;
    setLoadingDevelopers(true);
    try {
      const res = await fetch(`${API_BASE}/api/developers`, {
        headers: { Authorization: `Bearer ${activeTok}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDevelopers(data);
      }
    } catch (err) {
      console.warn('Failed to fetch developers:', err);
    } finally {
      setLoadingDevelopers(false);
    }
  };

  const handleToggleSuspendDev = async (dev) => {
    const action = dev.isSuspended ? 'reinstate' : 'suspend';
    let reason = '';
    if (!dev.isSuspended) {
      reason = window.prompt(
        `Enter suspension reason for developer "${dev.displayName || dev.email}":`,
        'Policy violation or unverified software distribution'
      );
      if (reason === null) return;
    } else {
      if (!window.confirm(`Are you sure you want to reinstate developer "${dev.displayName || dev.email}"?`)) {
        return;
      }
    }

    setSuspendingDevId(dev.id);
    try {
      const activeTok = token || localStorage.getItem('adminToken');
      const res = await fetch(`${API_BASE}/api/developers/${dev.id}/suspend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeTok}`,
        },
        body: JSON.stringify({
          isSuspended: !dev.isSuspended,
          reason,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update developer suspension status.');
      }
      setMessage({
        type: 'success',
        text: data.message || `Developer ${dev.displayName || dev.email} updated.`,
      });
      fetchDevelopers(activeTok);
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSuspendingDevId(null);
    }
  };

  const fetchBroadcastNotifications = async (currentToken) => {
    const activeTok = currentToken || token || localStorage.getItem('adminToken');
    setLoadingNotifications(true);
    try {
      const res = await fetch(`${API_BASE}/api/notifications`, {
        headers: activeTok ? { Authorization: `Bearer ${activeTok}` } : {},
      });
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
          Authorization: `Bearer ${token || localStorage.getItem('adminToken')}`,
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
        headers: { Authorization: `Bearer ${token || localStorage.getItem('adminToken')}` },
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
        headers: { Authorization: `Bearer ${token || localStorage.getItem('adminToken')}` },
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
        headers: { Authorization: `Bearer ${token || localStorage.getItem('adminToken')}` },
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
        headers: { Authorization: `Bearer ${token || localStorage.getItem('adminToken')}` },
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
        headers: { Authorization: `Bearer ${token || localStorage.getItem('adminToken')}` },
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
        headers: { Authorization: `Bearer ${token || localStorage.getItem('adminToken')}` },
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
        headers: { Authorization: `Bearer ${token || localStorage.getItem('adminToken')}` },
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
    setCustomTags(Array.isArray(p.tags) ? p.tags.slice(0, 2).join(', ') : (p.customTags || ''));
    setHasLicenseKey(Boolean(p.hasLicenseKey));
    setLicensePrice(p.licensePrice || '');
    setIsPlatformFeeWaived(Boolean(p.isPlatformFeeWaived));
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
    setCustomTags('');
    setHasLicenseKey(false);
    setLicensePrice('');
    setIsPlatformFeeWaived(false);
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
          Authorization: `Bearer ${token || localStorage.getItem('adminToken')}`,
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
          hasLicenseKey,
          licensePrice: licensePrice.trim() || undefined,
          isPlatformFeeWaived: Boolean(isPlatformFeeWaived),
          tags: customTags.split(',').map(t => t.trim()).filter(Boolean).slice(0, 2),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save product.');

      setMessage({ type: 'success', text: `Product ${isEditing ? 'updated' : 'published'} successfully via GitHub Release!` });
      cancelEdit();
      fetchProducts();
      window.dispatchEvent(new Event('productsUpdated'));
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
        headers: { Authorization: `Bearer ${token || localStorage.getItem('adminToken')}` },
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
          className={`admin-tab-btn ${activeTab === 'platformFee' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('platformFee');
            fetchPlatformFeeSettings();
          }}
        >
          <CoinsIcon size={16} />
          <span>Platform Fee</span>
          <span className={`tab-badge ${platformFeeEnabled ? 'fee-active-badge' : 'fee-disabled-badge'}`}>
            {platformFeeEnabled ? `₹${platformFeeAmount}` : '₹0 Removed'}
          </span>
        </button>

        <button
          className={`admin-tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('payments');
            fetchUpiPayments();
            fetchPaymentSettings();
          }}
        >
          <QrCodeIcon size={16} />
          <span>UPI Payments</span>
          {upiStats.pending > 0 ? (
            <span className="tab-badge warning">{upiStats.pending} Pending</span>
          ) : (
            <span className="tab-badge" style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>Active</span>
          )}
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

        <button
          className={`admin-tab-btn ${activeTab === 'developers' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('developers');
            fetchDevelopers();
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <polyline points="17 11 19 13 23 9"></polyline>
          </svg>
          <span>VIP Developers ({developers.length})</span>
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

              {/* PRODUCT BADGES & TAGS (ADMIN EDITABLE - MAX 2) */}
              <div className="form-group highlight-box" style={{ borderColor: 'rgba(212, 175, 55, 0.35)', background: 'rgba(212, 175, 55, 0.04)' }}>
                {(() => {
                  const currentItems = customTags.split(',').map(s => s.trim()).filter(Boolean);
                  return (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <label style={{ color: '#d4af37', margin: 0 }}>Product Badges & Tags (Max 2)</label>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '0.1rem 0.4rem',
                            borderRadius: '8px',
                            background: currentItems.length >= 2 ? 'rgba(234, 179, 8, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                            color: currentItems.length >= 2 ? '#facc15' : '#aaa',
                            border: currentItems.length >= 2 ? '1px solid rgba(234, 179, 8, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            {currentItems.length} / 2 tags
                          </span>
                        </div>
                        {currentItems.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setCustomTags('')}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#f87171',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              padding: '0 0.2rem',
                              textDecoration: 'underline'
                            }}
                            title="Remove all tags from this product"
                          >
                            Remove All Tags
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={customTags}
                        onChange={(e) => {
                          const val = e.target.value;
                          const splitItems = val.split(',').map(s => s.trim()).filter(Boolean);
                          if (splitItems.length > 2) {
                            // Enforce max 2 tags
                            setCustomTags(splitItems.slice(0, 2).join(', '));
                          } else {
                            setCustomTags(val);
                          }
                        }}
                        placeholder="e.g. Ad-Free APK, Portable .exe (Maximum 2 tags)"
                      />

                      {/* Active Tag Badges with 1-Click Remove (✕) */}
                      {currentItems.length > 0 && (
                        <div style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.72rem', color: '#999', display: 'block', marginBottom: '0.3rem' }}>
                            Active badges ({currentItems.length}/2 — Click ✕ to remove):
                          </span>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {currentItems.slice(0, 2).map((tag, idx) => (
                              <span
                                key={idx}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  background: 'rgba(212, 175, 55, 0.14)',
                                  border: '1px solid rgba(212, 175, 55, 0.4)',
                                  color: '#d4af37',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  padding: '0.2rem 0.55rem',
                                  borderRadius: '12px'
                                }}
                              >
                                <span>{tag}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const remaining = currentItems.filter((_, i) => i !== idx);
                                    setCustomTags(remaining.join(', '));
                                  }}
                                  title={`Remove "${tag}"`}
                                  style={{
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    border: 'none',
                                    color: '#fca5a5',
                                    cursor: 'pointer',
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.7rem',
                                    padding: 0,
                                    lineHeight: 1,
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = '#ef4444';
                                    e.currentTarget.style.color = '#ffffff';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                                    e.currentTarget.style.color = '#fca5a5';
                                  }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <span className="field-hint" style={{ marginTop: '0.45rem', display: 'block' }}>
                        {currentItems.length >= 2 ? (
                          <span style={{ color: '#fbbf24', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <AlertTriangleIcon size={14} /> Maximum 2 tags reached. Remove a tag above if you wish to select a different one.
                          </span>
                        ) : (
                          <span>Click preset badges below to add (up to 2), or type custom tags above:</span>
                        )}
                      </span>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
                        {[
                          'Ad-Free APK',
                          'Portable .exe',
                          'SHA-256 Verified',
                          'Zero Telemetry',
                          'Open Source',
                          'Commercial Asset',
                          'Developer Tool'
                        ].map((preset) => {
                          const isActive = currentItems.includes(preset);
                          const isMaxReached = !isActive && currentItems.length >= 2;
                          return (
                            <button
                              key={preset}
                              type="button"
                              style={{
                                background: isActive ? 'rgba(212, 175, 55, 0.25)' : 'rgba(255, 255, 255, 0.05)',
                                border: isActive ? '1px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.25)',
                                color: isActive ? '#fff' : isMaxReached ? '#666' : '#d4af37',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                padding: '0.2rem 0.55rem',
                                borderRadius: '12px',
                                cursor: isMaxReached ? 'not-allowed' : 'pointer',
                                opacity: isMaxReached ? 0.45 : 1,
                                transition: 'all 0.2s ease',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem'
                              }}
                              onClick={() => {
                                if (isActive) {
                                  // Toggle off (remove)
                                  setCustomTags(currentItems.filter(t => t !== preset).join(', '));
                                } else {
                                  // Check max 2 limit
                                  if (currentItems.length >= 2) {
                                    alert('Maximum 2 tags allowed per product. Please remove an existing tag first.');
                                    return;
                                  }
                                  setCustomTags([...currentItems, preset].join(', '));
                                }
                              }}
                              title={isActive ? `Click to remove "${preset}"` : isMaxReached ? 'Maximum 2 tags already selected' : `Click to add "${preset}"`}
                            >
                              {isActive ? `✓ ${preset}` : `+ ${preset}`}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* DIGITAL LICENSE KEY SYSTEM TOGGLE */}
              <div className="form-group highlight-box" style={{
                borderColor: hasLicenseKey ? 'rgba(212, 175, 55, 0.45)' : 'rgba(255, 255, 255, 0.1)',
                background: hasLicenseKey ? 'linear-gradient(135deg, rgba(212, 175, 55, 0.08) 0%, rgba(20, 16, 32, 0.4) 100%)' : 'rgba(255, 255, 255, 0.02)',
                padding: '1.1rem',
                borderRadius: '12px',
                transition: 'all 0.25s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <label
                    htmlFor="licenseKeyCheckbox"
                    style={{
                      color: hasLicenseKey ? '#ffd700' : '#f1f5f9',
                      margin: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      fontSize: '0.92rem',
                      fontWeight: 700
                    }}
                  >
                    <input
                      id="licenseKeyCheckbox"
                      type="checkbox"
                      checked={hasLicenseKey}
                      onChange={(e) => setHasLicenseKey(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#d4af37', cursor: 'pointer' }}
                    />
                    <span>Offer Pro License Key for this Product</span>
                  </label>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '8px',
                    background: hasLicenseKey ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: hasLicenseKey ? '#4ade80' : '#94a3b8',
                    border: hasLicenseKey ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {hasLicenseKey ? 'ENABLED' : 'OFF'}
                  </span>
                </div>

                <span className="field-hint" style={{ marginTop: '0.5rem', display: 'block', color: '#94a3b8', fontSize: '0.78rem' }}>
                  When enabled, buyers of this specific product will see the <strong>&quot;Buy Pro License&quot;</strong> button to purchase and generate a cryptographically signed HMAC-SHA256 license key. If unchecked, license key purchasing is disabled for this product.
                </span>

                {hasLicenseKey && (
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(212, 175, 55, 0.2)' }}>
                    <label style={{ fontSize: '0.8rem', color: '#ffd700', marginBottom: '0.35rem', display: 'block', fontWeight: 600 }}>
                      Pro License Price Override (Optional &bull; Defaults to product price or $19):
                    </label>
                    <input
                      type="text"
                      value={licensePrice}
                      onChange={(e) => setLicensePrice(e.target.value)}
                      placeholder="e.g. $19, $49, or 1499 INR"
                      style={{ maxWidth: '320px' }}
                    />
                  </div>
                )}
              </div>

              {/* SPECIFIC PRODUCT PLATFORM FEE WAIVER TOGGLE */}
              <div className="form-group highlight-box" style={{
                borderColor: isPlatformFeeWaived ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.1)',
                background: isPlatformFeeWaived ? 'linear-gradient(135deg, rgba(56, 189, 248, 0.08) 0%, rgba(20, 16, 32, 0.4) 100%)' : 'rgba(255, 255, 255, 0.02)',
                padding: '1.1rem',
                borderRadius: '12px',
                transition: 'all 0.25s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
                  <label
                    htmlFor="platformFeeWaivedCheckbox"
                    style={{
                      color: isPlatformFeeWaived ? '#38bdf8' : '#f1f5f9',
                      margin: 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.65rem',
                      fontSize: '0.92rem',
                      fontWeight: 700
                    }}
                  >
                    <input
                      id="platformFeeWaivedCheckbox"
                      type="checkbox"
                      checked={isPlatformFeeWaived}
                      onChange={(e) => setIsPlatformFeeWaived(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#38bdf8', cursor: 'pointer' }}
                    />
                    <span>Waive Platform Fee on this Product (Always 100% Free)</span>
                  </label>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    padding: '0.15rem 0.55rem',
                    borderRadius: '8px',
                    background: isPlatformFeeWaived ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.08)',
                    color: isPlatformFeeWaived ? '#38bdf8' : '#94a3b8',
                    border: isPlatformFeeWaived ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {isPlatformFeeWaived ? 'WAIVED (₹0 FEE)' : 'FOLLOWS STORE POLICY'}
                  </span>
                </div>

                <span className="field-hint" style={{ marginTop: '0.5rem', display: 'block', color: '#94a3b8', fontSize: '0.78rem' }}>
                  If checked, non-VIP users can download this product completely free without paying any platform fee, even when global store platform fee is active. If unchecked, this product follows the global store platform fee policy ({platformFeeEnabled ? `₹${platformFeeAmount} INR` : 'Currently Removed / Free'}).
                </span>
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
                      <th>Total Downloads</th>
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                              <span className="sub-text">{p.price}</span>
                              {p.hasLicenseKey ? (
                                <span style={{ fontSize: '0.65rem', background: 'rgba(34, 197, 94, 0.15)', color: '#4ade80', border: '1px solid rgba(34, 197, 94, 0.35)', padding: '0.08rem 0.4rem', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                  <CheckIcon size={10} /> Pro License: {p.licensePrice || 'Active'}
                                </span>
                              ) : null}
                            </div>
                            {Array.isArray(p.tags) && p.tags.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.25rem' }}>
                                {p.tags.map((t, idx) => (
                                  <span key={idx} style={{ fontSize: '0.65rem', background: 'rgba(212, 175, 55, 0.12)', color: '#d4af37', border: '1px solid rgba(212, 175, 55, 0.3)', padding: '0.08rem 0.35rem', borderRadius: '4px' }}>
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                        <td><span className="cat-pill">{p.category}</span></td>
                        <td><code>v{p.version}</code></td>
                        <td>
                          <span className="cat-pill" style={{ background: 'rgba(212, 175, 55, 0.15)', color: '#d4af37', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
                            {p.downloadCount || 0} Downloads
                          </span>
                        </td>
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

      {/* TAB: VIP DEVELOPERS OVERSIGHT & AADHAAR VERIFICATION */}
      {activeTab === 'developers' && (
        <div className="admin-section-block">
          <div className="admin-section-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ margin: 0 }}>VIP Developers &amp; Aadhaar Verification ({developers.length})</h3>
              <p className="admin-section-desc" style={{ margin: '0.25rem 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>
                Review submitted Aadhaar proofs via Google Drive, inspect developer contact details, and suspend or reinstate publishing access.
              </p>
            </div>
            <button className="admin-btn outline-sm" onClick={() => fetchDevelopers()} disabled={loadingDevelopers}>
              {loadingDevelopers ? 'Refreshing...' : 'Refresh Developers'}
            </button>
          </div>

          <div className="admin-stats-pills-row" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div className="stat-pill" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)', padding: '0.65rem 1rem', borderRadius: '10px' }}>
              <span className="stat-val" style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>{developers.length}</span>
              <span className="stat-lbl" style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase' }}>Registered Developers</span>
            </div>
            <div className="stat-pill" style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', padding: '0.65rem 1rem', borderRadius: '10px' }}>
              <span className="stat-val" style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#22c55e' }}>
                {developers.filter(d => !d.isSuspended).length}
              </span>
              <span className="stat-lbl" style={{ fontSize: '0.72rem', color: '#86efac', textTransform: 'uppercase' }}>Active Publishers</span>
            </div>
            <div className="stat-pill" style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '0.65rem 1rem', borderRadius: '10px' }}>
              <span className="stat-val" style={{ display: 'block', fontSize: '1.25rem', fontWeight: 800, color: '#ef4444' }}>
                {developers.filter(d => d.isSuspended).length}
              </span>
              <span className="stat-lbl" style={{ fontSize: '0.72rem', color: '#fca5a5', textTransform: 'uppercase' }}>Suspended Accounts</span>
            </div>
          </div>

          <div className="admin-search-bar" style={{ margin: '1rem 0' }}>
            <input
              type="text"
              placeholder="Search developers by public name, legal name, email, phone, or Aadhaar number..."
              value={developerSearch}
              onChange={(e) => setDeveloperSearch(e.target.value)}
              className="admin-search-input"
              style={{
                width: '100%',
                padding: '0.65rem 1rem',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                boxSizing: 'border-box',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {loadingDevelopers ? (
            <div className="admin-loading">Loading developer directory...</div>
          ) : developers.length === 0 ? (
            <div className="admin-empty">No VIP developers have registered for publishing yet.</div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Developer Profile</th>
                    <th>Contact &amp; VIP Tier</th>
                    <th>12-Digit Aadhaar</th>
                    <th>Aadhaar Proof (Drive)</th>
                    <th>Published Products</th>
                    <th>Status</th>
                    <th>Account Moderation</th>
                  </tr>
                </thead>
                <tbody>
                  {developers
                    .filter((d) => {
                      if (!developerSearch.trim()) return true;
                      const q = developerSearch.toLowerCase();
                      return (
                        (d.displayName && d.displayName.toLowerCase().includes(q)) ||
                        (d.legalName && d.legalName.toLowerCase().includes(q)) ||
                        (d.email && d.email.toLowerCase().includes(q)) ||
                        (d.phone && d.phone.includes(q)) ||
                        (d.aadhaarNumber && d.aadhaarNumber.includes(q))
                      );
                    })
                    .map((dev) => {
                      return (
                        <tr key={dev.id} className={dev.isSuspended ? 'row-banned' : ''}>
                          <td className="user-profile-cell">
                            <VipAvatar
                              src={dev.avatar}
                              alt={dev.displayName || dev.legalName}
                              plan={dev.vipPlan || 'pro'}
                              size="md"
                              fallbackSeed={dev.email || 'dev'}
                            />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <strong>{dev.displayName || 'Developer'}</strong>
                                <VipFlairBadge plan={dev.vipPlan || 'pro'} compact={true} />
                              </div>
                              <span className="sub-text">Legal: {dev.legalName}</span>
                              <span className="sub-text">Joined: {new Date(dev.createdAt || Date.now()).toLocaleDateString()}</span>
                            </div>
                          </td>

                          <td>
                            <div>
                              <span style={{ color: '#ffffff', fontWeight: 600 }}>{dev.email}</span>
                              <div className="sub-text">Phone: {dev.phone}</div>
                              <span className={`provider-pill ${dev.vipPlan === 'elite' ? 'elite' : 'pro'}`} style={{ marginTop: '4px', display: 'inline-block' }}>
                                {dev.vipPlan ? dev.vipPlan.toUpperCase() : 'PRO'} VIP
                              </span>
                            </div>
                          </td>

                          <td>
                            <span style={{ letterSpacing: '1px', fontFamily: 'monospace', fontWeight: 700, color: '#ffd700' }}>
                              {dev.aadhaarNumber
                                ? `${dev.aadhaarNumber.slice(0, 4)} ${dev.aadhaarNumber.slice(4, 8)} ${dev.aadhaarNumber.slice(8, 12)}`
                                : 'N/A'}
                            </span>
                          </td>

                          <td>
                            {dev.aadhaarDriveLink ? (
                              <a
                                href={dev.aadhaarDriveLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-btn outline-sm drive-link-btn"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', background: 'rgba(212, 175, 55, 0.1)', borderColor: '#d4af37', color: '#ffd700' }}
                                title="Open Google Drive document in new tab"
                              >
                                View Aadhaar Proof ↗
                              </a>
                            ) : (
                              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No link</span>
                            )}
                          </td>

                          <td>
                            <span style={{ fontWeight: 700, color: '#e2e8f0' }}>
                              {dev.productsCount || 0} {dev.productsCount === 1 ? 'Product' : 'Products'}
                            </span>
                          </td>

                          <td>
                            {dev.isSuspended ? (
                              <span className="status-badge banned">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="12" cy="12" r="10"></circle>
                                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                                </svg>
                                <span>SUSPENDED</span>
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
                            <button
                              className={`admin-btn ${dev.isSuspended ? 'success-sm' : 'danger-sm'}`}
                              onClick={() => handleToggleSuspendDev(dev)}
                              disabled={suspendingDevId === dev.id}
                            >
                              {suspendingDevId === dev.id
                                ? 'Updating...'
                                : dev.isSuspended
                                ? 'Reinstate Account'
                                : 'Suspend Account'}
                            </button>
                            {dev.isSuspended && dev.suspensionReason && (
                              <div style={{ fontSize: '0.72rem', color: '#fca5a5', marginTop: '4px' }}>
                                Reason: {dev.suspensionReason}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
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

      {/* TAB: PLATFORM FEE MANAGEMENT */}
      {activeTab === 'platformFee' && (
        <div className="admin-section platform-fee-section">
          {/* Section Header */}
          <div className="section-header platform-fee-header">
            <div>
              <h3>
                <CoinsIcon size={22} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#d4af37' }} />
                Platform Fee Management on Free Products
              </h3>
              <p className="section-desc">
                Completely control, toggle, or remove the download platform fee charged to standard customers on free software. Upper VIP Club members (Pro &amp; Elite) are always granted ₹0 fee immunity.
              </p>
            </div>
            <button
              className="admin-btn outline"
              onClick={fetchPlatformFeeSettings}
              disabled={loadingFeeSettings || savingFeeSettings}
            >
              {loadingFeeSettings ? 'Syncing Settings...' : 'Refresh Status'}
            </button>
          </div>

          {/* Quick Status Hero Card */}
          <div className={`platform-fee-status-banner ${platformFeeEnabled ? 'banner-active' : 'banner-removed'}`}>
            <div className="status-banner-left">
              <div className="status-indicator-dot">
                <span className="dot-pulse"></span>
              </div>
              <div className="status-banner-text">
                <div className="status-badge-title">
                  <span className="status-label">CURRENT GLOBAL STORE POLICY:</span>
                  <span className="status-val">
                    {platformFeeEnabled ? `ACTIVE • ₹${platformFeeAmount} INR CHARGED ON FREE DOWNLOADS` : 'REMOVED • 100% COMPLIMENTARY (₹0 FEE FOR ALL)'}
                  </span>
                </div>
                <p className="status-explanation">
                  {platformFeeEnabled
                    ? `Standard non-VIP users are prompted to pay ₹${platformFeeAmount} INR to unlock free community software downloads. VIP Club members download with zero fees.`
                    : 'The platform fee is completely removed. All customers (both standard users and VIP members) can download any free software with ₹0 platform fee.'}
                </p>
              </div>
            </div>

            <div className="status-banner-actions">
              {platformFeeEnabled ? (
                <button
                  type="button"
                  className="quick-action-btn remove-fee-action"
                  onClick={() => handleSavePlatformFee(false, 0)}
                  disabled={savingFeeSettings}
                >
                  <ToggleOffIcon size={18} />
                  <span>Remove Platform Fee (Set to ₹0)</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="quick-action-btn activate-fee-action"
                  onClick={() => handleSavePlatformFee(true, 19)}
                  disabled={savingFeeSettings}
                >
                  <ToggleOnIcon size={18} />
                  <span>Restore Standard Fee (₹19)</span>
                </button>
              )}
            </div>
          </div>

          {/* Main Controls & Live Preview Grid */}
          <div className="admin-grid-2-col">
            {/* Left Column: Settings Configuration Form */}
            <div className="admin-form-card fee-settings-card">
              <h4>
                <SettingsSlidersIcon size={18} style={{ marginRight: '6px', verticalAlign: 'middle', color: '#d4af37' }} />
                Platform Fee Settings &amp; Rules
              </h4>

              <form onSubmit={(e) => { e.preventDefault(); handleSavePlatformFee(); }} className="admin-form">
                {/* Master Switch Toggle */}
                <div className="fee-toggle-box">
                  <div className="fee-toggle-text">
                    <span className="fee-toggle-title">Charge Platform Fee on Free Products</span>
                    <span className="fee-toggle-subtitle">
                      When enabled, non-VIP users are required to pay the configured fee before initiating an APK/software download.
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`fee-switch-button ${platformFeeEnabled ? 'is-enabled' : 'is-disabled'}`}
                    onClick={() => {
                      const next = !platformFeeEnabled;
                      setPlatformFeeEnabled(next);
                      if (!next) {
                        setFeeValidationError('');
                      }
                    }}
                    role="switch"
                    aria-checked={platformFeeEnabled}
                  >
                    <span className="switch-slider"></span>
                    <span className="switch-text">{platformFeeEnabled ? 'ACTIVE (ON)' : 'REMOVED (OFF)'}</span>
                  </button>
                </div>

                {/* Amount Input */}
                <div className={`fee-amount-control-group ${!platformFeeEnabled ? 'fee-input-dimmed' : ''}`}>
                  <label htmlFor="platformFeeInput" className="fee-input-label">
                    <span>Platform Fee Amount (INR)</span>
                    <span className="fee-range-hint">Valid Range: ₹0 to ₹999</span>
                  </label>

                  <div className="fee-input-wrapper">
                    <span className="fee-currency-prefix">₹</span>
                    <input
                      id="platformFeeInput"
                      type="number"
                      min="0"
                      max="999"
                      step="1"
                      disabled={!platformFeeEnabled}
                      value={platformFeeAmount}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setPlatformFeeAmount('');
                          setFeeValidationError('Fee amount cannot be empty.');
                          return;
                        }
                        const num = Number(val);
                        setPlatformFeeAmount(val);
                        if (isNaN(num)) {
                          setFeeValidationError('Please enter a valid numeric amount.');
                        } else if (num < 0) {
                          setFeeValidationError('Fee amount cannot be negative.');
                        } else if (num > 999) {
                          setFeeValidationError('Fee amount cannot exceed ₹999 INR.');
                        } else {
                          setFeeValidationError('');
                        }
                      }}
                      className="fee-number-input"
                      placeholder="19"
                    />
                    <span className="fee-currency-suffix">INR per download</span>
                  </div>

                  {feeValidationError && (
                    <div className="fee-validation-error">
                      <AlertTriangleIcon size={14} />
                      <span>{feeValidationError}</span>
                    </div>
                  )}

                  {!feeValidationError && platformFeeEnabled && Number(platformFeeAmount) === 0 && (
                    <div className="fee-validation-info">
                      <CheckIcon size={14} />
                      <span>Setting the amount to ₹0 effectively removes the platform fee for all users.</span>
                    </div>
                  )}

                  {/* Preset Pills */}
                  <div className="fee-presets-wrapper">
                    <span className="presets-label">Quick Preset Fee Amounts:</span>
                    <div className="fee-presets-pills">
                      {[
                        { label: '₹0 (Remove)', value: 0 },
                        { label: '₹9', value: 9 },
                        { label: '₹19 (Standard)', value: 19 },
                        { label: '₹29', value: 29 },
                        { label: '₹49', value: 49 },
                        { label: '₹99', value: 99 },
                      ].map((preset) => {
                        const isSelected = Number(platformFeeAmount) === preset.value && (preset.value === 0 ? !platformFeeEnabled : platformFeeEnabled);
                        return (
                          <button
                            type="button"
                            key={preset.value}
                            className={`preset-pill ${isSelected ? 'pill-selected' : ''}`}
                            onClick={() => {
                              if (preset.value === 0) {
                                setPlatformFeeAmount(0);
                                setPlatformFeeEnabled(false);
                              } else {
                                setPlatformFeeAmount(preset.value);
                                setPlatformFeeEnabled(true);
                              }
                              setFeeValidationError('');
                            }}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="fee-form-actions">
                  <button
                    type="submit"
                    className="admin-btn primary fee-save-btn"
                    disabled={savingFeeSettings || Boolean(feeValidationError)}
                  >
                    {savingFeeSettings ? (
                      <span>Saving Changes...</span>
                    ) : (
                      <>
                        <CheckIcon size={16} />
                        <span>Save Platform Fee Settings</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    className="admin-btn outline"
                    onClick={() => {
                      setPlatformFeeEnabled(originalFeeSettings.enabled);
                      setPlatformFeeAmount(originalFeeSettings.amount);
                      setFeeValidationError('');
                    }}
                    disabled={savingFeeSettings}
                  >
                    Discard Changes
                  </button>
                </div>
              </form>
            </div>

            {/* Right Column: Live Store Simulator & Logic Rules */}
            <div className="admin-form-card fee-simulator-card">
              <h4>Live Storefront Preview</h4>
              <p className="simulator-subtitle">
                Real-time preview of download buttons and VIP promotions seen by customers on product pages.
              </p>

              {/* Simulation 1: Standard User */}
              <div className="simulator-box">
                <div className="simulator-header">
                  <span className="simulator-user-type">Standard Customer (Free Account)</span>
                  <span className={`simulator-status-pill ${platformFeeEnabled && Number(platformFeeAmount) > 0 ? 'pill-fee' : 'pill-free'}`}>
                    {platformFeeEnabled && Number(platformFeeAmount) > 0 ? `Requires ₹${platformFeeAmount}` : '₹0 Free Download'}
                  </span>
                </div>

                <div className="simulator-preview-area">
                  {platformFeeEnabled && Number(platformFeeAmount) > 0 ? (
                    <>
                      <div className="simulated-cta-btn simulated-fee-btn">
                        <LockIcon size={15} style={{ marginRight: '6px' }} />
                        <span>Download (₹{platformFeeAmount} Platform Fee)</span>
                      </div>

                      <div className="simulated-upsell-box">
                        <div className="simulated-upsell-top">
                          <span className="sim-badge"><SparkleIcon size={11} /> UPPER VIP CLUB</span>
                          <span className="sim-gold">Get ₹0 Platform Fee on ALL downloads</span>
                        </div>
                        <span className="sim-desc">
                          Pro (₹99/mo) &bull; Elite (₹399/yr) &bull; Official Badges
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="simulated-cta-btn simulated-free-cleared-btn">
                      <CheckIcon size={15} style={{ marginRight: '6px' }} />
                      <span>Free Download (₹0 Fee)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation 2: VIP User */}
              <div className="simulator-box">
                <div className="simulator-header">
                  <span className="simulator-user-type">Upper VIP Club Member (Pro / Elite)</span>
                  <span className="simulator-status-pill pill-vip">Always ₹0 Waived</span>
                </div>

                <div className="simulator-preview-area">
                  <div className="simulated-cta-btn simulated-vip-btn">
                    <CrownIcon size={15} style={{ marginRight: '6px', color: '#ffd700' }} />
                    <span>Free Download (₹0 Platform Fee)</span>
                  </div>
                  <span className="simulated-vip-note">
                    <CheckIcon size={13} style={{ color: '#10b981', marginRight: '4px' }} />
                    VIP members automatically bypass all platform download fees.
                  </span>
                </div>
              </div>

              {/* Policy Rules & Instructions */}
              <div className="fee-guidelines-box">
                <h5>Platform Fee Logic &amp; Validations</h5>
                <ul>
                  <li><strong>Admin Controlled:</strong> The platform fee amount and active state depend entirely on admin configuration.</li>
                  <li><strong>Instant Real-time Sync:</strong> Changes take effect immediately across all active browser sessions without restarts.</li>
                  <li><strong>Per-Product Exemption:</strong> You can also exempt specific software from the fee via the &quot;Waive Platform Fee&quot; toggle in the Products tab.</li>
                  <li><strong>VIP Immunity:</strong> Pro (₹99/mo) and Elite (₹399/yr) VIP subscribers always retain permanent ₹0 platform fee download privileges.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: UPI PAYMENTS & APPROVALS CONSOLE */}
      {activeTab === 'payments' && (
        <div className="admin-section upi-payments-section">
          <div className="section-header">
            <div>
              <h3>
                <QrCodeIcon size={22} style={{ marginRight: '8px', verticalAlign: 'middle', color: '#ffd700' }} />
                Real UPI QR Payments &amp; Subscription Approvals
              </h3>
              <p className="section-subtitle">
                Verify incoming direct bank payments via UPI QR, approve pending VIP subscriptions, and issue cryptographic licenses.
              </p>
            </div>
            <button
              className="admin-btn outline"
              onClick={() => {
                fetchUpiPayments();
                fetchPaymentSettings();
              }}
              disabled={loadingUpiPayments}
            >
              {loadingUpiPayments ? 'Syncing...' : 'Refresh Payments'}
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="upi-metrics-grid">
            <div className={`upi-metric-card metric-pending ${upiStats.pending > 0 ? 'has-pending' : ''}`}>
              <span className="metric-label">PENDING VERIFICATION</span>
              <div className="metric-val-wrap">
                <span className="metric-val">{upiStats.pending}</span>
                {upiStats.pending > 0 && <span className="pulse-indicator"></span>}
              </div>
              <span className="metric-hint">Awaiting Admin Bank Match</span>
            </div>

            <div className="upi-metric-card metric-approved">
              <span className="metric-label">APPROVED ORDERS</span>
              <span className="metric-val">{upiStats.approved}</span>
              <span className="metric-hint">Active VIP Licenses Issued</span>
            </div>

            <div className="upi-metric-card metric-revenue">
              <span className="metric-label">TOTAL REVENUE</span>
              <span className="metric-val font-gold">₹{upiStats.totalRevenueINR} INR</span>
              <span className="metric-hint">Real Bank Inflow via QR</span>
            </div>

            <div className="upi-metric-card metric-mode">
              <span className="metric-label">PAYMENT GATEWAY MODE</span>
              <span className="metric-val font-green">
                {paymentSettings.paymentMode === 'upi_qr'
                  ? 'UPI QR Direct Bank'
                  : paymentSettings.paymentMode === 'merchant_gateway'
                  ? 'Merchant Gateway'
                  : 'Sandbox Test'}
              </span>
              <span className="metric-hint">
                {paymentSettings.autoApproveUpi ? 'Auto-Approve ON' : 'Manual Review (Secure)'}
              </span>
            </div>
          </div>

          {/* Payment Settings Card */}
          <div className="admin-card payment-settings-card">
            <div className="card-header-row" style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <SettingsSlidersIcon size={18} style={{ color: '#ffd700' }} />
                <h4 style={{ margin: 0 }}>Payment Gateway &amp; QR Control</h4>
              </div>
            </div>

            <div className="payment-settings-grid">
              <div className="setting-field">
                <label className="field-title-label">Active Store Payment Mode:</label>
                <div className="mode-pill-selector">
                  <button
                    type="button"
                    className={`mode-pill ${paymentSettings.paymentMode === 'upi_qr' ? 'active' : ''}`}
                    onClick={() => handleSavePaymentSettings({ paymentMode: 'upi_qr' })}
                    disabled={savingPaymentSettings}
                  >
                    <QrCodeIcon size={14} />
                    <span>UPI QR Direct Bank (Real Payments)</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-pill ${paymentSettings.paymentMode === 'merchant_gateway' ? 'active' : ''}`}
                    onClick={() => handleSavePaymentSettings({ paymentMode: 'merchant_gateway' })}
                    disabled={savingPaymentSettings}
                  >
                    <CreditCardIcon size={14} />
                    <span>Merchant Gateway (Stripe/Razorpay)</span>
                  </button>
                  <button
                    type="button"
                    className={`mode-pill ${paymentSettings.paymentMode === 'sandbox' ? 'active' : ''}`}
                    onClick={() => handleSavePaymentSettings({ paymentMode: 'sandbox' })}
                    disabled={savingPaymentSettings}
                  >
                    <LockIcon size={14} />
                    <span>Sandbox Test Mode</span>
                  </button>
                </div>
              </div>

              <div className="setting-field">
                <label className="field-title-label">Instant Auto-Approval on Valid 12-Digit UTR:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button
                    type="button"
                    className="auto-approve-toggle-btn"
                    onClick={() => handleSavePaymentSettings({ autoApproveUpi: !paymentSettings.autoApproveUpi })}
                    disabled={savingPaymentSettings}
                  >
                    {paymentSettings.autoApproveUpi ? <ToggleOnIcon size={26} /> : <ToggleOffIcon size={26} />}
                    <span style={{ fontWeight: 700, color: paymentSettings.autoApproveUpi ? '#10b981' : '#94a3b8' }}>
                      {paymentSettings.autoApproveUpi ? 'AUTO-APPROVE ON (Instant Activation)' : 'MANUAL REVIEW (Admin Match Required)'}
                    </span>
                  </button>
                </div>
                <span className="field-hint">
                  {paymentSettings.autoApproveUpi
                    ? 'Caution: Any valid 12-digit UTR will instantly grant VIP access. Useful for frictionless onboarding.'
                    : 'Recommended: Admin verifies money received in UPI/bank app before approving VIP subscription. This prevents fake UTR submissions.'}
                </span>
              </div>
            </div>

            <div className="payment-upi-details-row">
              <div className="detail-item">
                <span className="detail-label">Configured Payee:</span>
                <span className="detail-val">{paymentSettings.payeeName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Official UPI ID (VPA):</span>
                <code className="detail-vpa">{paymentSettings.upiId}</code>
              </div>
            </div>
          </div>

          {/* Transactions List */}
          <div className="admin-card">
            <div className="card-header-row" style={{ marginBottom: '1.2rem', flexWrap: 'wrap', gap: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CoinsIcon size={18} style={{ color: '#ffd700' }} />
                <h4 style={{ margin: 0 }}>Incoming UPI Payment Submissions</h4>
              </div>

              <div className="payment-filter-pills">
                <button
                  type="button"
                  className={`filter-pill ${selectedPaymentFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedPaymentFilter('all')}
                >
                  All ({upiPayments.length})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${selectedPaymentFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setSelectedPaymentFilter('pending')}
                >
                  Pending ({upiStats.pending})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${selectedPaymentFilter === 'approved' ? 'active' : ''}`}
                  onClick={() => setSelectedPaymentFilter('approved')}
                >
                  Approved ({upiStats.approved})
                </button>
                <button
                  type="button"
                  className={`filter-pill ${selectedPaymentFilter === 'rejected' ? 'active' : ''}`}
                  onClick={() => setSelectedPaymentFilter('rejected')}
                >
                  Rejected
                </button>
              </div>
            </div>

            {loadingUpiPayments ? (
              <p className="loading-text">Fetching payment submissions...</p>
            ) : upiPayments.filter(p => {
                if (selectedPaymentFilter === 'pending') return p.status === 'pending_verification';
                if (selectedPaymentFilter === 'approved') return p.status === 'approved';
                if (selectedPaymentFilter === 'rejected') return p.status === 'rejected';
                return true;
              }).length === 0 ? (
              <div className="no-data-placeholder">
                <p>No payment records found under &quot;{selectedPaymentFilter}&quot; filter.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Plan / Item</th>
                      <th>Amount</th>
                      <th>12-Digit UTR Number</th>
                      <th>Submitted</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upiPayments
                      .filter(p => {
                        if (selectedPaymentFilter === 'pending') return p.status === 'pending_verification';
                        if (selectedPaymentFilter === 'approved') return p.status === 'approved';
                        if (selectedPaymentFilter === 'rejected') return p.status === 'rejected';
                        return true;
                      })
                      .map((p) => {
                        const isPending = p.status === 'pending_verification';
                        const isApproved = p.status === 'approved';
                        const isRejected = p.status === 'rejected';

                        return (
                          <tr key={p.id}>
                            <td>
                              <strong>{p.userName || p.userEmail.split('@')[0]}</strong>
                              <div className="table-sub-text">{p.userEmail}</div>
                              {p.payerUpiId && <div className="table-vpa-text">UPI: {p.payerUpiId}</div>}
                            </td>
                            <td>
                              <span className={`plan-badge-inline ${p.plan === 'elite' ? 'badge-elite' : 'badge-pro'}`}>
                                {p.plan === 'elite' ? 'Elite VIP' : 'Pro Member'}
                              </span>
                              <div className="table-sub-text">{p.orderId}</div>
                            </td>
                            <td>
                              <span className="font-gold font-bold">₹{p.amount} INR</span>
                            </td>
                            <td>
                              <div className="utr-display-wrap">
                                <code className="utr-code">{p.utrNumber}</code>
                                <button
                                  type="button"
                                  className="copy-mini-btn"
                                  onClick={() => navigator.clipboard.writeText(p.utrNumber)}
                                  title="Copy UTR Number"
                                >
                                  Copy
                                </button>
                              </div>
                            </td>
                            <td>
                              {new Date(p.submittedAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td>
                              <span className={`status-pill ${isPending ? 'pending-pill' : isApproved ? 'approved-pill' : 'rejected-pill'}`}>
                                {isPending ? 'PENDING REVIEW' : isApproved ? 'APPROVED' : 'REJECTED'}
                              </span>
                            </td>
                            <td>
                              {isPending ? (
                                <div className="action-buttons-wrap">
                                  <button
                                    type="button"
                                    className="admin-btn approve-btn"
                                    onClick={() => handleVerifyUpiPayment(p.id, 'approve')}
                                    disabled={processingPaymentId === p.id}
                                  >
                                    <CheckIcon size={13} />
                                    <span>{processingPaymentId === p.id ? 'Approving...' : 'Approve & Activate'}</span>
                                  </button>
                                  <button
                                    type="button"
                                    className="admin-btn reject-btn"
                                    onClick={() => setRejectPromptPaymentId(p.id)}
                                    disabled={processingPaymentId === p.id}
                                  >
                                    <CloseIcon size={13} />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : isApproved ? (
                                <div className="approved-info">
                                  <span className="license-tag">{p.licenseKey || 'Activated'}</span>
                                </div>
                              ) : (
                                <span className="reject-reason-text">{p.rejectReason || 'Declined'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* REJECT MODAL */}
          {rejectPromptPaymentId && (
            <div className="admin-modal-backdrop" onClick={() => setRejectPromptPaymentId(null)}>
              <div className="admin-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
                <div className="admin-modal-header">
                  <h4>Reject Payment Submission</h4>
                  <button className="admin-modal-close" onClick={() => setRejectPromptPaymentId(null)}>
                    <CloseIcon size={16} />
                  </button>
                </div>
                <div className="admin-modal-body">
                  <p style={{ fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1rem' }}>
                    Are you sure you want to reject this payment? Please provide a reason (e.g. UTR not found in bank statement, invalid amount).
                  </p>
                  <input
                    type="text"
                    className="admin-input"
                    placeholder="Rejection reason (e.g. UTR not found in bank)"
                    value={rejectReasonInput}
                    onChange={(e) => setRejectReasonInput(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', marginBottom: '1.2rem' }}
                  />
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="admin-btn outline"
                      onClick={() => setRejectPromptPaymentId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="admin-btn delete-sm"
                      onClick={() => handleVerifyUpiPayment(rejectPromptPaymentId, 'reject', rejectReasonInput)}
                      disabled={processingPaymentId === rejectPromptPaymentId}
                    >
                      Confirm Reject
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* DOWNLOAD LOGS & ANALYTICS TAB */}
      {activeTab === 'downloads' && (
        <div className="admin-section">
          <div className="section-header">
            <h3>Database Download Analytics & Activity Logs</h3>
            <button className="admin-btn outline" onClick={fetchAllDownloads} disabled={loadingDownloads}>
              {loadingDownloads ? 'Syncing Logs...' : 'Refresh Logs'}
            </button>
          </div>

          <div className="admin-card">
            {loadingDownloads ? (
              <p className="loading-text">Fetching database download history...</p>
            ) : allDownloads.length === 0 ? (
              <div className="no-data-placeholder">
                <p>No software download activity recorded in the database yet.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>User Account</th>
                      <th>Product Software</th>
                      <th>Category</th>
                      <th>Version</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allDownloads.map((dl) => (
                      <tr key={dl.id || dl.downloadId}>
                        <td>
                          <strong>{dl.userEmail || 'anonymous'}</strong>
                        </td>
                        <td>
                          <strong>{dl.title}</strong>
                        </td>
                        <td>
                          <span className="cat-pill">{dl.category}</span>
                        </td>
                        <td><code>v{dl.version}</code></td>
                        <td className="time-cell">
                          {dl.downloadedAt ? new Date(dl.downloadedAt).toLocaleString() : 'Recent'}
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
