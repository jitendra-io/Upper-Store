import { useState, useEffect } from 'react';
import './Blog.css';

const BLOG_POSTS = [
  {
    id: 'upper-store-2-0',
    title: 'Introducing Upper Store 2.0: High-Speed Downloads & CDN Infrastructure',
    category: 'Release Announcements',
    date: 'Sep 30, 2026',
    readTime: '4 min read',
    author: 'Upper Core Team',
    image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=900',
    excerpt: 'We are thrilled to announce Upper Store 2.0 with direct GitHub Release mirrors for zero-limit package downloads and global ImageKit CDN integration.',
    featured: true,
    content: `
      <h2>The Next Generation of Developer Asset Distribution</h2>
      <p>Upper Store has evolved. Today we are launching <strong>Upper Store 2.0</strong>, engineered from the ground up to solve modern challenges in software deployment and digital asset distribution.</p>
      
      <h3>What's New in 2.0?</h3>
      <ul>
        <li><strong>Direct GitHub Release Mirrors:</strong> Unlimited package hosting for Android APKs and Windows EXEs with 2GB per binary limits via PAT Token authentication.</li>
        <li><strong>ImageKit Global CDN:</strong> Lightning-fast logo and screenshot rendering with automated WebP compression and global edge caching.</li>
        <li><strong>Real-Time Admin Inbox:</strong> Direct customer inquiry routing stored in Firebase Firestore to bypass cloud SMTP port restrictions.</li>
        <li><strong>Luxury Dark Gold Aesthetics:</strong> A revamped responsive UI built with glassmorphism and smooth micro-animations.</li>
      </ul>

      <h3>Security & Verification</h3>
      <p>All compiled binaries published on Upper Store undergo automated SHA-256 integrity checksum verification before entering the catalog. Developers and users can download packages with confidence.</p>
    `
  },
  {
    id: 'smtp-inbox-architecture',
    title: 'Overcoming Cloud SMTP Port Blocks with Firebase Firestore Inboxes',
    category: 'Tech & Development',
    date: 'Sep 29, 2026',
    readTime: '5 min read',
    author: 'Upper Engineering Team',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=900',
    excerpt: 'How we engineered a real-time database inbox system to bypass free-tier cloud platform SMTP blocks on Render and Vercel.',
    featured: false,
    content: `
      <h2>The Cloud SMTP Challenge</h2>
      <p>Free-tier hosting providers like Render, Vercel, and Heroku restrict outbound SMTP ports (25, 465, and 587) to prevent spam abuse. This frequently causes classic <code>Nodemailer</code> setups to fail silently or timeout in production environments.</p>
      
      <h3>The Solution: Real-Time Database Inbox</h3>
      <p>Instead of relying on SMTP mail servers, we designed a zero-latency database submission pipeline:</p>
      <ol>
        <li>Contact submissions are validated and sent to <code>POST /api/contact</code>.</li>
        <li>Messages are instantly written to the <code>messages</code> collection in Firebase Firestore.</li>
        <li>The Admin Control Dashboard polls and listens for unread messages with automated unread badge counters and real-time inbox popups.</li>
      </ol>

      <p>Result: <strong>100% message delivery reliability</strong> with zero dependency on third-party mail transport services!</p>
    `
  },
  {
    id: 'android-apk-security-guide',
    title: 'Android APK Installation & Unknown Sources Security Guide',
    category: 'Security Advisories',
    date: 'Sep 28, 2026',
    readTime: '3 min read',
    author: 'Security Advisory Board',
    image: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=900',
    excerpt: 'Best practices for installing side-loaded Android APK applications safely and managing device permissions.',
    featured: false,
    content: `
      <h2>Safe APK Sideloading</h2>
      <p>When installing Android applications outside the Google Play Store, Android prompts users to grant "Install Unknown Apps" permission to your browser or file manager.</p>

      <h3>Security Checklist</h3>
      <ul>
        <li><strong>Verify Source URLs:</strong> Ensure you are downloading binaries directly from official <code>upperstore.com</code> or GitHub Release mirrors.</li>
        <li><strong>Check App Permissions:</strong> Upper Store apps request only essential permissions required for core functionality.</li>
        <li><strong>Keep Apps Updated:</strong> Check the Release Notes and version pills in Upper Store to update your installed packages to the latest release.</li>
      </ul>
    `
  },
  {
    id: 'github-pat-release-automation',
    title: 'Automating Releases Directly from GitHub Repositories via PAT Tokens',
    category: 'Tutorials',
    date: 'Sep 27, 2026',
    readTime: '6 min read',
    author: 'Upper Core Team',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=900',
    excerpt: 'Learn how to link any public or private GitHub repository to Upper Store to publish releases in seconds.',
    featured: false,
    content: `
      <h2>Automating Binary Publishing</h2>
      <p>Upper Store Admin Dashboard allows creators to publish APK and EXE packages directly from GitHub Release tags without manually uploading heavy 500MB+ files through web forms.</p>

      <h3>How It Works</h3>
      <p>By configuring your Personal Access Token (PAT), repository owner, and repo name in the Admin Control Center, Upper Store fetches the latest compiled release assets automatically and mirrors them for end users.</p>
    `
  }
];

const CATEGORIES = ['All', 'Release Announcements', 'Tech & Development', 'Security Advisories', 'Tutorials'];

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeArticle, setActiveArticle] = useState(null);

  useEffect(() => {
    if (activeArticle) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [activeArticle]);

  const featuredPost = BLOG_POSTS.find((p) => p.featured) || BLOG_POSTS[0];
  const regularPosts = BLOG_POSTS.filter((p) => {
    if (selectedCategory === 'All') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="blog-container" style={{ zIndex: 1, position: 'relative' }}>
      <header className="blog-header">
        <h1>Blog & <span className="highlight">Updates</span></h1>
        <p>Insights, release notes, security advisories, and technical deep-dives from the Upper Store team.</p>
      </header>

      {/* Featured Post Hero */}
      {selectedCategory === 'All' && featuredPost && (
        <div className="featured-post-card" onClick={() => setActiveArticle(featuredPost)}>
          <div className="featured-image-wrapper">
            <img src={featuredPost.image} alt={featuredPost.title} />
            <span className="featured-badge">Featured Spotlight</span>
          </div>
          <div className="featured-info">
            <div className="blog-meta-row">
              <span className="blog-category-tag">{featuredPost.category}</span>
              <span className="blog-meta-dot">•</span>
              <span className="blog-date">{featuredPost.date}</span>
              <span className="blog-meta-dot">•</span>
              <span className="blog-read-time">{featuredPost.readTime}</span>
            </div>
            <h2>{featuredPost.title}</h2>
            <p>{featuredPost.excerpt}</p>
            <div className="featured-author-row">
              <span className="author-name">By {featuredPost.author}</span>
              <button className="read-more-btn">Read Article →</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="blog-category-tabs">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            className={`blog-tab ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Blog Cards Grid */}
      <div className="blog-grid">
        {regularPosts.map((post) => (
          <div key={post.id} className="blog-card" onClick={() => setActiveArticle(post)}>
            <div className="blog-card-image">
              <img src={post.image} alt={post.title} />
              <span className="blog-card-cat">{post.category}</span>
            </div>
            <div className="blog-card-content">
              <div className="blog-card-meta">
                <span>{post.date}</span>
                <span>•</span>
                <span>{post.readTime}</span>
              </div>
              <h3>{post.title}</h3>
              <p>{post.excerpt}</p>
              <div className="blog-card-footer">
                <span className="blog-author">{post.author}</span>
                <span className="read-link">Read →</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ARTICLE READER MODAL */}
      {activeArticle && (
        <div className="blog-modal-backdrop" onClick={() => setActiveArticle(null)}>
          <div className="blog-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="blog-modal-header">
              <span className="blog-modal-cat">{activeArticle.category}</span>
              <button className="blog-modal-close" onClick={() => setActiveArticle(null)}>✕</button>
            </div>
            <div className="blog-modal-body">
              <div className="blog-modal-hero">
                <img src={activeArticle.image} alt={activeArticle.title} />
                <div className="blog-modal-hero-text">
                  <h1>{activeArticle.title}</h1>
                  <div className="blog-modal-author-bar">
                    <span>By <strong>{activeArticle.author}</strong></span>
                    <span>Published {activeArticle.date}</span>
                    <span>{activeArticle.readTime}</span>
                  </div>
                </div>
              </div>
              <div
                className="blog-article-content"
                dangerouslySetInnerHTML={{ __html: activeArticle.content }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Blog;
