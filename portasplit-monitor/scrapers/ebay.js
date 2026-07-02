'use strict';

const { withPage } = require('../lib/browser');
const { withDomain } = require('../lib/domainGate');
const { sleep, randInt } = require('../lib/util');
const { CAPTCHA_RE } = require('../lib/retailer');
const config = require('../config');
const { log } = require('../lib/logger');

// eBay.fr — marketplace : on liste les annonces et on alerte sur les NOUVELLES
// (tracking par item ID). Selecteurs a verifier au 1er run.
module.exports = {
  id: 'ebay',
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
          if (CAPTCHA_RE.test(html)) {
            result.detail = 'captcha / anti-bot detecte';
            return result;
          }
          if (resp && resp.status() >= 400) {
            result.detail = 'HTTP ' + resp.status();
            return result;
          }

          const items = await page.$$eval('li.s-item, li.s-card', (nodes) =>
            nodes
              .map((n) => {
                const a = n.querySelector('a.s-item__link, a[href*="/itm/"]');
                const href = a ? a.href : null;
                const m = href && href.match(/\/itm\/(\d+)/);
                if (!href || !m) return null;
                const titleEl = n.querySelector('.s-item__title, .s-card__title');
                const priceEl = n.querySelector('.s-item__price, .s-card__price');
                return {
                  id: m[1],
                  url: href.split('?')[0],
                  title: titleEl ? titleEl.innerText.trim() : '',
                  price: priceEl ? priceEl.innerText.trim() : null,
                };
              })
              .filter(Boolean)
          );

          // Dedupe par id + on ignore la 1ere carte "shop on ebay" bidon.
          const seen = new Set();
          const listings = [];
          for (const it of items) {
            if (/shop on ebay/i.test(it.title)) continue;
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
