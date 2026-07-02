'use strict';

const { formatParis } = require('./util');

/**
 * Log structure horodate Europe/Paris.
 * Niveaux : info | warn | error. PM2 capte stdout/stderr.
 */
function log(level, scope, msg) {
  const line = `[${formatParis()}] [${String(level).toUpperCase()}] [${scope}] ${msg}`;
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = { log };
