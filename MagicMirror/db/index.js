const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(path.join(__dirname, "mirror.db"));
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
db.exec(fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8"));

module.exports = db;