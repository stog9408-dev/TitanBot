/**
 * 🛡️ Auto-Moderation Configuration Command
 * Configure comprehensive auto-moderation settings
 */

import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('automod')
        .setDescription('🛡️ Configure auto-moderation settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View current auto-mod configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('Enable or disable auto-mod')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('antispam')
                .setDescription('Configure anti-spam protection')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('antiinvite')
                .setDescription('Block Discord invite links')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('antilink')
                .setDescription('Block suspicious links')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('wordfilter')
                .setDescription('Configure word filter')
                .addBooleanOption(option =>
                    option
                        .setName('enabled')
                        .setDescription('Enable or disable')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('logchannel')
                .setDescription('Set log channel for auto-mod actions')
                .addChannelOption(option =>
                    option
                        .setName('channel')
                        .setDescription('Channel for logs')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('whitelist')
                .setDescription('Add role to whitelist')
                .addRoleOption(option =>
                    option
                        .setName('role')
                        .setDescription('Role to whitelist')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('blacklist')
                .setDescription('Add word to blacklist')
                .addStringOption(option =>
                    option
                        .setName('word')
                        .setDescription('Word to blacklist')
                        .setRequired(true)
                )
        ),

    async execute(interaction, config, client) {
        await interaction.deferReply({ ephemeral: true });

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (!client.db) {
            return interaction.editReply({
                content: '❌ Database not available'
            });
        }

        try {
            let automodConfig = await client.db.get(`automod_${guildId}`) || getDefaultConfig();

            switch (subcommand) {
                case 'status':
                    await handleStatus(interaction, automodConfig);
                    break;
                
                case 'toggle':
                    const enabled = interaction.options.getBoolean('enabled');
                    automodConfig.enabled = enabled;
                    await client.db.set(`automod_${guildId}`, automodConfig);
                    await interaction.editReply({
                        embeds: [createEmbed({
                            title: '✅ Auto-Mod Updated',
                            description: `Auto-moderation is now **${enabled ? 'enabled' : 'disabled'}**`,
                            color: 'success'
                        })]
                    });
                    break;

                case 'antispam':
                    const spamEnabled = interaction.options.getBoolean('enabled');
                    automodConfig.antiSpam = spamEnabled;
                    await client.db.set(`automod_${guildId}`, automodConfig);
                    await interaction.editReply({
                        embeds: [createEmbed({
                            title: '✅ Anti-Spam Updated',
                            description: `Anti-spam is now **${spamEnabled ? 'enabled' : 'disabled'}**`,
                            color: 'success'
                        })]
                    });
                    break;

                case 'antiinvite':
                    const inviteEnabled = interaction.options.getBoolean('enabled');
                    automodConfig.antiInvite = inviteEnabled;
                    await client.db.set(`automod_${guildId}`, automodConfig);
                    await interaction.editReply({
                        embeds: [createEmbed({
                            title: '✅ Anti-Invite Updated',
                            description: `Anti-invite is now **${inviteEnabled ? 'enabled' : 'disabled'}**`,
                            color: 'success'
                        })]
                    });
                    break;

                case 'antilink':
                    const linkEnabled = interaction.options.getBoolean('enabled');
                    automodConfig.antiLink = linkEnabled;
                    await client.db.set(`automod_${guildId}`, automodConfig);
                    await interaction.editReply({
                        embeds: [createEmbed({
                            title: '✅ Anti-Link Updated',
                            description: `Anti-link is now **${linkEnabled ? 'enabled' : 'disabled'}**`,
                            color: 'success'
                        })]
                    });
                    break;

                case 'wordfilter':
                    const filterEnabled = interaction.options.getBoolean('enabled');
                    automodConfig.wordFilter = filterEnabled;
                    await client.db.set(`automod_${guildId}`, automodConfig);
                    await interaction.editReply({
                        embeds: [createEmbed({
                            title: '✅ Word Filter Updated',
                            description: `Word filter is now **${filterEnabled ? 'enabled' : 'disabled'}**`,
                            color: 'success'
                        })]
                    });
                    break;

                case 'logchannel':
                    const channel = interaction.options.getChannel('channel');
                    automodConfig.logChannel = channel.id;
                    await client.db.set(`automod_${guildId}`, automodConfig);
                    await interaction.editReply({
                        embeds: [createEmbed({
                            title: '✅ Log Channel Set',
                            description: `Auto-mod logs will be sent to ${channel}`,
                            color: 'success'
                        })]
                    });
                    break;

                case 'whitelist':
                    const role = interaction.options.getRole('role');
                    if (!automodConfig.whitelistedRoles) {
                        automodConfig.whitelistedRoles = [];
                    }
                    if (!automodConfig.whitelistedRoles.includes(role.id)) {
                        automodConfig.whitelistedRoles.push(role.id);
                        await client.db.set(`automod_${guildId}`, automodConfig);
                        await interaction.editReply({
                            embeds: [createEmbed({
                                title: '✅ Role Whitelisted',
                                description: `${role} has been added to the whitelist`,
                                color: 'success'
                            })]
                        });
                    } else {
                        await interaction.editReply({
                            content: '⚠️ Role is already whitelisted'
                        });
                    }
                    break;

                case 'blacklist':
                    const word = interaction.options.getString('word');
                    if (!automodConfig.customBlacklist) {
                        automodConfig.customBlacklist = [];
                    }
                    if (!automodConfig.customBlacklist.includes(word.toLowerCase())) {
                        automodConfig.customBlacklist.push(word.toLowerCase());
                        await client.db.set(`automod_${guildId}`, automodConfig);
                        await interaction.editReply({
                            embeds: [createEmbed({
                                title: '✅ Word Blacklisted',
                                description: `"${word}" has been added to the blacklist`,
                                color: 'success'
                            })]
                        });
                    } else {
                        await interaction.editReply({
                            content: '⚠️ Word is already blacklisted'
                        });
                    }
                    break;
            }
        } catch (error) {
            logger.error('Automod command error:', error);
            await interaction.editReply({
                embeds: [createEmbed({
                    title: '❌ Error',
                    description: `Failed to update auto-mod settings: ${error.message}`,
                    color: 'error'
                })]
            });
        }
    }
};

async function handleStatus(interaction, config) {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Auto-Moderation Status')
        .setColor(config.enabled ? 0x00FF00 : 0xFF0000)
        .setDescription(`Auto-moderation is currently **${config.enabled ? 'ENABLED' : 'DISABLED'}**`)
        .addFields(
            {
                name: '🚫 Protection Modules',
                value: [
                    `${config.antiSpam ? '✅' : '❌'} **Anti-Spam**`,
                    `${config.antiInvite ? '✅' : '❌'} **Anti-Invite**`,
                    `${config.antiLink ? '✅' : '❌'} **Anti-Link**`,
                    `${config.antiMassMention ? '✅' : '❌'} **Anti-Mass-Mention**`,
                    `${config.antiCaps ? '✅' : '❌'} **Anti-Caps**`,
                    `${config.antiEmoji ? '✅' : '❌'} **Anti-Emoji-Spam**`,
                    `${config.antiZalgo ? '✅' : '❌'} **Anti-Zalgo**`,
                    `${config.wordFilter ? '✅' : '❌'} **Word Filter**`,
                    `${config.antiPhoneNumber ? '✅' : '❌'} **Anti-Phone-Number**`
                ].join('\n'),
                inline: false
            }
        );

    if (config.logChannel) {
        embed.addFields({
            name: '📝 Log Channel',
            value: `<#${config.logChannel}>`,
            inline: true
        });
    }

    if (config.whitelistedRoles && config.whitelistedRoles.length > 0) {
        embed.addFields({
            name: '✅ Whitelisted Roles',
            value: config.whitelistedRoles.map(id => `<@&${id}>`).join(', '),
            inline: false
        });
    }

    if (config.customBlacklist && config.customBlacklist.length > 0) {
        embed.addFields({
            name: '🚫 Custom Blacklist',
            value: `${config.customBlacklist.length} word(s)`,
            inline: true
        });
    }

    embed.setFooter({ text: 'Use /automod <subcommand> to configure' });
    embed.setTimestamp();

    await interaction.editReply({ embeds: [embed] });
}

function getDefaultConfig() {
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

// Made with Bob
