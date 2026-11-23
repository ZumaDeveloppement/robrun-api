# Deployment

GitHub stores the code. To let others call the API, you run it on a server that stays on and is reachable from the Internet.

## What you need from a host

- Node.js 20 or newer.
- A way to keep the process running (see below).
- An open port, or a reverse proxy in front.
- **HTTPS.** The API speaks plain HTTP, so serve it through a proxy that provides a certificate.
- A disk that survives restarts, for `data/` (the player history).

A game-bot hosting plan often does not open a public port. Check this before choosing a host.

## Run it

```bash
git clone https://github.com/ZumaDeveloppement/robrun-api.git
cd robrun-api
cp .env.example .env     # then edit it
npm start
```

## Keep it running

**systemd** (Linux), `/etc/systemd/system/robrun-api.service`:

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

**pm2** works too: `pm2 start src/index.js --name robrun-api && pm2 save`.

The server stops cleanly on `SIGINT` and `SIGTERM`.

## HTTPS with a reverse proxy

Example with nginx (adapt names and certificate paths; certificates are usually issued with Let's Encrypt):

```nginx
server {
  listen 443 ssl;
  server_name api.example.com;

  ssl_certificate     /etc/letsencrypt/live/api.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header Host $host;
  }
}
```

With a proxy like this, set `HOST=127.0.0.1` (so only the proxy can reach the API) and `TRUST_PROXY=1`. The proxy must
overwrite `X-Forwarded-For` as shown above: the API reads the **last** address of that header.

## Data and backups

`data/players.json` (history) and `data/community.json` (last Discord numbers) are plain JSON files, written atomically.
Back up `data/` if you care about the history. Deleting it only resets the history.

## Limits to know

- **One instance only.** The cache and the rate limiter live in memory. Two instances behind a load balancer would each
  count requests separately and each record their own history.
- Rate limiting is per IP address. Many visitors behind one shared IP share the same allowance.

## Check the deployment

```bash
curl https://api.example.com/v1/health
```

A `200` with `"status": "ok"` means it is running. To test against the real Steam API from the server, run `npm run smoke`.
