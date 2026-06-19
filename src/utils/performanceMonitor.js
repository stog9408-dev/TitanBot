/**
 * Performance Monitoring System
 * Tracks metrics, response times, and system health
 */

const EventEmitter = require('events');

class PerformanceMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = {
            commands: new Map(),
            api: new Map(),
            database: new Map(),
            cache: new Map(),
            memory: [],
            cpu: []
        };
        
        this.startTime = Date.now();
        this.requestCount = 0;
        this.errorCount = 0;
        
        // Start monitoring
        this.startMonitoring();
    }

    /**
     * Track command execution
     */
    trackCommand(commandName, duration, success = true) {
        if (!this.metrics.commands.has(commandName)) {
            this.metrics.commands.set(commandName, {
                count: 0,
                totalDuration: 0,
                errors: 0,
                avgDuration: 0,
                minDuration: Infinity,
                maxDuration: 0
            });
        }

        const stats = this.metrics.commands.get(commandName);
        stats.count++;
        stats.totalDuration += duration;
        stats.avgDuration = stats.totalDuration / stats.count;
        stats.minDuration = Math.min(stats.minDuration, duration);
        stats.maxDuration = Math.max(stats.maxDuration, duration);
        
        if (!success) {
            stats.errors++;
            this.errorCount++;
        }

        this.requestCount++;
        this.emit('commandExecuted', { commandName, duration, success });
    }

    /**
     * Track API request
     */
    trackAPIRequest(endpoint, method, duration, statusCode) {
        const key = `${method} ${endpoint}`;
        
        if (!this.metrics.api.has(key)) {
            this.metrics.api.set(key, {
                count: 0,
                totalDuration: 0,
                avgDuration: 0,
                statusCodes: {}
            });
        }

        const stats = this.metrics.api.get(key);
        stats.count++;
        stats.totalDuration += duration;
        stats.avgDuration = stats.totalDuration / stats.count;
        stats.statusCodes[statusCode] = (stats.statusCodes[statusCode] || 0) + 1;

        this.emit('apiRequest', { endpoint, method, duration, statusCode });
    }

    /**
     * Track database query
     */
    trackDatabaseQuery(query, duration, success = true) {
        const queryType = query.split(' ')[0].toUpperCase();
        
        if (!this.metrics.database.has(queryType)) {
            this.metrics.database.set(queryType, {
                count: 0,
                totalDuration: 0,
                avgDuration: 0,
                errors: 0
            });
        }

        const stats = this.metrics.database.get(queryType);
        stats.count++;
        stats.totalDuration += duration;
        stats.avgDuration = stats.totalDuration / stats.count;
        
        if (!success) {
            stats.errors++;
        }

        this.emit('databaseQuery', { queryType, duration, success });
    }

    /**
     * Track cache operation
     */
    trackCacheOperation(operation, hit = true) {
        if (!this.metrics.cache.has(operation)) {
            this.metrics.cache.set(operation, {
                hits: 0,
                misses: 0,
                hitRate: 0
            });
        }

        const stats = this.metrics.cache.get(operation);
        
        if (hit) {
            stats.hits++;
        } else {
            stats.misses++;
        }

        const total = stats.hits + stats.misses;
        stats.hitRate = (stats.hits / total) * 100;

        this.emit('cacheOperation', { operation, hit });
    }

    /**
     * Get system metrics
     */
    getSystemMetrics() {
        const uptime = Date.now() - this.startTime;
        const memUsage = process.memoryUsage();
        
        return {
            uptime: this.formatUptime(uptime),
            uptimeMs: uptime,
            requests: {
                total: this.requestCount,
                errors: this.errorCount,
                errorRate: (this.errorCount / this.requestCount * 100).toFixed(2) + '%'
            },
            memory: {
                rss: this.formatBytes(memUsage.rss),
                heapTotal: this.formatBytes(memUsage.heapTotal),
                heapUsed: this.formatBytes(memUsage.heapUsed),
                external: this.formatBytes(memUsage.external),
                heapUsedPercent: ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(2) + '%'
            },
            cpu: {
                usage: process.cpuUsage(),
                loadAverage: require('os').loadavg()
            }
        };
    }

    /**
     * Get command statistics
     */
    getCommandStats() {
        const stats = [];
        
        for (const [name, data] of this.metrics.commands.entries()) {
            stats.push({
                name,
                executions: data.count,
                avgDuration: data.avgDuration.toFixed(2) + 'ms',
                minDuration: data.minDuration.toFixed(2) + 'ms',
                maxDuration: data.maxDuration.toFixed(2) + 'ms',
                errors: data.errors,
                errorRate: ((data.errors / data.count) * 100).toFixed(2) + '%'
            });
        }

        return stats.sort((a, b) => b.executions - a.executions);
    }

    /**
     * Get API statistics
     */
    getAPIStats() {
        const stats = [];
        
        for (const [endpoint, data] of this.metrics.api.entries()) {
            stats.push({
                endpoint,
                requests: data.count,
                avgDuration: data.avgDuration.toFixed(2) + 'ms',
                statusCodes: data.statusCodes
            });
        }

        return stats.sort((a, b) => b.requests - a.requests);
    }

    /**
     * Get database statistics
     */
    getDatabaseStats() {
        const stats = [];
        
        for (const [queryType, data] of this.metrics.database.entries()) {
            stats.push({
                queryType,
                queries: data.count,
                avgDuration: data.avgDuration.toFixed(2) + 'ms',
                errors: data.errors,
                errorRate: ((data.errors / data.count) * 100).toFixed(2) + '%'
            });
        }

        return stats;
    }

    /**
     * Get cache statistics
     */
    getCacheStats() {
        const stats = [];
        
        for (const [operation, data] of this.metrics.cache.entries()) {
            stats.push({
                operation,
                hits: data.hits,
                misses: data.misses,
                hitRate: data.hitRate.toFixed(2) + '%'
            });
        }

        return stats;
    }

    /**
     * Get health status
     */
    getHealthStatus() {
        const system = this.getSystemMetrics();
        const memUsedPercent = parseFloat(system.memory.heapUsedPercent);
        const errorRate = parseFloat(system.requests.errorRate);

        let status = 'healthy';
        let issues = [];

        // Check memory usage
        if (memUsedPercent > 90) {
            status = 'critical';
            issues.push('Memory usage critical (>90%)');
        } else if (memUsedPercent > 75) {
            status = 'warning';
            issues.push('Memory usage high (>75%)');
        }

        // Check error rate
        if (errorRate > 10) {
            status = 'critical';
            issues.push('Error rate critical (>10%)');
        } else if (errorRate > 5) {
            if (status !== 'critical') status = 'warning';
            issues.push('Error rate high (>5%)');
        }

        return {
            status,
            issues,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Start monitoring intervals
     */
    startMonitoring() {
        // Monitor memory every 30 seconds
        setInterval(() => {
            const memUsage = process.memoryUsage();
            this.metrics.memory.push({
                timestamp: Date.now(),
                heapUsed: memUsage.heapUsed,
                heapTotal: memUsage.heapTotal
            });

            // Keep only last 100 entries
            if (this.metrics.memory.length > 100) {
                this.metrics.memory.shift();
            }

            this.emit('memoryUpdate', memUsage);
        }, 30000);

        // Monitor CPU every minute
        setInterval(() => {
            const cpuUsage = process.cpuUsage();
            this.metrics.cpu.push({
                timestamp: Date.now(),
                user: cpuUsage.user,
                system: cpuUsage.system
            });

            // Keep only last 60 entries
            if (this.metrics.cpu.length > 60) {
                this.metrics.cpu.shift();
            }

            this.emit('cpuUpdate', cpuUsage);
        }, 60000);

        // Check health every 5 minutes
        setInterval(() => {
            const health = this.getHealthStatus();
            this.emit('healthCheck', health);

            if (health.status === 'critical') {
                console.error('🚨 CRITICAL: System health issues detected:', health.issues);
            } else if (health.status === 'warning') {
                console.warn('⚠️ WARNING: System health warnings:', health.issues);
            }
        }, 300000);
    }

    /**
     * Generate performance report
     */
    generateReport() {
        return {
            system: this.getSystemMetrics(),
            commands: this.getCommandStats(),
            api: this.getAPIStats(),
            database: this.getDatabaseStats(),
            cache: this.getCacheStats(),
            health: this.getHealthStatus(),
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Reset all metrics
     */
    reset() {
        this.metrics.commands.clear();
        this.metrics.api.clear();
        this.metrics.database.clear();
        this.metrics.cache.clear();
        this.metrics.memory = [];
        this.metrics.cpu = [];
        this.requestCount = 0;
        this.errorCount = 0;
        this.startTime = Date.now();
        
        this.emit('metricsReset');
    }

    /**
     * Format bytes to human readable
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Format uptime to human readable
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }
}

// Singleton instance
const monitor = new PerformanceMonitor();

module.exports = monitor;

// Made with Bob
