import './About.css';

const About = () => {
  return (
    <div className="about-container" style={{ zIndex: 1, position: 'relative' }}>
      <section className="about-hero">
        <h1>About <span className="highlight">Upper Store</span></h1>
        <p>A premium platform built for creators who value quality over quantity.</p>
      </section>

      <section className="about-content">
        <div className="about-card">
          <span className="about-icon">🚀</span>
          <h3>The Mission</h3>
          <p>Upper Store was created to be a single, trusted destination for premium digital products — from production-ready Android APKs to exclusive design assets and developer tools.</p>
        </div>
        <div className="about-card">
          <span className="about-icon">🛡️</span>
          <h3>Security First</h3>
          <p>Every file distributed through Upper Store is personally vetted by the creator. No third-party uploads, no malware risk. You always know exactly what you're downloading.</p>
        </div>
        <div className="about-card">
          <span className="about-icon">✨</span>
          <h3>Premium Quality</h3>
          <p>Every product is built with a commitment to clean code, polished UI, and a great user experience. If it doesn't meet the bar, it doesn't ship.</p>
        </div>
      </section>
    </div>
  );
};

export default About;
