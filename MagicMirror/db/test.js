const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");

const db = new Database(":memory:");
db.pragma("foreign_keys = ON");
db.exec(fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8"));
db.exec(fs.readFileSync(path.join(__dirname, "seed.sql"), "utf8"));

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log(tables.length, "tables:", tables.map(t => t.name).join(", "));