const fs = require('fs');
const path = require('path');

// 1. Update ProductReviewsModal.jsx
const jsxPath = path.resolve(__dirname, '../frontend/src/components/ProductReviewsModal.jsx');
let jsx = fs.readFileSync(jsxPath, 'utf8');

// Replace the top state & effect block
const targetPattern = /const ProductReviewsModal = \(\{ product, isOpen, onClose \}\) => \{[\s\S]*?\/\/ Check if current user has downloaded this specific product/m;

const replacementBlock = `const ProductReviewsModal = ({ product, isOpen, onClose }) => {
  const { user, token, isLoggedIn, openAuthModal } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(() => Number(product?.averageRating) || 5.0);
  const [reviewsCount, setReviewsCount] = useState(() => Number(product?.reviewsCount) || 0);
  const [loading, setLoading] = useState(true);
  const [, setDownloadHistorySync] = useState(0);

  // Review Form state
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState('');
  const [hoverRating, setHoverRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formMsg, setFormMsg] = useState({ type: '', text: '' });
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [isBanned, setIsBanned] = useState(Boolean(user?.isBanned));

  // Sync ban status safely on modal open
  useEffect(() => {
    if (!isOpen || !user?.email) {
      setIsBanned(false);
      return;
    }
    let isMounted = true;
    setIsBanned(Boolean(user.isBanned));
    const checkBanStatus = async () => {
      try {
        const activeToken = token || localStorage.getItem('upper_user_token');
        const res = await fetch(\`\${API_BASE}/api/auth/user/status/\${encodeURIComponent(user.email)}\`, {
          headers: activeToken ? { Authorization: \`Bearer \${activeToken}\` } : {},
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          setIsBanned(Boolean(data.isBanned));
        }
      } catch (err) {}
    };
    checkBanStatus();
    return () => { isMounted = false; };
  }, [isOpen, user?.email]);

  // Sync user download history from DB when modal opens (purely local sync, never re-fetches reviews)
  useEffect(() => {
    let isMounted = true;
    if (isOpen && user?.email) {
      fetchUserDownloadHistoryFromDB(user.email).then(() => {
        if (isMounted) {
          setDownloadHistorySync((prev) => prev + 1);
        }
      });
    }
    return () => { isMounted = false; };
  }, [isOpen, user?.email]);

  // Fetch reviews on load - background safe, never blinks or destroys rendered reviews
  const loadReviews = async (showSpinner = false) => {
    if (!product?.id) return;
    if (showSpinner) {
      setLoading(true);
    }
    try {
      const res = await fetch(\`\${API_BASE}/api/reviews/product/\${product.id}\`);
      if (res.ok) {
        const data = await res.json();
        const sorted = sortVipReviews(data.reviews || []);
        setReviews(sorted);
        if (typeof data.averageRating === 'number') {
          setAverageRating(data.averageRating);
        }
        if (typeof data.reviewsCount === 'number') {
          setReviewsCount(data.reviewsCount);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  // Only trigger review load on open or product change - strictly decoupled from user identity updates
  useEffect(() => {
    if (isOpen && product?.id) {
      loadReviews(reviews.length === 0);
    }
  }, [isOpen, product?.id]);

  // Pre-fill user review if exists once reviews or user email are resolved
  useEffect(() => {
    if (user?.email && reviews.length > 0) {
      const cleanEmail = user.email.trim().toLowerCase();
      const existing = reviews.find(r => (r.userEmail || '').trim().toLowerCase() === cleanEmail);
      if (existing) {
        setUserRating(existing.rating || 5);
        setUserComment(existing.comment || '');
      }
    }
  }, [user?.email, reviews]);

  // Lock background scroll smoothly without layout thrashing
  useEffect(() => {
    if (isOpen) {
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !product) return null;

  // Check if current user has downloaded this specific product`;

if (!targetPattern.test(jsx)) {
  console.error('Target pattern not found in ProductReviewsModal.jsx');
  process.exit(1);
}

jsx = jsx.replace(targetPattern, replacementBlock);

// Also update executeDownload in ProductReviewsModal.jsx
jsx = jsx.replace(
  /setForceUpdate\(\(prev\) => prev \+ 1\);/g,
  'setDownloadHistorySync((prev) => prev + 1);'
);

fs.writeFileSync(jsxPath, jsx, 'utf8');
console.log('Successfully updated ProductReviewsModal.jsx');

// 2. Update ProductReviewsModal.css
const cssPath = path.resolve(__dirname, '../frontend/src/components/ProductReviewsModal.css');
let css = fs.readFileSync(cssPath, 'utf8');

// Update z-index to 100020 (above ProductDetailModal's 99999)
css = css.replace(/z-index:\s*99990;/g, 'z-index: 100020;');

// Update animations with forwards fill mode
css = css.replace(/animation:\s*reviewsFadeIn\s*0\.22s\s*ease-out;/g, 'animation: reviewsFadeIn 0.2s ease-out forwards;');
css = css.replace(/animation:\s*reviewsSlideUp\s*0\.28s\s*cubic-bezier\(0\.16,\s*1,\s*0\.3,\s*1\);/g, 'animation: reviewsSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;');

fs.writeFileSync(cssPath, css, 'utf8');
console.log('Successfully updated ProductReviewsModal.css');

// 3. Update TermsAcceptanceModal.css
const termsCssPath = path.resolve(__dirname, '../frontend/src/components/TermsAcceptanceModal.css');
let termsCss = fs.readFileSync(termsCssPath, 'utf8');
termsCss = termsCss.replace(/z-index:\s*99999;/g, 'z-index: 100050;');
fs.writeFileSync(termsCssPath, termsCss, 'utf8');
console.log('Successfully updated TermsAcceptanceModal.css');

