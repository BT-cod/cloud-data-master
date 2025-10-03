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
  const config = await loadConfig();
  if (!config.mongoDB) {
    notify(
      "Config Error",
      "No Atlas URI found. Restart and update config.json."
    );
    console.error("\x1b[31m❌ No Atlas URI found in config.json\x1b[0m");
    process.exit(1);
  }

  const isOnline = await checkInternet();
  if (!isOnline) {
    console.log("🌐 No Internet Connection");
    return; // skip pushing this round
  }

  console.log("🌐 Internet connection available");
  console.log("🔍 Checking localDB to Push data to Atlas Server...");

  const localClient = new MongoClient(localUri);
  const atlasClient = new MongoClient(config.mongoDB);

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

    // Remove _id before pushing
    const docsWithoutId = docs.map(({ _id, ...rest }) => rest);
    const result = await atlasDb.insertMany(docsWithoutId);

    // Mark local docs as pushed
    const ids = docs.map((d) => d._id);
    await localDb.updateMany(
      { _id: { $in: ids } },
      { $set: { pushedToAtlas: true } }
    );

    // Log & notify
    const successMsg = `✅ Pushed ${result.insertedCount} docs to Atlas`;
    logger.push(successMsg);
    notify("Push Success", successMsg);
    console.log(successMsg);

    // Clear gamesData.json after successful push
    try {
      if (fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, "[]", "utf-8");
        console.log(`🧹 Cleared ${dataFile} after successful push`);
      }
    } catch (fileErr) {
      console.error("⚠️ Could not clear gamesData.json:", fileErr.message);
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

// Check every 5 seconds instead of 5 minutes
setInterval(pushToAtlas, 5 * 1000);

module.exports = { pushToAtlas };
