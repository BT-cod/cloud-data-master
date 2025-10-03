const fs = require("fs");
const path = require("path");

const logDir = path.join(__dirname, "..", "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

function logToFile(file, message) {
  const filePath = path.join(logDir, file);
  const timestamp = new Date().toLocaleString();
  fs.appendFileSync(filePath, `[${timestamp}] ${message}\n`);
}

module.exports = {
  error: (msg) => logToFile("error.txt", msg),
  push: (msg) => logToFile("push.txt", msg),
  ping: (msg) => logToFile("ping.txt", msg),
};
