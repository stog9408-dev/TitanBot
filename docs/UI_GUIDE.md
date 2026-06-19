# 🎨 TitanBot Modern UI Guide

This guide explains the modern UI system implemented in TitanBot and how to use it effectively.

## 📋 Table of Contents

- [Color System](#color-system)
- [Embed Styles](#embed-styles)
- [Component Patterns](#component-patterns)
- [Best Practices](#best-practices)
- [Examples](#examples)

---

## 🎨 Color System

### Modern Color Palette

TitanBot uses a modern, vibrant color palette based on Discord's design language:

```javascript
// Primary Colors
primary: "#5865F2"    // Discord Blurple - Main brand color
secondary: "#4752C4"  // Deeper blue for contrast
accent: "#EB459E"     // Vibrant pink accent

// Status Colors
success: "#43B581"    // Softer green
error: "#F04747"      // Brighter red
warning: "#FAA61A"    // Warmer orange
info: "#5865F2"       // Consistent with primary

// Feature Colors
economy: "#FEE75C"    // Bright gold
birthday: "#EB459E"   // Vibrant pink
moderation: "#9B84EE" // Soft purple
leveling: "#00D9FF"   // Cyan
welcome: "#43B581"    // Green
```

### Using Colors

```javascript
import { getColor } from './config/bot.js';

// Get a color
const primaryColor = getColor('primary');
const successColor = getColor('success');
const economyColor = getColor('economy');

// Get nested colors
const ticketOpenColor = getColor('ticket.open');
const priorityHighColor = getColor('priority.high');
```

---

## 📝 Embed Styles

### Available Styles

TitanBot embeds support multiple styles:

1. **default** - Standard Discord embed
2. **modern** - Enhanced with decorative elements and branding
3. **minimal** - Clean, simple design
4. **card** - Card-like appearance

### Creating Modern Embeds

```javascript
import { createEmbed, successEmbed, errorEmbed, dashboardEmbed } from './utils/embeds.js';

// Modern style embed
const embed = createEmbed({
  title: 'Welcome to TitanBot',
  description: 'Your modern Discord bot experience',
  color: 'primary',
  style: 'modern',
  fields: [
    { name: 'Feature 1', value: 'Description', inline: true },
    { name: 'Feature 2', value: 'Description', inline: true }
  ]
});

// Success message with modern style
const success = successEmbed('Operation completed successfully!', '✅ Success', {
  style: 'modern',
  fields: [{ name: 'Details', value: 'Additional information' }]
});

// Dashboard embed
const dashboard = dashboardEmbed(
  'Server Settings',
  'Configure your server settings below',
  [
    { name: '🔧 Setting 1', value: 'Current: Enabled', inline: true },
    { name: '🎨 Setting 2', value: 'Current: Blue', inline: true }
  ],
  { color: 'info' }
);
```

### Status Embeds

```javascript
// Success
successEmbed('User has been verified!', '✅ Verification Complete');

// Error with details
errorEmbed('Failed to process command', error, { showDetails: true });

// Warning
warningEmbed('This action cannot be undone!', '⚠️ Confirmation Required');

// Info
infoEmbed('Server statistics updated', 'ℹ️ Update Complete');

// Loading state
loadingEmbed('Processing your request...', '⏳ Please Wait');
```

---

## 🎮 Component Patterns

### Modern Buttons

```javascript
import { 
  getConfirmationButtons, 
  getPaginationRow,
  getRefreshButton,
  getBackButton,
  getActionButtons 
} from './utils/components.js';

// Confirmation buttons with custom labels
const confirmRow = getConfirmationButtons('action', {
  confirmLabel: 'Yes, proceed',
  cancelLabel: 'No, cancel',
  confirmEmoji: '✅',
  cancelEmoji: '❌'
});

// Modern pagination
const paginationRow = getPaginationRow('page', currentPage, totalPages, {
  style: 'modern',
  showPageInfo: true
});

// Refresh button
const refreshRow = getRefreshButton('refresh_data', {
  label: 'Refresh',
  emoji: '🔄',
  style: ButtonStyle.Primary
});

// Back button
const backRow = getBackButton('back_to_menu', {
  label: 'Back',
  emoji: '◀️'
});

// Dynamic action buttons
const actionRow = getActionButtons([
  { customId: 'edit', label: 'Edit', emoji: '✏️', style: ButtonStyle.Primary },
  { customId: 'delete', label: 'Delete', emoji: '🗑️', style: ButtonStyle.Danger },
  { customId: 'view', label: 'View', emoji: '👁️', style: ButtonStyle.Secondary }
]);
```

### Select Menus

```javascript
import { createSelectMenu } from './utils/components.js';

const selectRow = createSelectMenu(
  'category_select',
  'Choose a category...',
  [
    { label: 'Moderation', value: 'mod', emoji: '🛡️' },
    { label: 'Economy', value: 'eco', emoji: '💰' },
    { label: 'Fun', value: 'fun', emoji: '🎮' }
  ],
  1, // min values
  1  // max values
);
```

---

## ✨ Best Practices

### 1. Consistent Color Usage

```javascript
// ✅ Good - Use semantic colors
createEmbed({ color: 'success' });
createEmbed({ color: 'error' });
createEmbed({ color: 'warning' });

// ❌ Avoid - Hardcoded hex colors
createEmbed({ color: '#00FF00' });
```

### 2. Modern Style for User-Facing Messages

```javascript
// ✅ Good - Modern style for better UX
successEmbed('Welcome!', '✅ Success', { style: 'modern' });

// ⚠️ Acceptable - Default for simple messages
successEmbed('Done');
```

### 3. Descriptive Titles and Emojis

```javascript
// ✅ Good - Clear and descriptive
createEmbed({
  title: '🎫 Ticket System Dashboard',
  description: 'Manage your server tickets'
});

// ❌ Avoid - Vague titles
createEmbed({
  title: 'Dashboard',
  description: 'Settings'
});
```

### 4. Proper Field Organization

```javascript
// ✅ Good - Organized with inline fields
createEmbed({
  fields: [
    { name: '👥 Members', value: '1,234', inline: true },
    { name: '🤖 Bots', value: '12', inline: true },
    { name: '📊 Online', value: '567', inline: true }
  ]
});
```

### 5. Loading States

```javascript
// ✅ Good - Show loading state for long operations
await interaction.reply({ embeds: [loadingEmbed('Fetching data...')] });
// ... perform operation ...
await interaction.editReply({ embeds: [successEmbed('Data loaded!')] });
```

---

## 📚 Examples

### Complete Dashboard Example

```javascript
import { dashboardEmbed } from './utils/embeds.js';
import { getActionButtons, getRefreshButton } from './utils/components.js';

async function showDashboard(interaction) {
  const embed = dashboardEmbed(
    'Server Configuration',
    'Manage your server settings using the buttons below',
    [
      { name: '🔧 Moderation', value: 'Enabled', inline: true },
      { name: '💰 Economy', value: 'Enabled', inline: true },
      { name: '🎫 Tickets', value: 'Disabled', inline: true },
      { name: '📊 Logging', value: 'Enabled', inline: true },
      { name: '👋 Welcome', value: 'Enabled', inline: true },
      { name: '🎁 Giveaways', value: 'Enabled', inline: true }
    ],
    { 
      color: 'primary',
      thumbnail: interaction.guild.iconURL()
    }
  );

  const actionRow = getActionButtons([
    { customId: 'config_mod', label: 'Moderation', emoji: '🔧', style: ButtonStyle.Primary },
    { customId: 'config_eco', label: 'Economy', emoji: '💰', style: ButtonStyle.Primary },
    { customId: 'config_ticket', label: 'Tickets', emoji: '🎫', style: ButtonStyle.Primary }
  ]);

  const refreshRow = getRefreshButton('refresh_dashboard', {
    label: 'Refresh',
    emoji: '🔄'
  });

  await interaction.reply({
    embeds: [embed],
    components: [actionRow, refreshRow],
    ephemeral: true
  });
}
```

### Confirmation Dialog Example

```javascript
import { warningEmbed } from './utils/embeds.js';
import { getConfirmationButtons } from './utils/components.js';

async function confirmAction(interaction, action) {
  const embed = warningEmbed(
    `Are you sure you want to ${action}? This action cannot be undone!`,
    '⚠️ Confirmation Required',
    { style: 'modern' }
  );

  const buttons = getConfirmationButtons('confirm_action', {
    confirmLabel: 'Yes, proceed',
    cancelLabel: 'Cancel',
    confirmEmoji: '✅',
    cancelEmoji: '❌'
  });

  await interaction.reply({
    embeds: [embed],
    components: [buttons],
    ephemeral: true
  });
}
```

### Paginated List Example

```javascript
import { createEmbed } from './utils/embeds.js';
import { getPaginationRow } from './utils/components.js';

async function showPaginatedList(interaction, items, page = 1) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const pageItems = items.slice(start, end);

  const embed = createEmbed({
    title: '📋 Item List',
    description: pageItems.map((item, i) => `${start + i + 1}. ${item}`).join('\n'),
    color: 'primary',
    style: 'modern',
    footer: `Page ${page} of ${totalPages} • ${items.length} total items`
  });

  const pagination = getPaginationRow('list_page', page, totalPages, {
    style: 'modern',
    showPageInfo: true
  });

  await interaction.reply({
    embeds: [embed],
    components: [pagination]
  });
}
```

---

## 🎯 Migration Guide

### Updating Existing Embeds

```javascript
// Old style
const embed = new EmbedBuilder()
  .setTitle('Success')
  .setDescription('Operation completed')
  .setColor('#00FF00');

// New modern style
const embed = successEmbed('Operation completed', '✅ Success', {
  style: 'modern'
});
```

### Updating Buttons

```javascript
// Old style
const row = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId('confirm')
    .setLabel('Confirm')
    .setStyle(ButtonStyle.Success)
);

// New modern style
const row = getConfirmationButtons('confirm');
```

---

## 🔗 Related Documentation

- [Discord.js Guide](https://discordjs.guide/)
- [Discord Developer Portal](https://discord.com/developers/docs)
- [TitanBot README](../README.md)
- [Changelog](../CHANGELOG.md)

---

*Last updated: June 17, 2026*