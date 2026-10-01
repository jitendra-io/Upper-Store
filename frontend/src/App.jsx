import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import BackgroundAnimation from './BackgroundAnimation';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import Faq from './pages/Faq';
import Blog from './pages/Blog';
import Press from './pages/Press';
import Policies from './pages/Policies';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import Footer from './components/Footer';
import MiniFooter from './components/MiniFooter';
import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import './App.css';

function AppContent() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);

  // Auto scroll to top on every navigation route, hash, or search change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash, location.search]);

  useEffect(() => {
    const handleModalToggle = (e) => {
      setModalOpen(!!e.detail);
    };
    window.addEventListener('modalToggle', handleModalToggle);
    return () => window.removeEventListener('modalToggle', handleModalToggle);
  }, []);

  const isAdmin = location.pathname.startsWith('/admin');
  const showFullFooter = !isAdmin && !modalOpen;

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
        <Route path="/faq" element={<Faq />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/press" element={<Press />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
      {showFullFooter && <Footer />}
      <AuthModal />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
