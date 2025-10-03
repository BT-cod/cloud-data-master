const ping = require("ping");
const logger = require("./logger");

async function pingServer(ip) {
  try {
    const res = await ping.promise.probe(ip);
    if (!res.alive) {
      logger.ping(`❌ Ping failed to ${ip}`);
    }
    return res.alive;
  } catch (err) {
    logger.ping(`❌ Ping error: ${err.message}`);
    return false;
  }
}

module.exports = { pingServer };
