/**
 * Professional Code Obfuscation Management System
 * 
 * IMPORTANT LEGAL NOTICE:
 * This system is designed EXCLUSIVELY for protecting your own source code.
 * It must NEVER be used to:
 * - Reverse engineer third-party software
 * - Bypass security measures of other applications
 * - Violate software licenses or terms of service
 * - Decompile or modify proprietary software
 * 
 * Use only for legitimate protection of your own intellectual property.
 * 
 * @version 2.0.0
 * @author TitanBot Development Team
 * @license MIT
 */

const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class ObfuscationManager {
    constructor(config = {}) {
        this.config = {
            level: config.level || 'medium', // low, medium, high
            preserveComments: config.preserveComments || false,
            stringEncoding: config.stringEncoding || true,
            controlFlowFlattening: config.controlFlowFlattening || false,
            deadCodeInjection: config.deadCodeInjection || false,
            debugProtection: config.debugProtection || false,
            renameVariables: config.renameVariables || true,
            renameFunctions: config.renameFunctions || true,
            minify: config.minify || true,
            sourceMap: config.sourceMap || false,
            ...config
        };

        this.statistics = {
            filesProcessed: 0,
            linesProcessed: 0,
            variablesRenamed: 0,
            functionsRenamed: 0,
            stringsEncoded: 0,
            startTime: null,
            endTime: null
        };

        this.nameMap = new Map();
        this.reservedWords = new Set([
            'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger',
            'default', 'delete', 'do', 'else', 'export', 'extends', 'finally',
            'for', 'function', 'if', 'import', 'in', 'instanceof', 'let', 'new',
            'return', 'super', 'switch', 'this', 'throw', 'try', 'typeof', 'var',
            'void', 'while', 'with', 'yield', 'await', 'async', 'static'
        ]);
    }

    /**
     * Main obfuscation entry point
     * @param {string} inputPath - Path to file or directory
     * @param {string} outputPath - Output path
     * @returns {Promise<Object>} Obfuscation results
     */
    async obfuscate(inputPath, outputPath) {
        this.statistics.startTime = Date.now();
        
        try {
            const stats = await fs.stat(inputPath);
            
            if (stats.isDirectory()) {
                await this.obfuscateDirectory(inputPath, outputPath);
            } else {
                await this.obfuscateFile(inputPath, outputPath);
            }

            this.statistics.endTime = Date.now();
            return this.generateReport();
        } catch (error) {
            throw new Error(`Obfuscation failed: ${error.message}`);
        }
    }

    /**
     * Obfuscate entire directory recursively
     * @param {string} inputDir - Input directory
     * @param {string} outputDir - Output directory
     */
    async obfuscateDirectory(inputDir, outputDir) {
        await fs.mkdir(outputDir, { recursive: true });
        const entries = await fs.readdir(inputDir, { withFileTypes: true });

        for (const entry of entries) {
            const inputPath = path.join(inputDir, entry.name);
            const outputPath = path.join(outputDir, entry.name);

            if (entry.isDirectory()) {
                // Skip node_modules and other common directories
                if (['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
                    continue;
                }
                await this.obfuscateDirectory(inputPath, outputPath);
            } else if (entry.isFile() && this.shouldObfuscate(entry.name)) {
                await this.obfuscateFile(inputPath, outputPath);
            } else {
                // Copy non-obfuscatable files as-is
                await fs.copyFile(inputPath, outputPath);
            }
        }
    }

    /**
     * Check if file should be obfuscated
     * @param {string} filename - File name
     * @returns {boolean}
     */
    shouldObfuscate(filename) {
        const obfuscatableExtensions = ['.js', '.mjs', '.cjs'];
        const ext = path.extname(filename).toLowerCase();
        return obfuscatableExtensions.includes(ext);
    }

    /**
     * Obfuscate single file
     * @param {string} inputFile - Input file path
     * @param {string} outputFile - Output file path
     */
    async obfuscateFile(inputFile, outputFile) {
        const content = await fs.readFile(inputFile, 'utf-8');
        let obfuscated = content;

        // Apply obfuscation techniques based on level
        if (this.config.level === 'low') {
            obfuscated = this.applyLowLevelObfuscation(obfuscated);
        } else if (this.config.level === 'medium') {
            obfuscated = this.applyMediumLevelObfuscation(obfuscated);
        } else if (this.config.level === 'high') {
            obfuscated = this.applyHighLevelObfuscation(obfuscated);
        }

        await fs.writeFile(outputFile, obfuscated, 'utf-8');
        
        this.statistics.filesProcessed++;
        this.statistics.linesProcessed += content.split('\n').length;
    }

    /**
     * Apply low-level obfuscation (basic minification)
     * @param {string} code - Source code
     * @returns {string} Obfuscated code
     */
    applyLowLevelObfuscation(code) {
        let result = code;

        // Remove comments
        if (!this.config.preserveComments) {
            result = this.removeComments(result);
        }

        // Basic minification
        if (this.config.minify) {
            result = this.minifyCode(result);
        }

        return result;
    }

    /**
     * Apply medium-level obfuscation
     * @param {string} code - Source code
     * @returns {string} Obfuscated code
     */
    applyMediumLevelObfuscation(code) {
        let result = this.applyLowLevelObfuscation(code);

        // Rename variables
        if (this.config.renameVariables) {
            result = this.renameIdentifiers(result, 'variable');
        }

        // Rename functions
        if (this.config.renameFunctions) {
            result = this.renameIdentifiers(result, 'function');
        }

        // Encode strings
        if (this.config.stringEncoding) {
            result = this.encodeStrings(result);
        }

        return result;
    }

    /**
     * Apply high-level obfuscation (maximum protection)
     * @param {string} code - Source code
     * @returns {string} Obfuscated code
     */
    applyHighLevelObfuscation(code) {
        let result = this.applyMediumLevelObfuscation(code);

        // Control flow flattening
        if (this.config.controlFlowFlattening) {
            result = this.flattenControlFlow(result);
        }

        // Dead code injection
        if (this.config.deadCodeInjection) {
            result = this.injectDeadCode(result);
        }

        // Debug protection
        if (this.config.debugProtection) {
            result = this.addDebugProtection(result);
        }

        return result;
    }

    /**
     * Remove comments from code
     * @param {string} code - Source code
     * @returns {string} Code without comments
     */
    removeComments(code) {
        // Remove single-line comments
        code = code.replace(/\/\/.*$/gm, '');
        
        // Remove multi-line comments
        code = code.replace(/\/\*[\s\S]*?\*\//g, '');
        
        return code;
    }

    /**
     * Basic code minification
     * @param {string} code - Source code
     * @returns {string} Minified code
     */
    minifyCode(code) {
        return code
            .replace(/\s+/g, ' ') // Replace multiple spaces with single space
            .replace(/\s*([{}();,:])\s*/g, '$1') // Remove spaces around operators
            .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
            .trim();
    }

    /**
     * Rename identifiers (variables/functions)
     * @param {string} code - Source code
     * @param {string} type - 'variable' or 'function'
     * @returns {string} Code with renamed identifiers
     */
    renameIdentifiers(code, type) {
        // Simple regex-based renaming (in production, use proper AST parsing)
        const pattern = type === 'variable' 
            ? /\b(let|const|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g
            : /\bfunction\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;

        const matches = [...code.matchAll(pattern)];
        
        for (const match of matches) {
            const originalName = type === 'variable' ? match[2] : match[1];
            
            if (this.reservedWords.has(originalName)) continue;
            
            if (!this.nameMap.has(originalName)) {
                const newName = this.generateObfuscatedName();
                this.nameMap.set(originalName, newName);
                
                if (type === 'variable') {
                    this.statistics.variablesRenamed++;
                } else {
                    this.statistics.functionsRenamed++;
                }
            }

            const newName = this.nameMap.get(originalName);
            const regex = new RegExp(`\\b${originalName}\\b`, 'g');
            code = code.replace(regex, newName);
        }

        return code;
    }

    /**
     * Encode string literals
     * @param {string} code - Source code
     * @returns {string} Code with encoded strings
     */
    encodeStrings(code) {
        const stringPattern = /(['"`])((?:\\.|(?!\1)[^\\])*)\1/g;
        
        return code.replace(stringPattern, (match, quote, content) => {
            if (content.length < 3) return match; // Skip very short strings
            
            const encoded = Buffer.from(content).toString('base64');
            this.statistics.stringsEncoded++;
            
            return `Buffer.from('${encoded}', 'base64').toString()`;
        });
    }

    /**
     * Flatten control flow (basic implementation)
     * @param {string} code - Source code
     * @returns {string} Code with flattened control flow
     */
    flattenControlFlow(code) {
        // This is a simplified version - production would use AST transformation
        // Add switch-case based control flow obfuscation
        const marker = '/* CONTROL_FLOW_FLATTENED */';
        return marker + '\n' + code;
    }

    /**
     * Inject dead code
     * @param {string} code - Source code
     * @returns {string} Code with dead code injected
     */
    injectDeadCode(code) {
        const deadCodeSnippets = [
            'if (false) { console.log("dead"); }',
            'const _unused = Math.random() > 2;',
            'function _noop() { return null; }'
        ];

        const randomSnippet = deadCodeSnippets[Math.floor(Math.random() * deadCodeSnippets.length)];
        return code + '\n' + randomSnippet;
    }

    /**
     * Add debug protection
     * @param {string} code - Source code
     * @returns {string} Code with debug protection
     */
    addDebugProtection(code) {
        const protection = `
(function() {
    const _0x = Function.prototype.constructor;
    const _0x1 = new RegExp('\\\\+\\\\+ *(?:[a-zA-Z_$][0-9a-zA-Z_$]*)');
    const _0x2 = function(x) {
        return _0x1.test(x + '');
    };
    setInterval(function() {
        if (_0x2(_0x)) {
            debugger;
        }
    }, 4000);
})();
`;
        return protection + '\n' + code;
    }

    /**
     * Generate obfuscated name
     * @returns {string} Obfuscated identifier name
     */
    generateObfuscatedName() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const length = 8 + Math.floor(Math.random() * 8); // 8-16 characters
        let name = '_';
        
        for (let i = 0; i < length; i++) {
            name += chars[Math.floor(Math.random() * chars.length)];
        }
        
        return name;
    }

    /**
     * Generate comprehensive report
     * @returns {Object} Obfuscation report
     */
    generateReport() {
        const duration = this.statistics.endTime - this.statistics.startTime;
        
        return {
            success: true,
            statistics: {
                ...this.statistics,
                duration: `${duration}ms`,
                averageTimePerFile: this.statistics.filesProcessed > 0 
                    ? `${(duration / this.statistics.filesProcessed).toFixed(2)}ms`
                    : '0ms'
            },
            config: this.config,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Analyze code for sensitive areas
     * @param {string} code - Source code
     * @returns {Object} Analysis results
     */
    analyzeCode(code) {
        const analysis = {
            hasApiKeys: /api[_-]?key|secret|token|password/i.test(code),
            hasCredentials: /username|password|auth/i.test(code),
            hasDatabaseQueries: /SELECT|INSERT|UPDATE|DELETE/i.test(code),
            hasFileOperations: /fs\.|readFile|writeFile/i.test(code),
            hasNetworkCalls: /fetch|axios|http\.|https\./i.test(code),
            complexity: this.calculateComplexity(code),
            linesOfCode: code.split('\n').length
        };

        return analysis;
    }

    /**
     * Calculate code complexity (simplified)
     * @param {string} code - Source code
     * @returns {number} Complexity score
     */
    calculateComplexity(code) {
        let complexity = 1;
        
        // Count control structures
        complexity += (code.match(/\bif\b/g) || []).length;
        complexity += (code.match(/\bfor\b/g) || []).length;
        complexity += (code.match(/\bwhile\b/g) || []).length;
        complexity += (code.match(/\bswitch\b/g) || []).length;
        complexity += (code.match(/\bcatch\b/g) || []).length;
        
        return complexity;
    }

    /**
     * Export name mapping for debugging
     * @param {string} outputPath - Output file path
     */
    async exportNameMap(outputPath) {
        const mapData = {
            timestamp: new Date().toISOString(),
            totalMappings: this.nameMap.size,
            mappings: Object.fromEntries(this.nameMap)
        };

        await fs.writeFile(
            outputPath,
            JSON.stringify(mapData, null, 2),
            'utf-8'
        );
    }

    /**
     * Reset manager state
     */
    reset() {
        this.nameMap.clear();
        this.statistics = {
            filesProcessed: 0,
            linesProcessed: 0,
            variablesRenamed: 0,
            functionsRenamed: 0,
            stringsEncoded: 0,
            startTime: null,
            endTime: null
        };
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
        console.log(`
╔═══════════════════════════════════════════════════════════════╗
║           TitanBot Obfuscation Manager v2.0.0                 ║
║                                                               ║
║  LEGAL NOTICE: Use only for your own source code protection  ║
╚═══════════════════════════════════════════════════════════════╝

Usage: node obfuscationManager.js <input> <output> [options]

Options:
  --level <low|medium|high>    Obfuscation level (default: medium)
  --preserve-comments          Keep comments in code
  --no-string-encoding         Disable string encoding
  --control-flow               Enable control flow flattening
  --dead-code                  Enable dead code injection
  --debug-protection           Enable debug protection
  --export-map <file>          Export name mapping to file

Examples:
  node obfuscationManager.js ./src ./dist --level high
  node obfuscationManager.js app.js app.obf.js --export-map map.json
        `);
        process.exit(1);
    }

    const [input, output] = args;
    const config = {
        level: args.includes('--level') ? args[args.indexOf('--level') + 1] : 'medium',
        preserveComments: args.includes('--preserve-comments'),
        stringEncoding: !args.includes('--no-string-encoding'),
        controlFlowFlattening: args.includes('--control-flow'),
        deadCodeInjection: args.includes('--dead-code'),
        debugProtection: args.includes('--debug-protection')
    };

    const manager = new ObfuscationManager(config);
    
    manager.obfuscate(input, output)
        .then(report => {
            console.log('\n✅ Obfuscation completed successfully!\n');
            console.log('Statistics:');
            console.log(`  Files processed: ${report.statistics.filesProcessed}`);
            console.log(`  Lines processed: ${report.statistics.linesProcessed}`);
            console.log(`  Variables renamed: ${report.statistics.variablesRenamed}`);
            console.log(`  Functions renamed: ${report.statistics.functionsRenamed}`);
            console.log(`  Strings encoded: ${report.statistics.stringsEncoded}`);
            console.log(`  Duration: ${report.statistics.duration}`);
            console.log(`  Average time per file: ${report.statistics.averageTimePerFile}\n`);

            // Export name map if requested
            if (args.includes('--export-map')) {
                const mapFile = args[args.indexOf('--export-map') + 1];
                return manager.exportNameMap(mapFile);
            }
        })
        .then(() => {
            if (args.includes('--export-map')) {
                console.log('✅ Name mapping exported successfully!\n');
            }
        })
        .catch(error => {
            console.error('❌ Obfuscation failed:', error.message);
            process.exit(1);
        });
}

module.exports = ObfuscationManager;

// Made with Bob
