const fs = require("fs");
const readline = require("readline");
const configPath = "./config.json";

async function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function loadConfig() {
  let config = JSON.parse(fs.readFileSync(configPath, "utf8"));

  if (!config.type) {
    config.type = await askQuestion("Enter DB type (local/prod): ");
  }

  if (!config.mongoDB) {
    config.mongoDB = await askQuestion("Enter MongoDB Atlas URI: ");
  }

  if (!config.cloudServerIp) {
    config.cloudServerIp = await askQuestion("Enter Cloud Server IP: ");
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return config;
}

module.exports = { loadConfig };
