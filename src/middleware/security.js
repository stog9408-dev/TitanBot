/**
 * Security Middleware
 * Implements CORS, rate limiting, and other security features
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');

/**
 * Configure CORS with whitelist
 */
const configureCORS = () => {
    const whitelist = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',')
        : ['http://localhost:3000'];

    return cors({
        origin: function (origin, callback) {
            // Allow requests with no origin (mobile apps, Postman, etc.)
            if (!origin) return callback(null, true);
            
            if (whitelist.indexOf(origin) !== -1) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true,
        optionsSuccessStatus: 200,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization']
    });
};

/**
 * General rate limiter
 */
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            error: 'Too many requests',
            message: 'You have exceeded the rate limit. Please try again later.',
            retryAfter: req.rateLimit.resetTime
        });
    }
});

/**
 * Strict rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    skipSuccessfulRequests: true,
    message: 'Too many authentication attempts, please try again later.'
});

/**
 * API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // limit each IP to 30 requests per minute
    message: 'API rate limit exceeded'
});

/**
 * Command rate limiter (per user)
 */
const commandLimiters = new Map();

const getCommandLimiter = (userId) => {
    if (!commandLimiters.has(userId)) {
        commandLimiters.set(userId, {
            count: 0,
            resetTime: Date.now() + 60000 // 1 minute
        });
    }

    const limiter = commandLimiters.get(userId);
    
    // Reset if time expired
    if (Date.now() > limiter.resetTime) {
        limiter.count = 0;
        limiter.resetTime = Date.now() + 60000;
    }

    return limiter;
};

const checkCommandRateLimit = (userId, maxCommands = 10) => {
    const limiter = getCommandLimiter(userId);
    
    if (limiter.count >= maxCommands) {
        const timeLeft = Math.ceil((limiter.resetTime - Date.now()) / 1000);
        return {
            limited: true,
            timeLeft,
            message: `You're sending commands too quickly! Please wait ${timeLeft} seconds.`
        };
    }

    limiter.count++;
    return { limited: false };
};

/**
 * Clean up old limiters
 */
setInterval(() => {
    const now = Date.now();
    for (const [userId, limiter] of commandLimiters.entries()) {
        if (now > limiter.resetTime + 300000) { // 5 minutes after reset
            commandLimiters.delete(userId);
        }
    }
}, 300000); // Run every 5 minutes

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
});

/**
 * Input sanitization middleware
 */
const sanitizeInput = () => {
    return [
        xss(), // Prevent XSS attacks
        mongoSanitize() // Prevent NoSQL injection
    ];
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    
    next();
};

/**
 * Error handling middleware
 */
const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Error',
            message: isDevelopment ? err.message : 'Invalid input data'
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            error: 'Unauthorized',
            message: 'Invalid or missing authentication token'
        });
    }

    if (err.name === 'ForbiddenError') {
        return res.status(403).json({
            error: 'Forbidden',
            message: 'You do not have permission to access this resource'
        });
    }

    // Default error
    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: isDevelopment ? err.message : 'Something went wrong'
    });
};

/**
 * Apply all security middleware to Express app
 */
const applySecurityMiddleware = (app) => {
    // Security headers
    app.use(securityHeaders);
    
    // CORS
    app.use(configureCORS());
    
    // Input sanitization
    app.use(sanitizeInput());
    
    // Request logging
    app.use(requestLogger);
    
    // General rate limiting
    app.use('/api/', generalLimiter);
    
    // Auth rate limiting
    app.use('/api/auth/', authLimiter);
    
    // API rate limiting
    app.use('/api/v1/', apiLimiter);
    
    // Error handling (should be last)
    app.use(errorHandler);
    
    console.log('✅ Security middleware applied');
};

module.exports = {
    configureCORS,
    generalLimiter,
    authLimiter,
    apiLimiter,
    checkCommandRateLimit,
    securityHeaders,
    sanitizeInput,
    requestLogger,
    errorHandler,
    applySecurityMiddleware
};

// Made with Bob
