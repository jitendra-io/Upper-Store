import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './Products.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FALLBACK_PRODUCTS = [
  {
    id: 'demo-1',
    title: 'Premium Web UI Kit',
    category: 'Design Asset',
    description: 'A dark-mode first, glassmorphism UI kit designed for premium applications.',
    image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=500',
    price: '$29',
  },
  {
    id: 'demo-2',
    title: 'Upper Store Mobile App',
    category: 'Android APK',
    description: 'The official mobile client for managing your products on the go.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=500',
    price: 'Free',
  },
  {
    id: 'demo-3',
    title: 'React Animation Library',
    category: 'Software Tool',
    description: 'A lightweight React library for creating stunning canvas particle effects.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=500',
    price: '$15',
  },
  {
    id: 'demo-4',
    title: 'Golden Icons Pack',
    category: 'Vector Graphics',
    description: '200+ beautifully crafted scalable vector icons using the Antique Gold palette.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=500',
    price: '$10',
  }
];

const Products = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            setProducts(data);
          } else {
            setProducts(FALLBACK_PRODUCTS);
          }
        } else {
          setProducts(FALLBACK_PRODUCTS);
        }
      } catch (err) {
        console.warn('Backend API offline or unreachable, showing demo items:', err);
        setProducts(FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return (
    <div className="products-container" style={{ zIndex: 1, position: 'relative' }}>
      <header className="products-header">
        <h1>Exclusive <span className="highlight">Products</span></h1>
        <p>Browse our curated collection of premium tools, assets, and applications.</p>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#d4af37' }}>
          Loading products...
        </div>
      ) : (
        <div className="products-grid">
          {products.map((product) => (
            <div key={product.id} className="product-card">
              <div className="product-image">
                <img
                  src={product.image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=500'}
                  alt={product.title}
                />
                <span className="product-category">{product.category}</span>
              </div>
              <div className="product-info">
                <h3>{product.title}</h3>
                <p>{product.description}</p>
                <div className="product-footer">
                  <span className="product-price">{product.price}</span>
                  <Link to={`/products/${product.id}`}>
                    <button className="view-btn">View Details</button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
