import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalPrompt, setAuthModalPrompt] = useState('');
  const [authModalTab, setAuthModalTab] = useState('login'); // 'login' | 'register'

  const refreshUserStatus = async (overrideEmail = null) => {
    const targetEmail = overrideEmail || user?.email;
    if (!targetEmail) return null;

    try {
      const activeToken = token || localStorage.getItem('upper_user_token');
      const res = await fetch(`${API_BASE}/api/auth/user/status/${encodeURIComponent(targetEmail.trim())}`, {
        headers: activeToken ? { Authorization: `Bearer ${activeToken}` } : {},
      });
      if (res.ok) {
        const statusData = await res.json();
        setUser((prevUser) => {
          if (!prevUser) return prevUser;
          const updated = {
            ...prevUser,
            isBanned: Boolean(statusData.isBanned),
            bannedAt: statusData.bannedAt || null,
            lastAppealedAt: statusData.lastAppealedAt || null,
            membership: statusData.membership || prevUser.membership || { plan: 'free', badge: null, validUntil: null },
            subscriptionCount: statusData.subscriptionCount ?? prevUser.subscriptionCount ?? 0,
            totalVipDays: statusData.totalVipDays ?? prevUser.totalVipDays ?? 0,
            totalAmountSpent: statusData.totalAmountSpent ?? prevUser.totalAmountSpent ?? 0,
            lastSubscribedAt: statusData.lastSubscribedAt ?? prevUser.lastSubscribedAt ?? null,
            subscriptionData: statusData.subscriptionData || prevUser.subscriptionData || null,
          };
          localStorage.setItem('upper_user_data', JSON.stringify(updated));
          return updated;
        });
        return statusData;
      }
    } catch (err) {
      console.warn('Failed to refresh user status:', err);
    }
    return null;
  };

  const updateMembership = (newMembership) => {
    setUser((prevUser) => {
      if (!prevUser) return prevUser;
      const isCancellation = !newMembership?.plan || newMembership.plan === 'free';
      const updated = {
        ...prevUser,
        membership: newMembership,
        subscriptionCount: isCancellation ? (prevUser.subscriptionCount || 0) : (prevUser.subscriptionCount || 0) + 1,
        totalVipDays: isCancellation ? (prevUser.totalVipDays || 0) : (prevUser.totalVipDays || 0) + (newMembership.plan === 'elite' ? 365 : 30),
      };
      localStorage.setItem('upper_user_data', JSON.stringify(updated));
      return updated;
    });
    window.dispatchEvent(new CustomEvent('membershipUpdated', { detail: { membership: newMembership } }));
  };

  // Load saved session on mount and sync live status from server
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('upper_user_token');
      const savedUser = localStorage.getItem('upper_user_data');
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);
        if (parsed?.email) {
          refreshUserStatus(parsed.email);
        }
      }
    } catch (err) {
      console.warn('Failed to restore auth session:', err);
    }
  }, []);

  // Sync user status on window focus or periodically every 15s
  useEffect(() => {
    if (!user?.email) return;

    const handleFocus = () => {
      refreshUserStatus(user.email);
    };

    window.addEventListener('focus', handleFocus);
    const intervalId = setInterval(() => {
      refreshUserStatus(user.email);
    }, 15000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(intervalId);
    };
  }, [user?.email]);

  const openAuthModal = (prompt = '', defaultTab = 'login') => {
    setAuthModalPrompt(prompt);
    setAuthModalTab(defaultTab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    setAuthModalPrompt('');
  };

  const saveAuthSession = (userData, userToken) => {
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('upper_user_token', userToken);
    localStorage.setItem('upper_user_data', JSON.stringify(userData));
    closeAuthModal();
  };

  // Register with Email & Password
  const register = async (email, password, displayName, username) => {
    const res = await fetch(`${API_BASE}/api/auth/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName, username }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Registration failed.');
    }

    saveAuthSession(data.user, data.token);
    return data;
  };

  // Login with Email & Password
  const login = async (email, password) => {
    const res = await fetch(`${API_BASE}/api/auth/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Login failed.');
    }

    saveAuthSession(data.user, data.token);
    return data;
  };

  // Google OAuth2.0 Login/Register Sync
  const loginWithGoogle = async (googlePayload) => {
    const res = await fetch(`${API_BASE}/api/auth/user/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googlePayload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Google authentication failed.');
    }

    saveAuthSession(data.user, data.token);
    return data;
  };

  // Update user username
  const updateUsername = async (newUsername) => {
    if (!token) throw new Error('Not authenticated');
    const res = await fetch(`${API_BASE}/api/auth/user/username`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ username: newUsername }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to update username.');
    }
    const updatedUser = { ...user, username: data.username };
    setUser(updatedUser);
    localStorage.setItem('upper_user_data', JSON.stringify(updatedUser));
    return data;
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('upper_user_token');
    localStorage.removeItem('upper_user_data');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user,
        authModalOpen,
        authModalPrompt,
        authModalTab,
        setAuthModalTab,
        openAuthModal,
        closeAuthModal,
        register,
        updateUsername,
        login,
        loginWithGoogle,
        logout,
        refreshUserStatus,
        updateMembership,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
