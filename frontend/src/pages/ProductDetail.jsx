import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductDetailModal from '../components/ProductDetailModal';
import Products from './Products';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const FALLBACK_MAP = {
  'demo-1': {
    id: 'demo-1',
    title: 'Premium Web UI Kit',
    category: 'Design Asset',
    description: 'A dark-mode first, glassmorphism UI kit designed for premium applications. Includes 200+ components, all crafted with the Antique Gold palette for a stunning visual identity.',
    image: 'https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&q=80&w=900',
    price: '$29',
    version: '2.1.0',
    releaseNotes: 'v2.1.0 - Added 30 new card components. Improved dark mode contrast. Fixed button hover states.',
    apkFile: null,
  },
  'demo-2': {
    id: 'demo-2',
    title: 'Upper Store Mobile App',
    category: 'Android APK',
    description: 'The official mobile client for managing your products and purchases on the go. Smooth animations and a native dark theme.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?auto=format&fit=crop&q=80&w=900',
    price: 'Free',
    version: '1.4.2',
    releaseNotes: 'v1.4.2 - Performance improvements. Fixed crash on Android 14. Added APK download tracker.',
    apkFile: '#',
  },
  'demo-3': {
    id: 'demo-3',
    title: 'React Animation Library',
    category: 'Software Tool',
    description: 'A lightweight React library for creating stunning canvas particle effects with zero dependencies.',
    image: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=900',
    price: '$15',
    version: '3.0.1',
    releaseNotes: 'v3.0.1 - Rebuilt core engine for 60fps. New `useParticles` hook. TypeScript support added.',
    apkFile: null,
  },
  'demo-4': {
    id: 'demo-4',
    title: 'Golden Icons Pack',
    category: 'Vector Graphics',
    description: '200+ beautifully crafted scalable vector icons using the Antique Gold palette, available in SVG and PNG formats.',
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=900',
    price: '$10',
    version: '1.0.0',
    releaseNotes: 'v1.0.0 - Initial release with 200 icons across 10 categories.',
    apkFile: null,
  }
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (FALLBACK_MAP[id]) {
        setProduct(FALLBACK_MAP[id]);
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/products/${id}`);
        if (res.ok) {
          const data = await res.json();
          setProduct(data);
        } else {
          setProduct(null);
        }
      } catch (err) {
        console.error('Error fetching product details:', err);
        setProduct(null);
      }
    };

    fetchProduct();
  }, [id]);

  return (
    <>
      <Products />
      {product && (
        <ProductDetailModal
          product={product}
          onClose={() => navigate('/products')}
        />
      )}
    </>
  );
};

export default ProductDetail;
