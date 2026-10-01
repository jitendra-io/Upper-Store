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
      const res = await fetch(`${API_BASE}/api/auth/user/status/${encodeURIComponent(targetEmail.trim())}`);
      if (res.ok) {
        const statusData = await res.json();
        setUser((prevUser) => {
          if (!prevUser) return prevUser;
          const updated = {
            ...prevUser,
            isBanned: Boolean(statusData.isBanned),
            bannedAt: statusData.bannedAt || null,
            lastAppealedAt: statusData.lastAppealedAt || null,
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
  const register = async (email, password, displayName) => {
    const res = await fetch(`${API_BASE}/api/auth/user/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, displayName }),
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
        login,
        loginWithGoogle,
        logout,
        refreshUserStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
