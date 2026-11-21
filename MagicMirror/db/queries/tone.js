const db = require("../index.js");

// Returns the default tone (the one new users start with). Throws if no tone is marked default.
function getDefaultTone() {
    const result = db.prepare(
        `
        SELECT * FROM tone_presets
        WHERE is_default = 1
        `
    ).get();

    if (result === undefined) { throw new Error("There is no default tone."); }
    return result;
}

// Makes a different tone the default, so there is always exactly one (transaction). Returns the new default's tone_id.
function setDefaultTone(toneId) {
    const set = db.transaction(() => {
        const tone = db.prepare(
            `
            SELECT tone_id FROM tone_presets
            WHERE tone_id = ?
            `
        ).get(toneId);

        if (tone === undefined) { throw new Error("Tone " + toneId + " not found"); }

        // clear the old default first, so there are never two (the one_default_tone index allows at most one)
        db.prepare(
            `
            UPDATE tone_presets SET is_default = 0
            WHERE is_default = 1
            `
        ).run();

        db.prepare(
            `
            UPDATE tone_presets SET is_default = 1
            WHERE tone_id = ?
            `
        ).run(toneId);

        return toneId;
    });
    return set();
}

module.exports = { getDefaultTone, setDefaultTone };
