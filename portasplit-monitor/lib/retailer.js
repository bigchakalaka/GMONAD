'use strict';

const { withPage } = require('./browser');
const { withDomain } = require('./domainGate');
const { sleep, randInt } = require('./util');
const { log } = require('./logger');
const config = require('../config');

// Motifs generiques de challenge anti-bot (Cloudflare / DataDome / captcha).
const CAPTCHA_RE = /datadome|captcha-delivery|geo\.captcha|are you a human|cf-chl|cf-challenge|verifying you are human|robot check|saisissez les caract/i;

async function anyVisible(page, selectors) {
  for (const sel of selectors || []) {
    try {
      if (await page.locator(sel).first().isVisible()) return true;
    } catch {
      /* selecteur invalide / detache : on ignore */
    }
  }
  return false;
}

async function firstText(page, selectors) {
  for (const sel of selectors || []) {
    try {
      const loc = page.locator(sel).first();
      if ((await loc.count()) && (await loc.isVisible())) {
        const t = (await loc.innerText()).trim();
        if (t) return t.replace(/\s+/g, ' ').slice(0, 60);
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * Verif generique d'un retailer via Playwright.
 * opts = { inStockSelectors[], outOfStockSelectors[], priceSelectors[], captchaSelectors?[] }
 * Retourne { site, name, url, status, price, detail, timestamp }.
 */
async function checkRetailer(ctx, opts) {
  const { site } = ctx;
  const result = {
    site: site.id,
    name: site.name,
    url: site.url,
    status: 'unknown',
    price: null,
    detail: null,
    timestamp: new Date().toISOString(),
  };

  if (!site.url) {
    result.detail = 'URL non configuree';
    return result;
  }

  // Desync : delai aleatoire 0-30s avant le check.
  await sleep(randInt(0, config.randomDelayMaxMs));

  return withDomain(site.url, config.minDomainIntervalMs, async () => {
    try {
      return await withPage(async (page) => {
        const resp = await page.goto(site.url, { waitUntil: 'domcontentloaded' });

        // Detection captcha / challenge -> unknown, pas de retry agressif.
        let html = '';
        try {
          html = await page.content();
        } catch {
          /* ignore */
        }
        if (CAPTCHA_RE.test(html) || (await anyVisible(page, opts.captchaSelectors))) {
          result.detail = 'captcha / anti-bot detecte';
          return result;
        }

        if (resp && resp.status() >= 400) {
          result.detail = 'HTTP ' + resp.status();
          return result;
        }

        result.price = await firstText(page, opts.priceSelectors);

        const inStock = await anyVisible(page, opts.inStockSelectors);
        const outStock = await anyVisible(page, opts.outOfStockSelectors);

        if (outStock && !inStock) {
          result.status = 'out_of_stock';
        } else if (inStock) {
          result.status = 'in_stock';
        } else {
          // Ni l'un ni l'autre : la page a peut-etre change de structure.
          result.status = 'unknown';
          result.detail = 'indicateurs stock introuvables (verifier les selecteurs)';
        }
        return result;
      });
    } catch (e) {
      result.status = 'unknown';
      result.detail = (e && e.message ? e.message : String(e)).slice(0, 200);
      log('warn', site.id, 'echec check : ' + result.detail);
      return result;
    }
  });
}

module.exports = { checkRetailer, anyVisible, firstText, CAPTCHA_RE };
