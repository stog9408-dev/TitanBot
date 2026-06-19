# 🛡️ TitanBot Auto-Moderation System

## Übersicht

Das Auto-Moderation System bietet umfassenden Schutz vor Spam, unerwünschten Links, Werbung und anderen Regelverstößen. Es arbeitet vollautomatisch und kann individuell konfiguriert werden.

## Features

### 🚫 Anti-Spam
- Erkennt wiederholte Nachrichten
- Blockiert schnelles Message-Flooding
- Verhindert Copy-Paste Spam
- Konfigurierbare Schwellenwerte

### 🔗 Anti-Invite
- Blockiert Discord-Einladungslinks
- Erkennt verschiedene Invite-Formate
- Whitelist für erlaubte Server
- Automatische Löschung

### 🌐 Anti-Link
- Filtert verdächtige URLs
- Blacklist für gefährliche Domains
- Phishing-Schutz
- IP-Logger Erkennung

### 📝 Wortfilter
- Blockiert verbotene Wörter
- Unterstützt Wildcards
- Case-insensitive Matching
- Umgehungsschutz (z.B. "b@d w0rd")

### 📢 Mass-Mention Schutz
- Verhindert Spam durch viele Mentions
- Konfigurierbare Limits
- Schutz vor @everyone/@here Missbrauch

### 🔤 Caps & Emoji Spam
- Erkennt übermäßige Großschreibung
- Blockiert Emoji-Spam
- Prozentuale Schwellenwerte

### 👻 Zalgo Text Filter
- Erkennt unleserliche Unicode-Zeichen
- Verhindert Chat-Verschmutzung
- Automatische Bereinigung

### 📱 Telefonnummern
- Optional: Blockiert Telefonnummern
- Verhindert Doxxing
- Internationale Formate

## Befehle

### `/automod status`
Zeigt die aktuelle Konfiguration und Statistiken

**Beispiel:**
```
/automod status
```

### `/automod toggle <feature> <enabled>`
Aktiviert oder deaktiviert einzelne Features

**Parameter:**
- `feature`: antispam, antiinvite, antilink, wordfilter, massmention, capsspam, emojispam, zalgo, phonenumbers
- `enabled`: true/false

**Beispiel:**
```
/automod toggle antispam true
/automod toggle antilink false
```

### `/automod antispam <messages> <timeframe> <action>`
Konfiguriert Anti-Spam Einstellungen

**Parameter:**
- `messages`: Anzahl der Nachrichten (3-20)
- `timeframe`: Zeitfenster in Sekunden (1-60)
- `action`: delete, timeout, ban

**Beispiel:**
```
/automod antispam messages:5 timeframe:10 action:timeout
```

### `/automod antiinvite <action>`
Konfiguriert Anti-Invite Einstellungen

**Parameter:**
- `action`: delete, timeout, ban

**Beispiel:**
```
/automod antiinvite action:delete
```

### `/automod antilink <action>`
Konfiguriert Anti-Link Einstellungen

**Parameter:**
- `action`: delete, timeout, ban

**Beispiel:**
```
/automod antilink action:timeout
```

### `/automod wordfilter <action> <word>`
Verwaltet den Wortfilter

**Subcommands:**
- `add`: Fügt ein Wort zur Blacklist hinzu
- `remove`: Entfernt ein Wort von der Blacklist
- `list`: Zeigt alle gefilterten Wörter

**Beispiele:**
```
/automod wordfilter add word:badword
/automod wordfilter remove word:badword
/automod wordfilter list
```

### `/automod logchannel <channel>`
Setzt den Log-Channel für Auto-Mod Aktionen

**Beispiel:**
```
/automod logchannel channel:#mod-logs
```

### `/automod whitelist <action> <value>`
Verwaltet Whitelists (Ausnahmen)

**Subcommands:**
- `add-role`: Fügt eine Rolle zur Whitelist hinzu
- `remove-role`: Entfernt eine Rolle
- `add-channel`: Fügt einen Channel hinzu
- `remove-channel`: Entfernt einen Channel
- `add-invite`: Erlaubt einen Discord-Server
- `remove-invite`: Entfernt erlaubten Server
- `list`: Zeigt alle Whitelist-Einträge

**Beispiele:**
```
/automod whitelist add-role role:@Moderator
/automod whitelist add-channel channel:#off-topic
/automod whitelist add-invite invite:discord.gg/example
/automod whitelist list
```

### `/automod blacklist <action> <value>`
Verwaltet Blacklists (blockierte Inhalte)

**Subcommands:**
- `add-domain`: Blockiert eine Domain
- `remove-domain`: Entfernt Domain-Block
- `list`: Zeigt alle Blacklist-Einträge

**Beispiele:**
```
/automod blacklist add-domain domain:malicious-site.com
/automod blacklist remove-domain domain:malicious-site.com
/automod blacklist list
```

## Aktionen

### Delete (Löschen)
- Nachricht wird sofort gelöscht
- Keine weiteren Strafen
- Ideal für leichte Verstöße

### Timeout (Stummschaltung)
- Nachricht wird gelöscht
- User wird für 10 Minuten stummgeschaltet
- Kann nicht schreiben oder sprechen
- Ideal für mittlere Verstöße

### Ban (Verbannung)
- Nachricht wird gelöscht
- User wird permanent gebannt
- Nur für schwere Verstöße
- Kann manuell rückgängig gemacht werden

## Severity Levels (Schweregrade)

Das System berechnet automatisch die Schwere eines Verstoßes:

- **LOW (1-3)**: Einzelne Verstöße → Delete
- **MEDIUM (4-6)**: Mehrfache Verstöße → Timeout
- **HIGH (7-9)**: Schwere Verstöße → Timeout (länger)
- **CRITICAL (10+)**: Extreme Verstöße → Ban

## Logging

Alle Auto-Mod Aktionen werden im konfigurierten Log-Channel protokolliert:

```
🛡️ Auto-Moderation Action

User: @Username#1234
Channel: #general
Violation: Spam detected
Severity: MEDIUM
Action: Timeout (10 minutes)
Message: [gelöschter Inhalt]
Timestamp: 2024-01-15 14:30:00
```

## Best Practices

### 1. Schrittweise Aktivierung
Aktiviere Features nacheinander und beobachte die Auswirkungen:
```
/automod toggle antispam true
# Warte ein paar Tage
/automod toggle antilink true
# etc.
```

### 2. Whitelist für Moderatoren
Füge Moderator-Rollen zur Whitelist hinzu:
```
/automod whitelist add-role role:@Moderator
/automod whitelist add-role role:@Admin
```

### 3. Separate Log-Channel
Erstelle einen dedizierten Channel für Auto-Mod Logs:
```
/automod logchannel channel:#automod-logs
```

### 4. Angemessene Schwellenwerte
Starte mit moderaten Werten:
```
/automod antispam messages:5 timeframe:10 action:timeout
```

### 5. Regelmäßige Überprüfung
Überprüfe die Statistiken regelmäßig:
```
/automod status
```

## Beispiel-Konfiguration

### Kleiner Server (< 100 Mitglieder)
```
/automod toggle antispam true
/automod toggle antiinvite true
/automod antispam messages:5 timeframe:10 action:delete
/automod antiinvite action:delete
/automod logchannel channel:#mod-logs
```

### Mittlerer Server (100-1000 Mitglieder)
```
/automod toggle antispam true
/automod toggle antiinvite true
/automod toggle antilink true
/automod toggle wordfilter true
/automod antispam messages:4 timeframe:8 action:timeout
/automod antiinvite action:timeout
/automod antilink action:delete
/automod logchannel channel:#automod-logs
/automod whitelist add-role role:@Trusted
```

### Großer Server (> 1000 Mitglieder)
```
/automod toggle antispam true
/automod toggle antiinvite true
/automod toggle antilink true
/automod toggle wordfilter true
/automod toggle massmention true
/automod toggle capsspam true
/automod toggle emojispam true
/automod antispam messages:3 timeframe:5 action:timeout
/automod antiinvite action:ban
/automod antilink action:timeout
/automod logchannel channel:#automod-logs
/automod whitelist add-role role:@Moderator
/automod whitelist add-role role:@Trusted
/automod whitelist add-channel channel:#links
```

## Fehlerbehebung

### Auto-Mod reagiert nicht
1. Überprüfe ob das Feature aktiviert ist: `/automod status`
2. Stelle sicher, dass der Bot die nötigen Permissions hat
3. Überprüfe ob der User/Channel auf der Whitelist ist

### Zu viele False Positives
1. Erhöhe die Schwellenwerte
2. Füge Channels zur Whitelist hinzu
3. Ändere die Aktion von "ban" zu "delete"

### Logs werden nicht angezeigt
1. Überprüfe ob ein Log-Channel gesetzt ist
2. Stelle sicher, dass der Bot Schreibrechte hat
3. Setze den Channel neu: `/automod logchannel`

## Technische Details

### Performance
- Alle Checks laufen asynchron
- Minimale Latenz (< 50ms)
- Effizientes Caching
- Keine Auswirkung auf Bot-Performance

### Datenspeicherung
- Konfiguration wird in MongoDB gespeichert
- Statistiken werden in-memory gehalten
- Automatische Bereinigung alter Daten

### Sicherheit
- Alle Regex-Patterns sind sicher
- Keine Code-Injection möglich
- Rate-Limiting für Commands
- Permission-Checks

## Support

Bei Fragen oder Problemen:
1. Überprüfe diese Dokumentation
2. Nutze `/automod status` für Diagnose
3. Kontaktiere den Bot-Administrator

## Updates

Das Auto-Mod System wird kontinuierlich verbessert. Neue Features:
- ✅ Spam-Erkennung
- ✅ Link-Filter
- ✅ Wortfilter
- ✅ Whitelist/Blacklist
- 🔄 Machine Learning (geplant)
- 🔄 Bild-Analyse (geplant)
- 🔄 Voice-Chat Moderation (geplant)