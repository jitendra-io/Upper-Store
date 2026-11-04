/**
 * High-Performance Pure JavaScript Bloom Filter
 * Space-efficient probabilistic data structure for constant-time O(1) set membership testing.
 * Provides 100% true negatives (zero false negatives) to terminate non-existent search queries
 * in under 0.05ms without touching Firestore or iterating over in-memory indexes.
 */

class BloomFilter {
  /**
   * @param {number} sizeBits - Number of bits in the filter (defaults to 262,144 bits = 32 KB)
   * @param {number} hashCount - Number of hash iterations per item (default 4)
   */
  constructor(sizeBits = 262144, hashCount = 4) {
    this.sizeBits = sizeBits;
    this.hashCount = hashCount;
    // Allocate bit-array using Uint8Array (sizeBits / 8 bytes)
    this.byteArray = new Uint8Array(Math.ceil(sizeBits / 8));
  }

  /**
   * 32-bit FNV-1a non-cryptographic hash with customizable seed.
   * @param {string} str - String to hash
   * @param {number} seed - Seed offset
   * @returns {number} 32-bit unsigned integer
   */
  _fnvHash(str, seed = 0x811c9dc5) {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      // Math.imul enables 32-bit integer multiplication in V8
      hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
  }

  /**
   * Kirsch-Mitzenmacher double-hashing technique:
   * Generates k distinct hash indexes from 2 base hashes:
   * gi(x) = (h1(x) + i * h2(x)) mod m
   * @param {string} str - String token
   * @returns {number[]} Array of bit positions
   */
  _getBitPositions(str) {
    const s = String(str).toLowerCase().trim();
    const h1 = this._fnvHash(s, 0x811c9dc5);
    const h2 = this._fnvHash(s, 0x9e3779b9) || 1; // Ensure h2 is non-zero

    const positions = [];
    for (let i = 0; i < this.hashCount; i++) {
      const combined = (h1 + Math.imul(i, h2)) >>> 0;
      positions.push(combined % this.sizeBits);
    }
    return positions;
  }

  /**
   * Add a string token into the Bloom filter.
   * @param {string} item - Token to insert
   */
  add(item) {
    if (!item) return;
    const positions = this._getBitPositions(item);
    for (let i = 0; i < positions.length; i++) {
      const bitIndex = positions[i];
      const bytePos = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      this.byteArray[bytePos] |= 1 << bitOffset;
    }
  }

  /**
   * Test whether a token exists in the filter.
   * If false: Token is DEFINITELY NOT in the database (0% false negatives).
   * If true: Token MIGHT be in the database (proceed to index lookup).
   * @param {string} item - Token to check
   * @returns {boolean}
   */
  has(item) {
    if (!item) return false;
    const positions = this._getBitPositions(item);
    for (let i = 0; i < positions.length; i++) {
      const bitIndex = positions[i];
      const bytePos = Math.floor(bitIndex / 8);
      const bitOffset = bitIndex % 8;
      if ((this.byteArray[bytePos] & (1 << bitOffset)) === 0) {
        return false; // Definite miss
      }
    }
    return true; // Possible hit
  }

  /**
   * Reset all bits to 0.
   */
  clear() {
    this.byteArray.fill(0);
  }
}

module.exports = BloomFilter;

