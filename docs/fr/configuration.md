# Configuration

Tout est facultatif. Les réglages viennent des variables d'environnement, ou d'un fichier `.env` à la racine du projet
(lignes `CLE=valeur`, `#` pour les commentaires). Une vraie variable d'environnement l'emporte toujours sur `.env`.

| Variable | Défaut | Valeurs valides | Signification |
|---|---|---|---|
| `PORT` | `3000` | 0 à 65535 | Port d'écoute. Sur un hébergeur qui te donne un port, utilise celui-là |
| `HOST` | `0.0.0.0` | adresse | Adresse d'écoute. `127.0.0.1` la garde locale (à utiliser avec un proxy) |
| `STEAM_APP_ID` | `4262460` | entier | Identifiant Steam. ROB RUN par défaut ; change-le pour suivre un autre jeu |
| `ALLOWED_ORIGINS` | `*` | `*` ou une liste séparée par des virgules | Origines web autorisées par CORS. `*` convient pour des données publiques en lecture seule |
| `RATE_LIMIT` | `60` | 1 à 100000 | Requêtes par minute et par IP |
| `TRUST_PROXY` | `0` | `0` ou `1` | `1` seulement derrière un proxy que tu contrôles : l'IP réelle est alors lue dans `X-Forwarded-For` |
| `API_TOKEN` | vide | n'importe quel secret | Jeton de la route du bot Discord. Vide = route désactivée |
| `DATA_DIR` | `./data` | chemin | Où écrire l'historique et les fichiers de la communauté |

Une valeur invalide revient à la valeur par défaut au lieu d'arrêter le serveur.

## Remarques

- **`TRUST_PROXY`** : laisse `0` quand l'API est joignable directement. Avec `1` sans proxy devant, n'importe qui peut
  falsifier `X-Forwarded-For` et contourner la limite de débit.
- **`ALLOWED_ORIGINS`** : si tu listes des origines (`https://mon-site.fr`), les navigateurs d'autres sites sont refusés. Ça
  n'empêche pas des serveurs ou des scripts d'appeler l'API, ça ne concerne que les navigateurs.
- **`API_TOKEN`** : génères-en un avec
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` et ne le publie jamais.
- **Réglages fixes** (à changer dans `src/config.js`) : durées de cache, conservation de l'historique (30 jours), intervalle
  de relevé (5 minutes), points d'historique par réponse (500), taille maximale d'un corps de requête (64 Ko).
