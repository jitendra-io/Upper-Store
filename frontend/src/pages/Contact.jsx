import { useState } from 'react';
import './Contact.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send message.');
      }

      setSent(true);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="contact-container" style={{ zIndex: 1, position: 'relative' }}>
      <header className="contact-header">
        <h1>Get in <span className="highlight">Touch</span></h1>
        <p>Have a question, want to collaborate, or need support? We'd love to hear from you.</p>
      </header>

      <div className="contact-card">
        {sent ? (
          <div className="success-message">
            <span>✅</span>
            <h3>Message Sent!</h3>
            <p>Thanks for reaching out. We'll get back to you shortly.</p>
          </div>
        ) : (
          <form className="contact-form" onSubmit={handleSubmit}>
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
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                rows="6"
                value={form.message}
                onChange={handleChange}
                placeholder="Write your message here..."
                required
              />
            </div>
            <button type="submit" className="submit-btn">Send Message</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Contact;
