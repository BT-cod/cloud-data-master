const { MongoClient } = require("mongodb");
const config = require("./config.json");

const localUri = "mongodb://localhost:27017";
const dbName = "cricketdb";

async function connect() {
  const client = new MongoClient(localUri);
  await client.connect();
  return client.db(dbName).collection("games");
}

module.exports = { connect };
