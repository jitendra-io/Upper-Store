import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import BackgroundAnimation from './BackgroundAnimation';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Footer from './components/Footer';
import './App.css';

function AppContent() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  // Auto scroll to top on every navigation route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  useEffect(() => {
    const handleModalToggle = (e) => {
      setModalOpen(!!e.detail);
    };
    window.addEventListener('modalToggle', handleModalToggle);
    return () => window.removeEventListener('modalToggle', handleModalToggle);
  }, []);

  // Show Footer ONLY on the Home page ('/'), removed from products panel
  const showFooter = location.pathname === '/';

  return (
    <div className="app-container">
      <BackgroundAnimation />
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
      {showFooter && <Footer />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
