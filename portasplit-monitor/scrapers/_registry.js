'use strict';

// Registre des modules de scraping. Ajouter un site :
//   1) creer scrapers/<id>.js exportant { id, check({site}) }
//   2) l'ajouter ici
//   3) l'activer dans config.js
// (les sites "a resoudre" utilisent le module generique parametrable)

const modules = {
  darty: require('./darty'),
  fnac: require('./fnac'),
  boulanger: require('./boulanger'),
  amazon: require('./amazon'),
  ventigo: require('./ventigo'),
  ebay: require('./ebay'),
  leboncoin: require('./leboncoin'),
  generic: require('./generic'),
};

/** Retourne les scrapers actifs : [{ site, check() }]. */
function getScrapers(config) {
  return config.sites
    .filter((s) => s.enabled)
    .map((site) => {
      const mod = modules[site.module || site.id];
      if (!mod) throw new Error(`scraper introuvable pour "${site.id}" (module: ${site.module || site.id})`);
      return { site, check: () => mod.check({ site }) };
    });
}

module.exports = { modules, getScrapers };
