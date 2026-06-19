/**
 * Database Query Optimizer & Performance Analyzer
 * Provides automatic query optimization, indexing suggestions, and performance monitoring
 * 
 * @version 2.0.0
 * @author TitanBot Development Team
 */

const { performance } = require('perf_hooks');

class DatabaseOptimizer {
    constructor(database) {
        this.db = database;
        this.queryStats = new Map();
        this.slowQueries = [];
        this.slowQueryThreshold = 100; // ms
        this.enableLogging = true;
        this.enableAutoOptimization = true;
        
        // Query patterns for optimization
        this.optimizationPatterns = {
            missingIndex: /WHERE\s+(\w+)\s*=/gi,
            selectAll: /SELECT\s+\*/gi,
            noLimit: /SELECT.*FROM.*WHERE/gi,
            cartesianProduct: /FROM\s+\w+\s*,\s*\w+/gi,
            subqueryInSelect: /SELECT.*\(SELECT/gi
        };

        // Index recommendations
        this.indexRecommendations = new Set();
    }

    /**
     * Execute optimized query with performance tracking
     * @param {string} query - SQL query
     * @param {Array} params - Query parameters
     * @returns {Promise<any>} Query result
     */
    async executeOptimized(query, params = []) {
        const startTime = performance.now();
        const queryHash = this.hashQuery(query);

        try {
            // Analyze query before execution
            const analysis = this.analyzeQuery(query);
            
            // Apply automatic optimizations if enabled
            let optimizedQuery = query;
            if (this.enableAutoOptimization && analysis.canOptimize) {
                optimizedQuery = this.optimizeQuery(query, analysis);
            }

            // Execute query
            const result = await this.db.all(optimizedQuery, params);
            
            // Track performance
            const executionTime = performance.now() - startTime;
            this.trackQueryPerformance(queryHash, query, executionTime, result.length);

            // Log slow queries
            if (executionTime > this.slowQueryThreshold) {
                this.logSlowQuery(query, executionTime, analysis);
            }

            return result;
        } catch (error) {
            const executionTime = performance.now() - startTime;
            this.trackQueryError(queryHash, query, executionTime, error);
            throw error;
        }
    }

    /**
     * Analyze query for optimization opportunities
     * @param {string} query - SQL query
     * @returns {Object} Analysis results
     */
    analyzeQuery(query) {
        const analysis = {
            canOptimize: false,
            issues: [],
            recommendations: [],
            complexity: 'low'
        };

        // Check for SELECT *
        if (this.optimizationPatterns.selectAll.test(query)) {
            analysis.issues.push('Using SELECT * - specify columns explicitly');
            analysis.recommendations.push('Replace SELECT * with specific column names');
            analysis.canOptimize = true;
        }

        // Check for missing LIMIT
        if (this.optimizationPatterns.noLimit.test(query) && !query.includes('LIMIT')) {
            analysis.issues.push('No LIMIT clause - may return too many rows');
            analysis.recommendations.push('Add LIMIT clause to restrict result set');
        }

        // Check for potential missing indexes
        const whereMatches = [...query.matchAll(this.optimizationPatterns.missingIndex)];
        if (whereMatches.length > 0) {
            whereMatches.forEach(match => {
                const column = match[1];
                analysis.recommendations.push(`Consider adding index on column: ${column}`);
                this.indexRecommendations.add(column);
            });
        }

        // Check for cartesian products
        if (this.optimizationPatterns.cartesianProduct.test(query)) {
            analysis.issues.push('Potential cartesian product detected');
            analysis.recommendations.push('Use explicit JOIN instead of comma-separated tables');
            analysis.complexity = 'high';
        }

        // Check for subqueries in SELECT
        if (this.optimizationPatterns.subqueryInSelect.test(query)) {
            analysis.issues.push('Subquery in SELECT clause');
            analysis.recommendations.push('Consider using JOIN instead of subquery');
            analysis.complexity = 'medium';
        }

        // Estimate complexity
        const joinCount = (query.match(/JOIN/gi) || []).length;
        const whereCount = (query.match(/WHERE/gi) || []).length;
        const subqueryCount = (query.match(/\(SELECT/gi) || []).length;

        if (joinCount > 3 || subqueryCount > 2) {
            analysis.complexity = 'high';
        } else if (joinCount > 1 || subqueryCount > 0) {
            analysis.complexity = 'medium';
        }

        return analysis;
    }

    /**
     * Optimize query automatically
     * @param {string} query - Original query
     * @param {Object} analysis - Query analysis
     * @returns {string} Optimized query
     */
    optimizeQuery(query, analysis) {
        let optimized = query;

        // Add LIMIT if missing (for SELECT queries without LIMIT)
        if (analysis.issues.some(i => i.includes('No LIMIT'))) {
            if (!optimized.includes('LIMIT') && optimized.trim().toUpperCase().startsWith('SELECT')) {
                optimized += ' LIMIT 1000';
            }
        }

        return optimized;
    }

    /**
     * Track query performance
     * @param {string} queryHash - Query hash
     * @param {string} query - SQL query
     * @param {number} executionTime - Execution time in ms
     * @param {number} rowCount - Number of rows returned
     */
    trackQueryPerformance(queryHash, query, executionTime, rowCount) {
        if (!this.queryStats.has(queryHash)) {
            this.queryStats.set(queryHash, {
                query: query.substring(0, 200), // Store first 200 chars
                executions: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                avgTime: 0,
                totalRows: 0,
                errors: 0
            });
        }

        const stats = this.queryStats.get(queryHash);
        stats.executions++;
        stats.totalTime += executionTime;
        stats.minTime = Math.min(stats.minTime, executionTime);
        stats.maxTime = Math.max(stats.maxTime, executionTime);
        stats.avgTime = stats.totalTime / stats.executions;
        stats.totalRows += rowCount;
    }

    /**
     * Track query error
     * @param {string} queryHash - Query hash
     * @param {string} query - SQL query
     * @param {number} executionTime - Execution time in ms
     * @param {Error} error - Error object
     */
    trackQueryError(queryHash, query, executionTime, error) {
        if (!this.queryStats.has(queryHash)) {
            this.queryStats.set(queryHash, {
                query: query.substring(0, 200),
                executions: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                avgTime: 0,
                totalRows: 0,
                errors: 0
            });
        }

        const stats = this.queryStats.get(queryHash);
        stats.errors++;
        stats.executions++;
        stats.totalTime += executionTime;
    }

    /**
     * Log slow query
     * @param {string} query - SQL query
     * @param {number} executionTime - Execution time in ms
     * @param {Object} analysis - Query analysis
     */
    logSlowQuery(query, executionTime, analysis) {
        const slowQuery = {
            query: query.substring(0, 500),
            executionTime: executionTime.toFixed(2),
            timestamp: new Date().toISOString(),
            analysis
        };

        this.slowQueries.push(slowQuery);

        // Keep only last 100 slow queries
        if (this.slowQueries.length > 100) {
            this.slowQueries.shift();
        }

        if (this.enableLogging) {
            console.warn(`⚠️ Slow query detected (${executionTime.toFixed(2)}ms):`);
            console.warn(`   Query: ${query.substring(0, 100)}...`);
            if (analysis.recommendations.length > 0) {
                console.warn(`   Recommendations:`);
                analysis.recommendations.forEach(rec => {
                    console.warn(`   - ${rec}`);
                });
            }
        }
    }

    /**
     * Generate query hash for tracking
     * @param {string} query - SQL query
     * @returns {string} Query hash
     */
    hashQuery(query) {
        // Normalize query (remove extra spaces, lowercase)
        const normalized = query.replace(/\s+/g, ' ').trim().toLowerCase();
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < normalized.length; i++) {
            const char = normalized.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Get performance statistics
     * @returns {Object} Performance statistics
     */
    getStatistics() {
        const stats = {
            totalQueries: 0,
            totalExecutionTime: 0,
            slowQueries: this.slowQueries.length,
            topSlowQueries: [],
            topFrequentQueries: [],
            indexRecommendations: Array.from(this.indexRecommendations),
            averageExecutionTime: 0
        };

        // Calculate totals
        for (const [hash, queryStats] of this.queryStats) {
            stats.totalQueries += queryStats.executions;
            stats.totalExecutionTime += queryStats.totalTime;
        }

        stats.averageExecutionTime = stats.totalQueries > 0 
            ? (stats.totalExecutionTime / stats.totalQueries).toFixed(2)
            : 0;

        // Get top 10 slowest queries
        const sortedBySlowest = Array.from(this.queryStats.values())
            .sort((a, b) => b.maxTime - a.maxTime)
            .slice(0, 10);

        stats.topSlowQueries = sortedBySlowest.map(q => ({
            query: q.query,
            maxTime: q.maxTime.toFixed(2),
            avgTime: q.avgTime.toFixed(2),
            executions: q.executions
        }));

        // Get top 10 most frequent queries
        const sortedByFrequency = Array.from(this.queryStats.values())
            .sort((a, b) => b.executions - a.executions)
            .slice(0, 10);

        stats.topFrequentQueries = sortedByFrequency.map(q => ({
            query: q.query,
            executions: q.executions,
            avgTime: q.avgTime.toFixed(2),
            totalTime: q.totalTime.toFixed(2)
        }));

        return stats;
    }

    /**
     * Generate optimization report
     * @returns {string} Formatted report
     */
    generateReport() {
        const stats = this.getStatistics();
        
        let report = '\n';
        report += '═══════════════════════════════════════════════════════════\n';
        report += '           DATABASE PERFORMANCE REPORT\n';
        report += '═══════════════════════════════════════════════════════════\n\n';

        report += '📊 OVERALL STATISTICS\n';
        report += '─────────────────────────────────────────────────────────\n';
        report += `Total Queries Executed: ${stats.totalQueries}\n`;
        report += `Total Execution Time: ${stats.totalExecutionTime.toFixed(2)}ms\n`;
        report += `Average Execution Time: ${stats.averageExecutionTime}ms\n`;
        report += `Slow Queries (>${this.slowQueryThreshold}ms): ${stats.slowQueries}\n\n`;

        if (stats.topSlowQueries.length > 0) {
            report += '🐌 TOP 10 SLOWEST QUERIES\n';
            report += '─────────────────────────────────────────────────────────\n';
            stats.topSlowQueries.forEach((q, i) => {
                report += `${i + 1}. Max: ${q.maxTime}ms | Avg: ${q.avgTime}ms | Runs: ${q.executions}\n`;
                report += `   ${q.query}\n\n`;
            });
        }

        if (stats.topFrequentQueries.length > 0) {
            report += '🔥 TOP 10 MOST FREQUENT QUERIES\n';
            report += '─────────────────────────────────────────────────────────\n';
            stats.topFrequentQueries.forEach((q, i) => {
                report += `${i + 1}. Runs: ${q.executions} | Avg: ${q.avgTime}ms | Total: ${q.totalTime}ms\n`;
                report += `   ${q.query}\n\n`;
            });
        }

        if (stats.indexRecommendations.length > 0) {
            report += '💡 INDEX RECOMMENDATIONS\n';
            report += '─────────────────────────────────────────────────────────\n';
            stats.indexRecommendations.forEach(column => {
                report += `• CREATE INDEX idx_${column} ON table_name(${column});\n`;
            });
            report += '\n';
        }

        report += '═══════════════════════════════════════════════════════════\n';

        return report;
    }

    /**
     * Create recommended indexes
     * @param {string} tableName - Table name
     * @returns {Promise<Array>} Created indexes
     */
    async createRecommendedIndexes(tableName) {
        const created = [];

        for (const column of this.indexRecommendations) {
            try {
                const indexName = `idx_${tableName}_${column}`;
                const query = `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${column})`;
                
                await this.db.run(query);
                created.push({ table: tableName, column, indexName });
                
                if (this.enableLogging) {
                    console.log(`✅ Created index: ${indexName}`);
                }
            } catch (error) {
                console.error(`❌ Failed to create index on ${column}:`, error.message);
            }
        }

        return created;
    }

    /**
     * Analyze table for optimization opportunities
     * @param {string} tableName - Table name
     * @returns {Promise<Object>} Analysis results
     */
    async analyzeTable(tableName) {
        const analysis = {
            tableName,
            rowCount: 0,
            indexes: [],
            recommendations: []
        };

        try {
            // Get row count
            const countResult = await this.db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
            analysis.rowCount = countResult.count;

            // Get existing indexes
            const indexes = await this.db.all(`PRAGMA index_list(${tableName})`);
            analysis.indexes = indexes.map(idx => idx.name);

            // Recommendations based on row count
            if (analysis.rowCount > 10000 && analysis.indexes.length === 0) {
                analysis.recommendations.push('Table has many rows but no indexes - consider adding indexes');
            }

            if (analysis.rowCount > 100000) {
                analysis.recommendations.push('Large table detected - consider partitioning or archiving old data');
            }

        } catch (error) {
            console.error(`Error analyzing table ${tableName}:`, error);
        }

        return analysis;
    }

    /**
     * Optimize database (VACUUM, ANALYZE)
     * @returns {Promise<Object>} Optimization results
     */
    async optimizeDatabase() {
        const results = {
            vacuum: false,
            analyze: false,
            errors: []
        };

        try {
            // VACUUM - reclaim unused space
            await this.db.run('VACUUM');
            results.vacuum = true;
            if (this.enableLogging) {
                console.log('✅ Database VACUUM completed');
            }
        } catch (error) {
            results.errors.push(`VACUUM failed: ${error.message}`);
        }

        try {
            // ANALYZE - update statistics
            await this.db.run('ANALYZE');
            results.analyze = true;
            if (this.enableLogging) {
                console.log('✅ Database ANALYZE completed');
            }
        } catch (error) {
            results.errors.push(`ANALYZE failed: ${error.message}`);
        }

        return results;
    }

    /**
     * Reset statistics
     */
    resetStatistics() {
        this.queryStats.clear();
        this.slowQueries = [];
        this.indexRecommendations.clear();
    }

    /**
     * Export statistics to JSON
     * @returns {Object} Statistics object
     */
    exportStatistics() {
        return {
            timestamp: new Date().toISOString(),
            statistics: this.getStatistics(),
            slowQueries: this.slowQueries,
            queryDetails: Array.from(this.queryStats.entries()).map(([hash, stats]) => ({
                hash,
                ...stats
            }))
        };
    }
}

module.exports = DatabaseOptimizer;

// Made with Bob
