const config = require('./config');
const history = require('./services/history');
const { createServer } = require('./server');

history.start();
const server = createServer();
server.listen(config.port, config.host, () => {
  console.log(`ROB RUN API : http://${config.host}:${config.port}/v1 (jeu ${config.appId}, envoi du bot ${config.apiToken ? 'activé' : 'désactivé'})`);
});

function shutdown() {
  console.log('Arrêt…');
  history.stop();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 5_000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => console.error('[api] promesse rejetée :', err));
