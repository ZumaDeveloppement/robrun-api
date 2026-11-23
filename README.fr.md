# ROB RUN Community API

[![Licence : MIT](https://img.shields.io/badge/licence-MIT-8a4fff.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%E2%89%A5%2020-8a4fff.svg)](package.json)
[![Dépendances](https://img.shields.io/badge/d%C3%A9pendances-0-8a4fff.svg)](package.json)
[![Discord](https://img.shields.io/badge/Discord-rejoindre-8a4fff.svg?logo=discord&logoColor=white)](https://discord.gg/rejoins)

[English](README.md)

Une petite **API HTTP en lecture seule pour [ROB RUN](https://store.steampowered.com/app/4262460)** (Steam) : nombre de joueurs
en direct avec pic des 24 h et historique, patch notes officiels, avis, prix et, en option, les stats d'un serveur Discord.

- **Aucune dépendance** : Node.js ≥ 20 seulement.
- **Rapide et respectueuse de Steam** : requêtes mises en cache et regroupées, dernière valeur connue servie si Steam tombe.
- **Sûre par défaut** : lecture seule, limite de débit, entrées validées, aucune donnée privée.

> **Non officielle.** Outil communautaire, sans lien avec les développeurs de ROB RUN ni avec Valve. ROB RUN n'a pas d'API
> publique de stats : le projet republie seulement des données que Steam expose déjà publiquement. Il n'y a **pas** de stats
> par joueur (kills, argent, classement) : le jeu ne les fournit pas.

## Démarrage rapide

```bash
git clone <ce dépôt>
cd RobRun
cp .env.example .env     # facultatif : les valeurs par défaut suffisent
npm start                # http://localhost:3000/v1
```

```bash
npm test                 # 19 tests hors ligne (Steam simulé)
npm run smoke            # test réel contre Steam (Internet requis)
```

Tu héberges ta propre copie : ce dépôt est le code, pas un service en ligne.

## Documentation

La documentation complète est dans [`docs/fr/`](docs/fr/README.md) :
[Démarrage](docs/fr/demarrage.md) ·
[Référence de l'API](docs/fr/reference-api.md) ·
[Configuration](docs/fr/configuration.md) ·
[Déploiement](docs/fr/deploiement.md) ·
[Intégration Discord](docs/fr/integration-discord.md) ·
[Architecture](docs/fr/architecture.md)

## Routes

Toutes en `GET`, réponses en JSON. Liste à jour : `GET /v1`.

| Route | Contenu |
|---|---|
| `/v1/health` | État du service |
| `/v1/players` | Joueurs en ligne + pic / moyenne / minimum des 24 h |
| `/v1/players/history?hours=24` | Historique (1 à 720 h, 500 points max) |
| `/v1/patchnotes?limit=10` | Annonces officielles Steam (Markdown), la plus récente d'abord |
| `/v1/patchnotes/latest` | La dernière annonce |
| `/v1/achievements` | % de joueurs ayant chaque succès (liste vide si le jeu n'en publie pas, ce qui est le cas aujourd'hui) |
| `/v1/reviews` | Avis Steam : total, % positifs, dernière semaine |
| `/v1/price?country=fr` | Prix / gratuité dans un pays |
| `/v1/community` | Membres / en ligne / en vocal d'un serveur Discord (lien bot facultatif) |
| `/v1/leaderboard` | Top 10 XP / pièces (seulement si ton bot le publie) |

Les erreurs ont la forme `{ "error": { "code": "bad_request", "message": "…" } }` avec le bon statut HTTP
(400, 404, 405, 413, 429, 502, 503). Les messages d'erreur sont en anglais.

`last24h.coveredSince` indique depuis quand l'API relève réellement les joueurs : Steam ne donne que la valeur du moment,
l'API enregistre donc elle-même le nombre de joueurs toutes les 5 minutes (`data/players.json`, 30 jours). Le pic des 24 h
n'est complet qu'après 24 h de fonctionnement.

## Configuration

Variables d'environnement (toutes facultatives, voir [.env.example](.env.example)) : `PORT`, `HOST`, `STEAM_APP_ID`
(change-le pour suivre un autre jeu), `ALLOWED_ORIGINS`, `RATE_LIMIT` (60 requêtes/min/IP), `TRUST_PROXY` (mets `1`
seulement derrière un proxy de confiance), `API_TOKEN` (voir plus bas), `DATA_DIR`.

L'API parle en HTTP simple : place-la derrière un proxy HTTPS (la plupart des hébergeurs en fournissent un).

## Sécurité

- **Lecture seule** : seules les routes `GET` sont publiques. La seule route `POST` (`/v1/internal/community`) est réservée à
  ton bot, protégée par un jeton secret et fermée aux navigateurs (pas de CORS).
- **Aucune donnée privée** : uniquement des nombres et, si tu l'actives, de courts pseudos nettoyés. Jamais d'identifiants
  Discord, de messages ni d'e-mails.
- **Limite de débit** par IP, entrées bornées et validées, corps de requête limité à 64 Ko.
- **Steam** : délais maximum, redirections jamais suivies, requêtes regroupées et mises en cache.

Tu as trouvé une faille ? Ouvre un signalement de sécurité privé plutôt qu'une issue publique.

## En option : publier les stats d'une communauté Discord

Les routes `/v1/community` et `/v1/leaderboard` sont alimentées par un bot Discord qui envoie ses chiffres à l'API :

1. Génère un jeton : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Mets-le dans le `.env` de l'API : `API_TOKEN=<jeton>`
3. Fais envoyer par ton bot un `POST` sur `/v1/internal/community` avec `Authorization: Bearer <jeton>` et ce corps JSON :

```json
{
  "server": { "members": 202, "online": 51, "inVoice": 4 },
  "leaderboard": {
    "xp":    [{ "name": "Alice", "level": 5, "xp": 1500 }],
    "coins": [{ "name": "Bob", "coins": 500 }]
  }
}
```

`leaderboard` est facultatif (10 lignes max par liste). Ne publie des pseudos que si tes membres sont d'accord.

## Auteur

Créé par **Zuma.Eu**. Une question, une idée, ou l'envie de l'utiliser dans ta communauté ? Rejoins le Discord : https://discord.gg/rejoins

## Licence

[MIT](LICENSE) © 2026 Zuma.Eu. Garde la mention de copyright et la signature de l'auteur dans les fichiers sources si tu réutilises le code.
