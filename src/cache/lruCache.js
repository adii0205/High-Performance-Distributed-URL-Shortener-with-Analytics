/**
 * Simple LRU Cache implementation for hot URLs
 * Keeps the top 100 most accessed URLs in memory for ultra-fast access
 */
class LRUCache {
  constructor(maxSize = 100) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.misses++;
      return null;
    }

    const value = this.cache.get(key);
    
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, value);
    
    this.hits++;
    return value;
  }

  set(key, value) {
    // Remove if exists
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Add to end
    this.cache.set(key, value);

    // Remove oldest if over capacity
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  has(key) {
    return this.cache.has(key);
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total === 0 ? 0 : (this.hits / total * 100).toFixed(2);
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  getSize() {
    return this.cache.size;
  }
}

// Singleton instance
let lruCache;

function initLRUCache(maxSize = 100) {
  lruCache = new LRUCache(maxSize);
  return lruCache;
}

function getLRUCache() {
  if (!lruCache) {
    lruCache = new LRUCache();
  }
  return lruCache;
}

module.exports = {
  LRUCache,
  initLRUCache,
  getLRUCache,
};
