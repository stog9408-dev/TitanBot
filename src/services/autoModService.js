/**
 * 🛡️ Auto-Moderation Service
 * Comprehensive auto-moderation system for spam, ads, and rule violations
 */

import { logger } from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

class AutoModService {
    constructor(client) {
        this.client = client;
        this.userViolations = new Map(); // userId -> violations array
        this.messageCache = new Map(); // userId -> recent messages
        this.linkCache = new Map(); // userId -> recent links
        
        // Spam detection settings
        this.spamThresholds = {
            messageCount: 5,        // Max messages
            timeWindow: 5000,       // In 5 seconds
            duplicateCount: 3,      // Max duplicate messages
            mentionCount: 5,        // Max mentions per message
            emojiCount: 10,         // Max emojis per message
            capsPercentage: 70,     // Max % of caps
            linkCount: 3            // Max links in timeWindow
        };

        // Patterns for detection
        this.patterns = {
            inviteLinks: /discord(?:\.gg|app\.com\/invite|\.com\/invite)\/[a-zA-Z0-9]+/gi,
            suspiciousLinks: /(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.(?:com|net|org|xyz|tk|ml|ga|cf|gq|top|click|link|site|online|store|shop|fun|space|live|pro|info|biz|me|co|io|gg|tv|cc|us|uk|de|fr|ru|cn|jp|br|in|au|ca|eu|asia))/gi,
            phoneNumbers: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
            emails: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
            excessiveEmojis: /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu,
            zalgo: /[\u0300-\u036F\u0489]/g,
            massMention: /<@!?\d+>/g,
            ipAddress: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
        };

        // Blacklisted words/phrases (can be configured per guild)
        this.defaultBlacklist = [
            'nigger', 'nigga', 'faggot', 'retard', 'kys', 'kill yourself',
            'nazi', 'hitler', 'rape', 'porn', 'xxx', 'sex', 'dick', 'pussy',
            'fuck', 'shit', 'bitch', 'ass', 'damn', 'cunt', 'whore', 'slut'
        ];

        // Suspicious domains
        this.suspiciousDomains = [
            'bit.ly', 'tinyurl.com', 'goo.gl', 'ow.ly', 't.co',
            'grabify.link', 'iplogger.org', 'blasze.tk', 'yip.su',
            'free-nitro.com', 'discord-nitro.com', 'steamcommunity.ru'
        ];
    }

    /**
     * Check message for violations
     */
    async checkMessage(message) {
        if (!message.guild || message.author.bot) return null;

        const config = await this.getGuildConfig(message.guild.id);
        if (!config.enabled) return null;

        // Check if user is whitelisted
        if (this.isWhitelisted(message.member, config)) return null;

        const violations = [];

        // Run all checks
        if (config.antiSpam) {
            const spamViolation = this.checkSpam(message);
            if (spamViolation) violations.push(spamViolation);
        }

        if (config.antiInvite) {
            const inviteViolation = this.checkInviteLinks(message);
            if (inviteViolation) violations.push(inviteViolation);
        }

        if (config.antiLink) {
            const linkViolation = this.checkSuspiciousLinks(message);
            if (linkViolation) violations.push(linkViolation);
        }

        if (config.antiMassMention) {
            const mentionViolation = this.checkMassMentions(message);
            if (mentionViolation) violations.push(mentionViolation);
        }

        if (config.antiCaps) {
            const capsViolation = this.checkExcessiveCaps(message);
            if (capsViolation) violations.push(capsViolation);
        }

        if (config.antiEmoji) {
            const emojiViolation = this.checkExcessiveEmojis(message);
            if (emojiViolation) violations.push(emojiViolation);
        }

        if (config.antiZalgo) {
            const zalgoViolation = this.checkZalgo(message);
            if (zalgoViolation) violations.push(zalgoViolation);
        }

        if (config.wordFilter) {
            const wordViolation = this.checkBlacklistedWords(message, config);
            if (wordViolation) violations.push(wordViolation);
        }

        if (config.antiPhoneNumber) {
            const phoneViolation = this.checkPhoneNumbers(message);
            if (phoneViolation) violations.push(phoneViolation);
        }

        if (violations.length > 0) {
            return {
                violations,
                action: this.determineAction(message.author.id, violations, config)
            };
        }

        return null;
    }

    /**
     * Check for spam patterns
     */
    checkSpam(message) {
        const userId = message.author.id;
        const now = Date.now();

        // Initialize cache
        if (!this.messageCache.has(userId)) {
            this.messageCache.set(userId, []);
        }

        const userMessages = this.messageCache.get(userId);
        
        // Add current message
        userMessages.push({
            content: message.content,
            timestamp: now,
            channelId: message.channel.id
        });

        // Clean old messages
        const recentMessages = userMessages.filter(
            msg => now - msg.timestamp < this.spamThresholds.timeWindow
        );
        this.messageCache.set(userId, recentMessages);

        // Check message count
        if (recentMessages.length > this.spamThresholds.messageCount) {
            return {
                type: 'spam',
                severity: 'high',
                reason: `Sent ${recentMessages.length} messages in ${this.spamThresholds.timeWindow / 1000} seconds`,
                evidence: recentMessages.map(m => m.content).join(' | ')
            };
        }

        // Check duplicate messages
        const duplicates = recentMessages.filter(
            msg => msg.content === message.content
        );
        if (duplicates.length >= this.spamThresholds.duplicateCount) {
            return {
                type: 'spam_duplicate',
                severity: 'medium',
                reason: `Repeated same message ${duplicates.length} times`,
                evidence: message.content
            };
        }

        return null;
    }

    /**
     * Check for Discord invite links
     */
    checkInviteLinks(message) {
        const matches = message.content.match(this.patterns.inviteLinks);
        if (matches && matches.length > 0) {
            return {
                type: 'invite_link',
                severity: 'high',
                reason: 'Posted Discord invite link',
                evidence: matches.join(', ')
            };
        }
        return null;
    }

    /**
     * Check for suspicious links
     */
    checkSuspiciousLinks(message) {
        const matches = message.content.match(this.patterns.suspiciousLinks);
        if (!matches) return null;

        const userId = message.author.id;
        const now = Date.now();

        if (!this.linkCache.has(userId)) {
            this.linkCache.set(userId, []);
        }

        const userLinks = this.linkCache.get(userId);
        userLinks.push({ timestamp: now, links: matches });

        // Clean old links
        const recentLinks = userLinks.filter(
            entry => now - entry.timestamp < this.spamThresholds.timeWindow
        );
        this.linkCache.set(userId, recentLinks);

        const totalLinks = recentLinks.reduce((sum, entry) => sum + entry.links.length, 0);

        // Check for suspicious domains
        const suspiciousFound = matches.some(link => 
            this.suspiciousDomains.some(domain => link.includes(domain))
        );

        if (suspiciousFound) {
            return {
                type: 'suspicious_link',
                severity: 'critical',
                reason: 'Posted link from suspicious domain',
                evidence: matches.join(', ')
            };
        }

        // Check link spam
        if (totalLinks > this.spamThresholds.linkCount) {
            return {
                type: 'link_spam',
                severity: 'high',
                reason: `Posted ${totalLinks} links in short time`,
                evidence: matches.join(', ')
            };
        }

        return null;
    }

    /**
     * Check for mass mentions
     */
    checkMassMentions(message) {
        const mentions = message.content.match(this.patterns.massMention);
        if (mentions && mentions.length > this.spamThresholds.mentionCount) {
            return {
                type: 'mass_mention',
                severity: 'high',
                reason: `Mentioned ${mentions.length} users`,
                evidence: `${mentions.length} mentions`
            };
        }
        return null;
    }

    /**
     * Check for excessive caps
     */
    checkExcessiveCaps(message) {
        const content = message.content.replace(/[^a-zA-Z]/g, '');
        if (content.length < 10) return null;

        const capsCount = (content.match(/[A-Z]/g) || []).length;
        const capsPercentage = (capsCount / content.length) * 100;

        if (capsPercentage > this.spamThresholds.capsPercentage) {
            return {
                type: 'excessive_caps',
                severity: 'low',
                reason: `${Math.round(capsPercentage)}% caps`,
                evidence: message.content.substring(0, 100)
            };
        }
        return null;
    }

    /**
     * Check for excessive emojis
     */
    checkExcessiveEmojis(message) {
        const emojis = message.content.match(this.patterns.excessiveEmojis);
        if (emojis && emojis.length > this.spamThresholds.emojiCount) {
            return {
                type: 'excessive_emoji',
                severity: 'low',
                reason: `Used ${emojis.length} emojis`,
                evidence: `${emojis.length} emojis`
            };
        }
        return null;
    }

    /**
     * Check for zalgo text
     */
    checkZalgo(message) {
        const zalgoChars = message.content.match(this.patterns.zalgo);
        if (zalgoChars && zalgoChars.length > 10) {
            return {
                type: 'zalgo_text',
                severity: 'medium',
                reason: 'Used zalgo/corrupted text',
                evidence: 'Zalgo text detected'
            };
        }
        return null;
    }

    /**
     * Check for blacklisted words
     */
    checkBlacklistedWords(message, config) {
        const content = message.content.toLowerCase();
        const blacklist = config.customBlacklist || this.defaultBlacklist;

        for (const word of blacklist) {
            if (content.includes(word.toLowerCase())) {
                return {
                    type: 'blacklisted_word',
                    severity: 'high',
                    reason: 'Used blacklisted word',
                    evidence: '[REDACTED]'
                };
            }
        }
        return null;
    }

    /**
     * Check for phone numbers
     */
    checkPhoneNumbers(message) {
        const matches = message.content.match(this.patterns.phoneNumbers);
        if (matches && matches.length > 0) {
            return {
                type: 'phone_number',
                severity: 'medium',
                reason: 'Posted phone number',
                evidence: '[REDACTED]'
            };
        }
        return null;
    }

    /**
     * Determine action based on violations
     */
    determineAction(userId, violations, config) {
        const highestSeverity = this.getHighestSeverity(violations);
        
        // Track violations
        if (!this.userViolations.has(userId)) {
            this.userViolations.set(userId, []);
        }
        
        const userViolations = this.userViolations.get(userId);
        userViolations.push({
            timestamp: Date.now(),
            violations,
            severity: highestSeverity
        });

        // Clean old violations (older than 1 hour)
        const recentViolations = userViolations.filter(
            v => Date.now() - v.timestamp < 3600000
        );
        this.userViolations.set(userId, recentViolations);

        // Determine action based on severity and count
        const violationCount = recentViolations.length;

        if (highestSeverity === 'critical' || violationCount >= 5) {
            return { type: 'ban', duration: null, reason: 'Multiple severe violations' };
        } else if (highestSeverity === 'high' || violationCount >= 3) {
            return { type: 'timeout', duration: 3600000, reason: 'Repeated violations' }; // 1 hour
        } else if (violationCount >= 2) {
            return { type: 'timeout', duration: 300000, reason: 'Multiple violations' }; // 5 minutes
        } else {
            return { type: 'delete', reason: 'Rule violation' };
        }
    }

    /**
     * Get highest severity from violations
     */
    getHighestSeverity(violations) {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        let highest = 'low';
        
        for (const violation of violations) {
            if (severityOrder[violation.severity] > severityOrder[highest]) {
                highest = violation.severity;
            }
        }
        
        return highest;
    }

    /**
     * Check if user is whitelisted
     */
    isWhitelisted(member, config) {
        if (!member) return false;
        
        // Check if user has admin/mod permissions
        if (member.permissions.has('Administrator') || member.permissions.has('ManageMessages')) {
            return true;
        }

        // Check whitelisted roles
        if (config.whitelistedRoles) {
            return member.roles.cache.some(role => 
                config.whitelistedRoles.includes(role.id)
            );
        }

        return false;
    }

    /**
     * Get guild configuration
     */
    async getGuildConfig(guildId) {
        if (!this.client.db) {
            return this.getDefaultConfig();
        }

        try {
            const config = await this.client.db.get(`automod_${guildId}`);
            return config || this.getDefaultConfig();
        } catch (error) {
            logger.error('Error getting automod config:', error);
            return this.getDefaultConfig();
        }
    }

    /**
     * Get default configuration
     */
    getDefaultConfig() {
        return {
            enabled: true,
            antiSpam: true,
            antiInvite: true,
            antiLink: true,
            antiMassMention: true,
            antiCaps: true,
            antiEmoji: true,
            antiZalgo: true,
            wordFilter: true,
            antiPhoneNumber: true,
            logChannel: null,
            whitelistedRoles: [],
            customBlacklist: null
        };
    }

    /**
     * Create log embed
     */
    createLogEmbed(message, result) {
        const embed = new EmbedBuilder()
            .setTitle('🛡️ Auto-Moderation Action')
            .setColor(this.getSeverityColor(result.violations))
            .setTimestamp()
            .addFields(
                { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                { name: 'Action', value: this.getActionText(result.action), inline: true }
            );

        // Add violations
        const violationText = result.violations
            .map(v => `**${v.type}** (${v.severity}): ${v.reason}`)
            .join('\n');
        embed.addFields({ name: 'Violations', value: violationText });

        // Add message content (truncated)
        const content = message.content.length > 500 
            ? message.content.substring(0, 500) + '...' 
            : message.content;
        embed.addFields({ name: 'Message', value: content || '[No content]' });

        return embed;
    }

    /**
     * Get severity color
     */
    getSeverityColor(violations) {
        const highest = this.getHighestSeverity(violations);
        const colors = {
            critical: 0x8B0000, // Dark red
            high: 0xFF0000,     // Red
            medium: 0xFFA500,   // Orange
            low: 0xFFFF00       // Yellow
        };
        return colors[highest] || 0xFFFF00;
    }

    /**
     * Get action text
     */
    getActionText(action) {
        switch (action.type) {
            case 'ban':
                return '🔨 **Banned**';
            case 'timeout':
                return `⏱️ **Timeout** (${Math.round(action.duration / 60000)} minutes)`;
            case 'delete':
                return '🗑️ **Message Deleted**';
            default:
                return '⚠️ **Warning**';
        }
    }
}

export default AutoModService;

// Made with Bob
