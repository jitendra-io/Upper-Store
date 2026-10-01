import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './Contact.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Contact = () => {
  const { user } = useAuth();
  const [formType, setFormType] = useState('message'); // 'message' or 'appeal'
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'Account Ban Appeal',
    message: '',
    commitment: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successResponse, setSuccessResponse] = useState('');
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        name: user.displayName || user.email?.split('@')[0] || '',
        email: user.email || '',
      }));
    }
  }, [user]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setSuccessResponse('');

    const isAppeal = formType === 'appeal';
    const endpoint = isAppeal ? `${API_BASE}/api/contact/appeal` : `${API_BASE}/api/contact`;
    const payload = isAppeal
      ? {
          name: form.name,
          email: form.email,
          subject: form.subject || 'Account Ban Appeal',
          commitment: form.commitment || form.message,
        }
      : {
          name: form.name,
          email: form.email,
          message: form.message,
        };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit form.');
      }

      setSuccessResponse(data.message || (isAppeal ? 'your appeal sent to officials , wait for 7 days , for feedback' : 'Thank you! Your message has been sent.'));
      setSent(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setForm({
      name: user?.displayName || '',
      email: user?.email || '',
      subject: 'Account Ban Appeal',
      message: '',
      commitment: '',
    });
    setSent(false);
    setErrorMsg('');
    setSuccessResponse('');
  };

  const handleRefreshPage = () => {
    window.location.reload();
  };

  return (
    <div className="contact-container" style={{ zIndex: 1, position: 'relative' }}>
      <header className="contact-header">
        <h1>Get in <span className="highlight">Touch</span></h1>
        <p>Have a question, want to collaborate, or need support? Submit a message or official ban appeal below.</p>
      </header>

      <div className="contact-card">
        <div className="contact-card-top-bar">
          <div className="contact-type-selector">
            <button
              type="button"
              className={`contact-type-tab ${formType === 'message' ? 'active' : ''}`}
              onClick={() => { setFormType('message'); setSent(false); setErrorMsg(''); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <span>General Inquiry</span>
            </button>
            <button
              type="button"
              className={`contact-type-tab ${formType === 'appeal' ? 'active' : ''}`}
              onClick={() => { setFormType('appeal'); setSent(false); setErrorMsg(''); }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>Appeals</span>
            </button>
          </div>
          <button 
            type="button" 
            onClick={handleRefreshPage} 
            className="contact-page-refresh-btn" 
            title="Refresh Contact Page"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"></polyline>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        {sent ? (
          <div className="success-message">
            <div className="success-icon-badge">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <h3>{formType === 'appeal' ? 'Appeal Submitted' : 'Message Sent Successfully!'}</h3>
            <p>{successResponse}</p>
            
            <button onClick={handleReset} className="reset-form-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10"></polyline>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
              </svg>
              <span>{formType === 'appeal' ? 'Submit Another Form' : 'Send Another Message'}</span>
            </button>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
            {errorMsg && <div className="contact-error-banner">{errorMsg}</div>}
            
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="john@example.com"
                required
              />
            </div>

            {formType === 'appeal' && (
              <div className="form-group">
                <label htmlFor="subject">Subject</label>
                <input
                  id="subject"
                  type="text"
                  name="subject"
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="Subject (e.g. Account Ban Appeal)"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor={formType === 'appeal' ? 'commitment' : 'message'}>
                {formType === 'appeal' ? 'Commitment & Explanation Message' : 'Message'}
              </label>
              <textarea
                id={formType === 'appeal' ? 'commitment' : 'message'}
                name={formType === 'appeal' ? 'commitment' : 'message'}
                rows="6"
                value={formType === 'appeal' ? form.commitment : form.message}
                onChange={handleChange}
                placeholder={formType === 'appeal' ? 'State your case, reason for appeal, and commitment to adhere to site policies...' : 'Write your message here...'}
                required
              />
            </div>

            <button type="submit" className="submit-btn" disabled={submitting}>
              {submitting ? 'Submitting...' : formType === 'appeal' ? 'Submit Appeal' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Contact;
