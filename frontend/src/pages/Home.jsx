import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <main className="hero" style={{ zIndex: 1, position: 'relative' }}>
      <h1 className="hero-title">
        Upper <span className="highlight">Store</span>
      </h1>
      <p className="hero-subtitle">
        Discover exclusive tools, APKs, and digital assets. Built with unparalleled elegance.
      </p>
      
      <Link to="/products">
        <button className="cta-button">Explore Now</button>
      </Link>
    </main>
  );
};

export default Home;
