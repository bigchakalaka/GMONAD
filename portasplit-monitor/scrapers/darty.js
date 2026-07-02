'use strict';

const { checkRetailer } = require('../lib/retailer');

// Selecteurs Darty — VERIFIER / AJUSTER AU 1er RUN (le HTML des retailers change).
module.exports = {
  id: 'darty',
  check(ctx) {
    return checkRetailer(ctx, {
      inStockSelectors: [
        'button:has-text("Ajouter au panier")',
        'button.add_to_cart',
        '[data-automation-id="add-to-cart"]',
      ],
      outOfStockSelectors: [
        'text=/produit épuisé/i',
        'text=/indisponible/i',
        'text=/en rupture/i',
        'button:has-text("Indisponible")',
      ],
      priceSelectors: [
        'span[itemprop="price"]',
        '.darty_prix',
        '[class*="product-price"]',
        '[class*="price"]',
      ],
    });
  },
};
