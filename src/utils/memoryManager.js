/**
 * Advanced Memory Management & Resource Optimization
 * Monitors memory usage, detects leaks, and optimizes resource allocation
 * 
 * @version 2.0.0
 * @author TitanBot Development Team
 */

const { EventEmitter } = require('events');
const v8 = require('v8');
const os = require('os');

class MemoryManager extends EventEmitter {
    constructor(config = {}) {
        super();
        
        this.config = {
            warningThreshold: config.warningThreshold || 0.75, // 75% of max memory
            criticalThreshold: config.criticalThreshold || 0.90, // 90% of max memory
            checkInterval: config.checkInterval || 30000, // 30 seconds
            enableAutoGC: config.enableAutoGC !== false,
            enableHeapSnapshots: config.enableHeapSnapshots || false,
            maxHeapSize: config.maxHeapSize || 512, // MB
            enableLeakDetection: config.enableLeakDetection !== false,
            ...config
        };

        this.stats = {
            checks: 0,
            warnings: 0,
            criticals: 0,
            gcRuns: 0,
            leaksDetected: 0,
            startTime: Date.now(),
            peakMemory: 0
        };

        this.memoryHistory = [];
        this.maxHistorySize = 100;
        this.objectTracking = new Map();
        this.intervalId = null;
        this.isMonitoring = false;
    }

    /**
     * Start memory monitoring
     */
    start() {
        if (this.isMonitoring) {
            console.warn('Memory manager already running');
            return;
        }

        this.isMonitoring = true;
        this.intervalId = setInterval(() => {
            this.checkMemory();
        }, this.config.checkInterval);

        console.log('✅ Memory manager started');
        this.emit('started');
    }

    /**
     * Stop memory monitoring
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isMonitoring = false;
        console.log('⏹️ Memory manager stopped');
        this.emit('stopped');
    }

    /**
     * Check current memory usage
     */
    checkMemory() {
        const usage = this.getMemoryUsage();
        this.stats.checks++;

        // Update peak memory
        if (usage.heapUsedMB > this.stats.peakMemory) {
            this.stats.peakMemory = usage.heapUsedMB;
        }

        // Store in history
        this.addToHistory(usage);

        // Check thresholds
        const usagePercent = usage.heapUsedMB / this.config.maxHeapSize;

        if (usagePercent >= this.config.criticalThreshold) {
            this.handleCriticalMemory(usage);
        } else if (usagePercent >= this.config.warningThreshold) {
            this.handleWarningMemory(usage);
        }

        // Detect memory leaks
        if (this.config.enableLeakDetection) {
            this.detectLeaks();
        }

        this.emit('check', usage);
    }

    /**
     * Get current memory usage
     * @returns {Object} Memory usage statistics
     */
    getMemoryUsage() {
        const memUsage = process.memoryUsage();
        const heapStats = v8.getHeapStatistics();
        const systemMem = {
            total: os.totalmem(),
            free: os.freemem()
        };

        return {
            timestamp: Date.now(),
            rss: memUsage.rss,
            rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
            heapTotal: memUsage.heapTotal,
            heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
            heapUsed: memUsage.heapUsed,
            heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
            external: memUsage.external,
            externalMB: (memUsage.external / 1024 / 1024).toFixed(2),
            arrayBuffers: memUsage.arrayBuffers,
            heapSizeLimit: heapStats.heap_size_limit,
            heapSizeLimitMB: (heapStats.heap_size_limit / 1024 / 1024).toFixed(2),
            totalAvailableSize: heapStats.total_available_size,
            usedHeapSize: heapStats.used_heap_size,
            mallocedMemory: heapStats.malloced_memory,
            peakMallocedMemory: heapStats.peak_malloced_memory,
            systemTotal: systemMem.total,
            systemTotalMB: (systemMem.total / 1024 / 1024).toFixed(2),
            systemFree: systemMem.free,
            systemFreeMB: (systemMem.free / 1024 / 1024).toFixed(2),
            systemUsedPercent: ((1 - systemMem.free / systemMem.total) * 100).toFixed(2)
        };
    }

    /**
     * Add memory usage to history
     * @param {Object} usage - Memory usage data
     */
    addToHistory(usage) {
        this.memoryHistory.push({
            timestamp: usage.timestamp,
            heapUsedMB: parseFloat(usage.heapUsedMB),
            rssMB: parseFloat(usage.rssMB)
        });

        // Keep only last N entries
        if (this.memoryHistory.length > this.maxHistorySize) {
            this.memoryHistory.shift();
        }
    }

    /**
     * Handle warning level memory usage
     * @param {Object} usage - Memory usage data
     */
    handleWarningMemory(usage) {
        this.stats.warnings++;
        
        console.warn(`⚠️ Memory usage warning: ${usage.heapUsedMB}MB / ${this.config.maxHeapSize}MB`);
        
        this.emit('warning', {
            usage,
            threshold: this.config.warningThreshold,
            message: 'Memory usage above warning threshold'
        });

        // Suggest garbage collection
        if (this.config.enableAutoGC) {
            this.runGarbageCollection();
        }
    }

    /**
     * Handle critical level memory usage
     * @param {Object} usage - Memory usage data
     */
    handleCriticalMemory(usage) {
        this.stats.criticals++;
        
        console.error(`🚨 CRITICAL: Memory usage at ${usage.heapUsedMB}MB / ${this.config.maxHeapSize}MB`);
        
        this.emit('critical', {
            usage,
            threshold: this.config.criticalThreshold,
            message: 'Memory usage at critical level'
        });

        // Force garbage collection
        if (this.config.enableAutoGC) {
            this.runGarbageCollection(true);
        }

        // Clear caches if available
        this.clearCaches();
    }

    /**
     * Run garbage collection
     * @param {boolean} force - Force aggressive GC
     */
    runGarbageCollection(force = false) {
        if (global.gc) {
            try {
                if (force) {
                    // Run multiple GC cycles for aggressive cleanup
                    global.gc();
                    global.gc();
                } else {
                    global.gc();
                }
                this.stats.gcRuns++;
                console.log('🗑️ Garbage collection completed');
                this.emit('gc', { forced: force });
            } catch (error) {
                console.error('GC error:', error);
            }
        } else {
            console.warn('⚠️ Garbage collection not available. Run with --expose-gc flag');
        }
    }

    /**
     * Detect potential memory leaks
     */
    detectLeaks() {
        if (this.memoryHistory.length < 10) {
            return; // Need more data
        }

        // Get last 10 measurements
        const recent = this.memoryHistory.slice(-10);
        
        // Check if memory is consistently increasing
        let increasing = 0;
        for (let i = 1; i < recent.length; i++) {
            if (recent[i].heapUsedMB > recent[i - 1].heapUsedMB) {
                increasing++;
            }
        }

        // If memory increased in 8+ out of 10 checks, potential leak
        if (increasing >= 8) {
            const growthRate = (recent[recent.length - 1].heapUsedMB - recent[0].heapUsedMB) / recent[0].heapUsedMB;
            
            if (growthRate > 0.1) { // 10% growth
                this.stats.leaksDetected++;
                
                console.warn('🔍 Potential memory leak detected');
                console.warn(`   Growth rate: ${(growthRate * 100).toFixed(2)}%`);
                console.warn(`   From: ${recent[0].heapUsedMB}MB to ${recent[recent.length - 1].heapUsedMB}MB`);
                
                this.emit('leak', {
                    growthRate,
                    startMemory: recent[0].heapUsedMB,
                    endMemory: recent[recent.length - 1].heapUsedMB,
                    measurements: recent.length
                });

                // Take heap snapshot if enabled
                if (this.config.enableHeapSnapshots) {
                    this.takeHeapSnapshot();
                }
            }
        }
    }

    /**
     * Take heap snapshot for analysis
     */
    takeHeapSnapshot() {
        try {
            const filename = `heap-${Date.now()}.heapsnapshot`;
            const snapshot = v8.writeHeapSnapshot(filename);
            console.log(`📸 Heap snapshot saved: ${snapshot}`);
            this.emit('snapshot', { filename: snapshot });
        } catch (error) {
            console.error('Failed to take heap snapshot:', error);
        }
    }

    /**
     * Clear caches to free memory
     */
    clearCaches() {
        // Emit event for other services to clear their caches
        this.emit('clearCaches');
        
        // Clear internal tracking
        this.objectTracking.clear();
        
        console.log('🧹 Caches cleared');
    }

    /**
     * Track object for memory leak detection
     * @param {string} name - Object name/identifier
     * @param {Object} obj - Object to track
     */
    trackObject(name, obj) {
        if (!this.config.enableLeakDetection) return;

        if (!this.objectTracking.has(name)) {
            this.objectTracking.set(name, {
                count: 0,
                firstSeen: Date.now(),
                lastSeen: Date.now()
            });
        }

        const tracking = this.objectTracking.get(name);
        tracking.count++;
        tracking.lastSeen = Date.now();
    }

    /**
     * Untrack object
     * @param {string} name - Object name/identifier
     */
    untrackObject(name) {
        if (!this.config.enableLeakDetection) return;

        if (this.objectTracking.has(name)) {
            const tracking = this.objectTracking.get(name);
            tracking.count = Math.max(0, tracking.count - 1);
            
            if (tracking.count === 0) {
                this.objectTracking.delete(name);
            }
        }
    }

    /**
     * Get tracked objects report
     * @returns {Array} Tracked objects
     */
    getTrackedObjects() {
        const objects = [];
        
        for (const [name, data] of this.objectTracking) {
            objects.push({
                name,
                count: data.count,
                age: Date.now() - data.firstSeen,
                lastSeen: new Date(data.lastSeen).toISOString()
            });
        }

        return objects.sort((a, b) => b.count - a.count);
    }

    /**
     * Get memory statistics
     * @returns {Object} Statistics
     */
    getStatistics() {
        const uptime = Date.now() - this.stats.startTime;
        const current = this.getMemoryUsage();

        return {
            uptime: {
                ms: uptime,
                formatted: this.formatUptime(uptime)
            },
            current: current,
            peak: {
                heapUsedMB: this.stats.peakMemory
            },
            checks: this.stats.checks,
            warnings: this.stats.warnings,
            criticals: this.stats.criticals,
            gcRuns: this.stats.gcRuns,
            leaksDetected: this.stats.leaksDetected,
            trackedObjects: this.objectTracking.size,
            historySize: this.memoryHistory.length
        };
    }

    /**
     * Format uptime
     * @param {number} ms - Milliseconds
     * @returns {string} Formatted uptime
     */
    formatUptime(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    /**
     * Generate memory report
     * @returns {string} Formatted report
     */
    generateReport() {
        const stats = this.getStatistics();
        const trackedObjects = this.getTrackedObjects();

        let report = '\n';
        report += '═══════════════════════════════════════════════════════════\n';
        report += '              MEMORY MANAGEMENT REPORT\n';
        report += '═══════════════════════════════════════════════════════════\n\n';

        report += '📊 CURRENT MEMORY USAGE\n';
        report += '─────────────────────────────────────────────────────────\n';
        report += `Heap Used: ${stats.current.heapUsedMB}MB / ${stats.current.heapSizeLimitMB}MB\n`;
        report += `RSS: ${stats.current.rssMB}MB\n`;
        report += `External: ${stats.current.externalMB}MB\n`;
        report += `System: ${stats.current.systemUsedPercent}% used\n\n`;

        report += '📈 STATISTICS\n';
        report += '─────────────────────────────────────────────────────────\n';
        report += `Uptime: ${stats.uptime.formatted}\n`;
        report += `Peak Memory: ${stats.peak.heapUsedMB}MB\n`;
        report += `Memory Checks: ${stats.checks}\n`;
        report += `Warnings: ${stats.warnings}\n`;
        report += `Critical Alerts: ${stats.criticals}\n`;
        report += `GC Runs: ${stats.gcRuns}\n`;
        report += `Leaks Detected: ${stats.leaksDetected}\n\n`;

        if (trackedObjects.length > 0) {
            report += '🔍 TOP TRACKED OBJECTS\n';
            report += '─────────────────────────────────────────────────────────\n';
            trackedObjects.slice(0, 10).forEach((obj, i) => {
                report += `${i + 1}. ${obj.name}: ${obj.count} instances (age: ${this.formatUptime(obj.age)})\n`;
            });
            report += '\n';
        }

        if (this.memoryHistory.length > 0) {
            const recent = this.memoryHistory.slice(-5);
            report += '📉 RECENT MEMORY TREND\n';
            report += '─────────────────────────────────────────────────────────\n';
            recent.forEach(entry => {
                const time = new Date(entry.timestamp).toLocaleTimeString();
                report += `${time}: ${entry.heapUsedMB}MB\n`;
            });
            report += '\n';
        }

        report += '═══════════════════════════════════════════════════════════\n';

        return report;
    }

    /**
     * Optimize memory usage
     * @returns {Object} Optimization results
     */
    async optimize() {
        const beforeUsage = this.getMemoryUsage();
        
        console.log('🔧 Starting memory optimization...');

        // Clear caches
        this.clearCaches();

        // Run garbage collection
        if (global.gc) {
            this.runGarbageCollection(true);
        }

        // Wait a bit for GC to complete
        await new Promise(resolve => setTimeout(resolve, 1000));

        const afterUsage = this.getMemoryUsage();
        const freed = parseFloat(beforeUsage.heapUsedMB) - parseFloat(afterUsage.heapUsedMB);

        const results = {
            before: beforeUsage.heapUsedMB,
            after: afterUsage.heapUsedMB,
            freed: freed.toFixed(2),
            freedPercent: ((freed / parseFloat(beforeUsage.heapUsedMB)) * 100).toFixed(2)
        };

        console.log(`✅ Optimization complete: Freed ${results.freed}MB (${results.freedPercent}%)`);
        this.emit('optimized', results);

        return results;
    }
}

module.exports = MemoryManager;

// Made with Bob
