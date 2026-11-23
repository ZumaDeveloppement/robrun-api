# Démarrage

## Prérequis

Node.js 20 ou plus récent. Il n'y a rien à installer : l'API n'a aucune dépendance.

## Lancer

```bash
git clone https://github.com/ZumaDeveloppement/robrun-api.git
cd robrun-api
npm start
```

Le serveur écoute sur `http://localhost:3000`. Les réglages sont facultatifs : copie `.env.example` en `.env` pour les
changer (voir [Configuration](configuration.md)).

## Premières requêtes

```bash
curl http://localhost:3000/v1
curl http://localhost:3000/v1/players
curl "http://localhost:3000/v1/patchnotes/latest"
curl "http://localhost:3000/v1/price?country=fr"
```

En JavaScript (navigateur ou Node.js) :

```js
const res = await fetch('http://localhost:3000/v1/players');
const { players, last24h } = await res.json();
console.log(`${players} joueurs en ligne, pic des 24 h : ${last24h?.peak ?? 'pas encore disponible'}`);
```

## À savoir

- **Le pic des 24 h se construit avec le temps.** Steam ne donne que le nombre de joueurs du moment : l'API le relève
  toutes les 5 minutes. `last24h` vaut `null` juste après le premier démarrage, et `last24h.coveredSince` indique depuis
  quand les données couvrent vraiment. L'historique est conservé 30 jours dans `data/players.json`.
- **Il n'y a pas de stats par joueur** (kills, argent, classement). Le jeu ne les publie pas, et l'API ne sert que des
  données que Steam expose déjà publiquement.
- **Tu héberges ta propre copie.** Ce dépôt est le code, pas un service en ligne. Voir [Déploiement](deploiement.md).

## Vérifier que ça marche

```bash
npm test        # 19 tests hors ligne (Steam simulé)
npm run smoke   # vrais appels à Steam (Internet requis)
```

Ensuite : la [référence de l'API](reference-api.md).
