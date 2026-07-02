# PortaSplit Monitor

Moniteur de disponibilité du **Midea PortaSplit MMCS-12HRN8-QRD0** (3,5 kW / 12000 BTU réversible) sur les principaux sites FR.

- Vérifie le stock **toutes les 5 minutes, 24/7** (Playwright headless).
- Envoie une **alerte Telegram** dès qu'un site passe de *rupture/inconnu* → *disponible* (alerte **sur transition uniquement**, anti-spam strict).
- Sert un **dashboard web** sombre et dense sur le port `8080`, consultable via l'IP Tailscale de l'Umbrel.

Cible d'exécution : **Umbrel Home** (Intel N150, 16 GB RAM), IP LAN `192.168.1.31`, accès Tailscale + SSH.

---

## Architecture

```
Scheduler (node-cron */5) ─▶ Scrapers (1 module/site) ─▶ State store (SQLite)
                                                              │
                                        ┌─────────────────────┼───────────────┐
                                        ▼                     ▼
                                 Telegram notifier      Dashboard HTTP :8080
                                 (transition → dispo)   (Express + /api/*)
```

Un seul process Node : le scraping tourne en async isolé (`Promise.allSettled`, un scraper qui casse n'interrompt jamais les autres) et ne bloque pas le serveur HTTP.

### Arborescence

```
portasplit-monitor/
├── config.js               # liste des sites, cron, seuils, mots-clés
├── ecosystem.config.js     # PM2
├── index.js                # bootstrap : scheduler + Express + listener Telegram
├── lib/
│   ├── state.js            # SQLite : état courant + history + annonces vues
│   ├── telegram.js         # envoi + commande /status
│   ├── runner.js           # orchestration allSettled + logique de transition
│   ├── browser.js          # instance Chromium unique + contextes jetables
│   ├── retailer.js         # helper de détection stock générique
│   ├── domainGate.js       # sérialisation + intervalle mini par domaine
│   ├── logger.js
│   └── util.js
├── scrapers/
│   ├── _registry.js        # registre id → module
│   ├── darty.js  fnac.js  boulanger.js  amazon.js  ventigo.js
│   ├── generic.js          # retailer paramétrable (sites à résoudre)
│   ├── ebay.js  leboncoin.js   # marketplaces (nouvelle annonce)
├── public/index.html       # dashboard
├── scripts/check-once.js   # un cycle en DRY_RUN pour tester les sélecteurs
├── .env.example
└── package.json
```

---

## Installation sur l'Umbrel (pas-à-pas)

### 1. Se connecter

```bash
ssh umbrel@192.168.1.31      # ou l'utilisateur configuré
```

### 2. Node.js 20 LTS

Si Node n'est pas déjà en 20+ :

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # v20.x
```

### 3. Récupérer le projet

```bash
git clone <URL_DU_REPO> && cd portasplit-monitor
# (ce projet vit dans le sous-dossier portasplit-monitor/ du repo)
npm install
```

### 4. Installer Chromium pour Playwright

```bash
npx playwright install chromium --with-deps
```

> `--with-deps` installe les libs système requises (nécessite sudo). Sur un
> Umbrel Ubuntu-based, c'est la commande à privilégier.

### 5. Créer le bot Telegram

1. Sur Telegram, ouvrir **@BotFather** → `/newbot` → suivre les étapes → récupérer le **token** (`TELEGRAM_BOT_TOKEN`).
2. Écrire un message à votre nouveau bot (n'importe quoi).
3. Récupérer le **chat id** :
   ```bash
   curl "https://api.telegram.org/bot<VOTRE_TOKEN>/getUpdates"
   ```
   Chercher `"chat":{"id":<NOMBRE>...}` → c'est `TELEGRAM_CHAT_ID`.

### 6. Configurer `.env`

```bash
cp .env.example .env
nano .env
```

```env
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_CHAT_ID=987654321
PORT=8080
DRY_RUN=false
```

> `.env` n'est **jamais** commité (voir `.gitignore`).

### 7. Test à blanc (aucune alerte envoyée)

```bash
npm run check
```

Lance **un** cycle en `DRY_RUN`, affiche l'état détecté par site et logue les
messages Telegram qui *auraient* été envoyés. **C'est le moment de vérifier /
ajuster les sélecteurs** (voir plus bas).

### 8. Lancer avec PM2

```bash
sudo npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup            # exécuter la commande affichée (démarrage au boot)

# logs rotatifs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

Suivi : `pm2 logs portasplit-monitor` · `pm2 status` · `pm2 restart portasplit-monitor`.

### 9. Ouvrir le dashboard via Tailscale

```bash
tailscale ip -4          # ex. 100.x.y.z
```

Ouvrir **`http://<ip-tailscale>:8080`** depuis un appareil du tailnet.
Rien à ouvrir sur Internet : le port reste sur le LAN / Tailscale. Si un
pare-feu UFW est actif : `sudo ufw allow in on tailscale0 to any port 8080`.

---

## Utilisation

- **Dashboard** : tableau (statut 🟢/🔴/⚪, prix, dernière vérif, dernier changement, lien fiche), bandeau *X/N en stock*, bouton **Vérifier maintenant**, timeline 24 h, auto-refresh 30 s.
- **Telegram** :
  - Alerte dispo :
    ```
    🟢 PortaSplit DISPO — <Site>
    Prix : <prix ou n/c>
    <URL>
    Détecté : <heure Europe/Paris>
    ```
  - Scraper cassé (après 6 échecs consécutifs) : `⚠️ Scraper <site> KO (6 échecs). Sélecteur à revoir.`
  - Nouvelle annonce marketplace : `🆕 Nouvelle annonce — <Site> …`
  - Commande **/status** : le bot répond l'état courant de tous les sites.
- **API JSON** : `GET /api/state`, `GET /api/history?hours=24`, `POST /api/check-now`.

---

## Logique de détection

- 3 états par site : `in_stock`, `out_of_stock`, `unknown` (erreur / captcha / page changée).
- **Alerte stock uniquement sur transition** `out_of_stock | unknown → in_stock`. Ré-alerte si le produit repasse en rupture puis redevient dispo.
- `unknown` ne déclenche pas d'alerte stock ; après **6 unknowns consécutifs** (~30 min), **une seule** alerte « scraper cassé » (réarmée quand le scraper refonctionne).
- Marketplaces (eBay, LeBonCoin) : détection **nouvelle annonce** par item ID. Le premier passage *seed* les annonces existantes sans alerter.
- État persisté en SQLite (`data/state.db`) → survit à un redémarrage.

## Anti-blocage

- Playwright/Chromium headless (pas de simple `fetch`) pour les gros retailers (rendu JS).
- User-Agent réaliste + rotation légère, `locale: fr-FR`, viewport desktop.
- **Délai aléatoire 0–30 s** avant chaque check (désync).
- **Intervalle mini par domaine** + jamais 2 requêtes simultanées sur le même domaine (`lib/domainGate.js`).
- Timeout page 25 s. Captcha / challenge (DataDome, Cloudflare) détecté → statut `unknown`, pas de retry agressif.
- **Amazon** et **LeBonCoin** = *best effort* (anti-bot lourd). Leur échec est isolé et ne fait jamais planter le cycle.

---

## Ajouter / modifier un site

1. Créer `scrapers/<id>.js` exportant `{ id, check({ site }) }`. Le plus simple : réutiliser le helper `checkRetailer` (voir `scrapers/darty.js`).
2. L'enregistrer dans `scrapers/_registry.js`.
3. Ajouter l'entrée dans `config.js` (`enabled: true`).

Pour un retailer standard sans écrire de code, utiliser le module **`generic`** : ajouter dans `config.js` une entrée avec `module: 'generic'`, l'`url` et éventuellement des `selectors` sur-mesure (`inStockSelectors`, `outOfStockSelectors`, `priceSelectors`).

## Sélecteurs (à vérifier au 1er run)

Les sélecteurs de détection stock sont documentés **dans chaque module** `scrapers/<site>.js`, avec le rappel *« VERIFIER / AJUSTER AU 1er RUN »* : les sites changent régulièrement leur HTML. Lancer `npm run check`, repérer les sites en `unknown` avec le détail *« indicateurs stock introuvables »*, puis corriger les sélecteurs.

## À résoudre au premier run

Dans `config.js` :
- **URL produit exacte** de la réf `MMCS-12HRN8-QRD0` pour Darty (et confirmer Fnac `a21457105`, Boulanger `1216685`, Ventigo `81002309`).
- **ASIN Amazon** → remplacer l'URL de recherche par `https://www.amazon.fr/dp/<ASIN>`.
- **Leroy Merlin / Castorama / ManoMano** : entrées `enabled: false` (module `generic`) — résoudre l'URL produit via la recherche interne du site puis passer à `true`.

## Configuration rapide

| Réglage | Où | Défaut |
|---|---|---|
| Fréquence | `config.cron` / `CRON_SCHEDULE` | `*/5 * * * *` |
| Fuseau | `config.timezone` | `Europe/Paris` |
| Seuil "scraper cassé" | `config.unknownThreshold` | `6` |
| Délai anti-desync | `config.randomDelayMaxMs` | `30000` |
| Intervalle mini/domaine | `config.minDomainIntervalMs` | `60000` |
| Port dashboard | `PORT` | `8080` |
| Mode test (pas de Telegram) | `DRY_RUN` | `false` |

## Licence

MIT.
