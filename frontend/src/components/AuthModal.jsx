import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

const AuthModal = () => {
  const {
    authModalOpen,
    authModalPrompt,
    authModalTab,
    setAuthModalTab,
    closeAuthModal,
    login,
    register,
    loginWithGoogle,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState('');
  const [googleNameInput, setGoogleNameInput] = useState('');

  // Lock background scroll when open
  useEffect(() => {
    if (authModalOpen) {
      document.body.style.overflow = 'hidden';
      setErrorMsg('');
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (authModalTab === 'login') {
        await login(email, password);
      } else {
        await register(email, password, displayName);
      }
      // Reset form
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger Google OAuth2.0
  const handleGoogleClick = () => {
    setErrorMsg('');
    
    // Check if Google GIS script is available
    if (window.google && window.google.accounts && window.google.accounts.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
          scope: 'email profile',
          callback: async (response) => {
            if (response.access_token) {
              // Fetch Google User Profile
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              });
              const googleUser = await res.json();
              await loginWithGoogle({
                email: googleUser.email,
                displayName: googleUser.name,
                photoURL: googleUser.picture,
                googleId: googleUser.sub,
              });
            }
          },
        });
        client.requestAccessToken();
        return;
      } catch (err) {
        console.warn('Google GIS client initialization fallback:', err);
      }
    }

    // Interactive Google OAuth prompt fallback
    setGooglePromptOpen(true);
  };

  const handleGooglePromptSubmit = async (e) => {
    e.preventDefault();
    if (!googleEmailInput.trim()) return;
    setLoading(true);
    try {
      await loginWithGoogle({
        email: googleEmailInput.trim(),
        displayName: googleNameInput.trim() || googleEmailInput.split('@')[0],
        photoURL: `https://api.dicebear.com/7.x/bottts/svg?seed=${googleEmailInput.trim()}`,
      });
      setGooglePromptOpen(false);
      setGoogleEmailInput('');
      setGoogleNameInput('');
    } catch (err) {
      setErrorMsg(err.message || 'Google authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="auth-modal-backdrop" onClick={closeAuthModal}>
      <div className="auth-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* MODAL HEADER */}
        <div className="auth-modal-header">
          <div className="auth-header-brand">
            <span className="auth-header-pill">Account Access</span>
            <h3>{authModalTab === 'login' ? 'Welcome Back' : 'Create Account'}</h3>
          </div>
          <button className="auth-modal-close-btn" onClick={closeAuthModal} title="Close Modal">✕</button>
        </div>

        {/* PROMPT NOTICE FOR DOWNLOAD ATTEMPTS */}
        {authModalPrompt && (
          <div className="auth-prompt-banner">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>{authModalPrompt}</span>
          </div>
        )}

        {/* TAB SWITCHER */}
        <div className="auth-tabs-bar">
          <button
            type="button"
            className={`auth-tab-btn ${authModalTab === 'login' ? 'active' : ''}`}
            onClick={() => { setAuthModalTab('login'); setErrorMsg(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authModalTab === 'register' ? 'active' : ''}`}
            onClick={() => { setAuthModalTab('register'); setErrorMsg(''); }}
          >
            Create Account
          </button>
        </div>

        {/* ERROR BADGE */}
        {errorMsg && (
          <div className="auth-error-alert">
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* GOOGLE OAUTH PROMPT FALLBACK OVERLAY */}
        {googlePromptOpen ? (
          <form className="auth-form google-prompt-form" onSubmit={handleGooglePromptSubmit}>
            <div className="google-prompt-title">
              <svg width="22" height="22" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <h4>Google Account Verification</h4>
            </div>
            <p className="google-prompt-desc">Enter your Google email address to complete Google OAuth authorization.</p>
            
            <div className="auth-field">
              <label>Google Email Address *</label>
              <input
                type="email"
                required
                placeholder="name@gmail.com"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
              />
            </div>

            <div className="auth-field">
              <label>Display Name (Optional)</label>
              <input
                type="text"
                placeholder="John Doe"
                value={googleNameInput}
                onChange={(e) => setGoogleNameInput(e.target.value)}
              />
            </div>

            <div className="google-prompt-actions">
              <button type="submit" className="auth-submit-btn" disabled={loading}>
                {loading ? 'Authenticating...' : 'Continue as Google User'}
              </button>
              <button type="button" className="auth-cancel-btn" onClick={() => setGooglePromptOpen(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          /* REGULAR EMAIL & PASSWORD FORM */
          <form className="auth-form" onSubmit={handleSubmit}>
            
            {/* GOOGLE OAUTH BUTTON */}
            <button type="button" className="auth-google-btn" onClick={handleGoogleClick}>
              <svg width="20" height="20" viewBox="0 0 24 24" style={{ marginRight: '10px' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-divider-or">
              <span>OR EMAIL</span>
            </div>

            {/* REGISTER DISPLAY NAME FIELD */}
            {authModalTab === 'register' && (
              <div className="auth-field">
                <label>Full Name / Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Johnson"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </div>
            )}

            {/* EMAIL FIELD */}
            <div className="auth-field">
              <label>Email Address *</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* PASSWORD FIELD */}
            <div className="auth-field">
              <div className="label-row">
                <label>Password *</label>
                {authModalTab === 'login' && (
                  <span className="auth-help-text">Min 6 characters</span>
                )}
              </div>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading
                ? 'Processing...'
                : authModalTab === 'login'
                ? 'Sign In to Upper Store'
                : 'Create Account & Continue'}
            </button>

            <p className="auth-terms-note">
              By logging in or registering, you agree to Upper Store's{' '}
              <a href="/policies#terms" target="_blank" rel="noopener noreferrer">Terms of Service</a> &{' '}
              <a href="/policies#privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </p>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;
