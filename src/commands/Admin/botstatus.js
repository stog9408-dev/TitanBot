/**
 * 🤖 Bot Status Management Command
 * Advanced bot status control with rich presence customization
 */

import { 
    SlashCommandBuilder, 
    ActivityType, 
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

// Status presets for quick selection
const STATUS_PRESETS = {
    online: {
        status: 'online',
        activities: [
            { name: 'your commands', type: ActivityType.Listening },
            { name: 'the server', type: ActivityType.Watching },
            { name: 'with Discord.js', type: ActivityType.Playing }
        ]
    },
    idle: {
        status: 'idle',
        activities: [
            { name: 'on standby', type: ActivityType.Playing },
            { name: 'taking a break', type: ActivityType.Playing }
        ]
    },
    dnd: {
        status: 'dnd',
        activities: [
            { name: 'in maintenance mode', type: ActivityType.Playing },
            { name: 'Do Not Disturb', type: ActivityType.Playing }
        ]
    },
    invisible: {
        status: 'invisible',
        activities: []
    }
};

const ACTIVITY_TYPES = {
    playing: ActivityType.Playing,
    streaming: ActivityType.Streaming,
    listening: ActivityType.Listening,
    watching: ActivityType.Watching,
    competing: ActivityType.Competing,
    custom: ActivityType.Playing // Fallback to Playing for compatibility
};

export default {
    data: new SlashCommandBuilder()
        .setName('botstatus')
        .setDescription('🤖 Manage bot status and presence')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set custom bot status')
                .addStringOption(option =>
                    option
                        .setName('status')
                        .setDescription('Bot online status')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 Online', value: 'online' },
                            { name: '🟡 Idle', value: 'idle' },
                            { name: '🔴 Do Not Disturb', value: 'dnd' },
                            { name: '⚫ Invisible', value: 'invisible' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('activity')
                        .setDescription('Activity type')
                        .addChoices(
                            { name: '🎮 Playing', value: 'playing' },
                            { name: '🎵 Listening', value: 'listening' },
                            { name: '👀 Watching', value: 'watching' },
                            { name: '🏆 Competing', value: 'competing' },
                            { name: '📝 Custom', value: 'custom' }
                        )
                )
                .addStringOption(option =>
                    option
                        .setName('text')
                        .setDescription('Activity text (e.g., "with commands")')
                        .setMaxLength(128)
                )
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('Streaming URL (only for streaming activity)')
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('preset')
                .setDescription('Apply a status preset')
                .addStringOption(option =>
                    option
                        .setName('preset')
                        .setDescription('Choose a preset')
                        .setRequired(true)
                        .addChoices(
                            { name: '🟢 Online & Active', value: 'online' },
                            { name: '🟡 Idle Mode', value: 'idle' },
                            { name: '🔴 Maintenance', value: 'dnd' },
                            { name: '⚫ Invisible', value: 'invisible' }
                        )
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('rotate')
                .setDescription('Enable rotating status messages')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable rotation')
                        .setRequired(true)
                )
                .addIntegerOption(option =>
                    option
                        .setName('interval')
                        .setDescription('Rotation interval in minutes (1-60)')
                        .setMinValue(1)
                        .setMaxValue(60)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View current bot status configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset to default status')
        ),

    async execute(interaction, config, client) {
      // Defer reply immediately to prevent timeout
      await interaction.deferReply({ ephemeral: true });
      
      const subcommand = interaction.options.getSubcommand();
  
      try {
            switch (subcommand) {
                case 'set':
                    await handleSetStatus(interaction, client);
                    break;
                case 'preset':
                    await handlePreset(interaction, client);
                    break;
                case 'rotate':
                    await handleRotate(interaction, client);
                    break;
                case 'view':
                    await handleView(interaction, client);
                    break;
                case 'reset':
                    await handleReset(interaction, client);
                    break;
                default:
                    await interaction.editReply({
                        content: '❌ Unknown subcommand'
                    });
            }
        } catch (error) {
            logger.error('Bot status command error:', error);
            
            const errorMessage = {
                embeds: [createEmbed({
                    title: '❌ Error',
                    description: `Failed to update bot status: ${error.message}`,
                    color: 'error'
                })],
                ephemeral: true
            };

            await interaction.editReply(errorMessage);
        }
    }
};

async function handleSetStatus(interaction, client) {
    const status = interaction.options.getString('status');
    const activityType = interaction.options.getString('activity');
    const text = interaction.options.getString('text');
    const url = interaction.options.getString('url');

    // Build presence data
    const presenceData = {
        status: status,
        activities: []
    };

    if (activityType && text) {
        const activity = {
            name: text,
            type: ACTIVITY_TYPES[activityType]
        };

        // Add URL for streaming
        if (activityType === 'streaming' && url) {
            activity.url = url;
        }

        presenceData.activities.push(activity);
    }

    // Set the presence
    await client.user.setPresence(presenceData);

    // Store in client for persistence
    if (!client.statusConfig) {
        client.statusConfig = {};
    }
    client.statusConfig.current = presenceData;
    client.statusConfig.lastUpdated = new Date();
    client.statusConfig.updatedBy = interaction.user.id;

    const embed = createEmbed({
        title: '✅ Bot Status Updated',
        description: 'Successfully updated bot presence',
        color: 'success'
    });

    embed.addFields(
        { name: 'Status', value: getStatusEmoji(status) + ' ' + status.toUpperCase(), inline: true },
        { name: 'Updated By', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'Timestamp', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
    );

    if (activityType && text) {
        embed.addFields({
            name: 'Activity',
            value: `${getActivityEmoji(activityType)} ${activityType.toUpperCase()}: ${text}`,
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handlePreset(interaction, client) {
    const presetName = interaction.options.getString('preset');
    const preset = STATUS_PRESETS[presetName];

    if (!preset) {
        return interaction.reply({
            content: '❌ Invalid preset',
            ephemeral: true
        });
    }

    // Apply preset
    const presenceData = {
        status: preset.status,
        activities: preset.activities.length > 0 ? [preset.activities[0]] : []
    };

    await client.user.setPresence(presenceData);

    // Store preset info
    if (!client.statusConfig) {
        client.statusConfig = {};
    }
    client.statusConfig.current = presenceData;
    client.statusConfig.preset = presetName;
    client.statusConfig.lastUpdated = new Date();
    client.statusConfig.updatedBy = interaction.user.id;

    const embed = createEmbed({
        title: '✅ Preset Applied',
        description: `Successfully applied **${presetName.toUpperCase()}** preset`,
        color: 'success'
    });

    embed.addFields(
        { name: 'Status', value: getStatusEmoji(preset.status) + ' ' + preset.status.toUpperCase(), inline: true },
        { name: 'Preset', value: presetName, inline: true },
        { name: 'Updated By', value: `<@${interaction.user.id}>`, inline: true }
    );

    if (preset.activities.length > 0) {
        embed.addFields({
            name: 'Activities',
            value: preset.activities.map(a => `• ${a.name}`).join('\n'),
            inline: false
        });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handleRotate(interaction, client) {
    const enabled = interaction.options.getBoolean('enabled');
    const interval = interaction.options.getInteger('interval') || 5;

    if (!client.statusConfig) {
        client.statusConfig = {};
    }

    if (enabled) {
        // Start rotation
        const activities = [
            { name: `${client.guilds.cache.size} servers`, type: ActivityType.Watching },
            { name: 'your commands', type: ActivityType.Listening },
            { name: 'with Discord.js', type: ActivityType.Playing },
            { name: `${client.users.cache.size} users`, type: ActivityType.Watching },
            { name: 'TitanBot v2.0', type: ActivityType.Playing }
        ];

        let currentIndex = 0;

        // Clear existing interval
        if (client.statusConfig.rotationInterval) {
            clearInterval(client.statusConfig.rotationInterval);
        }

        // Set up rotation
        client.statusConfig.rotationInterval = setInterval(() => {
            const activity = activities[currentIndex];
            client.user.setPresence({
                status: 'online',
                activities: [activity]
            });
            currentIndex = (currentIndex + 1) % activities.length;
        }, interval * 60 * 1000);

        // Set initial activity
        client.user.setPresence({
            status: 'online',
            activities: [activities[0]]
        });

        client.statusConfig.rotation = {
            enabled: true,
            interval: interval,
            activities: activities
        };

        const embed = createEmbed({
            title: '🔄 Status Rotation Enabled',
            description: `Bot status will rotate every **${interval} minute(s)**`,
            color: 'success'
        });

        embed.addFields({
            name: 'Rotating Activities',
            value: activities.map((a, i) => `${i + 1}. ${a.name}`).join('\n'),
            inline: false
        });

        await interaction.editReply({ embeds: [embed] });
    } else {
        // Disable rotation
        if (client.statusConfig.rotationInterval) {
            clearInterval(client.statusConfig.rotationInterval);
            client.statusConfig.rotationInterval = null;
        }

        client.statusConfig.rotation = { enabled: false };

        await interaction.reply({
            embeds: [createEmbed({
                title: '⏸️ Status Rotation Disabled',
                description: 'Status rotation has been stopped',
                color: 'warning'
            })],
            ephemeral: true
        });
    }
}

async function handleView(interaction, client) {
    const config = client.statusConfig || {};
    const presence = client.user.presence;

    const embed = new EmbedBuilder()
        .setTitle('🤖 Current Bot Status Configuration')
        .setColor(0x5865F2)
        .setThumbnail(client.user.displayAvatarURL())
        .setTimestamp();

    // Current status
    const statusEmoji = getStatusEmoji(presence.status);
    embed.addFields({
        name: 'Current Status',
        value: `${statusEmoji} **${presence.status.toUpperCase()}**`,
        inline: true
    });

    // Current activity
    if (presence.activities && presence.activities.length > 0) {
        const activity = presence.activities[0];
        const activityText = `${getActivityTypeText(activity.type)} ${activity.name}`;
        embed.addFields({
            name: 'Current Activity',
            value: activityText,
            inline: true
        });
    }

    // Rotation status
    if (config.rotation) {
        embed.addFields({
            name: 'Rotation',
            value: config.rotation.enabled 
                ? `🔄 Enabled (${config.rotation.interval}min)` 
                : '⏸️ Disabled',
            inline: true
        });
    }

    // Last updated
    if (config.lastUpdated) {
        embed.addFields({
            name: 'Last Updated',
            value: `<t:${Math.floor(config.lastUpdated.getTime() / 1000)}:R>`,
            inline: true
        });
    }

    if (config.updatedBy) {
        embed.addFields({
            name: 'Updated By',
            value: `<@${config.updatedBy}>`,
            inline: true
        });
    }

    // Statistics
    embed.addFields({
        name: '📊 Bot Statistics',
        value: [
            `**Servers:** ${client.guilds.cache.size}`,
            `**Users:** ${client.users.cache.size}`,
            `**Commands:** ${client.commands.size}`,
            `**Uptime:** ${formatUptime(client.uptime)}`
        ].join('\n'),
        inline: false
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleReset(interaction, client) {
    // Reset to default
    await client.user.setPresence({
        status: 'online',
        activities: [{
            name: 'your commands',
            type: ActivityType.Listening
        }]
    });

    // Clear rotation
    if (client.statusConfig?.rotationInterval) {
        clearInterval(client.statusConfig.rotationInterval);
    }

    client.statusConfig = {
        current: {
            status: 'online',
            activities: [{ name: 'your commands', type: ActivityType.Listening }]
        },
        lastUpdated: new Date(),
        updatedBy: interaction.user.id
    };

    await interaction.reply({
        embeds: [createEmbed({
            title: '🔄 Status Reset',
            description: 'Bot status has been reset to default configuration',
            color: 'success'
        })],
        ephemeral: true
    });
}

// Helper functions
function getStatusEmoji(status) {
    const emojis = {
        online: '🟢',
        idle: '🟡',
        dnd: '🔴',
        invisible: '⚫'
    };
    return emojis[status] || '⚪';
}

function getActivityEmoji(activityType) {
    const emojis = {
        playing: '🎮',
        streaming: '📡',
        listening: '🎵',
        watching: '👀',
        competing: '🏆',
        custom: '📝'
    };
    return emojis[activityType] || '📝';
}

function getActivityTypeText(type) {
    const types = {
        [ActivityType.Playing]: '🎮 Playing',
        [ActivityType.Streaming]: '📡 Streaming',
        [ActivityType.Listening]: '🎵 Listening to',
        [ActivityType.Watching]: '👀 Watching',
        [ActivityType.Competing]: '🏆 Competing in',
        [ActivityType.Custom]: '📝'
    };
    return types[type] || '📝';
}

function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}