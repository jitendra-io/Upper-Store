import logoImg from '../assets/logo.jpg';
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
          <p>Single, trusted destination for premium digital products — from Android APKs to exclusive design assets.</p>
        </div>

        <div className="about-card">
          <span className="about-icon">🛡️</span>
          <h3>Security First</h3>
          <p>Every file distributed through Upper Store is personally vetted. No third-party risk, 100% verified files.</p>
        </div>

        <div className="about-card">
          <span className="about-icon">✨</span>
          <h3>Premium Quality</h3>
          <p>Built with commitment to clean code, polished UI, and elite user experience across all devices.</p>
        </div>

        {/* 4th Square Card containing ONLY the Logo */}
        <div className="about-card logo-card">
          <img src={logoImg} alt="Upper Store Logo" className="about-logo-img" />
        </div>
      </section>
    </div>
  );
};

export default About;
