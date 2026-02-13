# Aviopika WhatsApp Bot

Ein WhatsApp-Bot für Flugpreisabfragen nach Kosovo.

## Setup

### Voraussetzungen

- Node.js 22+ (LTS)
- Laufende Aviopika API (Port 3000)
- WhatsApp auf dem Handy

### Starten

```bash
# Bot starten
npm run bot

# Bot mit Auto-Reload (Development)
npm run bot:dev
```

### Erste Authentifizierung

1. Bot starten mit `npm run bot`
2. QR-Code erscheint im Terminal
3. WhatsApp öffnen → Verknüpfte Geräte → Gerät hinzufügen
4. QR-Code scannen
5. Bot ist bereit!

Die Session wird in `.wwebjs_auth/` gespeichert und muss nicht jedes Mal neu gescannt werden.

## Unterstützte Befehle

### Flugsuche

```
DUS PRN 15.03
Düsseldorf Pristina 15. März
Frankfurt Kosovo 20.03.2025
```

### Hin-Rückflug

```
DUS PRN 15.03-22.03
DUS PRN 15.03 bis 22.03
Düsseldorf Pristina 15.-22. März
```

### Hilfe

```
hilfe
help
?
```

## Unterstützte Flughäfen

### Deutschland
- DUS - Düsseldorf
- FRA - Frankfurt
- MUC - München
- STR - Stuttgart
- BER - Berlin
- HAM - Hamburg
- CGN - Köln
- HAJ - Hannover
- NUE - Nürnberg
- DTM - Dortmund

### Schweiz
- ZRH - Zürich
- BSL - Basel
- GVA - Genf

### Österreich
- VIE - Wien
- SZG - Salzburg
- INN - Innsbruck

### Kosovo
- PRN - Pristina

## Konfiguration

### OpenAI API (Pflicht)

```bash
# .env erstellen
cp bot/.env.example .env

# OpenAI API Key eintragen
OPENAI_API_KEY=sk-...
```

Der Bot nutzt ausschließlich ChatGPT (kein Regex-Fallback).

Umgebungsvariablen:

| Variable | Default | Beschreibung |
|----------|---------|--------------|
| `OPENAI_API_KEY` | - | OpenAI API Key (erforderlich) |
| `OPENAI_MODEL` | `gpt-5-mini` | GPT Model |
| `AVIOPIKA_API_URL` | `http://localhost:3000` | API URL für Flugsuche |
| `AVIOPIKA_URL` | `https://autopika.al` | Website URL für Links |
| `OPENAI_TIMEOUT_MS` | `20000` | OpenAI Timeout (ms) |

### Hinweis

- Der Bot startet nur mit gültigem OpenAI API Key.

## Deployment (Docker)

### Voraussetzungen
- Docker + Docker Compose
- Persistenter Storage für `.wwebjs_auth/`

### Schritte
1. `.env` erstellen:
   ```bash
   cp bot/.env.example bot/.env
   ```
2. Werte in `bot/.env` setzen.
3. Container bauen + starten:
   ```bash
   cd bot
   docker compose up -d --build
   ```
4. QR-Code aus Logs scannen:
   ```bash
   docker compose logs -f aviopika-bot
   ```

### Session-Backup
```bash
cd bot
./backup-session.sh
```

### Logs (Rotation)
Docker-Logs werden rotiert via `docker-compose.yml`:
`max-size=10m`, `max-file=3`.

## Deployment (PM2, VPS Ubuntu 22.04)

### Ziel
Generic Anleitung + konkrete Hinweise fuer eine kleine IONOS VPS (1 vCPU / 1 GB RAM / 10 GB SSD, Ubuntu 22.04).

### Voraussetzungen
- Node.js 22+ (LTS)
- PM2
- Chromium Abhaengigkeiten fuer puppeteer

### Installation (Ubuntu 22.04, generisch)
```bash
sudo apt update
sudo apt install -y curl ca-certificates git
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
sudo apt install -y chromium

# Falls Chromium nicht startet: zusaetzliche Libs nachinstallieren
# sudo apt install -y \
#   libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
#   libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2 \
#   libpangocairo-1.0-0 libpango-1.0-0 libgtk-3-0 libx11-xcb1 libxss1 \
#   libxshmfence1 libxext6 libx11-6
```

### IONOS VPS Hinweise (1 vCPU / 1 GB RAM)
- Swap aktivieren (empfohlen, 1-2 GB):
  ```bash
  sudo fallocate -l 1G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```
- SSH Hardening (minimal):
  ```bash
  sudo apt install -y ufw
  sudo ufw allow OpenSSH
  sudo ufw enable
  ```
- Optional: einen eigenen User nutzen (statt root), wenn nicht bereits eingerichtet.

### Starten
```bash
cp bot/.env.example bot/.env
sudo nano bot/.env

cd bot
npm ci

# Optional: falls noetig
# export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

pm2 start "npm run bot" --name aviopika-bot
pm2 save
pm2 status
```

### Logs
```bash
pm2 logs aviopika-bot
```

### Autostart nach Reboot
```bash
pm2 startup
pm2 save
```

## Architektur

```
bot/
├── index.ts           # Haupt-Bot, WhatsApp-Client
├── parsers/
│   ├── index.ts       # ChatGPT-Parser Wrapper
│   └── chatgpt.ts     # ChatGPT-Parser (OpenAI API)
├── formatter.ts       # Antwort-Formatierung
├── backup-session.sh  # Session-Backup
├── Dockerfile         # Container Build
├── docker-compose.yml # Container Run
├── types.d.ts         # TypeScript Deklarationen
└── README.md          # Diese Datei
```

**Parser-Flow:**
```
User Message
     ↓
chatgpt.ts (OpenAI)
     ↓
Structured Query
     ↓
Flight Search
```

## Rate Limiting

- Max. 10 Anfragen pro Minute pro Nummer
- Max. 100 Anfragen pro Tag pro Nummer

## Troubleshooting

### QR-Code erscheint nicht
- `.wwebjs_auth/` Ordner löschen und neu starten

### Bot antwortet nicht
- API läuft? `npm run dev` in anderem Terminal
- Puppeteer-Fehler? Chromium installieren
- OpenAI API Key gesetzt?

### Session abgelaufen
- `.wwebjs_auth/` löschen
- Bot neu starten und QR-Code scannen

## Wichtige Hinweise

⚠️ **Inoffiziell**: Dieser Bot nutzt whatsapp-web.js, das nicht offiziell von WhatsApp unterstützt wird. Es besteht ein Risiko der Account-Sperrung.

✅ **Empfehlung**: Für Production auf WhatsApp Business API migrieren.
