import { Link } from 'react-router-dom';
import logoImg from '../assets/logo.jpg';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/">
          <img src={logoImg} alt="Upper Store Logo" className="brand-logo-img" />
          <span>Upper <span className="highlight-text">Store</span></span>
        </Link>
      </div>
      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/products">Products</Link>
        <Link to="/about">About</Link>
        <Link to="/contact">Contact</Link>
      </div>
    </nav>
  );
};

export default Navbar;
