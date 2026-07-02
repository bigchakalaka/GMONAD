'use strict';

const { checkRetailer } = require('../lib/retailer');

// Selecteurs Ventigo — VERIFIER / AJUSTER AU 1er RUN.
module.exports = {
  id: 'ventigo',
  check(ctx) {
    return checkRetailer(ctx, {
      inStockSelectors: [
        'button:has-text("Ajouter au panier")',
        '#add-to-cart-or-refresh button[type="submit"]',
        'text=/en stock/i',
        'text=/disponible/i',
      ],
      outOfStockSelectors: [
        'text=/rupture de stock/i',
        'text=/indisponible/i',
        'text=/produit épuisé/i',
      ],
      priceSelectors: ['.current-price', 'span[itemprop="price"]', '[class*="price"]'],
    });
  },
};
