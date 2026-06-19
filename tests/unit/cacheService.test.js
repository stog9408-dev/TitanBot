/**
 * Unit Tests for Cache Service
 * Comprehensive test suite for multi-layer caching system
 */

const { expect } = require('chai');
const sinon = require('sinon');
const { CacheService } = require('../../src/services/cacheService');

describe('CacheService', () => {
    let cacheService;
    let clock;

    beforeEach(() => {
        // Create cache instance without Redis for testing
        cacheService = new CacheService({
            enableMemoryCache: true,
            maxMemoryCache: 100,
            defaultTTL: 60,
            redis: null // Disable Redis for unit tests
        });
        clock = sinon.useFakeTimers();
    });

    afterEach(() => {
        clock.restore();
        if (cacheService) {
            cacheService.close();
        }
    });

    describe('Memory Cache Operations', () => {
        it('should set and get value from memory cache', async () => {
            await cacheService.set('test:key', 'test-value');
            const value = await cacheService.get('test:key');
            expect(value).to.equal('test-value');
        });

        it('should return null for non-existent key', async () => {
            const value = await cacheService.get('non:existent');
            expect(value).to.be.null;
        });

        it('should delete value from cache', async () => {
            await cacheService.set('test:key', 'test-value');
            await cacheService.delete('test:key');
            const value = await cacheService.get('test:key');
            expect(value).to.be.null;
        });

        it('should respect TTL expiration', async () => {
            await cacheService.set('test:key', 'test-value', 5);
            
            // Before expiration
            let value = await cacheService.get('test:key');
            expect(value).to.equal('test-value');
            
            // After expiration
            clock.tick(6000);
            value = await cacheService.get('test:key');
            expect(value).to.be.null;
        });

        it('should handle cache size limit', async () => {
            const smallCache = new CacheService({
                enableMemoryCache: true,
                maxMemoryCache: 3
            });

            await smallCache.set('key1', 'value1');
            await smallCache.set('key2', 'value2');
            await smallCache.set('key3', 'value3');
            await smallCache.set('key4', 'value4'); // Should evict key1

            const value1 = await smallCache.get('key1');
            const value4 = await smallCache.get('key4');
            
            expect(value1).to.be.null;
            expect(value4).to.equal('value4');
        });
    });

    describe('getOrSet Pattern', () => {
        it('should fetch and cache value on miss', async () => {
            const fetchFn = sinon.stub().resolves('fetched-value');
            
            const value = await cacheService.getOrSet('test:key', fetchFn, 60);
            
            expect(value).to.equal('fetched-value');
            expect(fetchFn.calledOnce).to.be.true;
        });

        it('should return cached value on hit', async () => {
            const fetchFn = sinon.stub().resolves('fetched-value');
            
            // First call - cache miss
            await cacheService.getOrSet('test:key', fetchFn, 60);
            
            // Second call - cache hit
            const value = await cacheService.getOrSet('test:key', fetchFn, 60);
            
            expect(value).to.equal('fetched-value');
            expect(fetchFn.calledOnce).to.be.true; // Should only be called once
        });

        it('should handle fetch function errors', async () => {
            const fetchFn = sinon.stub().rejects(new Error('Fetch failed'));
            
            const value = await cacheService.getOrSet('test:key', fetchFn, 60);
            
            expect(value).to.be.null;
        });
    });

    describe('Pattern-based Operations', () => {
        it('should delete keys matching pattern', async () => {
            await cacheService.set('user:1', 'user1');
            await cacheService.set('user:2', 'user2');
            await cacheService.set('post:1', 'post1');
            
            const deleted = await cacheService.deletePattern('user:*');
            
            expect(deleted).to.equal(2);
            expect(await cacheService.get('user:1')).to.be.null;
            expect(await cacheService.get('user:2')).to.be.null;
            expect(await cacheService.get('post:1')).to.equal('post1');
        });
    });

    describe('Statistics', () => {
        it('should track cache hits and misses', async () => {
            await cacheService.set('test:key', 'value');
            
            await cacheService.get('test:key'); // Hit
            await cacheService.get('non:existent'); // Miss
            
            const stats = cacheService.getStats();
            
            expect(stats.memory.hits).to.equal(1);
            expect(stats.memory.misses).to.equal(1);
        });

        it('should calculate hit rate correctly', async () => {
            await cacheService.set('key1', 'value1');
            await cacheService.set('key2', 'value2');
            
            await cacheService.get('key1'); // Hit
            await cacheService.get('key2'); // Hit
            await cacheService.get('key3'); // Miss
            
            const stats = cacheService.getStats();
            
            expect(stats.memory.hitRate).to.equal('66.67%');
        });
    });

    describe('Serialization', () => {
        it('should serialize and deserialize objects', async () => {
            const obj = { name: 'test', value: 123, nested: { key: 'value' } };
            
            await cacheService.set('test:obj', obj);
            const retrieved = await cacheService.get('test:obj');
            
            expect(retrieved).to.deep.equal(obj);
        });

        it('should handle arrays', async () => {
            const arr = [1, 2, 3, 'test', { key: 'value' }];
            
            await cacheService.set('test:arr', arr);
            const retrieved = await cacheService.get('test:arr');
            
            expect(retrieved).to.deep.equal(arr);
        });
    });

    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const health = await cacheService.healthCheck();
            
            expect(health.status).to.equal('healthy');
            expect(health.memory.healthy).to.be.true;
        });
    });

    describe('Clear Operations', () => {
        it('should clear all caches', async () => {
            await cacheService.set('key1', 'value1');
            await cacheService.set('key2', 'value2');
            
            await cacheService.clear();
            
            expect(await cacheService.get('key1')).to.be.null;
            expect(await cacheService.get('key2')).to.be.null;
        });
    });
});

describe('CacheService Integration', () => {
    it('should work with real-world scenario', async () => {
        const cache = new CacheService({
            enableMemoryCache: true,
            defaultTTL: 60
        });

        // Simulate user data caching
        const getUserData = async (userId) => {
            return await cache.getOrSet(
                `user:${userId}`,
                async () => {
                    // Simulate database fetch
                    return {
                        id: userId,
                        name: `User ${userId}`,
                        email: `user${userId}@example.com`
                    };
                },
                300
            );
        };

        // First call - cache miss
        const user1 = await getUserData(1);
        expect(user1.name).to.equal('User 1');

        // Second call - cache hit
        const user1Again = await getUserData(1);
        expect(user1Again).to.deep.equal(user1);

        // Different user - cache miss
        const user2 = await getUserData(2);
        expect(user2.name).to.equal('User 2');

        cache.close();
    });
});

// Made with Bob
