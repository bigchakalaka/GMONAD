'use strict';

const https = require('https');
const config = require('../config');
const { log } = require('./logger');
const { sleep } = require('./util');

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

function api(method, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${TOKEN}/${method}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
        timeout: 40000,
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            const j = JSON.parse(body);
            if (j.ok) resolve(j);
            else reject(new Error(j.description || 'erreur Telegram'));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/** Envoie un message au chat configure. Respecte DRY_RUN. Ne throw jamais. */
async function notify(text) {
  if (config.dryRun) {
    log('info', 'telegram', '[DRY_RUN] ' + text.replace(/\n/g, ' | '));
    return;
  }
  if (!TOKEN || !CHAT_ID) {
    log('warn', 'telegram', 'TOKEN/CHAT_ID manquant, message non envoye : ' + text.split('\n')[0]);
    return;
  }
  try {
    await api('sendMessage', {
      chat_id: CHAT_ID,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: false,
    });
    log('info', 'telegram', 'alerte envoyee : ' + text.split('\n')[0]);
  } catch (e) {
    log('error', 'telegram', 'envoi echoue : ' + e.message);
  }
}

/**
 * Ecoute la commande /status (bonus) via long-polling getUpdates.
 * getStatusText() doit renvoyer le texte (Markdown) a repondre.
 */
let polling = false;
function startCommandListener(getStatusText) {
  if (config.dryRun || !TOKEN) {
    log('info', 'telegram', 'listener commandes desactive (dry-run ou pas de token)');
    return;
  }
  if (polling) return;
  polling = true;
  let offset = 0;

  (async function loop() {
    log('info', 'telegram', 'listener /status actif');
    while (polling) {
      try {
        const res = await api('getUpdates', { offset, timeout: 30 });
        for (const u of res.result) {
          offset = u.update_id + 1;
          const msg = u.message;
          if (!msg || !msg.text) continue;
          if (msg.text.trim().toLowerCase().startsWith('/status')) {
            const text = await getStatusText();
            await api('sendMessage', {
              chat_id: msg.chat.id,
              text,
              parse_mode: 'Markdown',
              disable_web_page_preview: true,
            }).catch((e) => log('warn', 'telegram', 'reponse /status : ' + e.message));
          }
        }
      } catch (e) {
        log('warn', 'telegram', 'getUpdates : ' + e.message);
        await sleep(5000);
      }
    }
  })();
}

function stopCommandListener() {
  polling = false;
}

module.exports = { notify, startCommandListener, stopCommandListener };
