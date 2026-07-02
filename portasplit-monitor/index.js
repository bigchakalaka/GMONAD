'use strict';

require('dotenv').config();
const path = require('path');
const express = require('express');
const cron = require('node-cron');

const config = require('./config');
const state = require('./lib/state');
const runner = require('./lib/runner');
const telegram = require('./lib/telegram');
const { closeBrowser } = require('./lib/browser');
const { log } = require('./lib/logger');
const { formatParis } = require('./lib/util');

function statusEmoji(s) {
  return s === 'in_stock' ? '🟢' : s === 'out_of_stock' ? '🔴' : '⚪';
}

// Texte de la commande Telegram /status.
function statusText() {
  const sites = state.getAllStates();
  const inStock = sites.filter((s) => s.status === 'in_stock').length;
  const lines = sites.map(
    (s) => `${statusEmoji(s.status)} *${s.name}* — ${s.status}${s.price ? ` (${s.price})` : ''}`
  );
  const last = runner.getLastCycleAt() ? formatParis(runner.getLastCycleAt()) : '—';
  return (
    `📊 *État PortaSplit* — ${inStock}/${sites.length} en stock\n` +
    lines.join('\n') +
    `\n\nDernier cycle : ${last}`
  );
}

async function main() {
  state.init();
  log('info', 'main', `Démarrage moniteur PortaSplit (${config.productRef})${config.dryRun ? ' [DRY_RUN]' : ''}`);

  // ── Serveur HTTP / dashboard ──────────────────────────────────────────────
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.get('/api/state', (req, res) => {
    res.json({
      generatedAt: new Date().toISOString(),
      lastCycleAt: runner.getLastCycleAt(),
      cycleInProgress: runner.isCycleInProgress(),
      timezone: config.timezone,
      productRef: config.productRef,
      sites: state.getAllStates(),
    });
  });

  app.get('/api/history', (req, res) => {
    const hours = Math.min(parseInt(req.query.hours, 10) || 24, 168);
    res.json(state.getHistory(hours));
  });

  app.post('/api/check-now', (req, res) => {
    if (runner.isCycleInProgress()) {
      return res.status(202).json({ started: false, reason: 'cycle déjà en cours' });
    }
    res.json({ started: true });
    runner.runCycle('manuel').catch((e) => log('error', 'api', e.message));
  });

  app.listen(config.port, '0.0.0.0', () => {
    log('info', 'http', `Dashboard : http://0.0.0.0:${config.port} (accessible via l'IP Tailscale de l'Umbrel)`);
  });

  // ── Telegram : listener /status (bonus) ───────────────────────────────────
  telegram.startCommandListener(async () => statusText());

  // ── Planification ─────────────────────────────────────────────────────────
  cron.schedule(config.cron, () => runner.runCycle('planifié'), { timezone: config.timezone });
  log('info', 'main', `Planification cron "${config.cron}" (${config.timezone})`);

  // Cycle immediat au demarrage.
  runner.runCycle('démarrage').catch((e) => log('error', 'main', e.message));

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  log('info', 'main', 'Arrêt en cours...');
  telegram.stopCommandListener();
  await closeBrowser();
  process.exit(0);
}

main().catch((e) => {
  console.error('Erreur fatale au démarrage :', e);
  process.exit(1);
});
