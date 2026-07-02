'use strict';

const { checkRetailer } = require('../lib/retailer');

// Selecteurs Fnac — VERIFIER / AJUSTER AU 1er RUN.
module.exports = {
  id: 'fnac',
  check(ctx) {
    return checkRetailer(ctx, {
      inStockSelectors: [
        'button:has-text("Ajouter au panier")',
        '.f-buyBox-btnAddToCart',
        '[data-automation-id="add-to-cart"]',
      ],
      outOfStockSelectors: [
        'text=/indisponible/i',
        'text=/bient.t de retour/i',
        'text=/actuellement indisponible/i',
      ],
      priceSelectors: ['.f-priceBox-price', 'span[itemprop="price"]', '[class*="price"]'],
    });
  },
};
