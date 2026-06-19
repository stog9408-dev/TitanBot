/**
 * 🛡️ Advanced Raid Protection System
 * Protects servers from raids, spam, and malicious attacks
 */

import { logger } from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

export class RaidProtectionService {
  constructor(client) {
    this.client = client;
    
    // Raid detection thresholds
    this.thresholds = {
      joinRate: {
        count: 10, // members
        window: 10000 // 10 seconds
      },
      messageSpam: {
        count: 10, // messages
        window: 5000 // 5 seconds
      },
      mentionSpam: {
        count: 5, // mentions
        window: 5000 // 5 seconds
      },
      newAccountAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      suspiciousPatterns: {
        similarNames: 0.8, // 80% similarity threshold
        rapidActions: 3000 // 3 seconds between actions
      }
    };

    // Tracking maps
    this.joinTracking = new Map();
    this.messageTracking = new Map();
    this.mentionTracking = new Map();
    this.suspiciousUsers = new Map();
    this.raidSessions = new Map();

    // Protection actions
    this.protectionLevels = {
      none: 0,
      low: 1,
      medium: 2,
      high: 3,
      lockdown: 4
    };

    // Guild protection states
    this.guildProtection = new Map();

    // Statistics
    this.stats = {
      raidsDetected: 0,
      raidsPrevented: 0,
      usersBlocked: 0,
      messagesDeleted: 0,
      actionsAutomated: 0
    };

    logger.info('🛡️ Raid Protection Service initialized');
  }

  /**
   * Monitor member joins for raid patterns
   */
  async monitorJoin(member) {
    const guildId = member.guild.id;
    const now = Date.now();

    // Initialize tracking for guild
    if (!this.joinTracking.has(guildId)) {
      this.joinTracking.set(guildId, []);
    }

    const joins = this.joinTracking.get(guildId);
    joins.push({ userId: member.id, timestamp: now, member });

    // Clean old entries
    const recentJoins = joins.filter(j => now - j.timestamp < this.thresholds.joinRate.window);
    this.joinTracking.set(guildId, recentJoins);

    // Check for raid
    if (recentJoins.length >= this.thresholds.joinRate.count) {
      await this.handleRaidDetection(member.guild, 'join_flood', recentJoins);
    }

    // Check account age
    const accountAge = now - member.user.createdTimestamp;
    if (accountAge < this.thresholds.newAccountAge) {
      await this.flagSuspiciousUser(member, 'new_account', accountAge);
    }

    // Check for similar names
    await this.checkSimilarNames(member, recentJoins);
  }

  /**
   * Monitor messages for spam patterns
   */
  async monitorMessage(message) {
    if (message.author.bot) return;

    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = Date.now();

    // Track messages
    const key = `${guildId}-${userId}`;
    if (!this.messageTracking.has(key)) {
      this.messageTracking.set(key, []);
    }

    const messages = this.messageTracking.get(key);
    messages.push({ content: message.content, timestamp: now, message });

    // Clean old entries
    const recentMessages = messages.filter(m => now - m.timestamp < this.thresholds.messageSpam.window);
    this.messageTracking.set(key, recentMessages);

    // Check for spam
    if (recentMessages.length >= this.thresholds.messageSpam.count) {
      await this.handleSpamDetection(message, 'message_spam', recentMessages);
    }

    // Check for mention spam
    const mentions = message.mentions.users.size + message.mentions.roles.size;
    if (mentions > 0) {
      await this.monitorMentions(message, mentions);
    }

    // Check for duplicate content
    const duplicates = recentMessages.filter(m => m.content === message.content);
    if (duplicates.length >= 3) {
      await this.handleSpamDetection(message, 'duplicate_spam', duplicates);
    }
  }

  /**
   * Monitor mentions for spam
   */
  async monitorMentions(message, mentionCount) {
    const userId = message.author.id;
    const guildId = message.guild.id;
    const now = Date.now();

    const key = `${guildId}-${userId}`;
    if (!this.mentionTracking.has(key)) {
      this.mentionTracking.set(key, []);
    }

    const mentions = this.mentionTracking.get(key);
    mentions.push({ count: mentionCount, timestamp: now, message });

    // Clean old entries
    const recentMentions = mentions.filter(m => now - m.timestamp < this.thresholds.mentionSpam.window);
    this.mentionTracking.set(key, recentMentions);

    const totalMentions = recentMentions.reduce((sum, m) => sum + m.count, 0);

    if (totalMentions >= this.thresholds.mentionSpam.count) {
      await this.handleSpamDetection(message, 'mention_spam', recentMentions);
    }
  }

  /**
   * Check for similar usernames (raid pattern)
   */
  async checkSimilarNames(member, recentJoins) {
    const newName = member.user.username.toLowerCase();
    
    for (const join of recentJoins) {
      if (join.userId === member.id) continue;
      
      const existingName = join.member.user.username.toLowerCase();
      const similarity = this.calculateSimilarity(newName, existingName);

      if (similarity >= this.thresholds.suspiciousPatterns.similarNames) {
        await this.flagSuspiciousUser(member, 'similar_name', {
          similarity,
          comparedTo: join.member.user.tag
        });
      }
    }
  }

  /**
   * Calculate string similarity (Levenshtein distance)
   */
  calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Handle raid detection
   */
  async handleRaidDetection(guild, type, data) {
    this.stats.raidsDetected++;

    const protectionLevel = this.getProtectionLevel(guild.id);
    
    logger.warn(`🚨 Raid detected in ${guild.name}: ${type}`);

    // Create raid session
    const raidId = `${guild.id}-${Date.now()}`;
    this.raidSessions.set(raidId, {
      guildId: guild.id,
      type,
      startTime: Date.now(),
      affectedUsers: data.map(d => d.userId),
      actions: []
    });

    // Auto-escalate protection
    if (protectionLevel < this.protectionLevels.high) {
      await this.setProtectionLevel(guild.id, this.protectionLevels.high);
    }

    // Take action based on protection level
    switch (protectionLevel) {
      case this.protectionLevels.high:
      case this.protectionLevels.lockdown:
        await this.executeRaidProtection(guild, data);
        break;
      case this.protectionLevels.medium:
        await this.notifyModerators(guild, type, data);
        break;
    }

    this.stats.raidsPrevented++;
  }

  /**
   * Execute raid protection measures
   */
  async executeRaidProtection(guild, data) {
    for (const entry of data) {
      try {
        const member = entry.member;
        
        // Kick suspicious members
        await member.kick('Raid protection: Suspicious join pattern');
        this.stats.usersBlocked++;
        this.stats.actionsAutomated++;

        logger.info(`Kicked ${member.user.tag} from ${guild.name} (raid protection)`);
      } catch (error) {
        logger.error('Error executing raid protection:', error);
      }
    }
  }

  /**
   * Handle spam detection
   */
  async handleSpamDetection(message, type, data) {
    const protectionLevel = this.getProtectionLevel(message.guild.id);

    logger.warn(`🚨 Spam detected: ${type} by ${message.author.tag}`);

    // Delete spam messages
    for (const entry of data) {
      try {
        await entry.message.delete();
        this.stats.messagesDeleted++;
      } catch (error) {
        logger.error('Error deleting spam message:', error);
      }
    }

    // Take action based on protection level
    if (protectionLevel >= this.protectionLevels.medium) {
      try {
        await message.member.timeout(5 * 60 * 1000, `Spam detected: ${type}`);
        this.stats.actionsAutomated++;
        logger.info(`Timed out ${message.author.tag} for spam`);
      } catch (error) {
        logger.error('Error timing out user:', error);
      }
    }
  }

  /**
   * Flag suspicious user
   */
  async flagSuspiciousUser(member, reason, data) {
    const key = `${member.guild.id}-${member.id}`;
    
    if (!this.suspiciousUsers.has(key)) {
      this.suspiciousUsers.set(key, {
        member,
        flags: [],
        firstFlagged: Date.now()
      });
    }

    const userRecord = this.suspiciousUsers.get(key);
    userRecord.flags.push({ reason, data, timestamp: Date.now() });

    // Auto-action if multiple flags
    if (userRecord.flags.length >= 3) {
      const protectionLevel = this.getProtectionLevel(member.guild.id);
      
      if (protectionLevel >= this.protectionLevels.high) {
        try {
          await member.kick('Multiple suspicious activity flags');
          this.stats.usersBlocked++;
          this.stats.actionsAutomated++;
          logger.info(`Kicked ${member.user.tag} (multiple suspicious flags)`);
        } catch (error) {
          logger.error('Error kicking suspicious user:', error);
        }
      }
    }
  }

  /**
   * Notify moderators
   */
  async notifyModerators(guild, type, data) {
    // Find mod log channel
    const modLogChannel = guild.channels.cache.find(
      c => c.name.includes('mod-log') || c.name.includes('audit')
    );

    if (!modLogChannel) return;

    const embed = new EmbedBuilder()
      .setTitle('🚨 Raid Alert')
      .setDescription(`Potential raid detected: **${type}**`)
      .setColor(0xF04747)
      .addFields(
        { name: 'Affected Users', value: data.length.toString(), inline: true },
        { name: 'Time', value: new Date().toLocaleString(), inline: true }
      )
      .setTimestamp();

    try {
      await modLogChannel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Error sending raid alert:', error);
    }
  }

  /**
   * Get protection level for guild
   */
  getProtectionLevel(guildId) {
    return this.guildProtection.get(guildId) || this.protectionLevels.medium;
  }

  /**
   * Set protection level for guild
   */
  async setProtectionLevel(guildId, level) {
    this.guildProtection.set(guildId, level);
    logger.info(`Protection level for guild ${guildId} set to ${level}`);
  }

  /**
   * Get service statistics
   */
  getStats() {
    return {
      ...this.stats,
      activeRaidSessions: this.raidSessions.size,
      suspiciousUsers: this.suspiciousUsers.size,
      trackedGuilds: this.guildProtection.size
    };
  }

  /**
   * Clear tracking data (cleanup)
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour

    // Clean join tracking
    for (const [guildId, joins] of this.joinTracking.entries()) {
      const recent = joins.filter(j => now - j.timestamp < maxAge);
      if (recent.length === 0) {
        this.joinTracking.delete(guildId);
      } else {
        this.joinTracking.set(guildId, recent);
      }
    }

    // Clean message tracking
    for (const [key, messages] of this.messageTracking.entries()) {
      const recent = messages.filter(m => now - m.timestamp < maxAge);
      if (recent.length === 0) {
        this.messageTracking.delete(key);
      } else {
        this.messageTracking.set(key, recent);
      }
    }

    // Clean suspicious users
    for (const [key, record] of this.suspiciousUsers.entries()) {
      if (now - record.firstFlagged > maxAge) {
        this.suspiciousUsers.delete(key);
      }
    }

    logger.debug('Raid protection cleanup completed');
  }
}

export default RaidProtectionService;

// Made with Bob
