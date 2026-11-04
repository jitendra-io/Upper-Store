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
import VipClub from './pages/VipClub';
import DeveloperProfile from './pages/DeveloperProfile';
import Footer from './components/Footer';
import MiniFooter from './components/MiniFooter';
import { AuthProvider } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import GlobalSearchModal from './components/GlobalSearchModal';
import ProductDetailModal from './components/ProductDetailModal';
import './App.css';

function AppContent() {
  const location = useLocation();
  const [modalOpen, setModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [selectedSearchProduct, setSelectedSearchProduct] = useState(null);

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

  // Global Ctrl+K / Cmd+K listener to open global search from anywhere
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    const handleOpenSearchEvent = () => setIsSearchOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('openGlobalSearch', handleOpenSearchEvent);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('openGlobalSearch', handleOpenSearchEvent);
    };
  }, []);

  const isAdmin = location.pathname.startsWith('/admin');
  const showFullFooter = !isAdmin && !modalOpen;

  return (
    <div className="app-container">
      <BackgroundAnimation />
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
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
        <Route path="/vip" element={<VipClub />} />
        <Route path="/vip-club" element={<VipClub />} />
        <Route path="/developer/:username" element={<DeveloperProfile />} />
        <Route path="/developers/:username" element={<DeveloperProfile />} />
        <Route path="/dev/:username" element={<DeveloperProfile />} />
      </Routes>
      {showFullFooter && <Footer />}
      <AuthModal />
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectProduct={(product) => setSelectedSearchProduct(product)}
      />
      {selectedSearchProduct && (
        <ProductDetailModal
          product={selectedSearchProduct}
          onClose={() => setSelectedSearchProduct(null)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;
