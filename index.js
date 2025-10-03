const express = require("express");
const cors = require("cors");
const { connect } = require("./db");
const { default: mongoose } = require("mongoose");
const { pushToAtlas } = require("./push");
const { pingServer } = require("./utils/ping");
const { loadConfig } = require("./utils/configHandler");
const fs = require("fs");

const app = express();
const PORT = 5000;
const dataFile = "gamesData.json";

app.use(cors());
app.use(express.json());

/**
 * Inserts games from the local JSON file into the database.
 * Clears the file after successful insertion.
 */
async function insertGames() {
  try {
    if (fs.existsSync(dataFile)) {
      const collection = await connect();
      const data = fs.readFileSync(dataFile, "utf-8");
      const games = JSON.parse(data);

      if (games.length > 0) {
        const result = await collection.insertMany(games);
        console.log(`🎮 Inserted ${result.insertedCount} games successfully.`);
        fs.writeFileSync(dataFile, "[]", "utf-8");
        console.log(`🧹 Cleared ${dataFile} after insertion`);
      } else {
        console.log("⚠️ No new games found in gamesData.json");
      }
    }
  } catch (err) {
    console.error("❌ Failed to insert games:", err.message);
  }
}

/**
 * Returns all games stored in the database.
 */
app.get("/games", async (req, res) => {
  const collection = await connect();
  const games = await collection.find({}).toArray();
  res.json(games);
});

/**
 * Deletes a game by ID.
 */
app.delete("/games/:id", async (req, res) => {
  const collection = await connect();
  const { id } = req.params;
  const result = await collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
  result.deletedCount === 1
    ? res.status(200).json({ message: "Game deleted successfully" })
    : res.status(404).json({ message: "Game not found" });
});

/**
 * Checks availability of the configured cloud server.
 */
app.get("/ping-cloud", async (req, res) => {
  const config = await loadConfig();
  const alive = await pingServer(config.cloudServerIp);
  res.json({ alive });
});

/**
 * Application entry point.
 * 1. Inserts pending games from JSON.
 * 2. Starts API server.
 * 3. Initiates background push to Atlas.
 */
(async () => {
  await insertGames();
  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
    pushToAtlas();
  });
})();
