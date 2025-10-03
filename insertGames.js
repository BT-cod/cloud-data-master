const { connect } = require("./db");
const fs = require("fs");

async function insertGames() {
  const collection = await connect();

  // Read JSON file
  const data = fs.readFileSync("gamesData.json", "utf-8");
  const games = JSON.parse(data);

  if (!games.length) {
    console.log("⚠️ No games found in gamesData.json");
    process.exit();
  }

  // Insert all documents into MongoDB
  const result = await collection.insertMany(games);
  console.log(`✅ Inserted ${result.insertedCount} games successfully.`);

  // Clear the JSON file after successful insert
  fs.writeFileSync("gamesData.json", "[]", "utf-8");
  console.log("🧹 Cleared gamesData.json after insert.");

  process.exit();
}

insertGames();
