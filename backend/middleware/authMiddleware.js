const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'upper_store_jwt_secret_key_2026';

/**
 * General user authentication middleware:
 * Validates JWT token for any signed-in user or admin.
 */
const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized: No authentication token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.admin = decoded; // Backwards compatibility for handlers referencing req.admin
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized: Token is invalid or expired.' });
  }
};

/**
 * Strict Admin RBAC middleware:
 * Validates JWT token AND strictly verifies decoded.role === 'admin'.
 * Non-admin users are rejected with 403 Forbidden.
 */
const protectAdmin = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized: Admin authentication token required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        message: 'Forbidden: Access denied. Administrator privileges required.',
      });
    }

    req.user = decoded;
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized: Admin token is invalid or expired.' });
  }
};

module.exports = {
  protect,
  protectAdmin,
};
