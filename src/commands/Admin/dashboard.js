/**
 * 📊 Advanced Admin Dashboard Command
 * Comprehensive server analytics and management interface
 */

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
  .setName('dashboard')
  .setDescription('📊 View advanced server analytics and management dashboard')
  .setDefaultMemberPermissions('0')
  .addSubcommand(subcommand =>
    subcommand
      .setName('overview')
      .setDescription('View overall bot statistics')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('commands')
      .setDescription('View command usage statistics')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('users')
      .setDescription('View user activity statistics')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('moderation')
      .setDescription('View moderation statistics')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('performance')
      .setDescription('View bot performance metrics')
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('security')
      .setDescription('View security and raid protection stats')
  ),

  async execute(interaction) {
  const analytics = interaction.client.analytics;
  const raidProtection = interaction.client.raidProtection;
  const aiService = interaction.client.ai;

  if (!analytics) {
    return interaction.reply({
      content: '❌ Analytics service is not available',
      ephemeral: true
    });
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'overview':
        await showOverview(interaction, analytics, aiService, raidProtection);
        break;
      case 'commands':
        await showCommands(interaction, analytics);
        break;
      case 'users':
        await showUsers(interaction, analytics);
        break;
      case 'moderation':
        await showModeration(interaction, analytics);
        break;
      case 'performance':
        await showPerformance(interaction, analytics);
        break;
      case 'security':
        await showSecurity(interaction, raidProtection);
        break;
      default:
        await interaction.reply({
          content: '❌ Unknown subcommand',
          ephemeral: true
        });
    }
  } catch (error) {
    logger.error('Dashboard command error:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: '❌ An error occurred while loading the dashboard'
      });
    } else {
      await interaction.reply({
        content: '❌ An error occurred while loading the dashboard',
        ephemeral: true
      });
    }
  }
}
};

async function showOverview(interaction, analytics, aiService, raidProtection) {
  const dashboard = analytics.getDashboard();
  const aiStats = aiService?.getStats();
  const securityStats = raidProtection?.getStats();

  const embed = new EmbedBuilder()
    .setTitle('📊 TitanBot Dashboard - Overview')
    .setColor(0x5865F2)
    .setDescription('> Comprehensive bot statistics and insights')
    .addFields(
      {
        name: '📈 General Statistics',
        value: [
          `**Commands Executed:** ${dashboard.overview.totalCommands.toLocaleString()}`,
          `**Messages Processed:** ${dashboard.overview.totalMessages.toLocaleString()}`,
          `**Active Users:** ${dashboard.overview.activeUsers.toLocaleString()}`,
          `**Servers:** ${dashboard.overview.totalGuilds.toLocaleString()}`
        ].join('\n'),
        inline: true
      },
      {
        name: '⚡ Performance',
        value: [
          `**Uptime:** ${dashboard.performance.uptime}`,
          `**Latency:** ${dashboard.performance.latency}`,
          `**Memory:** ${dashboard.performance.memory}`,
          `**Success Rate:** ${dashboard.commands.successRate}%`
        ].join('\n'),
        inline: true
      },
      {
        name: '👥 User Activity',
        value: [
          `**New Users:** +${dashboard.users.new}`,
          `**Left Users:** -${dashboard.users.left}`,
          `**Growth Rate:** ${dashboard.users.growthRate > 0 ? '+' : ''}${dashboard.users.growthRate}`,
          `**Engagement:** ${dashboard.insights.engagementScore}/user`
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ text: `TitanBot v2.0 • ${new Date().toLocaleString()}` })
    .setTimestamp();

  // Add AI stats if available
  if (aiStats) {
    embed.addFields({
      name: '🤖 AI Service',
      value: [
        `**Requests:** ${aiStats.totalRequests}`,
        `**Cache Hits:** ${aiStats.cacheHits} (${aiStats.totalRequests > 0 ? Math.round((aiStats.cacheHits / aiStats.totalRequests) * 100) : 0}%)`,
        `**Avg Response:** ${Math.round(aiStats.averageResponseTime)}ms`,
        `**Providers:** ${aiStats.providers.join(', ') || 'None'}`
      ].join('\n'),
      inline: true
    });
  }

  // Add security stats if available
  if (securityStats) {
    embed.addFields({
      name: '🛡️ Security',
      value: [
        `**Raids Detected:** ${securityStats.raidsDetected}`,
        `**Raids Prevented:** ${securityStats.raidsPrevented}`,
        `**Users Blocked:** ${securityStats.usersBlocked}`,
        `**Messages Deleted:** ${securityStats.messagesDeleted}`
      ].join('\n'),
      inline: true
    });
  }

  // Add top commands
  if (dashboard.commands.popular.length > 0) {
    embed.addFields({
      name: '🔥 Popular Commands',
      value: dashboard.commands.popular
        .map(([cmd, count], i) => `${i + 1}. \`/${cmd}\` - ${count} uses`)
        .join('\n'),
      inline: false
    });
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('dashboard_refresh')
        .setLabel('Refresh')
        .setEmoji('🔄')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('dashboard_commands')
        .setLabel('Commands')
        .setEmoji('⚡')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('dashboard_users')
        .setLabel('Users')
        .setEmoji('👥')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('dashboard_security')
        .setLabel('Security')
        .setEmoji('🛡️')
        .setStyle(ButtonStyle.Secondary)
    );

  await interaction.reply({ embeds: [embed], components: [row], ephemeral: true });
}

async function showCommands(interaction, analytics) {
  const dashboard = analytics.getDashboard();

  const embed = new EmbedBuilder()
    .setTitle('⚡ Command Statistics')
    .setColor(0x43B581)
    .setDescription('> Detailed command usage analytics')
    .addFields(
      {
        name: '📊 Overview',
        value: [
          `**Total Commands:** ${dashboard.commands.total.toLocaleString()}`,
          `**Errors:** ${dashboard.commands.errors}`,
          `**Success Rate:** ${dashboard.commands.successRate}%`,
          `**Avg Response Time:** ${dashboard.commands.averageResponseTime}ms`
        ].join('\n'),
        inline: false
      }
    );

  if (dashboard.commands.popular.length > 0) {
    embed.addFields({
      name: '🔥 Most Used Commands',
      value: dashboard.commands.popular
        .map(([cmd, count], i) => `**${i + 1}.** \`/${cmd}\` - ${count.toLocaleString()} uses`)
        .join('\n'),
      inline: false
    });
  }

  embed.setFooter({ text: `Last 24 hours • ${new Date().toLocaleString()}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showUsers(interaction, analytics) {
  const dashboard = analytics.getDashboard();

  const embed = new EmbedBuilder()
    .setTitle('👥 User Activity Statistics')
    .setColor(0x5865F2)
    .setDescription('> User engagement and activity metrics')
    .addFields(
      {
        name: '📈 User Metrics',
        value: [
          `**Active Users:** ${dashboard.users.active.toLocaleString()}`,
          `**New Users:** +${dashboard.users.new}`,
          `**Left Users:** -${dashboard.users.left}`,
          `**Net Growth:** ${dashboard.users.growthRate > 0 ? '+' : ''}${dashboard.users.growthRate}`
        ].join('\n'),
        inline: true
      },
      {
        name: '💡 Engagement',
        value: [
          `**Engagement Score:** ${dashboard.insights.engagementScore}`,
          `**Commands/User:** ${(dashboard.overview.totalCommands / (dashboard.users.active || 1)).toFixed(2)}`,
          `**Messages/User:** ${(dashboard.overview.totalMessages / (dashboard.users.active || 1)).toFixed(2)}`
        ].join('\n'),
        inline: true
      }
    );

  if (dashboard.users.topActive.length > 0) {
    embed.addFields({
      name: '⭐ Most Active Users',
      value: dashboard.users.topActive
        .map(([userId, count], i) => `**${i + 1}.** <@${userId}> - ${count} commands`)
        .join('\n'),
      inline: false
    });
  }

  embed.setFooter({ text: `Last 24 hours • ${new Date().toLocaleString()}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showModeration(interaction, analytics) {
  const dashboard = analytics.getDashboard();

  const embed = new EmbedBuilder()
    .setTitle('🛡️ Moderation Statistics')
    .setColor(0xF04747)
    .setDescription('> Moderation actions and enforcement metrics')
    .addFields(
      {
        name: '📊 Actions Taken',
        value: [
          `**Warnings:** ${dashboard.moderation.warnings}`,
          `**Kicks:** ${dashboard.moderation.kicks}`,
          `**Bans:** ${dashboard.moderation.bans}`,
          `**Timeouts:** ${dashboard.moderation.timeouts}`,
          `**Total:** ${dashboard.moderation.total}`
        ].join('\n'),
        inline: true
      },
      {
        name: '📈 Trends',
        value: [
          `**Most Common:** ${dashboard.moderation.warnings > dashboard.moderation.kicks ? 'Warnings' : 'Kicks'}`,
          `**Severity Index:** ${((dashboard.moderation.bans * 3 + dashboard.moderation.kicks * 2 + dashboard.moderation.warnings) / (dashboard.moderation.total || 1)).toFixed(2)}`,
          `**Actions/Day:** ${(dashboard.moderation.total / 1).toFixed(2)}`
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ text: `Last 24 hours • ${new Date().toLocaleString()}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showPerformance(interaction, analytics) {
  const dashboard = analytics.getDashboard();

  const embed = new EmbedBuilder()
    .setTitle('⚡ Performance Metrics')
    .setColor(0xFAA61A)
    .setDescription('> System performance and resource usage')
    .addFields(
      {
        name: '🖥️ System',
        value: [
          `**Uptime:** ${dashboard.performance.uptime}`,
          `**Memory Usage:** ${dashboard.performance.memory}`,
          `**Latency:** ${dashboard.performance.latency}`,
          `**CPU Usage:** ${dashboard.performance.cpuUsage}`
        ].join('\n'),
        inline: true
      },
      {
        name: '📊 Bot Performance',
        value: [
          `**Avg Response:** ${dashboard.commands.averageResponseTime}ms`,
          `**Success Rate:** ${dashboard.commands.successRate}%`,
          `**Error Rate:** ${((dashboard.commands.errors / (dashboard.commands.total || 1)) * 100).toFixed(2)}%`,
          `**Commands/Min:** ${(dashboard.commands.total / (dashboard.performance.uptime / 60 || 1)).toFixed(2)}`
        ].join('\n'),
        inline: true
      }
    )
    .setFooter({ text: `Real-time metrics • ${new Date().toLocaleString()}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function showSecurity(interaction, raidProtection) {
  if (!raidProtection) {
    return interaction.reply({
      content: '❌ Raid protection service is not available',
      ephemeral: true
    });
  }

  const stats = raidProtection.getStats();

  const embed = new EmbedBuilder()
    .setTitle('🛡️ Security & Raid Protection')
    .setColor(0xF04747)
    .setDescription('> Advanced security monitoring and threat detection')
    .addFields(
      {
        name: '🚨 Threat Detection',
        value: [
          `**Raids Detected:** ${stats.raidsDetected}`,
          `**Raids Prevented:** ${stats.raidsPrevented}`,
          `**Success Rate:** ${stats.raidsDetected > 0 ? ((stats.raidsPrevented / stats.raidsDetected) * 100).toFixed(2) : 100}%`
        ].join('\n'),
        inline: true
      },
      {
        name: '⚔️ Actions Taken',
        value: [
          `**Users Blocked:** ${stats.usersBlocked}`,
          `**Messages Deleted:** ${stats.messagesDeleted}`,
          `**Automated Actions:** ${stats.actionsAutomated}`
        ].join('\n'),
        inline: true
      },
      {
        name: '📊 Current Status',
        value: [
          `**Active Raid Sessions:** ${stats.activeRaidSessions}`,
          `**Suspicious Users:** ${stats.suspiciousUsers}`,
          `**Monitored Guilds:** ${stats.trackedGuilds}`
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: `Security Status: Active • ${new Date().toLocaleString()}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}
