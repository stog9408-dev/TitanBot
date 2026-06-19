/**
 * 📊 Advanced Analytics & Monitoring Dashboard
 * Real-time statistics, insights, and performance monitoring
 */

import { logger } from '../utils/logger.js';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export class AnalyticsService {
  constructor(client) {
    this.client = client;
    
    // Real-time metrics
    this.metrics = {
      commands: {
        total: 0,
        byCommand: new Map(),
        byUser: new Map(),
        byGuild: new Map(),
        errors: 0,
        averageResponseTime: 0
      },
      messages: {
        total: 0,
        byGuild: new Map(),
        byChannel: new Map(),
        byUser: new Map()
      },
      users: {
        active: new Set(),
        new: 0,
        left: 0,
        banned: 0
      },
      guilds: {
        total: 0,
        new: 0,
        left: 0
      },
      voice: {
        activeChannels: new Map(),
        totalMinutes: 0,
        peakConcurrent: 0
      },
      economy: {
        totalTransactions: 0,
        totalCoins: 0,
        topEarners: new Map()
      },
      moderation: {
        warnings: 0,
        kicks: 0,
        bans: 0,
        timeouts: 0
      },
      performance: {
        uptime: 0,
        memoryUsage: 0,
        cpuUsage: 0,
        latency: 0,
        eventLoopLag: 0
      }
    };

    // Historical data (last 24 hours)
    this.history = {
      commands: [],
      messages: [],
      users: [],
      performance: []
    };

    // Insights and trends
    this.insights = {
      peakHours: new Map(),
      popularCommands: [],
      activeUsers: [],
      growthRate: 0,
      engagementScore: 0
    };

    // Start monitoring
    this.startMonitoring();
    
    logger.info('📊 Analytics Service initialized');
  }

  /**
   * Start real-time monitoring
   */
  startMonitoring() {
    // Update performance metrics every 30 seconds
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000);

    // Generate insights every 5 minutes
    setInterval(() => {
      this.generateInsights();
    }, 300000);

    // Clean old history every hour
    setInterval(() => {
      this.cleanHistory();
    }, 3600000);
  }

  /**
   * Track command execution
   */
  trackCommand(commandName, userId, guildId, responseTime, success = true) {
    this.metrics.commands.total++;
    
    // By command
    const cmdCount = this.metrics.commands.byCommand.get(commandName) || 0;
    this.metrics.commands.byCommand.set(commandName, cmdCount + 1);

    // By user
    const userCount = this.metrics.commands.byUser.get(userId) || 0;
    this.metrics.commands.byUser.set(userId, userCount + 1);

    // By guild
    if (guildId) {
      const guildCount = this.metrics.commands.byGuild.get(guildId) || 0;
      this.metrics.commands.byGuild.set(guildId, guildCount + 1);
    }

    // Response time
    const currentAvg = this.metrics.commands.averageResponseTime;
    const total = this.metrics.commands.total;
    this.metrics.commands.averageResponseTime = 
      (currentAvg * (total - 1) + responseTime) / total;

    // Errors
    if (!success) {
      this.metrics.commands.errors++;
    }

    // Add to history
    this.history.commands.push({
      command: commandName,
      userId,
      guildId,
      responseTime,
      success,
      timestamp: Date.now()
    });

    // Track active user
    this.metrics.users.active.add(userId);
  }

  /**
   * Track message
   */
  trackMessage(message) {
    this.metrics.messages.total++;

    const guildId = message.guild?.id;
    const channelId = message.channel.id;
    const userId = message.author.id;

    // By guild
    if (guildId) {
      const guildCount = this.metrics.messages.byGuild.get(guildId) || 0;
      this.metrics.messages.byGuild.set(guildId, guildCount + 1);
    }

    // By channel
    const channelCount = this.metrics.messages.byChannel.get(channelId) || 0;
    this.metrics.messages.byChannel.set(channelId, channelCount + 1);

    // By user
    const userCount = this.metrics.messages.byUser.get(userId) || 0;
    this.metrics.messages.byUser.set(userId, userCount + 1);

    // Add to history
    this.history.messages.push({
      guildId,
      channelId,
      userId,
      length: message.content.length,
      timestamp: Date.now()
    });

    // Track active user
    this.metrics.users.active.add(userId);
  }

  /**
   * Track user join
   */
  trackUserJoin(member) {
    this.metrics.users.new++;
    
    this.history.users.push({
      type: 'join',
      userId: member.id,
      guildId: member.guild.id,
      timestamp: Date.now()
    });
  }

  /**
   * Track user leave
   */
  trackUserLeave(member) {
    this.metrics.users.left++;
    
    this.history.users.push({
      type: 'leave',
      userId: member.id,
      guildId: member.guild.id,
      timestamp: Date.now()
    });
  }

  /**
   * Track moderation action
   */
  trackModeration(type, userId, guildId, moderatorId) {
    switch (type) {
      case 'warn':
        this.metrics.moderation.warnings++;
        break;
      case 'kick':
        this.metrics.moderation.kicks++;
        break;
      case 'ban':
        this.metrics.moderation.bans++;
        this.metrics.users.banned++;
        break;
      case 'timeout':
        this.metrics.moderation.timeouts++;
        break;
    }
  }

  /**
   * Track economy transaction
   */
  trackEconomyTransaction(userId, amount, type) {
    this.metrics.economy.totalTransactions++;
    this.metrics.economy.totalCoins += amount;

    const userTotal = this.metrics.economy.topEarners.get(userId) || 0;
    this.metrics.economy.topEarners.set(userId, userTotal + amount);
  }

  /**
   * Track voice activity
   */
  trackVoiceActivity(channelId, duration) {
    const current = this.metrics.voice.activeChannels.get(channelId) || 0;
    this.metrics.voice.activeChannels.set(channelId, current + duration);
    this.metrics.voice.totalMinutes += duration / 60000;

    const concurrent = this.metrics.voice.activeChannels.size;
    if (concurrent > this.metrics.voice.peakConcurrent) {
      this.metrics.voice.peakConcurrent = concurrent;
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    const memUsage = process.memoryUsage();
    
    this.metrics.performance.uptime = process.uptime();
    this.metrics.performance.memoryUsage = memUsage.heapUsed / 1024 / 1024; // MB
    this.metrics.performance.latency = this.client.ws.ping;

    // Add to history
    this.history.performance.push({
      uptime: this.metrics.performance.uptime,
      memory: this.metrics.performance.memoryUsage,
      latency: this.metrics.performance.latency,
      timestamp: Date.now()
    });
  }

  /**
   * Generate insights from data
   */
  generateInsights() {
    // Peak hours analysis
    const hourCounts = new Map();
    for (const cmd of this.history.commands) {
      const hour = new Date(cmd.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    }
    this.insights.peakHours = new Map([...hourCounts.entries()].sort((a, b) => b[1] - a[1]));

    // Popular commands
    this.insights.popularCommands = [...this.metrics.commands.byCommand.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Active users
    this.insights.activeUsers = [...this.metrics.commands.byUser.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // Growth rate (users joined vs left)
    const joined = this.metrics.users.new;
    const left = this.metrics.users.left;
    this.insights.growthRate = joined - left;

    // Engagement score (commands + messages per active user)
    const activeUserCount = this.metrics.users.active.size || 1;
    this.insights.engagementScore = 
      (this.metrics.commands.total + this.metrics.messages.total) / activeUserCount;

    logger.debug('Analytics insights generated');
  }

  /**
   * Clean old history data
   */
  cleanHistory() {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    this.history.commands = this.history.commands.filter(c => now - c.timestamp < maxAge);
    this.history.messages = this.history.messages.filter(m => now - m.timestamp < maxAge);
    this.history.users = this.history.users.filter(u => now - u.timestamp < maxAge);
    this.history.performance = this.history.performance.filter(p => now - p.timestamp < maxAge);

    logger.debug('Analytics history cleaned');
  }

  /**
   * Get dashboard data
   */
  getDashboard() {
    return {
      overview: {
        totalCommands: this.metrics.commands.total,
        totalMessages: this.metrics.messages.total,
        activeUsers: this.metrics.users.active.size,
        totalGuilds: this.client.guilds.cache.size,
        uptime: this.metrics.performance.uptime,
        latency: this.metrics.performance.latency
      },
      commands: {
        total: this.metrics.commands.total,
        errors: this.metrics.commands.errors,
        successRate: ((this.metrics.commands.total - this.metrics.commands.errors) / 
          (this.metrics.commands.total || 1) * 100).toFixed(2),
        averageResponseTime: Math.round(this.metrics.commands.averageResponseTime),
        popular: this.insights.popularCommands.slice(0, 5)
      },
      users: {
        active: this.metrics.users.active.size,
        new: this.metrics.users.new,
        left: this.metrics.users.left,
        growthRate: this.insights.growthRate,
        topActive: this.insights.activeUsers.slice(0, 5)
      },
      moderation: {
        warnings: this.metrics.moderation.warnings,
        kicks: this.metrics.moderation.kicks,
        bans: this.metrics.moderation.bans,
        timeouts: this.metrics.moderation.timeouts,
        total: this.metrics.moderation.warnings + this.metrics.moderation.kicks + 
               this.metrics.moderation.bans + this.metrics.moderation.timeouts
      },
      economy: {
        transactions: this.metrics.economy.totalTransactions,
        totalCoins: this.metrics.economy.totalCoins,
        topEarners: [...this.metrics.economy.topEarners.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
      },
      performance: {
        uptime: this.formatUptime(this.metrics.performance.uptime),
        memory: `${this.metrics.performance.memoryUsage.toFixed(2)} MB`,
        latency: `${this.metrics.performance.latency}ms`,
        cpuUsage: `${this.metrics.performance.cpuUsage.toFixed(2)}%`
      },
      insights: {
        peakHours: [...this.insights.peakHours.entries()].slice(0, 3),
        engagementScore: this.insights.engagementScore.toFixed(2),
        growthRate: this.insights.growthRate
      }
    };
  }

  /**
   * Format uptime
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      commands: this.metrics.commands.total,
      messages: this.metrics.messages.total,
      activeUsers: this.metrics.users.active.size,
      guilds: this.client.guilds.cache.size,
      uptime: this.formatUptime(this.metrics.performance.uptime),
      memoryUsage: `${this.metrics.performance.memoryUsage.toFixed(2)} MB`,
      latency: `${this.metrics.performance.latency}ms`
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics.users.active.clear();
    this.metrics.commands.byCommand.clear();
    this.metrics.commands.byUser.clear();
    this.metrics.commands.byGuild.clear();
    this.metrics.messages.byGuild.clear();
    this.metrics.messages.byChannel.clear();
    this.metrics.messages.byUser.clear();
    
    logger.info('Analytics metrics reset');
  }
}

export default AnalyticsService;

// Made with Bob
