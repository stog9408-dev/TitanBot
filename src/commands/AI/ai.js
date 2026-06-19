/**
 * 🤖 Advanced AI Command
 * Multi-functional AI interactions with modern UI
 */

import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import { createEmbed, successEmbed, errorEmbed, loadingEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

export const data = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('🤖 Advanced AI-powered features')
  .addSubcommand(subcommand =>
    subcommand
      .setName('ask')
      .setDescription('Ask AI anything')
      .addStringOption(option =>
        option
          .setName('question')
          .setDescription('Your question')
          .setRequired(true)
          .setMaxLength(500)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('summarize')
      .setDescription('Summarize text using AI')
      .addStringOption(option =>
        option
          .setName('text')
          .setDescription('Text to summarize')
          .setRequired(true)
          .setMaxLength(2000)
      )
      .addIntegerOption(option =>
        option
          .setName('length')
          .setDescription('Maximum summary length')
          .setMinValue(50)
          .setMaxValue(500)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('translate')
      .setDescription('Translate text to another language')
      .addStringOption(option =>
        option
          .setName('text')
          .setDescription('Text to translate')
          .setRequired(true)
          .setMaxLength(1000)
      )
      .addStringOption(option =>
        option
          .setName('language')
          .setDescription('Target language')
          .setRequired(true)
          .addChoices(
            { name: '🇩🇪 German', value: 'German' },
            { name: '🇬🇧 English', value: 'English' },
            { name: '🇪🇸 Spanish', value: 'Spanish' },
            { name: '🇫🇷 French', value: 'French' },
            { name: '🇮🇹 Italian', value: 'Italian' },
            { name: '🇯🇵 Japanese', value: 'Japanese' },
            { name: '🇰🇷 Korean', value: 'Korean' },
            { name: '🇨🇳 Chinese', value: 'Chinese' },
            { name: '🇷🇺 Russian', value: 'Russian' },
            { name: '🇵🇹 Portuguese', value: 'Portuguese' }
          )
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('sentiment')
      .setDescription('Analyze sentiment of text')
      .addStringOption(option =>
        option
          .setName('text')
          .setDescription('Text to analyze')
          .setRequired(true)
          .setMaxLength(1000)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('creative')
      .setDescription('Generate creative content')
      .addStringOption(option =>
        option
          .setName('type')
          .setDescription('Type of content')
          .setRequired(true)
          .addChoices(
            { name: '📖 Story', value: 'story' },
            { name: '✍️ Poem', value: 'poem' },
            { name: '😂 Joke', value: 'joke' },
            { name: '💡 Fact', value: 'fact' },
            { name: '💬 Quote', value: 'quote' }
          )
      )
      .addStringOption(option =>
        option
          .setName('topic')
          .setDescription('Topic or theme')
          .setRequired(true)
          .setMaxLength(100)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('moderate')
      .setDescription('Check if text is appropriate')
      .addStringOption(option =>
        option
          .setName('text')
          .setDescription('Text to moderate')
          .setRequired(true)
          .setMaxLength(1000)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('stats')
      .setDescription('View AI service statistics')
  );

export async function execute(interaction) {
  const aiService = interaction.client.ai;
  
  if (!aiService) {
    return interaction.reply({
      embeds: [errorEmbed('AI service is not available')],
      ephemeral: true
    });
  }

  const subcommand = interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'ask':
        await handleAsk(interaction, aiService);
        break;
      case 'summarize':
        await handleSummarize(interaction, aiService);
        break;
      case 'translate':
        await handleTranslate(interaction, aiService);
        break;
      case 'sentiment':
        await handleSentiment(interaction, aiService);
        break;
      case 'creative':
        await handleCreative(interaction, aiService);
        break;
      case 'moderate':
        await handleModerate(interaction, aiService);
        break;
      case 'stats':
        await handleStats(interaction, aiService);
        break;
      default:
        await interaction.reply({
          embeds: [errorEmbed('Unknown subcommand')],
          ephemeral: true
        });
    }
  } catch (error) {
    logger.error('AI command error:', error);
    
    const errorMessage = error.message.includes('Rate limit') 
      ? 'You have reached your AI request limit. Please try again later.'
      : 'An error occurred while processing your request.';

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        embeds: [errorEmbed(errorMessage)]
      });
    } else {
      await interaction.reply({
        embeds: [errorEmbed(errorMessage)],
        ephemeral: true
      });
    }
  }
}

async function handleAsk(interaction, aiService) {
  const question = interaction.options.getString('question');
  
  await interaction.deferReply();

  const response = await aiService.generate(question, {
    userId: interaction.user.id,
    maxTokens: 500
  });

  const embed = createEmbed({
    title: '🤖 AI Response',
    description: response,
    color: 'primary',
    fields: [
      {
        name: '❓ Question',
        value: question.length > 100 ? question.substring(0, 100) + '...' : question,
        inline: false
      }
    ],
    footer: { text: `Asked by ${interaction.user.tag}` },
    timestamp: true
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSummarize(interaction, aiService) {
  const text = interaction.options.getString('text');
  const length = interaction.options.getInteger('length') || 200;
  
  await interaction.deferReply();

  const summary = await aiService.summarize(text, length);

  const embed = createEmbed({
    title: '📝 Text Summary',
    description: summary,
    color: 'info',
    fields: [
      {
        name: '📄 Original Length',
        value: `${text.length} characters`,
        inline: true
      },
      {
        name: '📊 Summary Length',
        value: `${summary.length} characters`,
        inline: true
      },
      {
        name: '💾 Compression',
        value: `${Math.round((1 - summary.length / text.length) * 100)}%`,
        inline: true
      }
    ],
    footer: { text: `Summarized by ${interaction.user.tag}` },
    timestamp: true
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleTranslate(interaction, aiService) {
  const text = interaction.options.getString('text');
  const language = interaction.options.getString('language');
  
  await interaction.deferReply();

  const translation = await aiService.translate(text, language);

  const embed = createEmbed({
    title: '🌐 Translation',
    color: 'success',
    fields: [
      {
        name: '📝 Original',
        value: text.length > 500 ? text.substring(0, 500) + '...' : text,
        inline: false
      },
      {
        name: `🔄 ${language}`,
        value: translation,
        inline: false
      }
    ],
    footer: { text: `Translated by ${interaction.user.tag}` },
    timestamp: true
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleSentiment(interaction, aiService) {
  const text = interaction.options.getString('text');
  
  await interaction.deferReply();

  const sentiment = await aiService.analyzeSentiment(text);

  const sentimentEmojis = {
    positive: '😊',
    negative: '😔',
    neutral: '😐'
  };

  const sentimentColors = {
    positive: 'success',
    negative: 'error',
    neutral: 'gray'
  };

  const embed = createEmbed({
    title: `${sentimentEmojis[sentiment] || '🤔'} Sentiment Analysis`,
    description: `**Result:** ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}`,
    color: sentimentColors[sentiment] || 'info',
    fields: [
      {
        name: '📝 Analyzed Text',
        value: text.length > 500 ? text.substring(0, 500) + '...' : text,
        inline: false
      }
    ],
    footer: { text: `Analyzed by ${interaction.user.tag}` },
    timestamp: true
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleCreative(interaction, aiService) {
  const type = interaction.options.getString('type');
  const topic = interaction.options.getString('topic');
  
  await interaction.deferReply();

  const content = await aiService.generateCreative(type, topic);

  const typeEmojis = {
    story: '📖',
    poem: '✍️',
    joke: '😂',
    fact: '💡',
    quote: '💬'
  };

  const embed = createEmbed({
    title: `${typeEmojis[type]} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    description: content,
    color: 'purple',
    fields: [
      {
        name: '🎯 Topic',
        value: topic,
        inline: true
      },
      {
        name: '📝 Type',
        value: type.charAt(0).toUpperCase() + type.slice(1),
        inline: true
      }
    ],
    footer: { text: `Generated for ${interaction.user.tag}` },
    timestamp: true
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleModerate(interaction, aiService) {
  const text = interaction.options.getString('text');
  
  await interaction.deferReply({ ephemeral: true });

  const result = await aiService.moderateContent(text);

  const embed = createEmbed({
    title: result.safe ? '✅ Content is Safe' : '⚠️ Content Flagged',
    description: result.reason,
    color: result.safe ? 'success' : 'warning',
    fields: result.categories && result.categories.length > 0 ? [
      {
        name: '🏷️ Categories',
        value: result.categories.join(', '),
        inline: false
      }
    ] : [],
    footer: { text: 'AI Content Moderation' },
    timestamp: true
  });

  await interaction.editReply({ embeds: [embed] });
}

async function handleStats(interaction, aiService) {
  const stats = aiService.getStats();

  const embed = createEmbed({
    title: '📊 AI Service Statistics',
    color: 'info',
    fields: [
      {
        name: '📈 Total Requests',
        value: stats.totalRequests.toString(),
        inline: true
      },
      {
        name: '💾 Cache Hits',
        value: `${stats.cacheHits} (${stats.totalRequests > 0 ? Math.round((stats.cacheHits / stats.totalRequests) * 100) : 0}%)`,
        inline: true
      },
      {
        name: '⚡ Avg Response Time',
        value: `${Math.round(stats.averageResponseTime)}ms`,
        inline: true
      },
      {
        name: '🗄️ Cache Size',
        value: `${stats.cacheSize} entries`,
        inline: true
      },
      {
        name: '👥 Active Users',
        value: stats.activeUsers.toString(),
        inline: true
      },
      {
        name: '❌ Errors',
        value: stats.errors.toString(),
        inline: true
      },
      {
        name: '🤖 Available Providers',
        value: stats.providers.join(', ') || 'None',
        inline: false
      },
      {
        name: '📊 Provider Usage',
        value: Object.entries(stats.providerUsage)
          .map(([provider, count]) => `${provider}: ${count}`)
          .join('\n') || 'No usage yet',
        inline: false
      }
    ],
    footer: { text: 'TitanBot AI Service' },
    timestamp: true
  });

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

// Made with Bob
