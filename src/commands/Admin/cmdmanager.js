/**
 * ⚡ Command Manager - Advanced Command Control System
 * Manage commands, view statistics, set cooldowns, and control permissions
 */

import { 
    SlashCommandBuilder, 
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle
} from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('cmdmanager')
        .setDescription('⚡ Advanced command management and statistics')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View command usage statistics')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('Specific command to view stats for')
                        .setAutocomplete(true)
                )
                .addStringOption(option =>
                    option
                        .setName('timeframe')
                        .setDescription('Time period for statistics')
                        .addChoices(
                            { name: 'Last Hour', value: 'hour' },
                            { name: 'Last 24 Hours', value: 'day' },
                            { name: 'Last Week', value: 'week' },
                            { name: 'Last Month', value: 'month' },
                            { name: 'All Time', value: 'all' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('enable')
                .setDescription('Enable a command in this server')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('Command to enable')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable a command in this server')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('Command to disable')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('cooldown')
                .setDescription('Set custom cooldown for a command')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('Command to set cooldown for')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('seconds')
                        .setDescription('Cooldown in seconds (0 to remove)')
                        .setRequired(true)
                        .setMinValue(0)
                        .setMaxValue(3600)
                )
                .addStringOption(option =>
                    option
                        .setName('scope')
                        .setDescription('Cooldown scope')
                        .addChoices(
                            { name: 'Per User', value: 'user' },
                            { name: 'Per Channel', value: 'channel' },
                            { name: 'Server-wide', value: 'guild' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('permissions')
                .setDescription('Set custom permissions for a command')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('Command to configure')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to allow/deny')
                )
                .addBooleanOption(option =>
                    option
                        .setName('allow')
                        .setDescription('Allow or deny access')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all commands with their status')
                .addStringOption(option =>
                    option
                        .setName('category')
                        .setDescription('Filter by category')
                        .addChoices(
                            { name: 'Admin', value: 'Admin' },
                            { name: 'Moderation', value: 'Moderation' },
                            { name: 'Economy', value: 'Economy' },
                            { name: 'Fun', value: 'Fun' },
                            { name: 'Utility', value: 'Utility' },
                            { name: 'Core', value: 'Core' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('Filter by status')
                        .addChoices(
                            { name: 'Enabled', value: 'enabled' },
                            { name: 'Disabled', value: 'disabled' },
                            { name: 'All', value: 'all' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reload')
                .setDescription('Reload a specific command')
                .addStringOption(option =>
                    option
                        .setName('command')
                        .setDescription('Command to reload')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('analytics')
                .setDescription('View detailed command analytics dashboard')
        ),

    async execute(interaction, config, client) {
      // Defer reply immediately to prevent timeout
      await interaction.deferReply({ ephemeral: true });
      
      const subcommand = interaction.options.getSubcommand();
  
      try {
            switch (subcommand) {
                case 'stats':
                    await handleStats(interaction, client);
                    break;
                case 'enable':
                    await handleEnable(interaction, client);
                    break;
                case 'disable':
                    await handleDisable(interaction, client);
                    break;
                case 'cooldown':
                    await handleCooldown(interaction, client);
                    break;
                case 'permissions':
                    await handlePermissions(interaction, client);
                    break;
                case 'list':
                    await handleList(interaction, client);
                    break;
                case 'reload':
                    await handleReload(interaction, client);
                    break;
                case 'analytics':
                    await handleAnalytics(interaction, client);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand'
                    });
            }
        } catch (error) {
            logger.error('Command manager error:', error);
            
            const errorMessage = {
                embeds: [createEmbed({
                    title: '❌ Error',
                    description: `Command manager error: ${error.message}`,
                    color: 'error'
                })],
                ephemeral: true
            };

            await interaction.editReply(errorMessage);
        }
    }
};

async function handleStats(interaction, client) {
    const commandName = interaction.options.getString('command');
    const timeframe = interaction.options.getString('timeframe') || 'day';
    
    // Initialize command stats if not exists
    if (!client.commandStats) {
        client.commandStats = new Map();
    }

    if (commandName) {
        // Show stats for specific command
        const stats = client.commandStats.get(commandName) || {
            uses: 0,
            errors: 0,
            lastUsed: null,
            avgResponseTime: 0,
            users: new Set()
        };

        const command = client.commands.get(commandName);
        if (!command) {
            return interaction.editReply({
                content: `❌ Command \`${commandName}\` not found`
            });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📊 Command Statistics: /${commandName}`)
            .setColor(0x5865F2)
            .setDescription(`Detailed statistics for the **/${commandName}** command`)
            .addFields(
                { name: '📈 Total Uses', value: stats.uses.toString(), inline: true },
                { name: '❌ Errors', value: stats.errors.toString(), inline: true },
                { name: '✅ Success Rate', value: `${stats.uses > 0 ? ((1 - stats.errors / stats.uses) * 100).toFixed(1) : 100}%`, inline: true },
                { name: '👥 Unique Users', value: stats.users.size.toString(), inline: true },
                { name: '⚡ Avg Response', value: `${stats.avgResponseTime}ms`, inline: true },
                { name: '🕐 Last Used', value: stats.lastUsed ? `<t:${Math.floor(stats.lastUsed.getTime() / 1000)}:R>` : 'Never', inline: true }
            );

        if (command.category) {
            embed.addFields({ name: '📁 Category', value: command.category, inline: true });
        }

        await interaction.editReply({ embeds: [embed] });
    } else {
        // Show overall stats
        const totalCommands = client.commands.size;
        let totalUses = 0;
        let totalErrors = 0;
        const topCommands = [];

        for (const [name, stats] of client.commandStats.entries()) {
            totalUses += stats.uses;
            totalErrors += stats.errors;
            topCommands.push({ name, uses: stats.uses });
        }

        topCommands.sort((a, b) => b.uses - a.uses);

        const embed = new EmbedBuilder()
            .setTitle('📊 Command Statistics Overview')
            .setColor(0x5865F2)
            .setDescription(`Statistics for the last **${timeframe}**`)
            .addFields(
                { name: '⚡ Total Commands', value: totalCommands.toString(), inline: true },
                { name: '📈 Total Uses', value: totalUses.toLocaleString(), inline: true },
                { name: '❌ Total Errors', value: totalErrors.toString(), inline: true },
                { name: '✅ Success Rate', value: `${totalUses > 0 ? ((1 - totalErrors / totalUses) * 100).toFixed(1) : 100}%`, inline: true },
                { name: '📊 Avg Uses/Command', value: (totalUses / totalCommands).toFixed(1), inline: true },
                { name: '🎯 Active Commands', value: client.commandStats.size.toString(), inline: true }
            );

        if (topCommands.length > 0) {
            embed.addFields({
                name: '🔥 Top 10 Commands',
                value: topCommands.slice(0, 10)
                    .map((cmd, i) => `**${i + 1}.** \`/${cmd.name}\` - ${cmd.uses.toLocaleString()} uses`)
                    .join('\n') || 'No data yet',
                inline: false
            });
        }

        embed.setFooter({ text: `Use /cmdmanager stats command:<name> for detailed stats` });
        embed.setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleEnable(interaction, client) {
    const commandName = interaction.options.getString('command');
    const guildId = interaction.guildId;

    if (!client.db) {
        return interaction.editReply({
            content: '❌ Database not available'
        });
    }

    // Get guild config
    const { getGuildConfig } = await import('../../services/guildConfig.js');
    const guildConfig = await getGuildConfig(client, guildId);

    // Remove from disabled commands
    if (guildConfig.disabledCommands) {
        delete guildConfig.disabledCommands[commandName];
    }

    // Save config
    await client.db.set(`guild_${guildId}_config`, guildConfig);

    await interaction.editReply({
        embeds: [createEmbed({
            title: '✅ Command Enabled',
            description: `The command \`/${commandName}\` has been **enabled** in this server`,
            color: 'success'
        })]
    });
}

async function handleDisable(interaction, client) {
    const commandName = interaction.options.getString('command');
    const guildId = interaction.guildId;

    // Prevent disabling critical commands
    const protectedCommands = ['cmdmanager', 'help', 'ping'];
    if (protectedCommands.includes(commandName)) {
        return interaction.editReply({
            content: `❌ Cannot disable protected command \`/${commandName}\``
        });
    }

    if (!client.db) {
        return interaction.editReply({
            content: '❌ Database not available'
        });
    }

    // Get guild config
    const { getGuildConfig } = await import('../../services/guildConfig.js');
    const guildConfig = await getGuildConfig(client, guildId);

    // Add to disabled commands
    if (!guildConfig.disabledCommands) {
        guildConfig.disabledCommands = {};
    }
    guildConfig.disabledCommands[commandName] = true;

    // Save config
    await client.db.set(`guild_${guildId}_config`, guildConfig);

    await interaction.editReply({
        embeds: [createEmbed({
            title: '🚫 Command Disabled',
            description: `The command \`/${commandName}\` has been **disabled** in this server`,
            color: 'warning'
        })]
    });
}

async function handleCooldown(interaction, client) {
    const commandName = interaction.options.getString('command');
    const seconds = interaction.options.getInteger('seconds');
    const scope = interaction.options.getString('scope') || 'user';
    const guildId = interaction.guildId;

    if (!client.commandCooldowns) {
        client.commandCooldowns = new Map();
    }

    const cooldownKey = `${guildId}_${commandName}`;

    if (seconds === 0) {
        // Remove cooldown
        client.commandCooldowns.delete(cooldownKey);
        
        await interaction.editReply({
            embeds: [createEmbed({
                title: '✅ Cooldown Removed',
                description: `Cooldown for \`/${commandName}\` has been removed`,
                color: 'success'
            })]
        });
    } else {
        // Set cooldown
        client.commandCooldowns.set(cooldownKey, {
            duration: seconds * 1000,
            scope: scope,
            setBy: interaction.user.id,
            setAt: new Date()
        });

        const embed = createEmbed({
            title: '⏱️ Cooldown Set',
            description: `Cooldown configured for \`/${commandName}\``,
            color: 'success'
        });

        embed.addFields(
            { name: 'Duration', value: `${seconds} seconds`, inline: true },
            { name: 'Scope', value: scope, inline: true },
            { name: 'Set By', value: `<@${interaction.user.id}>`, inline: true }
        );

        await interaction.editReply({ embeds: [embed] });
    }
}

async function handlePermissions(interaction, client) {
    const commandName = interaction.options.getString('command');
    const role = interaction.options.getRole('role');
    const allow = interaction.options.getBoolean('allow');

    if (!role || allow === null) {
        return interaction.editReply({
            content: '❌ Please specify both a role and allow/deny setting'
        });
    }

    // This would integrate with Discord's command permissions system
    // For now, we'll store it in guild config
    const guildId = interaction.guildId;
    
    if (!client.db) {
        return interaction.editReply({
            content: '❌ Database not available'
        });
    }

    const { getGuildConfig } = await import('../../services/guildConfig.js');
    const guildConfig = await getGuildConfig(client, guildId);

    if (!guildConfig.commandPermissions) {
        guildConfig.commandPermissions = {};
    }
    if (!guildConfig.commandPermissions[commandName]) {
        guildConfig.commandPermissions[commandName] = { roles: {} };
    }

    guildConfig.commandPermissions[commandName].roles[role.id] = allow;

    await client.db.set(`guild_${guildId}_config`, guildConfig);

    await interaction.editReply({
        embeds: [createEmbed({
            title: '✅ Permissions Updated',
            description: `${role} is now **${allow ? 'allowed' : 'denied'}** to use \`/${commandName}\``,
            color: 'success'
        })]
    });
}

async function handleList(interaction, client) {
    const category = interaction.options.getString('category');
    const statusFilter = interaction.options.getString('status') || 'all';
    const guildId = interaction.guildId;

    const { getGuildConfig } = await import('../../services/guildConfig.js');
    const guildConfig = await getGuildConfig(client, guildId);
    const disabledCommands = guildConfig?.disabledCommands || {};

    let commands = Array.from(client.commands.values());

    // Filter by category
    if (category) {
        commands = commands.filter(cmd => cmd.category === category);
    }

    // Filter by status
    if (statusFilter !== 'all') {
        commands = commands.filter(cmd => {
            const isDisabled = disabledCommands[cmd.data.name];
            return statusFilter === 'disabled' ? isDisabled : !isDisabled;
        });
    }

    // Group by category
    const grouped = {};
    for (const cmd of commands) {
        const cat = cmd.category || 'Uncategorized';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(cmd);
    }

    const embed = new EmbedBuilder()
        .setTitle('📋 Command List')
        .setColor(0x5865F2)
        .setDescription(`Showing ${commands.length} command(s)${category ? ` in **${category}**` : ''}`)
        .setTimestamp();

    for (const [cat, cmds] of Object.entries(grouped)) {
        const commandList = cmds.map(cmd => {
            const isDisabled = disabledCommands[cmd.data.name];
            const status = isDisabled ? '🔴' : '🟢';
            return `${status} \`/${cmd.data.name}\``;
        }).join(', ');

        embed.addFields({
            name: `${cat} (${cmds.length})`,
            value: commandList || 'No commands',
            inline: false
        });
    }

    embed.setFooter({ text: '🟢 Enabled | 🔴 Disabled' });

    await interaction.editReply({ embeds: [embed] });
}

async function handleReload(interaction, client) {
    const commandName = interaction.options.getString('command');

    const { reloadCommand } = await import('../../handlers/commandLoader.js');
    const result = await reloadCommand(client, commandName);

    if (result.success) {
        await interaction.editReply({
            embeds: [createEmbed({
                title: '🔄 Command Reloaded',
                description: `Successfully reloaded \`/${commandName}\``,
                color: 'success'
            })]
        });
    } else {
        await interaction.editReply({
            embeds: [createEmbed({
                title: '❌ Reload Failed',
                description: result.message,
                color: 'error'
            })]
        });
    }
}

async function handleAnalytics(interaction, client) {
    if (!client.analytics) {
        return interaction.editReply({
            content: '❌ Analytics service not available'
        });
    }

    const dashboard = client.analytics.getDashboard();

    const embed = new EmbedBuilder()
        .setTitle('📊 Command Analytics Dashboard')
        .setColor(0x5865F2)
        .setDescription('Comprehensive command usage analytics')
        .addFields(
            {
                name: '📈 Overview',
                value: [
                    `**Total Commands:** ${dashboard.commands.total.toLocaleString()}`,
                    `**Success Rate:** ${dashboard.commands.successRate}%`,
                    `**Errors:** ${dashboard.commands.errors}`,
                    `**Avg Response:** ${dashboard.commands.averageResponseTime}ms`
                ].join('\n'),
                inline: true
            },
            {
                name: '🔥 Popular Commands',
                value: dashboard.commands.popular.slice(0, 5)
                    .map(([cmd, count], i) => `**${i + 1}.** \`/${cmd}\` (${count})`)
                    .join('\n') || 'No data',
                inline: true
            },
            {
                name: '⚡ Performance',
                value: [
                    `**Uptime:** ${dashboard.performance.uptime}`,
                    `**Memory:** ${dashboard.performance.memory}`,
                    `**Latency:** ${dashboard.performance.latency}`
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'Real-time analytics' })
        .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}