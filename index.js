const express = require("express");
const cors = require("cors");
const { connect } = require("./db");
const { default: mongoose } = require("mongoose");
const { pushToAtlas } = require("./push");
const { pingServer } = require("./utils/ping");
const { loadConfig } = require("./utils/configHandler");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
  pushToAtlas(); // run once immediately
});
