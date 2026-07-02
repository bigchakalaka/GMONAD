'use strict';

/**
 * Configuration centrale du moniteur PortaSplit.
 *
 * Ajouter / retirer un site = editer le tableau `sites` ci-dessous
 * (+ creer le module scrapers/<id>.js si besoin). Rien d'autre.
 *
 * Chaque entree de `sites` :
 *   id       : identifiant unique (sert de cle en base)
 *   name     : nom affiche (dashboard + Telegram)
 *   module   : nom du module dans scrapers/ (defaut = id)
 *   type     : 'retailer' (detection stock) | 'marketplace' (detection annonce)
 *   url      : URL a scraper (produit pour retailer, recherche pour marketplace)
 *   enabled  : true pour activer
 *   selectors: (optionnel) surcharge des selecteurs pour le module generique
 *   fiability: (optionnel) 'reliable' | 'best-effort' (indicatif dashboard)
 */

const productRef = 'MMCS-12HRN8-QRD0';

module.exports = {
  // Planification (cron, fuseau Europe/Paris applique dans index.js)
  cron: process.env.CRON_SCHEDULE || '*/5 * * * *',
  timezone: 'Europe/Paris',

  // Serveur HTTP / dashboard
  port: parseInt(process.env.PORT, 10) || 8080,

  // Comportement
  dryRun: String(process.env.DRY_RUN).toLowerCase() === 'true',
  unknownThreshold: 6, // N unknowns consecutifs avant alerte "scraper casse" (=30 min a 5 min)

  // Anti-blocage
  randomDelayMaxMs: 30000, // delai aleatoire 0-30s avant chaque check (desync)
  pageTimeoutMs: 25000, // timeout de chargement par page
  minDomainIntervalMs: 60000, // intervalle mini entre 2 hits sur le meme domaine

  // Produit surveille
  productRef,
  marketplaceKeywords: ['portasplit', 'midea portasplit', 'mmcs-12hrn8', 'midea portasplit 12000'],

  sites: [
    // ── Retailers structures (detection stock fiable) ──────────────────────
    {
      id: 'darty',
      name: 'Darty',
      type: 'retailer',
      // TODO 1er run : verifier l'URL produit exacte de la ref MMCS-12HRN8-QRD0.
      url: 'https://www.darty.com/nav/recherche/' + encodeURIComponent(productRef) + '.html',
      enabled: true,
      fiability: 'reliable',
    },
    {
      id: 'fnac',
      name: 'Fnac',
      type: 'retailer',
      url: 'https://www.fnac.com/a21457105', // fiche indiquee dans la spec
      enabled: true,
      fiability: 'reliable',
    },
    {
      id: 'boulanger',
      name: 'Boulanger',
      type: 'retailer',
      url: 'https://www.boulanger.com/ref/1216685', // ref indiquee dans la spec
      enabled: true,
      fiability: 'reliable',
    },
    {
      id: 'amazon',
      name: 'Amazon.fr',
      type: 'retailer',
      // TODO 1er run : resoudre l'ASIN puis figer https://www.amazon.fr/dp/<ASIN>
      url: 'https://www.amazon.fr/s?k=midea+portasplit+12000',
      enabled: true,
      fiability: 'best-effort', // anti-bot agressif
    },
    {
      id: 'ventigo',
      name: 'Ventigo',
      type: 'retailer',
      // TODO 1er run : l'URL de recherche par ref donnait un 404 ; a resoudre
      // manuellement (ouvrir le site, chercher "midea portasplit 12000",
      // recuperer l'URL de la FICHE PRODUIT et la figer ici).
      url: 'https://www.ventigo.fr/recherche?controller=search&s=' + encodeURIComponent('midea portasplit 12000'),
      enabled: true,
      fiability: 'best-effort',
    },

    // ── A resoudre au 1er run (module generique) : desactives par defaut ────
    {
      id: 'leroymerlin',
      name: 'Leroy Merlin',
      type: 'retailer',
      module: 'generic',
      url: 'https://www.leroymerlin.fr/produits/recherche.html?query=midea+portasplit+12000',
      enabled: false, // TODO : resoudre l'URL produit puis passer a true
      fiability: 'best-effort',
    },
    {
      id: 'castorama',
      name: 'Castorama',
      type: 'retailer',
      module: 'generic',
      url: 'https://www.castorama.fr/search?q=midea+portasplit+12000',
      enabled: false, // TODO : resoudre l'URL produit puis passer a true
      fiability: 'best-effort',
    },
    {
      id: 'manomano',
      name: 'ManoMano',
      type: 'retailer',
      module: 'generic',
      url: 'https://www.manomano.fr/recherche/midea%20portasplit%2012000',
      enabled: false, // TODO : resoudre l'URL produit puis passer a true
      fiability: 'best-effort',
    },

    // ── Marketplaces (detection nouvelle annonce) ──────────────────────────
    {
      id: 'ebay',
      name: 'eBay.fr',
      type: 'marketplace',
      url: 'https://www.ebay.fr/sch/i.html?_nkw=midea+portasplit+12000&_sop=10',
      enabled: true,
      fiability: 'best-effort',
    },
    {
      id: 'leboncoin',
      name: 'LeBonCoin',
      type: 'marketplace',
      url: 'https://www.leboncoin.fr/recherche?text=midea%20portasplit',
      enabled: true,
      fiability: 'best-effort', // DataDome tres agressif : souvent 'unknown'
    },

    // Back Market (reconditionne) — optionnel, desactive par defaut
    // { id: 'backmarket', name: 'Back Market', type: 'marketplace', module: 'generic', url: '...', enabled: false },
  ],
};
