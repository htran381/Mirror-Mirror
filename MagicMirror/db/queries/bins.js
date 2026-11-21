const db = require("../index.js");
const { getSetting } = require("./settings.js");

// Reuse the user's General Choices bin, or create it when they save their first choice.
function getOrCreateGeneralChoiceBin(userId) {
    const bins = db.prepare(`
        SELECT bin_id FROM user_bins
        WHERE user_id = ? AND name = 'General Choices'
            AND mm_role = 'advise' AND app = 'choice'
    `).all(userId);

    if (bins.length > 1) {
        throw new Error("Multiple General Choices bins exist for the default user.");
    }
    if (bins.length === 1) {
        return bins[0].bin_id;
    }

    return db.prepare(`
        INSERT INTO user_bins
            (user_id, name, mm_role, source, content_source, app, weight, active)
        VALUES (?, 'General Choices', 'advise', 'user_created', 'none', 'choice', ?, 1)
    `).run(userId, getSetting("initial_bin_weight")).lastInsertRowid;
}

// Returns the user's visible bins (active = 1), grouped by mm_role and highest weight first, 
// with config parsed into an object.
function getActiveBins(userId) {

    const active_bins = db.prepare(
        `
        SELECT * FROM user_bins WHERE user_id = ? AND active = 1
        ORDER BY mm_role, weight DESC
        `
    ).all(userId);
    //parses the config file into javascript objects
    const parsed = active_bins.map(row => ({ ...row, config: JSON.parse(row.config) }));
    return parsed;
}

// Returns one bin by id with config parsed into an object, or undefined if it doesn't exist.
function getBin(binId) {
    const bin = db.prepare(
        `
        SELECT * FROM user_bins WHERE bin_id = ?
        `
    ).get(binId);

    if (bin === undefined) {
        return undefined
    }
    //parses config file into javascript objects
    const parsed = { ...bin, config: JSON.parse(bin.config) };
    return parsed;
}

// Hides a bin (active = 0) without deleting it, so its history is kept. 
// Returns 1 if hidden, 0 if the id wasn't found.
function hideBin(binId) {
    const changes = db.prepare(
        `
        UPDATE user_bins SET active = 0, updated_at = datetime('now','localtime')
            WHERE bin_id = ?        
        `

    ).run(binId);

    return changes.changes;
}


module.exports = { getActiveBins, getBin, hideBin, getOrCreateGeneralChoiceBin };
