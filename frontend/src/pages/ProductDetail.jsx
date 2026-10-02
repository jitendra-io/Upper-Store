import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ProductDetailModal from '../components/ProductDetailModal';
import Products from './Products';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
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
