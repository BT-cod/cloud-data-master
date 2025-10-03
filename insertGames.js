const { connect } = require("./db");
const fs = require("fs");

/**
 * Inserts games from gamesData.json into MongoDB
 * and clears the file after a successful insert.
 */
async function insertGames() {
  const collection = await connect();
  const data = fs.readFileSync("gamesData.json", "utf-8");
  const games = JSON.parse(data);

  if (!games.length) {
    console.log("⚠️ No games found in gamesData.json");
    process.exit();
  }

  const result = await collection.insertMany(games);
  console.log(`✅ Inserted ${result.insertedCount} games successfully.`);

  fs.writeFileSync("gamesData.json", "[]", "utf-8");
  console.log("🧹 Cleared gamesData.json after insert.");

  process.exit();
}

insertGames();
