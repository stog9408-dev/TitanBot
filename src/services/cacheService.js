/**
 * Advanced Caching Service with Redis Integration
 * Provides multi-layer caching with automatic invalidation
 * 
 * @version 2.0.0
 * @author TitanBot Development Team
 */

const Redis = require('ioredis');
const { EventEmitter } = require('events');

class CacheService extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            redis: {
                host: config.redisHost || process.env.REDIS_HOST || 'localhost',
                port: config.redisPort || process.env.REDIS_PORT || 6379,
                password: config.redisPassword || process.env.REDIS_PASSWORD,
                db: config.redisDb || 0,
                keyPrefix: config.keyPrefix || 'titanbot:',
                retryStrategy: (times) => {
                    const delay = Math.min(times * 50, 2000);
                    return delay;
                }
            },
            defaultTTL: config.defaultTTL || 3600, // 1 hour
            maxMemoryCache: config.maxMemoryCache || 1000, // Max items in memory
            enableMemoryCache: config.enableMemoryCache !== false,
            enableCompression: config.enableCompression || false,
            enableStats: config.enableStats !== false
        };

        // In-memory cache (L1)
        this.memoryCache = new Map();
        this.memoryCacheStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0
        };

        // Redis client (L2)
        this.redis = null;
        this.redisStats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            errors: 0
        };

        // Cache patterns for automatic invalidation
        this.patterns = new Map();

        // Initialize
        this.initialize();
    }

    /**
     * Initialize cache service
     */
    async initialize() {
        try {
            // Connect to Redis
            this.redis = new Redis(this.config.redis);

            this.redis.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.emit('connected');
            });

            this.redis.on('error', (error) => {
                console.error('❌ Redis error:', error.message);
                this.redisStats.errors++;
                this.emit('error', error);
            });

            this.redis.on('close', () => {
                console.log('⚠️ Redis connection closed');
                this.emit('disconnected');
            });

            // Start cleanup interval for memory cache
            if (this.config.enableMemoryCache) {
                this.startMemoryCacheCleanup();
            }

            // Start stats reporting
            if (this.config.enableStats) {
                this.startStatsReporting();
            }

        } catch (error) {
            console.error('Failed to initialize cache service:', error);
            throw error;
        }
    }

    /**
     * Get value from cache (checks memory first, then Redis)
     * @param {string} key - Cache key
     * @returns {Promise<any>} Cached value or null
     */
    async get(key) {
        try {
            // Check memory cache first (L1)
            if (this.config.enableMemoryCache) {
                const memoryValue = this.memoryCache.get(key);
                if (memoryValue !== undefined) {
                    // Check if expired
                    if (memoryValue.expiresAt && Date.now() > memoryValue.expiresAt) {
                        this.memoryCache.delete(key);
                    } else {
                        this.memoryCacheStats.hits++;
                        return memoryValue.data;
                    }
                }
                this.memoryCacheStats.misses++;
            }

            // Check Redis (L2)
            if (this.redis) {
                const redisValue = await this.redis.get(key);
                if (redisValue !== null) {
                    this.redisStats.hits++;
                    const parsed = this.deserialize(redisValue);
                    
                    // Store in memory cache for faster access
                    if (this.config.enableMemoryCache) {
                        this.setMemoryCache(key, parsed);
                    }
                    
                    return parsed;
                }
                this.redisStats.misses++;
            }

            return null;
        } catch (error) {
            console.error(`Cache get error for key ${key}:`, error);
            this.redisStats.errors++;
            return null;
        }
    }

    /**
     * Set value in cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds (optional)
     * @returns {Promise<boolean>} Success status
     */
    async set(key, value, ttl = null) {
        try {
            const actualTTL = ttl || this.config.defaultTTL;
            const serialized = this.serialize(value);

            // Set in memory cache (L1)
            if (this.config.enableMemoryCache) {
                this.setMemoryCache(key, value, actualTTL);
                this.memoryCacheStats.sets++;
            }

            // Set in Redis (L2)
            if (this.redis) {
                if (actualTTL > 0) {
                    await this.redis.setex(key, actualTTL, serialized);
                } else {
                    await this.redis.set(key, serialized);
                }
                this.redisStats.sets++;
            }

            return true;
        } catch (error) {
            console.error(`Cache set error for key ${key}:`, error);
            this.redisStats.errors++;
            return false;
        }
    }

    /**
     * Delete value from cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Success status
     */
    async delete(key) {
        try {
            // Delete from memory cache
            if (this.config.enableMemoryCache) {
                this.memoryCache.delete(key);
                this.memoryCacheStats.deletes++;
            }

            // Delete from Redis
            if (this.redis) {
                await this.redis.del(key);
                this.redisStats.deletes++;
            }

            return true;
        } catch (error) {
            console.error(`Cache delete error for key ${key}:`, error);
            this.redisStats.errors++;
            return false;
        }
    }

    /**
     * Delete multiple keys matching pattern
     * @param {string} pattern - Key pattern (e.g., "user:*")
     * @returns {Promise<number>} Number of keys deleted
     */
    async deletePattern(pattern) {
        try {
            let deletedCount = 0;

            // Delete from memory cache
            if (this.config.enableMemoryCache) {
                const regex = new RegExp(pattern.replace('*', '.*'));
                for (const key of this.memoryCache.keys()) {
                    if (regex.test(key)) {
                        this.memoryCache.delete(key);
                        deletedCount++;
                    }
                }
            }

            // Delete from Redis
            if (this.redis) {
                const keys = await this.redis.keys(pattern);
                if (keys.length > 0) {
                    await this.redis.del(...keys);
                    deletedCount += keys.length;
                }
            }

            return deletedCount;
        } catch (error) {
            console.error(`Cache delete pattern error for ${pattern}:`, error);
            this.redisStats.errors++;
            return 0;
        }
    }

    /**
     * Check if key exists in cache
     * @param {string} key - Cache key
     * @returns {Promise<boolean>} Exists status
     */
    async exists(key) {
        try {
            // Check memory cache
            if (this.config.enableMemoryCache && this.memoryCache.has(key)) {
                return true;
            }

            // Check Redis
            if (this.redis) {
                const exists = await this.redis.exists(key);
                return exists === 1;
            }

            return false;
        } catch (error) {
            console.error(`Cache exists error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Get remaining TTL for key
     * @param {string} key - Cache key
     * @returns {Promise<number>} TTL in seconds (-1 if no expiry, -2 if not exists)
     */
    async ttl(key) {
        try {
            if (this.redis) {
                return await this.redis.ttl(key);
            }
            return -2;
        } catch (error) {
            console.error(`Cache TTL error for key ${key}:`, error);
            return -2;
        }
    }

    /**
     * Increment numeric value
     * @param {string} key - Cache key
     * @param {number} amount - Amount to increment (default: 1)
     * @returns {Promise<number>} New value
     */
    async increment(key, amount = 1) {
        try {
            if (this.redis) {
                return await this.redis.incrby(key, amount);
            }
            return 0;
        } catch (error) {
            console.error(`Cache increment error for key ${key}:`, error);
            return 0;
        }
    }

    /**
     * Decrement numeric value
     * @param {string} key - Cache key
     * @param {number} amount - Amount to decrement (default: 1)
     * @returns {Promise<number>} New value
     */
    async decrement(key, amount = 1) {
        try {
            if (this.redis) {
                return await this.redis.decrby(key, amount);
            }
            return 0;
        } catch (error) {
            console.error(`Cache decrement error for key ${key}:`, error);
            return 0;
        }
    }

    /**
     * Get or set value (cache-aside pattern)
     * @param {string} key - Cache key
     * @param {Function} fetchFunction - Function to fetch data if not cached
     * @param {number} ttl - Time to live in seconds (optional)
     * @returns {Promise<any>} Cached or fetched value
     */
    async getOrSet(key, fetchFunction, ttl = null) {
        try {
            // Try to get from cache
            let value = await this.get(key);
            
            if (value !== null) {
                return value;
            }

            // Fetch data
            value = await fetchFunction();
            
            // Store in cache
            if (value !== null && value !== undefined) {
                await this.set(key, value, ttl);
            }

            return value;
        } catch (error) {
            console.error(`Cache getOrSet error for key ${key}:`, error);
            // Return fetched value even if caching fails
            try {
                return await fetchFunction();
            } catch (fetchError) {
                console.error(`Fetch function error for key ${key}:`, fetchError);
                return null;
            }
        }
    }

    /**
     * Set value in memory cache
     * @param {string} key - Cache key
     * @param {any} value - Value to cache
     * @param {number} ttl - Time to live in seconds
     */
    setMemoryCache(key, value, ttl = null) {
        // Check memory cache size limit
        if (this.memoryCache.size >= this.config.maxMemoryCache) {
            // Remove oldest entry (FIFO)
            const firstKey = this.memoryCache.keys().next().value;
            this.memoryCache.delete(firstKey);
        }

        const expiresAt = ttl ? Date.now() + (ttl * 1000) : null;
        this.memoryCache.set(key, { data: value, expiresAt });
    }

    /**
     * Start memory cache cleanup interval
     */
    startMemoryCacheCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, value] of this.memoryCache.entries()) {
                if (value.expiresAt && now > value.expiresAt) {
                    this.memoryCache.delete(key);
                }
            }
        }, 60000); // Clean every minute
    }

    /**
     * Start stats reporting interval
     */
    startStatsReporting() {
        setInterval(() => {
            const stats = this.getStats();
            this.emit('stats', stats);
        }, 300000); // Report every 5 minutes
    }

    /**
     * Serialize value for storage
     * @param {any} value - Value to serialize
     * @returns {string} Serialized value
     */
    serialize(value) {
        try {
            return JSON.stringify(value);
        } catch (error) {
            console.error('Serialization error:', error);
            return null;
        }
    }

    /**
     * Deserialize value from storage
     * @param {string} value - Serialized value
     * @returns {any} Deserialized value
     */
    deserialize(value) {
        try {
            return JSON.parse(value);
        } catch (error) {
            console.error('Deserialization error:', error);
            return null;
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const memoryHitRate = this.memoryCacheStats.hits + this.memoryCacheStats.misses > 0
            ? (this.memoryCacheStats.hits / (this.memoryCacheStats.hits + this.memoryCacheStats.misses) * 100).toFixed(2)
            : 0;

        const redisHitRate = this.redisStats.hits + this.redisStats.misses > 0
            ? (this.redisStats.hits / (this.redisStats.hits + this.redisStats.misses) * 100).toFixed(2)
            : 0;

        return {
            memory: {
                size: this.memoryCache.size,
                maxSize: this.config.maxMemoryCache,
                hits: this.memoryCacheStats.hits,
                misses: this.memoryCacheStats.misses,
                sets: this.memoryCacheStats.sets,
                deletes: this.memoryCacheStats.deletes,
                hitRate: `${memoryHitRate}%`
            },
            redis: {
                hits: this.redisStats.hits,
                misses: this.redisStats.misses,
                sets: this.redisStats.sets,
                deletes: this.redisStats.deletes,
                errors: this.redisStats.errors,
                hitRate: `${redisHitRate}%`
            },
            overall: {
                totalHits: this.memoryCacheStats.hits + this.redisStats.hits,
                totalMisses: this.memoryCacheStats.misses + this.redisStats.misses,
                totalSets: this.memoryCacheStats.sets + this.redisStats.sets,
                totalDeletes: this.memoryCacheStats.deletes + this.redisStats.deletes
            }
        };
    }

    /**
     * Clear all caches
     * @returns {Promise<boolean>} Success status
     */
    async clear() {
        try {
            // Clear memory cache
            if (this.config.enableMemoryCache) {
                this.memoryCache.clear();
            }

            // Clear Redis
            if (this.redis) {
                await this.redis.flushdb();
            }

            return true;
        } catch (error) {
            console.error('Cache clear error:', error);
            return false;
        }
    }

    /**
     * Close cache service
     */
    async close() {
        try {
            if (this.redis) {
                await this.redis.quit();
            }
            this.memoryCache.clear();
            this.removeAllListeners();
        } catch (error) {
            console.error('Cache close error:', error);
        }
    }

    /**
     * Health check
     * @returns {Promise<Object>} Health status
     */
    async healthCheck() {
        const health = {
            status: 'healthy',
            memory: {
                enabled: this.config.enableMemoryCache,
                size: this.memoryCache.size,
                healthy: true
            },
            redis: {
                enabled: !!this.redis,
                connected: false,
                healthy: false
            }
        };

        try {
            if (this.redis) {
                const pong = await this.redis.ping();
                health.redis.connected = pong === 'PONG';
                health.redis.healthy = health.redis.connected;
            }
        } catch (error) {
            health.redis.healthy = false;
            health.status = 'degraded';
        }

        if (!health.redis.healthy && this.redis) {
            health.status = 'degraded';
        }

        return health;
    }
}

// Export singleton instance
let instance = null;

module.exports = {
    CacheService,
    getInstance: (config) => {
        if (!instance) {
            instance = new CacheService(config);
        }
        return instance;
    },
    createInstance: (config) => {
        return new CacheService(config);
    }
};

// Made with Bob
