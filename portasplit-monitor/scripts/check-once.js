'use strict';

// Lance UN cycle de scraping puis affiche l'etat, sans planifier ni servir le
// dashboard. Force DRY_RUN (aucun Telegram envoye) pour tester les selecteurs.
//   node scripts/check-once.js
require('dotenv').config();
process.env.DRY_RUN = 'true';

const state = require('../lib/state');
const runner = require('../lib/runner');
const { closeBrowser } = require('../lib/browser');

(async () => {
  state.init();
  await runner.runCycle('cli');
  console.log('\n=== État final ===');
  console.log(JSON.stringify(state.getAllStates(), null, 2));
  await closeBrowser();
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
