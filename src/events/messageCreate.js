




import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling.js';
import { addXp } from '../services/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;

export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      
      if (message.author.bot || !message.guild) return;

      // Auto-Moderation Check (before XP processing)
      if (client.autoMod) {
        const result = await client.autoMod.checkMessage(message);
        
        if (result) {
          // Delete message
          try {
            await message.delete();
          } catch (error) {
            logger.error('Failed to delete message:', error);
          }

          // Execute action
          await executeAutoModAction(message, result, client);

          // Log to channel
          await logAutoModAction(message, result, client);

          // Don't process XP for rule violations
          return;
        }
      }

      await handleLeveling(message, client);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};








async function handleLeveling(message, client) {
  try {
    const rateLimitKey = `xp-event:${message.guild.id}:${message.author.id}`;
    const canProcess = await checkRateLimit(rateLimitKey, MESSAGE_XP_RATE_LIMIT_ATTEMPTS, MESSAGE_XP_RATE_LIMIT_WINDOW_MS);
    if (!canProcess) {
      return;
    }

    const levelingConfig = await getLevelingConfig(client, message.guild.id);
    
    if (!levelingConfig?.enabled) {
      return;
    }

    
    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) {
      return;
    }

    
    if (levelingConfig.ignoredRoles?.length > 0) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => {
        return null;
      });
      if (member && member.roles.cache.some(role => levelingConfig.ignoredRoles.includes(role.id))) {
        return;
      }
    }

    
    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) {
      return;
    }

    
    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    const userData = await getUserLevelData(client, message.guild.id, message.author.id);
    
    
    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();
    const timeSinceLastMessage = now - (userData.lastMessage || 0);
    
    
    if (timeSinceLastMessage < cooldownTime * 1000) {
      return;
    }

    
    const minXP = levelingConfig.xpRange?.min || levelingConfig.xpPerMessage?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || levelingConfig.xpPerMessage?.max || 25;

    
    const safeMinXP = Math.max(1, minXP);
    const safeMaxXP = Math.max(safeMinXP, maxXP);

    
    const xpToGive = Math.floor(Math.random() * (safeMaxXP - safeMinXP + 1)) + safeMinXP;

    
    let finalXP = xpToGive;
    if (levelingConfig.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      finalXP = Math.floor(finalXP * levelingConfig.xpMultiplier);
    }

    
    const result = await addXp(client, message.guild, message.member, finalXP);
    
    if (result.success && result.leveledUp) {
      logger.info(
        `${message.author.tag} leveled up to level ${result.level} in ${message.guild.name}`
      );
    }
  } catch (error) {
    logger.error('Error handling leveling for message:', error);
  }
}




async function executeAutoModAction(message, result, client) {
  try {
    const member = message.member;
    if (!member) return;

    switch (result.action.type) {
      case 'ban':
        await member.ban({ reason: result.action.reason });
        logger.info(`Auto-mod banned ${member.user.tag} for: ${result.action.reason}`);
        break;

      case 'timeout':
        await member.timeout(result.action.duration, result.action.reason);
        logger.info(`Auto-mod timed out ${member.user.tag} for ${result.action.duration}ms`);
        break;

      case 'delete':
        // Message already deleted
        logger.info(`Auto-mod deleted message from ${member.user.tag}`);
        break;
    }

    // Send DM to user
    try {
      await member.send({
        embeds: [{
          title: '⚠️ Auto-Moderation Action',
          description: `Your message in **${message.guild.name}** was removed for violating server rules.`,
          fields: [
            { name: 'Reason', value: result.action.reason },
            { name: 'Action', value: client.autoMod.getActionText(result.action) }
          ],
          color: 0xFF0000,
          timestamp: new Date()
        }]
      });
    } catch (error) {
      // User has DMs disabled
      logger.debug('Could not DM user about auto-mod action');
    }
  } catch (error) {
    logger.error('Error executing auto-mod action:', error);
  }
}

async function logAutoModAction(message, result, client) {
  try {
    const config = await client.autoMod.getGuildConfig(message.guild.id);
    if (!config.logChannel) return;

    const logChannel = message.guild.channels.cache.get(config.logChannel);
    if (!logChannel) return;

    const embed = client.autoMod.createLogEmbed(message, result);
    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    logger.error('Error logging auto-mod action:', error);
  }
}
