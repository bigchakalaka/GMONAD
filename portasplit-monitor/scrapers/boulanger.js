'use strict';

const { checkRetailer } = require('../lib/retailer');

// Selecteurs Boulanger — VERIFIER / AJUSTER AU 1er RUN.
module.exports = {
  id: 'boulanger',
  check(ctx) {
    return checkRetailer(ctx, {
      inStockSelectors: [
        'button:has-text("Ajouter au panier")',
        'button.js-add-to-cart',
        '[data-automation-id="add-to-cart"]',
      ],
      outOfStockSelectors: [
        'text=/bient.t de retour/i',
        'text=/indisponible/i',
        'text=/produit épuisé/i',
      ],
      priceSelectors: ['.price__amount', 'span[itemprop="price"]', '[class*="price"]'],
    });
  },
};
