/**
 * In-Memory TTL Cache Service
 * Provides high-speed micro-caching for catalog endpoints to eliminate redundant Firestore reads.
 */
class MemoryCache {
  constructor() {
    this.store = new Map();
  }

  set(key, data, ttlSeconds = 60) {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { data, expiresAt });
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(key) {
    this.store.delete(key);
  }

  clear() {
    this.store.clear();
  }
}

const cacheService = new MemoryCache();

module.exports = cacheService;
