const { MongoClient } = require("mongodb");
const fs = require("fs");
const logger = require("./utils/logger");
const { notify } = require("./utils/notifier");
const { loadConfig } = require("./utils/configHandler");
const dns = require("dns");

const localUri = "mongodb://localhost:27017";
const dbName = "cricketdb";
const prodDbName = "cricket";
const collectionName = "games";
const dataFile = "gamesData.json";

let cachedConfig = null; // store config once

// Utility function to check internet availability
function checkInternet() {
  return new Promise((resolve) => {
    dns.lookup("google.com", (err) => {
      if (err && err.code === "ENOTFOUND") {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

async function pushToAtlas() {
  if (!cachedConfig) {
    cachedConfig = await loadConfig(); // load only once
  }

  if (!cachedConfig.mongoDB) {
    notify(
      "Config Error",
      "No Atlas URI found. Restart and update config.json."
    );
    console.error("\x1b[31m❌ No Atlas URI found in config.json\x1b[0m");
    return;
  }

  const isOnline = await checkInternet();
  if (!isOnline) {
    console.log("🌐 No Internet Connection");
    return; // skip pushing this round
  }

  console.log("🌐 Internet connection available");
  console.log("🔍 Checking localDB to Push data to Atlas Server...");

  const localClient = new MongoClient(localUri);
  const atlasClient = new MongoClient(cachedConfig.mongoDB);

  try {
    await localClient.connect();
    await atlasClient.connect();

    const localDb = localClient.db(dbName).collection(collectionName);
    const atlasDb = atlasClient.db(prodDbName).collection(collectionName);

    const docs = await localDb.find({ pushedToAtlas: { $ne: true } }).toArray();
    if (docs.length === 0) {
      console.log("✅ No new docs to push.");
      return;
    }

    const docsWithoutId = docs.map(({ _id, ...rest }) => rest);
    const result = await atlasDb.insertMany(docsWithoutId);

    const ids = docs.map((d) => d._id);
    await localDb.updateMany(
      { _id: { $in: ids } },
      { $set: { pushedToAtlas: true } }
    );

    const successMsg = `✅ Pushed ${result.insertedCount} docs to Atlas`;
    logger.push(successMsg);
    notify("Push Success", successMsg);
    console.log(successMsg);

    if (fs.existsSync(dataFile)) {
      fs.writeFileSync(dataFile, "[]", "utf-8");
      console.log(`🧹 Cleared ${dataFile} after successful push`);
    }
  } catch (err) {
    const failMsg = `❌ Push failed: ${err.message}`;
    logger.push(failMsg);
    notify("Push Failed", err.message);
    console.error("\x1b[31m❌ Error pushing to Atlas:", err.message, "\x1b[0m");
  } finally {
    await localClient.close();
    await atlasClient.close();
  }
}

// Load config ONCE and then schedule pushes
(async () => {
  cachedConfig = await loadConfig();
  console.log("⚙️ Config loaded once at startup.");
  setInterval(pushToAtlas, 5 * 1000);
})();

module.exports = { pushToAtlas };
