# Architecture

## Vue d'ensemble

```
 visiteur ──► server.js ──► routes/index.js ──► services/steam.js ──► Steam
               │   │                 │                │
               │   │                 │                └── lib/cache.js (cache, un seul appel pour plusieurs visiteurs)
               │   │                 ├──► services/history.js ──► data/players.json
               │   │                 └──► services/community.js ◄── POST d'un bot Discord
               │   └── lib/rateLimit.js
               └── en-têtes de sécurité, CORS, erreurs JSON
```

## Modules

| Fichier | Rôle |
|---|---|
| `src/index.js` | Démarre les relevés de joueurs et le serveur, gère l'arrêt |
| `src/config.js` | Lit les réglages et le `.env` facultatif |
| `src/server.js` | HTTP : routage, limite de débit, CORS, en-têtes de sécurité, lecture du corps, réponses d'erreur |
| `src/routes/index.js` | La liste des routes. Une entrée = méthode, chemin, durée de cache, fonction |
| `src/services/steam.js` | Appels à Steam : joueurs, annonces, succès, avis, prix |
| `src/services/history.js` | Relève le nombre de joueurs toutes les 5 minutes et répond aux demandes d'historique et de résumé |
| `src/services/community.js` | Valide et stocke les chiffres envoyés par un bot |
| `src/services/markdown.js` | Convertit le BBCode de Steam en Markdown |
| `src/services/storage.js` | Lit et écrit des fichiers JSON de façon atomique (fichier temporaire puis renommage) |
| `src/lib/cache.js` | Cache mémoire avec regroupement des requêtes et valeur de secours |
| `src/lib/rateLimit.js` | Compteur de requêtes par IP |
| `src/lib/http.js` | Appels HTTP sortants : délai maximal, aucune redirection |
| `src/lib/errors.js` | `ApiError` et les fonctions qui la créent |

## Comportements clés

**Cache.** Chaque appel à Steam passe par `memo(clé, ttl, chargeur)` :
- pendant la durée de vie, la valeur stockée est renvoyée ;
- des requêtes simultanées pour la même clé partagent un seul appel à Steam ;
- si Steam échoue et qu'une valeur de moins d'une heure existe, elle est renvoyée avec `stale: true`.

**Historique des joueurs.** Steam ne donne que le nombre du moment. `history.js` le relève toutes les 5 minutes en mémoire et
dans `data/players.json`, garde 30 jours, et ignore deux relevés plus proches qu'un demi-intervalle (un redémarrage rapide ne
duplique pas les points). Les longues plages sont moyennées à 500 points.

**Sécurité.** Le serveur est en lecture seule. Les entrées sont bornées et validées. La seule route `POST` compare le jeton en
temps constant. Les réponses de Steam ne sont jamais suivies à travers des redirections. Les erreurs ne divulguent aucun
détail interne.

## Ajouter une route

1. Écris l'accès aux données dans `src/services/` (utilise `memo` pour tout ce qui appelle un service externe).
2. Ajoute une entrée dans `src/routes/index.js` :

```js
{
  method: 'GET', path: '/v1/exemple', cache: 60, summary: 'Ce que ça renvoie',
  handler: async ({ query }) => ({ hello: 'world' }),
}
```

3. Lance une `ApiError` (`badRequest`, `notFound`, `unavailable`) pour les échecs prévus.
4. Ajoute des tests dans `test/api.test.js` et documente la route dans `docs/fr/reference-api.md`, `docs/api-reference.md` et
   les deux README.

Les routes publiques apparaissent automatiquement dans `GET /v1`.

## Tests

`npm test` démarre le serveur sur un port aléatoire avec Steam remplacé par des réponses fixes : les tests sont rapides et hors
ligne. Ils couvrent chaque route, la validation, les en-têtes de sécurité, la limite de débit, le cache (y compris la valeur de
secours) et la route du bot. `npm run smoke` fait le même parcours contre la vraie API de Steam.
