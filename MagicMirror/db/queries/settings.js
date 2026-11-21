const db = require("../index.js");

// Returns the number stored for a setting key, e.g. getSetting("weight_rate") -> 0.3. 
// Throws if the key doesn't exist.
function getSetting(key) {
    const row = db.prepare(
        `
        SELECT value FROM settings WHERE setting_key = ?
        `
    ).get(key);
    if (row === undefined) throw new Error("Unknown setting: " + key);
    return row.value;
}

module.exports = { getSetting };