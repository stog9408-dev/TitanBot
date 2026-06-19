# 🐛 Command Error Debugging Guide

## Problem: "Unexpected Error" bei neuen Commands

### Mögliche Ursachen:

1. **Commands nicht registriert**
   - Bot muss neu gestartet werden
   - 2-3 Minuten warten für Discord Sync

2. **Import-Fehler**
   - Fehlende Dependencies
   - Falsche Pfade

3. **Execution-Fehler**
   - Fehler im Command-Code
   - Fehlende Client-Properties

## 🔍 Debugging Schritte:

### 1. Railway Logs checken

```bash
# In Railway Dashboard:
1. Deployments → Latest → View Logs
2. Suche nach Fehlern beim Start
3. Achte auf "Command loaded" Messages
```

**Erwartete Logs:**
```
[info] Loaded command: botstatus from ...
[info] Loaded command: cmdmanager from ...
[info] Successfully loaded X commands
```

### 2. Bot neu starten

```bash
# In Railway:
1. Settings → Restart
2. Warte bis Status "Active"
3. Prüfe Logs auf Fehler
```

### 3. Commands testen

```bash
# Teste zuerst einfache Commands:
/ping
/help

# Dann neue Commands:
/botstatus view
/cmdmanager stats
```

## 🔧 Schnelle Fixes:

### Fix 1: Commands temporär deaktivieren

Wenn die neuen Commands Probleme machen, kannst du sie temporär umbenennen:

```bash
# In Railway Terminal oder lokal:
cd TitanBot-main/src/commands/Admin
mv botstatus.js botstatus.js.disabled
mv cmdmanager.js cmdmanager.js.disabled
```

Dann Bot neu starten.

### Fix 2: Nur einen Command testen

Deaktiviere einen der Commands und teste den anderen:

```bash
# Nur botstatus testen:
mv cmdmanager.js cmdmanager.js.disabled

# Bot neu starten und /botstatus testen
```

### Fix 3: Logs aktivieren

Füge mehr Logging hinzu um zu sehen wo der Fehler auftritt.

## 📊 Welchen Command hast du getestet?

Bitte teile mit:
1. Welchen Command hast du ausgeführt? (`/botstatus` oder `/cmdmanager`)
2. Welchen Subcommand? (z.B. `/botstatus view`)
3. Was steht in den Railway Logs?

## 🚨 Notfall-Lösung

Wenn nichts funktioniert, können wir die Commands vereinfachen:

### Minimaler Test-Command

Erstelle eine Datei `TitanBot-main/src/commands/Admin/test.js`:

```javascript
import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('test')
        .setDescription('Test command')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            await interaction.editReply({
                content: '✅ Test command works!'
            });
        } catch (error) {
            console.error('Test command error:', error);
            await interaction.editReply({
                content: `❌ Error: ${error.message}`
            });
        }
    }
};
```

Wenn dieser Command funktioniert, wissen wir dass das Problem in den komplexeren Commands liegt.

## 📝 Nächste Schritte:

1. **Prüfe Railway Logs** - Suche nach Fehlern
2. **Teste /ping** - Funktionieren andere Commands?
3. **Teste /test** - Funktioniert der minimale Command?
4. **Teile die Logs** - Zeig mir was in den Logs steht

## 💡 Häufige Fehler:

### Error: "Cannot read property 'X' of undefined"
- Client-Property fehlt
- Lösung: Prüfe ob `client.commandStats`, `client.statusConfig` etc. initialisiert sind

### Error: "Unknown interaction"
- Command antwortet zu langsam
- Lösung: `defer` am Anfang verwenden (bereits implementiert)

### Error: "Missing Access"
- Bot hat keine Permissions
- Lösung: Bot-Role Permissions prüfen

### Error: "Command not found"
- Command nicht geladen
- Lösung: Bot neu starten, Logs prüfen

## 🔍 Debug-Modus aktivieren

Füge in `src/app.js` hinzu:

```javascript
// Nach dem Command-Loading
console.log('Loaded commands:', Array.from(client.commands.keys()));
```

Das zeigt dir welche Commands geladen wurden.

## 📞 Support

Wenn der Fehler weiterhin auftritt:
1. Kopiere die Railway Logs
2. Teile welchen Command du getestet hast
3. Teile ob andere Commands funktionieren

---

*Erstellt: 19.06.2026*