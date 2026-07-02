'use strict';

const { sleep } = require('./util');

// Serialise les acces par domaine (jamais 2 requetes simultanees vers le meme
// hote) et garantit un intervalle minimum entre 2 hits sur ce domaine.
const lastHit = new Map(); // domaine -> timestamp du dernier acces
const chains = new Map(); // domaine -> promesse de la file en cours

function domainOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return String(url);
  }
}

async function withDomain(url, minIntervalMs, fn) {
  const d = domainOf(url);
  const prev = chains.get(d) || Promise.resolve();

  let release;
  const gate = new Promise((r) => {
    release = r;
  });
  chains.set(d, prev.then(() => gate));

  await prev.catch(() => {});
  const waitMs = minIntervalMs - (Date.now() - (lastHit.get(d) || 0));
  if (waitMs > 0) await sleep(waitMs);

  try {
    return await fn();
  } finally {
    lastHit.set(d, Date.now());
    release();
  }
}

module.exports = { withDomain, domainOf };
