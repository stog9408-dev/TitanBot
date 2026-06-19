import { EmbedBuilder } from 'discord.js';
import { getColor } from '../config/bot.js';

export function createEmbed({
  title = '',
  description = '',
  color = 'primary',
  fields = [],
  author = null,
  footer = null,
  thumbnail = null,
  image = null,
  timestamp = true,
  url = null,
  style = 'default'
} = {}) {
  const embed = new EmbedBuilder();
  
  // Apply title with optional emoji enhancement
  if (title && typeof title === 'string' && title.length > 0) {
    const formattedTitle = style === 'modern' ? `✨ ${title}` : title;
    embed.setTitle(formattedTitle.substring(0, 256));
  }
  
  // Apply description with better formatting
  if (description && typeof description === 'string' && description.length > 0) {
    let formattedDesc = description;
    
    // Add visual separators for modern style
    if (style === 'modern' && !description.includes('━')) {
      formattedDesc = `━━━━━━━━━━━━━━━━━━━━\n${description}\n━━━━━━━━━━━━━━━━━━━━`;
    }
    
    embed.setDescription(formattedDesc.substring(0, 4096));
  }
  
  // Apply color with enhanced palette
  try {
    const embedColor = getColor(color) || getColor('primary');
    embed.setColor(embedColor);
  } catch (error) {
    embed.setColor(getColor('primary'));
  }

  // Add fields with better formatting
  if (Array.isArray(fields) && fields.length > 0) {
    const validFields = fields.filter(f => f && f.name && f.value).map(field => ({
      name: field.name,
      value: field.value,
      inline: field.inline !== undefined ? field.inline : false
    }));
    
    if (validFields.length > 0) {
      embed.addFields(validFields.slice(0, 25));
    }
  }

  // Set author with enhanced formatting
  if (author) {
    try {
      if (typeof author === 'string' && author.length > 0) {
        embed.setAuthor({ name: author.substring(0, 256) });
      } else if (author && typeof author.name === 'string') {
        embed.setAuthor(author);
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Set footer with modern branding
  if (footer) {
    try {
      if (typeof footer === 'string' && footer.length > 0) {
        const footerText = style === 'modern'
          ? `${footer} • TitanBot`
          : footer;
        embed.setFooter({ text: footerText.substring(0, 2048) });
      } else if (footer && typeof footer.text === 'string') {
        embed.setFooter(footer);
      }
    } catch (error) {
      // Silently fail
    }
  } else if (style === 'modern') {
    embed.setFooter({ text: 'TitanBot • Modern Discord Experience' });
  }

  // Set thumbnail
  if (thumbnail) {
    try {
      if (typeof thumbnail === 'string' && thumbnail.length > 0) {
        embed.setThumbnail(thumbnail);
      } else if (thumbnail && typeof thumbnail.url === 'string') {
        embed.setThumbnail(thumbnail.url);
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Set image
  if (image) {
    try {
      if (typeof image === 'string' && image.length > 0) {
        embed.setImage(image);
      } else if (image && typeof image.url === 'string') {
        embed.setImage(image.url);
      }
    } catch (error) {
      // Silently fail
    }
  }

  // Set timestamp
  if (timestamp === true) {
    embed.setTimestamp();
  } else if (timestamp instanceof Date) {
    embed.setTimestamp(timestamp);
  }

  // Set URL
  if (url && typeof url === 'string' && url.length > 0) {
    try {
      embed.setURL(url);
    } catch (error) {
      // Silently fail
    }
  }

  return embed;
}

export function errorEmbed(message, error = null, options = {}) {
  const { showDetails = process.env.NODE_ENV !== 'production', style = 'modern' } = options;
  let description = message;

  if (error && showDetails) {
    const detailText = typeof error === 'string' ? error : (error.message || String(error));
    description = `${message}\n\n**Error Details:**\n${formatCodeBlock(detailText, 'js')}`;
  }

  return createEmbed({
    title: '❌ Error Occurred',
    description: `> ${description}`,
    color: 'error',
    timestamp: true,
    style,
    footer: 'If this persists, contact server administrators'
  });
}

export function successEmbed(message, title = '✅ Success', options = {}) {
  const { style = 'modern', fields = [] } = options;
  
  return createEmbed({
    title,
    description: `> ${message}`,
    color: 'success',
    timestamp: true,
    style,
    fields
  });
}

export function infoEmbed(message, title = 'ℹ️ Information', options = {}) {
  const { style = 'modern', fields = [] } = options;
  
  return createEmbed({
    title,
    description: `> ${message}`,
    color: 'info',
    timestamp: true,
    style,
    fields
  });
}

export function warningEmbed(message, title = '⚠️ Warning', options = {}) {
  const { style = 'modern', fields = [] } = options;
  
  return createEmbed({
    title,
    description: `> ${message}`,
    color: 'warning',
    timestamp: true,
    style,
    fields
  });
}

export function loadingEmbed(message = 'Processing...', title = '⏳ Please Wait') {
  return createEmbed({
    title,
    description: `> ${message}\n\n${formatProgressBar(0, 1, 20)}`,
    color: 'info',
    timestamp: true,
    style: 'modern'
  });
}

export function dashboardEmbed(title, description, fields = [], options = {}) {
  const { color = 'primary', thumbnail = null, footer = null } = options;
  
  return createEmbed({
    title: `📊 ${title}`,
    description,
    color,
    fields,
    thumbnail,
    footer: footer || 'Use the buttons below to configure settings',
    timestamp: true,
    style: 'modern'
  });
}

export function formatUser(user) {
  return `${user} (${user.tag} | ${user.id})`;
}

export function formatDate(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:F>`;
}

export function formatRelativeTime(date) {
  return `<t:${Math.floor(date.getTime() / 1000)}:R>`;
}

export function formatCodeBlock(content, language = '') {
  return `\`\`\`${language}\n${content}\n\`\`\``;
}

export function formatInlineCode(content) {
  return `\`${content}\``;
}

export function formatBold(content) {
  return `**${content}**`;
}

export function formatItalic(content) {
  return `*${content}*`;
}

export function formatUnderline(content) {
  return `__${content}__`;
}

export function formatStrikethrough(content) {
  return `~~${content}~~`;
}

export function formatSpoiler(content) {
  return `||${content}||`;
}

export function formatQuote(content) {
  return `> ${content}`;
}

export function formatList(items, ordered = false) {
  return items
    .map((item, index) => (ordered ? `${index + 1}.` : '•') + ` ${item}`)
    .join('\n');
}

export function formatProgressBar(current, max, size = 10) {
  const progress = Math.min(Math.max(0, current / max), 1);
  const filled = Math.round(size * progress);
  const empty = size - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(progress * 100)}%`;
}

// Made with Bob
