const path = require('path')
const fs = require('fs')

// Load .env file from bot directory
const envPath = path.join(__dirname, '.env')
const env = {}

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      if (key && valueParts.length > 0) {
        let value = valueParts.join('=').trim()
        // Remove surrounding quotes (single or double)
        if ((value.startsWith('"') && value.endsWith('"'))
          || (value.startsWith('\'') && value.endsWith('\''))) {
          value = value.slice(1, -1)
        }
        env[key.trim()] = value
      }
    }
  })
}

module.exports = {
  apps: [{
    name: 'krahaso-bot',
    script: 'bot/index.ts',
    cwd: path.join(__dirname, '..'),
    interpreter: 'node_modules/.bin/tsx',
    env,
    watch: false,
    autorestart: true,
    max_restarts: 10,
    restart_delay: 5000,
    exp_backoff_restart_delay: 100,
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: 'logs/bot-error.log',
    out_file: 'logs/bot-out.log',
    merge_logs: true
  }]
}
