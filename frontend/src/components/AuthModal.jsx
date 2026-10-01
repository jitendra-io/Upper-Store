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

  // Lock background scroll when open & reset form
  useEffect(() => {
    if (authModalOpen) {
      document.body.style.overflow = 'hidden';
      setErrorMsg('');
      // Prevent browser pre-fill
      setEmail('');
      setPassword('');
      setDisplayName('');
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [authModalOpen]);

  // Listen for Google OAuth popup window messages
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

  // Launch External Google OAuth2.0 Popup Window
  const handleGoogleClick = () => {
    setErrorMsg('');
    const width = 500;
    const height = 620;
    const left = Math.max(0, Math.floor((window.screen.width - width) / 2));
    const top = Math.max(0, Math.floor((window.screen.height - height) / 2));

    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    // Standard Google OAuth 2.0 Web Popup
    if (googleClientId) {
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${googleClientId}&` +
        `redirect_uri=${encodeURIComponent(window.location.origin)}&` +
        `response_type=token&` +
        `scope=email%20profile`;

      window.open(googleAuthUrl, 'GoogleOAuthPopup', `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`);
      return;
    }

    // Google Identity GIS Client if available
    if (window.google?.accounts?.oauth2) {
      try {
        const client = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId || 'dummy',
          scope: 'email profile',
          callback: async (response) => {
            if (response.access_token) {
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
        console.warn('GIS Client error:', err);
      }
    }

    // External Google Accounts Popup Window
    const popup = window.open(
      '',
      'GoogleAccountPickerWindow',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`
    );

    if (popup) {
      popup.document.write(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Sign in - Google Accounts</title>
          <style>
            * { box-sizing: border-box; font-family: 'Roboto', 'Segoe UI', Arial, sans-serif; }
            body { background: #121216; color: #e8eaed; margin: 0; padding: 2.5rem 2rem; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; }
            .card { background: #1e1e24; border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; padding: 2.2rem 2rem; width: 100%; max-width: 400px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            .g-svg { width: 44px; height: 44px; margin-bottom: 1rem; }
            h2 { font-size: 1.35rem; font-weight: 500; margin: 0 0 0.4rem; color: #fff; }
            p { font-size: 0.88rem; color: #9aa0a6; margin: 0 0 1.8rem; line-height: 1.4; }
            .input-group { text-align: left; margin-bottom: 1.2rem; }
            label { font-size: 0.78rem; font-weight: 600; color: #d4af37; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 0.4rem; }
            input { width: 100%; background: #121216; border: 1px solid rgba(255,255,255,0.15); border-radius: 8px; padding: 0.75rem 1rem; font-size: 0.95rem; color: #fff; outline: none; transition: border 0.2s; }
            input:focus { border-color: #d4af37; }
            .submit-btn { width: 100%; background: linear-gradient(135deg, #d4af37, #aa820a); color: #0d0d0f; font-weight: 700; font-size: 0.95rem; border: none; padding: 0.8rem; border-radius: 30px; cursor: pointer; margin-top: 0.8rem; }
            .submit-btn:hover { background: #e5be48; }
            .footer-note { font-size: 0.75rem; color: #666; margin-top: 1.5rem; }
          </style>
        </head>
        <body>
          <div class="card">
            <svg class="g-svg" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <h2>Sign in with Google</h2>
            <p>to continue to <strong>Upper Store</strong></p>
            <form id="gOAuthForm">
              <div class="input-group">
                <label>Google Account Email</label>
                <input type="email" id="gEmail" placeholder="your.name@gmail.com" required autocomplete="off" />
              </div>
              <div class="input-group">
                <label>Full Name (Optional)</label>
                <input type="text" id="gName" placeholder="Your Name" autocomplete="off" />
              </div>
              <button type="submit" class="submit-btn">Next & Continue</button>
            </form>
            <div class="footer-note">Google OAuth 2.0 Authorization Endpoint</div>
          </div>
          <script>
            document.getElementById('gOAuthForm').addEventListener('submit', function(e) {
              e.preventDefault();
              var email = document.getElementById('gEmail').value;
              var name = document.getElementById('gName').value;
              if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                  type: 'GOOGLE_OAUTH_SUCCESS',
                  email: email,
                  name: name
                }, '*');
              }
              window.close();
            });
          </script>
        </body>
        </html>
      `);
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
            <span>⚠️ {errorMsg}</span>
          </div>
        )}

        {/* REGULAR EMAIL & PASSWORD FORM (NO AUTOFILL) */}
        <form className="auth-form" onSubmit={handleSubmit} autoComplete="off">
          
          {/* Dummy hidden inputs to prevent browser password manager autofill */}
          <input type="text" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />
          <input type="password" style={{ display: 'none' }} aria-hidden="true" tabIndex={-1} />

          {/* GOOGLE OAUTH BUTTON (EXTERNAL POPUP TAB) */}
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
      </div>
    </div>,
    document.body
  );
};

export default AuthModal;
