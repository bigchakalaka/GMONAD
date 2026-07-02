'use strict';

const { withPage } = require('../lib/browser');
const { withDomain } = require('../lib/domainGate');
const { sleep, randInt } = require('../lib/util');
const { CAPTCHA_RE } = require('../lib/retailer');
const config = require('../config');
const { log } = require('../lib/logger');

// LeBonCoin — marketplace, BEST EFFORT : DataDome tres agressif.
// En cas de blocage -> status 'unknown' (ne fait pas planter le cycle).
// Selecteurs a verifier au 1er run.
module.exports = {
  id: 'leboncoin',
  async check({ site }) {
    const url = site.url;
    const result = {
      site: site.id,
      name: site.name,
      url,
      status: 'unknown',
      price: null,
      detail: null,
      listings: [],
      timestamp: new Date().toISOString(),
    };

    await sleep(randInt(0, config.randomDelayMaxMs));

    return withDomain(url, config.minDomainIntervalMs, async () => {
      try {
        return await withPage(async (page) => {
          const resp = await page.goto(url, { waitUntil: 'domcontentloaded' });

          let html = '';
          try {
            html = await page.content();
          } catch {
            /* ignore */
          }
          if (CAPTCHA_RE.test(html) || (resp && resp.status() === 403)) {
            result.detail = 'DataDome / captcha (best-effort)';
            return result;
          }
          if (resp && resp.status() >= 400) {
            result.detail = 'HTTP ' + resp.status();
            return result;
          }

          const items = await page.$$eval('a[data-test-id="ad"], a[href*="/ad/"]', (nodes) =>
            nodes
              .map((n) => {
                const href = n.href;
                const m = href && href.match(/\/(\d+)(?:\.htm|\/?$|\?)/);
                if (!href || !m) return null;
                const titleEl = n.querySelector('[data-test-id="adcard-title"], p, h2');
                const priceEl = n.querySelector('[data-test-id="price"], [class*="price"]');
                return {
                  id: m[1],
                  url: href.split('?')[0],
                  title: titleEl ? titleEl.innerText.trim() : '',
                  price: priceEl ? priceEl.innerText.trim() : null,
                };
              })
              .filter(Boolean)
          );

          const seen = new Set();
          const listings = [];
          for (const it of items) {
            if (!seen.has(it.id)) {
              seen.add(it.id);
              listings.push(it);
            }
          }

          result.listings = listings;
          result.status = listings.length ? 'in_stock' : 'out_of_stock';
          result.detail = `${listings.length} annonce(s)`;
          return result;
        });
      } catch (e) {
        result.detail = (e && e.message ? e.message : String(e)).slice(0, 200);
        log('warn', site.id, 'echec check : ' + result.detail);
        return result;
      }
    });
  },
};
