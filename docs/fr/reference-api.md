# Référence de l'API

Chemin de base : `/v1`. Toutes les routes publiques sont en `GET` et renvoient du JSON
(`Content-Type: application/json; charset=utf-8`). Les dates sont en ISO 8601, en UTC. Un slash final est accepté.
`HEAD` fonctionne comme `GET` sans corps.

Chaque réponse de données contient `updatedAt` (moment où la donnée a été récupérée). Si Steam était injoignable et qu'une
valeur plus ancienne a été servie, la réponse contient aussi `"stale": true`.

## Routes

| Route | Cache (`max-age`) | Description |
|---|---|---|
| [`GET /v1`](#get-v1) | 300 s | Liste des routes |
| [`GET /v1/health`](#get-v1health) | aucun | État du service |
| [`GET /v1/players`](#get-v1players) | 30 s | Joueurs en ligne et résumé des 24 h |
| [`GET /v1/players/history`](#get-v1playershistory) | 60 s | Historique du nombre de joueurs |
| [`GET /v1/patchnotes`](#get-v1patchnotes) | 120 s | Annonces officielles |
| [`GET /v1/patchnotes/latest`](#get-v1patchnoteslatest) | 120 s | Dernière annonce |
| [`GET /v1/achievements`](#get-v1achievements) | 300 s | Taux de déblocage des succès |
| [`GET /v1/reviews`](#get-v1reviews) | 300 s | Avis Steam |
| [`GET /v1/price`](#get-v1price) | 600 s | Prix dans un pays |
| [`GET /v1/community`](#get-v1community) | 60 s | Chiffres du serveur Discord |
| [`GET /v1/leaderboard`](#get-v1leaderboard) | 60 s | Top 10 Discord |

---

### `GET /v1`

```json
{ "name": "ROB RUN Community API", "version": "1.0.0", "appId": 4262460,
  "routes": [{ "method": "GET", "path": "/v1/players", "description": "…" }] }
```

### `GET /v1/health`

```json
{ "status": "ok", "uptimeSeconds": 3600, "appId": 4262460 }
```

### `GET /v1/players`

Joueurs en ligne maintenant, plus le pic, la moyenne et le minimum des 24 dernières heures (d'après les relevés de l'API).

```json
{
  "appId": 4262460,
  "players": 247069,
  "updatedAt": "2026-11-23T03:22:41.471Z",
  "last24h": {
    "hours": 24,
    "peak": 365092,
    "peakAt": "2026-11-22T19:00:00.000Z",
    "low": 180000,
    "average": 250000,
    "points": 288,
    "coveredSince": "2026-11-22T03:25:00.000Z"
  }
}
```

| Champ | Signification |
|---|---|
| `players` | Joueurs en jeu maintenant (Steam, en cache 60 s) |
| `last24h` | `null` tant qu'aucun relevé n'existe |
| `last24h.points` | Nombre de relevés utilisés (un toutes les 5 minutes, donc jusqu'à 288) |
| `last24h.coveredSince` | Début des données réelles. Plus récent que 24 h si l'API a démarré récemment |

### `GET /v1/players/history`

| Paramètre | Défaut | Plage | Signification |
|---|---|---|---|
| `hours` | `24` | 1 à 720 | Jusqu'où remonter |

```json
{
  "appId": 4262460,
  "hours": 24,
  "summary": { "hours": 24, "peak": 365092, "peakAt": "…", "low": 180000, "average": 250000, "points": 288, "coveredSince": "…" },
  "points": [{ "at": "2026-11-22T03:25:00.000Z", "players": 251300 }]
}
```

500 points au maximum sont renvoyés. S'il y a plus de relevés, ils sont moyennés par tranche et chaque point porte aussi
`peak` (le relevé le plus haut de sa tranche).

### `GET /v1/patchnotes`

| Paramètre | Défaut | Plage | Signification |
|---|---|---|---|
| `limit` | `10` | 1 à 30 | Nombre d'annonces |

La plus récente d'abord. `markdown` est le texte de l'annonce converti en Markdown (images retirées ; seuls les liens `http(s)`
sont conservés).

```json
{
  "items": [{
    "id": "1849827110432538",
    "title": "Patch Notes",
    "url": "https://store.steampowered.com/news/app/4262460/view/1849827110432538",
    "author": "Charlie",
    "publishedAt": "2026-11-20T14:59:56.000Z",
    "markdown": "We've got a fresh batch of changes…"
  }],
  "total": 30,
  "updatedAt": "2026-11-23T03:22:41.000Z"
}
```

### `GET /v1/patchnotes/latest`

Le même objet qu'un élément ci-dessus, plus `updatedAt`. `404` s'il n'y a aucune annonce.

### `GET /v1/achievements`

Part des joueurs ayant débloqué chaque succès, du plus courant au plus rare.

```json
{ "appId": 4262460, "count": 2, "achievements": [{ "name": "FIRST_RUN", "percent": 80 }, { "name": "RARE", "percent": 1.5 }], "updatedAt": "…" }
```

Si le jeu ne publie aucun succès (le cas de ROB RUN aujourd'hui), tu obtiens `count: 0` et une liste vide. C'est une
réponse normale, pas une erreur.

### `GET /v1/reviews`

```json
{
  "appId": 4262460,
  "total": 89706,
  "positive": 43195,
  "negative": 46511,
  "positivePercent": 48.2,
  "lastWeek": { "positivePercent": 43.3, "total": 31444 },
  "updatedAt": "…"
}
```

Les totaux sont la somme de toutes les semaines de l'historique des avis. `lastWeek` vaut `null` s'il n'y en a pas.

### `GET /v1/price`

| Paramètre | Défaut | Format | Signification |
|---|---|---|---|
| `country` | `us` | 2 lettres | Pays du magasin (`fr`, `de`, `us`…) |

```json
{
  "appId": 4262460,
  "name": "ROB RUN",
  "storeUrl": "https://store.steampowered.com/app/4262460",
  "free": true,
  "country": "fr",
  "price": null,
  "releaseDate": "4 Nov, 2026",
  "updatedAt": "…"
}
```

`price` vaut `null` pour un jeu gratuit. Sinon c'est
`{ "currency": "EUR", "initial": 9.99, "final": 7.99, "discountPercent": 20, "formatted": "7,99€" }`.

### `GET /v1/community`

Chiffres envoyés par un bot Discord (voir [Intégration Discord](integration-discord.md)).

```json
{ "updatedAt": "2026-11-23T03:24:41.683Z", "members": 202, "online": 51, "inVoice": 4 }
```

`503 unavailable` tant qu'un bot n'a pas envoyé de données au moins une fois.

### `GET /v1/leaderboard`

Disponible seulement si le bot le publie. Pseudos d'affichage uniquement, jamais d'identifiants.

```json
{
  "updatedAt": "…",
  "xp": [{ "rank": 1, "name": "Alice", "level": 5, "xp": 1500 }],
  "coins": [{ "rank": 1, "name": "Bob", "coins": 500 }]
}
```

`404 not_found` quand le classement n'est pas publié.

---

## Erreurs

Toutes les erreurs ont la même forme (les messages sont en anglais) :

```json
{ "error": { "code": "bad_request", "message": "\"hours\" must be an integer between 1 and 720." } }
```

| Statut | `code` | Quand |
|---|---|---|
| 400 | `bad_request` | Paramètre ou corps invalide |
| 401 | `unauthorized` | Jeton absent ou faux sur la route du bot |
| 404 | `not_found` | Route inconnue, ou donnée non publiée |
| 405 | `method_not_allowed` | Mauvaise méthode (un en-tête `Allow` indique les bonnes) |
| 413 | `payload_too_large` | Corps de plus de 64 Ko |
| 429 | `rate_limited` | Trop de requêtes (voir `Retry-After`) |
| 500 | `internal_error` | Échec inattendu |
| 502 | `upstream_error` | Steam injoignable et aucune valeur plus ancienne disponible |
| 503 | `unavailable` | Donnée pas encore disponible |

## En-têtes

| En-tête | Signification |
|---|---|
| `X-RateLimit-Limit` / `X-RateLimit-Remaining` | Requêtes autorisées par minute et restantes dans la fenêtre en cours |
| `X-RateLimit-Reset` | Fin de la fenêtre (secondes Unix) |
| `Retry-After` | Sur un 429 : secondes à attendre |
| `Cache-Control` | `public, max-age=N` selon la route (voir le tableau plus haut) |
| `Access-Control-Allow-Origin` | CORS, voir `ALLOWED_ORIGINS` |

Sois sympa avec le service : respecte les valeurs de `Cache-Control` au lieu d'interroger plus vite qu'elles ne le permettent.
