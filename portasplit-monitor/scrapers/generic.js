'use strict';

const { checkRetailer } = require('../lib/retailer');

// Scraper retailer generique et parametrable, utilise pour les sites dont
// l'URL/les selecteurs restent a resoudre (Leroy Merlin, Castorama, ManoMano...).
// Surcharger via `selectors` dans l'entree config.js du site.
const DEFAULTS = {
  inStockSelectors: [
    'button:has-text("Ajouter au panier")',
    'button:has-text("Ajouter")',
    'text=/en stock/i',
  ],
  outOfStockSelectors: [
    'text=/indisponible/i',
    'text=/épuisé/i',
    'text=/rupture/i',
    'text=/bient.t de retour/i',
  ],
  priceSelectors: ['span[itemprop="price"]', '[class*="price"]'],
};

module.exports = {
  id: 'generic',
  check(ctx) {
    const s = (ctx.site && ctx.site.selectors) || {};
    return checkRetailer(ctx, {
      inStockSelectors: s.inStockSelectors || DEFAULTS.inStockSelectors,
      outOfStockSelectors: s.outOfStockSelectors || DEFAULTS.outOfStockSelectors,
      priceSelectors: s.priceSelectors || DEFAULTS.priceSelectors,
      captchaSelectors: s.captchaSelectors,
    });
  },
};
