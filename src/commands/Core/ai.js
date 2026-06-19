/**
 * TitanBot - /ai Command Handler
 * Slash Commands: /ai ask, /ai summarize, /ai translate
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const command = new SlashCommandBuilder()
  .setName('ai')
  .setDescription('🤖 AI-gestützte Befehle')
  .addSubcommand(sub =>
    sub
      .setName('ask')
      .setDescription('Stelle eine Frage an die KI')
      .addStringOption(opt =>
        opt
          .setName('question')
          .setDescription('Deine Frage (max 2000 Zeichen)')
          .setRequired(true)
          .setMaxLength(2000)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('summarize')
      .setDescription('Fasse einen Text zusammen')
      .addStringOption(opt =>
        opt
          .setName('text')
          .setDescription('Text zum Zusammenfassen')
          .setRequired(true)
          .setMaxLength(2000)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('translate')
      .setDescription('Übersetze einen Text')
      .addStringOption(opt =>
        opt
          .setName('text')
          .setDescription('Text zum Übersetzen')
          .setRequired(true)
          .setMaxLength(2000)
      )
      .addStringOption(opt =>
        opt
          .setName('language')
          .setDescription('Zielsprache (z.B. Deutsch, Englisch, Spanisch)')
          .setRequired(true)
      )
  );

export async function execute(interaction, aiService) {
  // Sofortige Acknowledge
  await interaction.deferReply();

  const subcommand = interaction.options.getSubcommand();

  try {
    let result;

    switch (subcommand) {
      case 'ask': {
        const question = interaction.options.getString('question');
        result = await aiService.ask(
          interaction.user.id,
          interaction.guildId,
          question
        );
        break;
      }

      case 'summarize': {
        const text = interaction.options.getString('text');
        result = await aiService.summarize(
          interaction.user.id,
          interaction.guildId,
          text
        );
        break;
      }

      case 'translate': {
        const text = interaction.options.getString('text');
        const language = interaction.options.getString('language');
        result = await aiService.translate(
          interaction.user.id,
          interaction.guildId,
          text,
          language
        );
        break;
      }

      default:
        throw new Error(`Unbekannter Subbefehl: ${subcommand}`);
    }

    // Teile lange Antworten auf (Discord: max 2000 Zeichen)
    const chunks = chunkMessage(result, 1900);
    
    for (const chunk of chunks) {
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setDescription(chunk)
        .setFooter({ text: 'Powered by Claude AI' })
        .setTimestamp();

      if (chunks.indexOf(chunk) === 0) {
        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.followUp({ embeds: [embed] });
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unbekannter Fehler';
    
    await interaction.editReply({
      content: `❌ **Fehler:** ${errorMsg}`,
    });
  }
}

function chunkMessage(message, maxLength = 2000) {
  const chunks = [];
  for (let i = 0; i < message.length; i += maxLength) {
    chunks.push(message.slice(i, i + maxLength));
  }
  return chunks;
}

export { command as data };
