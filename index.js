// const express = require("express");
// const cors = require("cors");
// const { connect } = require("./db");
// const { default: mongoose } = require("mongoose");
// const { pushToAtlas } = require("./push");
// const { pingServer } = require("./utils/ping");
// const { loadConfig } = require("./utils/configHandler");

// const app = express();
// const PORT = 5000;

// app.use(cors());
// app.use(express.json());

// // API: get all games
// app.get("/games", async (req, res) => {
//   const collection = await connect();
//   const games = await collection.find({}).toArray();
//   res.json(games);
// });

// // API: delete a game
// app.delete("/games/:id", async (req, res) => {
//   const collection = await connect();
//   const { id } = req.params;
//   const result = await collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
//   result.deletedCount === 1
//     ? res.status(200).json({ message: "Game deleted successfully" })
//     : res.status(404).json({ message: "Game not found" });
// });

// // Check cloud server availability
// app.get("/ping-cloud", async (req, res) => {
//   const config = await loadConfig();
//   const alive = await pingServer(config.cloudServerIp);
//   res.json({ alive });
// });

// app.listen(PORT, () => {
//   console.log(`🚀 API running on http://localhost:${PORT}`);
//   pushToAtlas(); // run once immediately
// });

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

// Function: Insert games before server starts
async function insertGames() {
  try {
    if (fs.existsSync(dataFile)) {
      const collection = await connect();
      const data = fs.readFileSync(dataFile, "utf-8");
      const games = JSON.parse(data);

      if (games.length > 0) {
        const result = await collection.insertMany(games);
        console.log(`🎮 Inserted ${result.insertedCount} games successfully.`);
        fs.writeFileSync(dataFile, "[]", "utf-8"); // clear file
        console.log(`🧹 Cleared ${dataFile} after insertion`);
      } else {
        console.log("⚠️ No new games to insert from gamesData.json");
      }
    }
  } catch (err) {
    console.error("❌ Error inserting games:", err.message);
  }
}

// API: get all games
app.get("/games", async (req, res) => {
  const collection = await connect();
  const games = await collection.find({}).toArray();
  res.json(games);
});

// API: delete a game
app.delete("/games/:id", async (req, res) => {
  const collection = await connect();
  const { id } = req.params;
  const result = await collection.deleteOne({ _id: new mongoose.Types.ObjectId(id) });
  result.deletedCount === 1
    ? res.status(200).json({ message: "Game deleted successfully" })
    : res.status(404).json({ message: "Game not found" });
});

// Check cloud server availability
app.get("/ping-cloud", async (req, res) => {
  const config = await loadConfig();
  const alive = await pingServer(config.cloudServerIp);
  res.json({ alive });
});

// Main startup
(async () => {
  await insertGames(); // step 1: insert data from JSON
  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
    pushToAtlas(); // step 2: push in background
  });
})();
