import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider, signInWithPopup } from '../config/firebase';
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

  // Lock background scroll & reset fields
  useEffect(() => {
    if (authModalOpen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
      setErrorMsg('');
      setEmail('');
      setPassword('');
      setDisplayName('');
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [authModalOpen]);

  // Listen for Google OAuth popup messages fallback
  useEffect(() => {
    const handleGoogleMessage = async (event) => {
      if (event.data && event.data.type === 'GOOGLE_OAUTH_SUCCESS' && event.data.email) {
        setLoading(true);
        setErrorMsg('');
        try {
          await loginWithGoogle({
            email: event.data.email.trim(),
            displayName: event.data.name || event.data.email.split('@')[0],
            photoURL: event.data.picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${event.data.email.trim()}`,
          });
        } catch (err) {
          setErrorMsg(err.message || 'Google OAuth login failed.');
        } finally {
          setLoading(false);
        }
      }
    };
    window.addEventListener('message', handleGoogleMessage);
    return () => window.removeEventListener('message', handleGoogleMessage);
  }, [loginWithGoogle]);

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
      setEmail('');
      setPassword('');
      setDisplayName('');
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Launch Authentic Google Sign-In Account Chooser Popup Window
  const handleGoogleClick = async () => {
    setErrorMsg('');
    setLoading(true);

    try {
      // 1. Primary: Firebase Web SDK Google Auth Provider Popup Window
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;
      
      await loginWithGoogle({
        email: googleUser.email,
        displayName: googleUser.displayName || googleUser.email.split('@')[0],
        photoURL: googleUser.photoURL || null,
        googleId: googleUser.uid,
      });
      setLoading(false);
      return;
    } catch (err) {
      console.error('Firebase Google Auth error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setErrorMsg('Domain not authorized in Firebase Console. Add jitendra-io.github.io to Firebase Auth Authorized Domains.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Google Sign-In popup was closed before completing.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMsg('Popup was blocked by your browser. Please allow popups for Google Sign-In.');
      } else {
        setErrorMsg(err.message || 'Google Sign-In failed. Please try again.');
      }
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
          <button className="auth-modal-close-btn" onClick={closeAuthModal} title="Close Modal">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
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
            onClick={() => { setAuthModalTab('login'); setErrorMsg(''); setEmail(''); setPassword(''); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${authModalTab === 'register' ? 'active' : ''}`}
            onClick={() => { setAuthModalTab('register'); setErrorMsg(''); setEmail(''); setPassword(''); setDisplayName(''); }}
          >
            Create Account
          </button>
        </div>

        {/* ERROR BADGE */}
        {errorMsg && (
          <div className="auth-error-alert">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px', flexShrink: 0 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* REGULAR EMAIL & PASSWORD FORM (AUTOFILL DISABLED) */}
        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          
          {/* Dummy hidden inputs to prevent browser password manager autofill */}
          <input type="text" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
          <input type="password" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />

          {/* GOOGLE OAUTH BUTTON (EXTERNAL POPUP WINDOW) */}
          <button type="button" className="auth-google-btn" onClick={handleGoogleClick} disabled={loading}>
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
                name="user_fullname_new"
                autoComplete="off"
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
              name="user_email_new"
              autoComplete="off"
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
                name="user_pass_new"
                autoComplete="new-password"
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
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
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
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;
