/**
 * Input Validation Utility
 * Provides comprehensive input validation for all user inputs
 */

const validator = require('validator');

class InputValidator {
    /**
     * Validate username
     */
    static validateUsername(username) {
        if (!username || typeof username !== 'string') {
            return { valid: false, error: 'Username is required' };
        }

        if (username.length < 3 || username.length > 32) {
            return { valid: false, error: 'Username must be between 3 and 32 characters' };
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
        }

        return { valid: true };
    }

    /**
     * Validate amount (for economy)
     */
    static validateAmount(amount, min = 1, max = 1000000) {
        const num = parseInt(amount);

        if (isNaN(num)) {
            return { valid: false, error: 'Amount must be a number' };
        }

        if (num < min) {
            return { valid: false, error: `Amount must be at least ${min}` };
        }

        if (num > max) {
            return { valid: false, error: `Amount cannot exceed ${max}` };
        }

        return { valid: true, value: num };
    }

    /**
     * Validate Discord ID
     */
    static validateDiscordId(id) {
        if (!id || typeof id !== 'string') {
            return { valid: false, error: 'Invalid Discord ID' };
        }

        if (!/^\d{17,19}$/.test(id)) {
            return { valid: false, error: 'Discord ID must be 17-19 digits' };
        }

        return { valid: true };
    }

    /**
     * Validate URL
     */
    static validateUrl(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, error: 'URL is required' };
        }

        if (!validator.isURL(url, { protocols: ['http', 'https'], require_protocol: true })) {
            return { valid: false, error: 'Invalid URL format' };
        }

        return { valid: true };
    }

    /**
     * Validate hex color
     */
    static validateColor(color) {
        if (!color || typeof color !== 'string') {
            return { valid: false, error: 'Color is required' };
        }

        if (!/^#[0-9A-F]{6}$/i.test(color)) {
            return { valid: false, error: 'Color must be in hex format (#RRGGBB)' };
        }

        return { valid: true };
    }

    /**
     * Sanitize string input
     */
    static sanitizeString(input, maxLength = 2000) {
        if (!input || typeof input !== 'string') {
            return '';
        }

        // Remove potential XSS
        let sanitized = validator.escape(input);
        
        // Trim whitespace
        sanitized = sanitized.trim();
        
        // Limit length
        if (sanitized.length > maxLength) {
            sanitized = sanitized.substring(0, maxLength);
        }

        return sanitized;
    }

    /**
     * Validate message content
     */
    static validateMessage(content, minLength = 1, maxLength = 2000) {
        if (!content || typeof content !== 'string') {
            return { valid: false, error: 'Message content is required' };
        }

        const trimmed = content.trim();

        if (trimmed.length < minLength) {
            return { valid: false, error: `Message must be at least ${minLength} characters` };
        }

        if (trimmed.length > maxLength) {
            return { valid: false, error: `Message cannot exceed ${maxLength} characters` };
        }

        // Check for spam patterns
        if (/(.)\1{10,}/.test(trimmed)) {
            return { valid: false, error: 'Message contains spam patterns' };
        }

        return { valid: true, value: this.sanitizeString(trimmed, maxLength) };
    }

    /**
     * Validate duration (in seconds)
     */
    static validateDuration(duration, min = 60, max = 2592000) {
        const seconds = parseInt(duration);

        if (isNaN(seconds)) {
            return { valid: false, error: 'Duration must be a number' };
        }

        if (seconds < min) {
            return { valid: false, error: `Duration must be at least ${min} seconds` };
        }

        if (seconds > max) {
            return { valid: false, error: `Duration cannot exceed ${max} seconds (30 days)` };
        }

        return { valid: true, value: seconds };
    }

    /**
     * Validate role mention
     */
    static validateRoleMention(mention) {
        if (!mention || typeof mention !== 'string') {
            return { valid: false, error: 'Role mention is required' };
        }

        if (!/^<@&\d{17,19}>$/.test(mention)) {
            return { valid: false, error: 'Invalid role mention format' };
        }

        return { valid: true };
    }

    /**
     * Validate channel mention
     */
    static validateChannelMention(mention) {
        if (!mention || typeof mention !== 'string') {
            return { valid: false, error: 'Channel mention is required' };
        }

        if (!/^<#\d{17,19}>$/.test(mention)) {
            return { valid: false, error: 'Invalid channel mention format' };
        }

        return { valid: true };
    }

    /**
     * Validate permission string
     */
    static validatePermission(permission) {
        const validPermissions = [
            'Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels',
            'KickMembers', 'BanMembers', 'ManageMessages', 'MentionEveryone',
            'ViewAuditLog', 'ManageWebhooks', 'ManageEmojisAndStickers'
        ];

        if (!validPermissions.includes(permission)) {
            return { valid: false, error: 'Invalid permission' };
        }

        return { valid: true };
    }

    /**
     * Validate JSON string
     */
    static validateJSON(jsonString) {
        try {
            JSON.parse(jsonString);
            return { valid: true };
        } catch (error) {
            return { valid: false, error: 'Invalid JSON format' };
        }
    }

    /**
     * Validate array of items
     */
    static validateArray(array, minLength = 0, maxLength = 100) {
        if (!Array.isArray(array)) {
            return { valid: false, error: 'Input must be an array' };
        }

        if (array.length < minLength) {
            return { valid: false, error: `Array must contain at least ${minLength} items` };
        }

        if (array.length > maxLength) {
            return { valid: false, error: `Array cannot contain more than ${maxLength} items` };
        }

        return { valid: true };
    }

    /**
     * Validate pagination parameters
     */
    static validatePagination(page, limit) {
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        if (isNaN(pageNum) || pageNum < 1) {
            return { valid: false, error: 'Page must be a positive number' };
        }

        if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
            return { valid: false, error: 'Limit must be between 1 and 100' };
        }

        return { valid: true, page: pageNum, limit: limitNum };
    }
}

module.exports = InputValidator;

// Made with Bob
