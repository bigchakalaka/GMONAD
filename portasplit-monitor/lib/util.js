'use strict';

const config = require('../config');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Formate une date ISO (ou maintenant) en heure locale Europe/Paris. */
function formatParis(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d.getTime())) return String(iso);
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: config.timezone,
  }).format(d);
}

/** Heure seule Europe/Paris (pour messages courts). */
function timeParis(iso) {
  const d = iso ? new Date(iso) : new Date();
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: config.timezone,
  }).format(d);
}

module.exports = { sleep, randInt, formatParis, timeParis };
