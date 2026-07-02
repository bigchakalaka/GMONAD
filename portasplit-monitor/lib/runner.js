'use strict';

const registry = require('../scrapers/_registry');
const state = require('./state');
const telegram = require('./telegram');
const config = require('../config');
const { log } = require('./logger');
const { timeParis } = require('./util');

let cycleInProgress = false;
let lastCycleAt = null;

function getLastCycleAt() {
  return lastCycleAt;
}
function isCycleInProgress() {
  return cycleInProgress;
}

function stockMessage(site, res) {
  return (
    `🟢 PortaSplit DISPO — ${site.name}\n` +
    `Prix : ${res.price || 'n/c'}\n` +
    `${res.url}\n` +
    `Détecté : ${timeParis(res.timestamp)}`
  );
}

function newListingMessage(site, l) {
  return (
    `🆕 Nouvelle annonce — ${site.name}\n` +
    `${l.title || 'PortaSplit'}\n` +
    `Prix : ${l.price || 'n/c'}\n` +
    `${l.url}`
  );
}

async function handleRetailer(site, res) {
  const prev = state.getState(site.id);
  state.addHistory(site.id, res.status, res.price);

  const prevStatus = prev ? prev.status : 'unknown';
  let consecutiveUnknown = prev ? prev.consecutive_unknown : 0;
  let alertedBroken = prev ? !!prev.alerted_broken : false;
  let lastChange = prev ? prev.last_change : res.timestamp;

  if (res.status === 'unknown') {
    consecutiveUnknown += 1;
    if (consecutiveUnknown >= config.unknownThreshold && !alertedBroken) {
      await telegram.notify(`⚠️ Scraper ${site.name} KO (${consecutiveUnknown} échecs). Sélecteur à revoir.`);
      alertedBroken = true;
    }
  } else {
    consecutiveUnknown = 0;
    alertedBroken = false; // le scraper refonctionne
    if (res.status !== prevStatus) {
      lastChange = res.timestamp;
      // Alerte uniquement sur transition (out_of_stock | unknown) -> in_stock.
      if (res.status === 'in_stock') {
        await telegram.notify(stockMessage(site, res));
      }
    }
  }

  state.upsertState({
    site: site.id,
    name: site.name,
    url: res.url || site.url,
    status: res.status,
    price: res.price,
    detail: res.detail,
    last_check: res.timestamp,
    last_change: lastChange,
    consecutive_unknown: consecutiveUnknown,
    alerted_broken: alertedBroken ? 1 : 0,
  });
}

async function handleMarketplace(site, res) {
  const prev = state.getState(site.id);
  state.addHistory(site.id, res.status, res.price);

  let consecutiveUnknown = prev ? prev.consecutive_unknown : 0;
  let alertedBroken = prev ? !!prev.alerted_broken : false;

  if (res.status === 'unknown') {
    consecutiveUnknown += 1;
    if (consecutiveUnknown >= config.unknownThreshold && !alertedBroken) {
      await telegram.notify(`⚠️ Scraper ${site.name} KO (${consecutiveUnknown} échecs). Sélecteur à revoir.`);
      alertedBroken = true;
    }
  } else {
    consecutiveUnknown = 0;
    alertedBroken = false;
    // Au tout premier passage on seed les annonces existantes SANS alerter.
    const firstRun = state.getSeenCount(site.id) === 0;
    for (const l of res.listings || []) {
      if (!l || l.id == null) continue;
      if (!state.isListingSeen(site.id, l.id)) {
        state.addListing(site.id, l);
        if (!firstRun) await telegram.notify(newListingMessage(site, l));
      }
    }
  }

  state.upsertState({
    site: site.id,
    name: site.name,
    url: res.url || site.url,
    status: res.status,
    price: res.price,
    detail: res.detail,
    last_check: res.timestamp,
    last_change: prev ? prev.last_change : res.timestamp,
    consecutive_unknown: consecutiveUnknown,
    alerted_broken: alertedBroken ? 1 : 0,
  });
}

/** Execute un cycle complet. Ne throw jamais (isolation par module). */
async function runCycle(trigger = 'planifié') {
  if (cycleInProgress) {
    log('warn', 'runner', 'cycle déjà en cours, déclenchement ignoré');
    return;
  }
  cycleInProgress = true;
  const started = Date.now();
  log('info', 'runner', `Cycle démarré (${trigger})`);

  try {
    const scrapers = registry.getScrapers(config);
    const results = await Promise.allSettled(scrapers.map((s) => s.check()));

    for (let i = 0; i < scrapers.length; i++) {
      const site = scrapers[i].site;
      const r = results[i];
      let res;
      if (r.status === 'fulfilled') {
        res = r.value;
      } else {
        res = {
          site: site.id,
          name: site.name,
          url: site.url,
          status: 'unknown',
          price: null,
          detail: (r.reason && r.reason.message) || 'exception scraper',
          timestamp: new Date().toISOString(),
        };
      }
      try {
        if (site.type === 'marketplace') await handleMarketplace(site, res);
        else await handleRetailer(site, res);
        log('info', site.id, `${res.status}${res.price ? ' @ ' + res.price : ''}${res.detail ? ' (' + res.detail + ')' : ''}`);
      } catch (e) {
        log('error', 'runner', `traitement ${site.id} : ${e.message}`);
      }
    }

    // Entretien : purge de l'historique > 7 jours.
    try {
      state.pruneHistory(7);
    } catch (e) {
      log('warn', 'runner', 'purge historique : ' + e.message);
    }
  } catch (e) {
    log('error', 'runner', 'erreur cycle : ' + (e.message || e));
  } finally {
    lastCycleAt = new Date().toISOString();
    cycleInProgress = false;
    log('info', 'runner', `Cycle terminé en ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
}

module.exports = { runCycle, getLastCycleAt, isCycleInProgress };
