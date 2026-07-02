'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'state.db');

let db = null;

function init() {
  if (db) return db;
  fs.mkdirSync(DB_DIR, { recursive: true });
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS site_state (
      site TEXT PRIMARY KEY,
      name TEXT,
      url TEXT,
      status TEXT,
      price TEXT,
      detail TEXT,
      last_check TEXT,
      last_change TEXT,
      consecutive_unknown INTEGER DEFAULT 0,
      alerted_broken INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site TEXT,
      status TEXT,
      price TEXT,
      ts TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_history_ts ON history(ts);

    CREATE TABLE IF NOT EXISTS seen_listings (
      site TEXT,
      listing_id TEXT,
      title TEXT,
      url TEXT,
      price TEXT,
      first_seen TEXT,
      PRIMARY KEY (site, listing_id)
    );
  `);
  return db;
}

function getState(site) {
  return db.prepare('SELECT * FROM site_state WHERE site = ?').get(site);
}

function getAllStates() {
  return db.prepare('SELECT * FROM site_state ORDER BY name').all();
}

function upsertState(s) {
  db.prepare(
    `INSERT INTO site_state
       (site, name, url, status, price, detail, last_check, last_change, consecutive_unknown, alerted_broken)
     VALUES
       (@site, @name, @url, @status, @price, @detail, @last_check, @last_change, @consecutive_unknown, @alerted_broken)
     ON CONFLICT(site) DO UPDATE SET
       name=@name, url=@url, status=@status, price=@price, detail=@detail,
       last_check=@last_check, last_change=@last_change,
       consecutive_unknown=@consecutive_unknown, alerted_broken=@alerted_broken`
  ).run({
    site: s.site,
    name: s.name,
    url: s.url,
    status: s.status,
    price: s.price ?? null,
    detail: s.detail ?? null,
    last_check: s.last_check,
    last_change: s.last_change ?? null,
    consecutive_unknown: s.consecutive_unknown ?? 0,
    alerted_broken: s.alerted_broken ?? 0,
  });
}

function addHistory(site, status, price) {
  db.prepare('INSERT INTO history (site, status, price, ts) VALUES (?, ?, ?, ?)').run(
    site,
    status,
    price ?? null,
    new Date().toISOString()
  );
}

function getHistory(hours) {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  return db
    .prepare('SELECT site, status, price, ts FROM history WHERE ts >= ? ORDER BY ts ASC')
    .all(since);
}

/** Purge l'historique plus vieux que `days` jours (appele periodiquement). */
function pruneHistory(days) {
  const before = new Date(Date.now() - days * 86400 * 1000).toISOString();
  return db.prepare('DELETE FROM history WHERE ts < ?').run(before).changes;
}

// ── Marketplaces : suivi des annonces deja vues ─────────────────────────────
function isListingSeen(site, listingId) {
  return !!db
    .prepare('SELECT 1 FROM seen_listings WHERE site = ? AND listing_id = ?')
    .get(site, String(listingId));
}

function getSeenCount(site) {
  return db.prepare('SELECT COUNT(*) c FROM seen_listings WHERE site = ?').get(site).c;
}

function addListing(site, l) {
  db.prepare(
    `INSERT OR IGNORE INTO seen_listings (site, listing_id, title, url, price, first_seen)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(site, String(l.id), l.title ?? null, l.url ?? null, l.price ?? null, new Date().toISOString());
}

module.exports = {
  init,
  getState,
  getAllStates,
  upsertState,
  addHistory,
  getHistory,
  pruneHistory,
  isListingSeen,
  getSeenCount,
  addListing,
};
