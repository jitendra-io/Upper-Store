const crypto = require('crypto');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config();

let ephemeralSecret = null;

/**
 * Safely resolves the JWT secret.
 * In production: throws a fatal error if JWT_SECRET is missing.
 * In development: if missing, generates an unguessable ephemeral secret to prevent offline token forgery.
 */
function getJwtSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length > 0) {
    return process.env.JWT_SECRET.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production mode.');
  }

  if (!ephemeralSecret) {
    console.warn('⚠️ [SECURITY WARNING] JWT_SECRET is unset. Generating a secure ephemeral runtime key. Note that tokens will invalidate on server restart.');
    ephemeralSecret = crypto.randomBytes(32).toString('hex');
  }

  return ephemeralSecret;
}

/**
 * Safely resolves the License signing secret key.
 */
function getLicenseSecret() {
  if (process.env.LICENSE_SECRET_KEY && process.env.LICENSE_SECRET_KEY.trim().length > 0) {
    return process.env.LICENSE_SECRET_KEY.trim();
  }

  return getJwtSecret();
}

module.exports = {
  getJwtSecret,
  getLicenseSecret,
};
