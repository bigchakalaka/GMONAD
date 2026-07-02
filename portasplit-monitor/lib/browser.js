'use strict';

const { chromium } = require('playwright');
const config = require('../config');
const { log } = require('./logger');

// Instance Chromium unique et partagee, relancee automatiquement si elle meurt.
let browser = null;
let launching = null;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
];

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;
  if (launching) return launching;

  launching = chromium
    .launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    })
    .then((b) => {
      browser = b;
      launching = null;
      b.on('disconnected', () => {
        log('warn', 'browser', 'Chromium deconnecte, sera relance au prochain besoin');
        browser = null;
      });
      log('info', 'browser', 'Chromium lance');
      return b;
    })
    .catch((e) => {
      launching = null;
      throw e;
    });

  return launching;
}

/**
 * Ouvre un contexte + page frais (UA/viewport/locale realistes), execute fn,
 * puis ferme systematiquement le contexte (pas de fuite memoire).
 */
async function withPage(fn) {
  const b = await getBrowser();
  const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  const context = await b.newContext({
    userAgent: ua,
    locale: 'fr-FR',
    timezoneId: config.timezone,
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: { 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(config.pageTimeoutMs);
  try {
    return await fn(page, context);
  } finally {
    await context.close().catch(() => {});
  }
}

async function closeBrowser() {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
    log('info', 'browser', 'Chromium ferme');
  }
}

module.exports = { getBrowser, withPage, closeBrowser };
