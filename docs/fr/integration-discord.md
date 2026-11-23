# Intégration Discord

Les routes `/v1/community` et `/v1/leaderboard` sont alimentées par un bot Discord qui envoie ses chiffres à l'API. L'API ne se
connecte jamais à Discord elle-même et ne peut lire aucun serveur.

## Mise en place

1. Génère un jeton : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Mets-le dans le `.env` de l'API : `API_TOKEN=<jeton>`, puis redémarre l'API.
3. Fais envoyer un `POST` régulièrement par ton bot (toutes les 5 minutes suffisent largement).

## La route

`POST /v1/internal/community`

| En-tête | Valeur |
|---|---|
| `Authorization` | `Bearer <jeton>` |
| `Content-Type` | `application/json` |

Corps :

```json
{
  "server": { "members": 202, "online": 51, "inVoice": 4 },
  "leaderboard": {
    "xp":    [{ "name": "Alice", "level": 5, "xp": 1500 }],
    "coins": [{ "name": "Bob", "coins": 500 }]
  }
}
```

| Champ | Règle |
|---|---|
| `server.members`, `online`, `inVoice` | Obligatoires. Entiers de 0 à 10 000 000 |
| `leaderboard` | Facultatif. Ne l'envoie pas pour garder le classement privé |
| `leaderboard.xp`, `leaderboard.coins` | Listes facultatives de 10 lignes maximum |
| `name` | Pseudo d'affichage, nettoyé par l'API (caractères de contrôle et invisibles retirés, 32 caractères maximum) |

Réponse : `200 { "ok": true, "updatedAt": "…" }`. Erreurs : `400` corps invalide, `401` jeton faux ou absent,
`413` corps de plus de 64 Ko, `503` quand `API_TOKEN` n'est pas défini sur l'API.

Exemple avec `curl` :

```bash
curl -X POST https://api.exemple.fr/v1/internal/community \
  -H "Authorization: Bearer $API_TOKEN" -H "Content-Type: application/json" \
  -d '{"server":{"members":202,"online":51,"inVoice":4}}'
```

Exemple en Node.js :

```js
await fetch(`${process.env.ROBRUN_API_URL}/v1/internal/community`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.ROBRUN_API_TOKEN}` },
  body: JSON.stringify({ server: { members, online, inVoice } }),
});
```

## Confidentialité

- Seuls des nombres, et éventuellement de courts pseudos d'affichage, sont acceptés. Il n'existe aucun champ pour un
  identifiant Discord ou un message, et les champs inconnus sont ignorés et jamais publiés.
- Ne publie le classement que si tes membres sont d'accord pour que leur pseudo soit affiché publiquement.
- Cette route est faite pour des serveurs uniquement. Elle n'envoie aucun en-tête CORS : les navigateurs ne peuvent pas
  l'appeler. Ne mets jamais le jeton dans une page web.
