const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const target = path.join(root, 'api', '.env');

if (fs.existsSync(target)) process.exit(0);

const gateway = JSON.parse(fs.readFileSync(path.join(root, 'pasarela-sim', 'config.json'), 'utf8'));
const values = {
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  GATEWAY_API_KEY: gateway.apiKey,
  GATEWAY_WEBHOOK_SECRET: gateway.webhookSecret,
};

const env = fs
  .readFileSync(path.join(root, 'api', '.env.example'), 'utf8')
  .split('\n')
  .map((line) => {
    const key = line.split('=')[0];
    return key in values ? `${key}=${values[key]}` : line;
  })
  .join('\n');

fs.writeFileSync(target, env);
console.log('Created api/.env from api/.env.example');
