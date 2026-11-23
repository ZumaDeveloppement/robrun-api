# Déploiement

GitHub stocke le code. Pour que d'autres puissent appeler l'API, tu la lances sur un serveur toujours allumé et joignable
depuis Internet.

## Ce qu'il faut chez un hébergeur

- Node.js 20 ou plus récent.
- Un moyen de garder le processus en marche (voir plus bas).
- Un port ouvert, ou un proxy inverse devant.
- **Le HTTPS.** L'API parle en HTTP simple : sers-la derrière un proxy qui fournit un certificat.
- Un disque qui survit aux redémarrages, pour `data/` (l'historique des joueurs).

Une offre d'hébergement de bot n'ouvre souvent pas de port public. Vérifie-le avant de choisir.

## Lancer

```bash
git clone https://github.com/ZumaDeveloppement/robrun-api.git
cd robrun-api
cp .env.example .env     # puis modifie-le
npm start
```

## La garder en marche

**systemd** (Linux), `/etc/systemd/system/robrun-api.service` :

```ini
[Unit]
Description=ROB RUN Community API
After=network.target

[Service]
WorkingDirectory=/opt/robrun-api
ExecStart=/usr/bin/node src/index.js
Restart=always
User=robrun
Environment=HOST=127.0.0.1
Environment=TRUST_PROXY=1

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now robrun-api
```

**pm2** convient aussi : `pm2 start src/index.js --name robrun-api && pm2 save`.

Le serveur s'arrête proprement sur `SIGINT` et `SIGTERM`.

## HTTPS avec un proxy inverse

Exemple avec nginx (adapte les noms et les chemins des certificats ; ils sont en général émis avec Let's Encrypt) :

```nginx
server {
  listen 443 ssl;
  server_name api.exemple.fr;

  ssl_certificate     /etc/letsencrypt/live/api.exemple.fr/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.exemple.fr/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Host $host;
  }
}
```

Avec un tel proxy, mets `HOST=127.0.0.1` (seul le proxy peut joindre l'API) et `TRUST_PROXY=1`. Le proxy doit écraser
`X-Forwarded-For` comme ci-dessus : l'API lit la **dernière** adresse de cet en-tête.

## Données et sauvegardes

`data/players.json` (historique) et `data/community.json` (derniers chiffres Discord) sont de simples fichiers JSON, écrits de
façon atomique. Sauvegarde `data/` si l'historique compte pour toi. Le supprimer remet seulement l'historique à zéro.

## Limites à connaître

- **Une seule instance.** Le cache et la limite de débit vivent en mémoire. Deux instances derrière un répartiteur de charge
  compteraient chacune les requêtes de leur côté et enregistreraient chacune leur historique.
- La limite de débit est par adresse IP. Beaucoup de visiteurs derrière une même IP partagent la même allocation.

## Vérifier le déploiement

```bash
curl https://api.exemple.fr/v1/health
```

Un `200` avec `"status": "ok"` signifie qu'elle tourne. Pour tester contre la vraie API de Steam depuis le serveur, lance
`npm run smoke`.
