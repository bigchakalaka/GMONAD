'use strict';

const { checkRetailer } = require('../lib/retailer');

// Amazon.fr — BEST EFFORT : anti-bot agressif (captcha frequent -> unknown).
// Selecteurs a VERIFIER / AJUSTER AU 1er RUN + resoudre l'ASIN dans config.js.
module.exports = {
  id: 'amazon',
  check(ctx) {
    return checkRetailer(ctx, {
      inStockSelectors: [
        '#add-to-cart-button',
        '#buy-now-button',
        '#availability .a-color-success',
        'text=/en stock/i',
      ],
      outOfStockSelectors: [
        'text=/actuellement indisponible/i',
        '#availability .a-color-price:has-text("indisponible")',
        'text=/non disponible/i',
      ],
      priceSelectors: [
        '#corePrice_feature_div .a-offscreen',
        '.a-price .a-offscreen',
        'span[itemprop="price"]',
      ],
      captchaSelectors: [
        'form[action*="validateCaptcha"]',
        'text=/Saisissez les caractères/i',
        'text=/Tapez les caractères/i',
        '#captchacharacters',
      ],
    });
  },
};
