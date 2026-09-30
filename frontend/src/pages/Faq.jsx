import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Faq.css';

const FAQ_DATA = [
  {
    id: '1',
    category: 'Installation & Downloads',
    question: 'How do I download and install Android apps (.apk) from Upper Store?',
    answer: 'Simply navigate to the product catalog, select your desired Android app, and click the "Download Android App (.apk)" button. Once downloaded to your device, open the file and follow the on-screen prompts. If prompted, enable "Install from Unknown Sources" in your Android Security Settings.'
  },
  {
    id: '2',
    category: 'Installation & Downloads',
    question: 'How do I run Windows desktop applications (.exe)?',
    answer: 'After downloading the .exe package from the product details modal, double-click the file to launch the installer or standalone executable. All binaries are compiled with 64-bit Windows compatibility.'
  },
  {
    id: '3',
    category: 'Security & Integrity',
    question: 'Are all applications on Upper Store safe and malware-free?',
    answer: 'Yes! Every file listed on Upper Store undergoes strict security checks and SHA-256 checksum verification. We host package mirrors directly on official GitHub Release servers for maximum transparency and speed.'
  },
  {
    id: '4',
    category: 'General',
    question: 'Are the products on Upper Store free to use?',
    answer: 'We offer a wide selection of both completely free applications and premium tools. Each product page clearly labels the price and version details before downloading.'
  },
  {
    id: '5',
    category: 'Developer & Support',
    question: 'How do I report a bug or request a new feature?',
    answer: 'You can reach out directly via our Contact Us page. Your message is delivered instantly to our Admin Inbox for review.'
  },
  {
    id: '6',
    category: 'Developer & Support',
    question: 'How do I receive app updates?',
    answer: 'We regularly publish updated packages on Upper Store. Check the version pills and Release Notes section in the Product Details modal to see recent changelogs.'
  }
];

const CATEGORIES = ['All', 'Installation & Downloads', 'Security & Integrity', 'General', 'Developer & Support'];

const Faq = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [openItems, setOpenItems] = useState({ '1': true }); // First item open by default

  const toggleAccordion = (id) => {
    setOpenItems((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const filteredFaqs = FAQ_DATA.filter((item) => {
    return selectedCategory === 'All' || item.category === selectedCategory;
  });

  return (
    <div className="faq-container" style={{ zIndex: 1, position: 'relative' }}>
      <header className="faq-header">
        <h1>Help & <span className="highlight">FAQ</span></h1>
        <p>Find answers to common questions about downloads, installation, security, and developer support.</p>
      </header>

      {/* Category Filter Tabs */}
      <div className="faq-category-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`category-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion FAQ List */}
      <div className="faq-list">
        {filteredFaqs.length === 0 ? (
          <div className="faq-no-results">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#777" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <h3>No matching questions found</h3>
            <p>Try searching for different keywords or select another category.</p>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isOpen = !!openItems[faq.id];
            return (
              <div key={faq.id} className={`faq-card ${isOpen ? 'open' : ''}`}>
                <button
                  className="faq-question-btn"
                  onClick={() => toggleAccordion(faq.id)}
                  aria-expanded={isOpen}
                >
                  <span className="faq-question-text">{faq.question}</span>
                  <span className="faq-toggle-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points={isOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                    </svg>
                  </span>
                </button>
                {isOpen && (
                  <div className="faq-answer-body">
                    <p>{faq.answer}</p>
                    <span className="faq-cat-tag">{faq.category}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Still Need Help CTA Card */}
      <div className="faq-support-card">
        <div className="support-card-content">
          <h3>Still have questions?</h3>
          <p>Can't find what you're looking for? Get in touch with our team directly.</p>
        </div>
        <Link to="/contact" className="contact-support-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          Contact Support
        </Link>
      </div>
    </div>
  );
};

export default Faq;
