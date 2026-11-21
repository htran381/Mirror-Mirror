const db = require("../index.js");
const { addTask } = require("./tasks.js");
const { getOrCreateGeneralChoiceBin } = require("./bins.js");
const { getDefaultUser } = require("./users.js");

function createChoice({ name, context = null } = {}) {
    if (typeof name !== "string" || name.trim() === "") {
        throw new Error("A choice name is required.");
    }
    if (context !== null && typeof context !== "string") {
        throw new Error("Choice context must be text.");
    }

    const create = db.transaction(() => {
        const userId = getDefaultUser();
        const binId = getOrCreateGeneralChoiceBin(userId);
        return addChoice(binId, null, {
            description: name.trim(),
            context
        });
    });

    // Lock before looking up the bin so two requests can't create it at the same time.
    return create.immediate();
}

// List the default user's choice summaries for one status. Defaults to active choices.
function listChoices(status = "active") {
    if (!["active", "decided", "implemented", "dropped"].includes(status)) {
        throw new Error("Invalid choice status.");
    }

    return db.prepare(`
        SELECT choices.choice_id, choices.description, choices.status
        FROM choices
        JOIN user_bins ON choices.bin_id = user_bins.bin_id
        WHERE user_bins.user_id = ? AND choices.status = ?
        ORDER BY choices.choice_id
    `).all(getDefaultUser(), status);
}

// Find recent choices that contain every search term.
function searchChoices(query) {
    if (typeof query !== "string" || query.trim() === "") {
        throw new Error("A search word or phrase is required.");
    }
    const terms = [...new Set(query.trim().toLowerCase().split(/\s+/))];

    // Return summaries so the caller can open only the relevant choices.
    return db.prepare(`
        SELECT choices.choice_id, choices.description, choices.status
        FROM choices
        JOIN user_bins ON choices.bin_id = user_bins.bin_id
        WHERE user_bins.user_id = @userId
            -- Skip choices that are missing any search term.
            AND NOT EXISTS (
                SELECT 1 FROM json_each(@terms) AS term
                WHERE NOT (
                    instr(lower(choices.description), term.value) > 0
                    OR instr(lower(COALESCE(choices.context, '')), term.value) > 0
                    OR instr(lower(COALESCE(choices.helpful_info, '')), term.value) > 0
                    OR EXISTS (
                        SELECT 1 FROM options
                        WHERE options.choice_id = choices.choice_id
                            AND options.bin_id = choices.bin_id
                            AND (
                                instr(lower(options.description), term.value) > 0
                                OR instr(lower(COALESCE(options.outcomes, '')), term.value) > 0
                                OR instr(lower(COALESCE(options.pros, '')), term.value) > 0
                                OR instr(lower(COALESCE(options.cons, '')), term.value) > 0
                            )
                    )
                )
            )
        ORDER BY choices.updated_at DESC, choices.choice_id DESC
        LIMIT 5
    `).all({ userId: getDefaultUser(), terms: JSON.stringify(terms) });
}

// Load one choice and its options by ID, regardless of status, for the default user.
function getChoiceDetails(choiceId) {
    if (!Number.isSafeInteger(choiceId) || choiceId <= 0) {
        throw new Error("A valid choice ID is required.");
    }

    const choice = db.prepare(`
        SELECT choices.*
        FROM choices
        JOIN user_bins ON choices.bin_id = user_bins.bin_id
        WHERE user_bins.user_id = ? AND choices.choice_id = ?
    `).get(getDefaultUser(), choiceId);

    if (choice === undefined) {
        throw new Error("Choice not found.");
    }

    // Include dropped options so they can be shown when the user asks.
    const options = db.prepare(`
        SELECT * FROM options
        WHERE choice_id = ? AND bin_id = ?
        ORDER BY option_id
    `).all(choice.choice_id, choice.bin_id);

    return { ...choice, options };
}

// Edit the name, context, or helpful information for an active choice.
function updateChoice(choiceId, { name, context, helpfulInfo } = {}) {
    if (!Number.isSafeInteger(choiceId) || choiceId <= 0) {
        throw new Error("A valid choice ID is required.");
    }
    if (name === undefined && context === undefined && helpfulInfo === undefined) {
        throw new Error("Provide a choice name, context, or helpful information to update.");
    }
    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
        throw new Error("A choice name is required.");
    }
    if (context !== undefined && context !== null && typeof context !== "string") {
        throw new Error("Choice context must be text.");
    }
    if (helpfulInfo !== undefined && helpfulInfo !== null && typeof helpfulInfo !== "string") {
        throw new Error("Helpful information must be text or null.");
    }

    // Leave a field out to keep it. Pass null to clear context or helpful information.
    const choice = db.prepare(`
        UPDATE choices
        SET description = COALESCE(@name, description),
            context = CASE WHEN @hasContext = 1 THEN @context ELSE context END,
            helpful_info = CASE WHEN @hasHelpfulInfo = 1 THEN @helpfulInfo ELSE helpful_info END,
            updated_at = datetime('now', 'localtime')
        WHERE choice_id = @choiceId AND status = 'active'
            AND bin_id IN (SELECT bin_id FROM user_bins WHERE user_id = @userId)
        RETURNING choice_id, description, context, helpful_info, status
    `).get({
        choiceId,
        userId: getDefaultUser(),
        name: name === undefined ? null : name.trim(),
        context: context ?? null,
        hasContext: context === undefined ? 0 : 1,
        helpfulInfo: helpfulInfo ?? null,
        hasHelpfulInfo: helpfulInfo === undefined ? 0 : 1
    });

    if (choice === undefined) {
        throw new Error("No active choice found for that ID.");
    }

    return choice;
}

// Drop a choice and keep its options for later.
function dropChoice(choiceId) {
    const drop = db.transaction(() => {
        const choice = getChoiceDetails(choiceId);

        if (choice.status !== "active" && choice.status !== "decided") {
            throw new Error("Only active or decided choices can be dropped.");
        }

        setChoiceStatus(choiceId, "dropped", null);
        return { choice_id: choiceId, status: "dropped" };
    });

    return drop.immediate();
}

// Reopen a choice and reset the options from its previous decision.
function reopenChoice(choiceId) {
    const reopen = db.transaction(() => {
        const choice = getChoiceDetails(choiceId);

        if (choice.status !== "decided" && choice.status !== "dropped") {
            throw new Error("Only decided or dropped choices can be reopened.");
        }

        for (const option of choice.options) {
            if (option.status === "chosen" || option.status === "not_chosen") {
                setOptionStatus(option.option_id, "considering", null);
            }
        }

        setChoiceStatus(choiceId, "active", null);
        return { choice_id: choiceId, status: "active" };
    });

    return reopen.immediate();
}

// Delete a choice and its options after the user confirms.
function deleteChoice(choiceId, { confirmed = false } = {}) {
    if (confirmed !== true) {
        throw new Error("Confirm permanent deletion before deleting a choice.");
    }

    const remove = db.transaction(() => {
        const choice = getChoiceDetails(choiceId);
        const mismatchedOption = db.prepare(`
            SELECT option_id FROM options
            WHERE choice_id = ? AND bin_id <> ?
        `).get(choice.choice_id, choice.bin_id);

        if (mismatchedOption !== undefined) {
            throw new Error("A linked option belongs to a different bin. Choice was not deleted.");
        }

        // Delete the options first because SQLite would otherwise detach them.
        db.prepare("DELETE FROM options WHERE choice_id = ?").run(choice.choice_id);
        db.prepare("DELETE FROM choices WHERE choice_id = ?").run(choice.choice_id);

        return { choice_id: choice.choice_id, deleted: true };
    });

    return remove.immediate();
}

// Create a choice AND its "Do nothing" option together (transaction). 
// Bin must be an advise bin. Returns choice_id.
function addChoice(binId, sessionId, choice) {
    const {
        description,
        context = null,
        source = "stated"
    } = choice;
    const add = db.transaction(() => {

        const bin = db.prepare(
            `
            SELECT mm_role FROM user_bins 
            WHERE bin_id = ?
        `
        ).get(binId);

        if (bin === undefined || bin.mm_role !== "advise") { throw new Error("Bin " + binId + " is not an advise bin"); }

        const insertChoice = db.prepare(
            `
            INSERT INTO choices (bin_id, description, context, status, source)
                VALUES (?,?,?,'active',?)
            `
        ).run(binId, description, context, source);

        const choiceId = insertChoice.lastInsertRowid;

        db.prepare(
            `
            INSERT INTO options (bin_id,choice_id,description,is_do_nothing,status,source)
                VALUES (?,?,'Do nothing',1,'considering',?)
            `
        ).run(binId, choiceId, source);
        return choiceId;
    });
    return add();
}

// Add an option to an active choice that belongs to the default user.
function createOption(choiceId, { description } = {}) {
    if (typeof description !== "string" || description.trim() === "") {
        throw new Error("An option description is required.");
    }

    const create = db.transaction(() => {
        const choice = getChoiceDetails(choiceId);

        if (choice.status !== "active") {
            throw new Error("Options can only be added to active choices.");
        }

        return addOption(choiceId, null, { description: description.trim() });
    });

    // Keep the choice active between the check and the insert.
    return create.immediate();
}

// Edit an option's description on an active choice owned by the default user.
function updateOptionDescription(optionId, { description } = {}) {
    if (!Number.isSafeInteger(optionId) || optionId <= 0) {
        throw new Error("A valid option ID is required.");
    }
    if (typeof description !== "string" || description.trim() === "") {
        throw new Error("An option description is required.");
    }

    // Keep the built-in Do nothing option's description fixed.
    const option = db.prepare(`
        UPDATE options
        SET description = @description,
            updated_at = datetime('now', 'localtime')
        WHERE option_id = @optionId AND is_do_nothing = 0
            AND EXISTS (
                SELECT 1
                FROM choices
                JOIN user_bins ON user_bins.bin_id = choices.bin_id
                WHERE choices.choice_id = options.choice_id
                    AND choices.bin_id = options.bin_id
                    AND choices.status = 'active'
                    AND user_bins.user_id = @userId
            )
        RETURNING option_id, choice_id, description, status
    `).get({
        optionId,
        description: description.trim(),
        userId: getDefaultUser()
    });

    if (option === undefined) {
        throw new Error("No editable option found for that ID.");
    }

    return option;
}

// Save or clear evaluation text for an option on an active choice.
function updateOptionEvaluation(optionId, { outcomes, pros, cons } = {}) {
    if (!Number.isSafeInteger(optionId) || optionId <= 0) {
        throw new Error("A valid option ID is required.");
    }

    // Update only the fields the caller supplies. Null clears a field.
    const fields = Object.entries({ outcomes, pros, cons })
        .filter(([, value]) => value !== undefined);

    if (fields.length === 0) {
        throw new Error("Provide outcomes, pros, or cons to update.");
    }

    for (const [field, value] of fields) {
        if (value !== null && typeof value !== "string") {
            throw new Error(`${field} must be text or null.`);
        }
    }

    // Column names come from the three fields above. Bind the values separately.
    const assignments = fields.map(([field]) => `${field} = ?`).join(", ");
    const values = fields.map(([, value]) => value);
    const option = db.prepare(`
        UPDATE options
        SET ${assignments}, updated_at = datetime('now', 'localtime')
        WHERE option_id = ?
            AND EXISTS (
                SELECT 1
                FROM choices
                JOIN user_bins ON user_bins.bin_id = choices.bin_id
                WHERE choices.choice_id = options.choice_id
                    AND choices.bin_id = options.bin_id
                    AND choices.status = 'active'
                    AND user_bins.user_id = ?
            )
        RETURNING option_id, choice_id, outcomes, pros, cons
    `).get(...values, optionId, getDefaultUser());

    if (option === undefined) {
        throw new Error("No option found on an active choice for that ID.");
    }

    return option;
}

// Drop an option and keep it for later.
function dropOption(optionId) {
    return changeOptionStatus(optionId, ["considering", "in_progress", "available"], "dropped");
}

// Put a dropped option back into consideration.
function restoreOption(optionId) {
    return changeOptionStatus(optionId, ["dropped"], "considering");
}

// Delete a regular option after the user confirms.
function deleteOption(optionId, { confirmed = false } = {}) {
    if (confirmed !== true) {
        throw new Error("Confirm permanent deletion before deleting an option.");
    }
    if (!Number.isSafeInteger(optionId) || optionId <= 0) {
        throw new Error("A valid option ID is required.");
    }

    // Check ownership and the choice's status in the same statement that deletes the option.
    const result = db.prepare(`
        DELETE FROM options
        WHERE option_id = @optionId AND is_do_nothing = 0
            AND EXISTS (
                SELECT 1
                FROM choices
                JOIN user_bins ON user_bins.bin_id = choices.bin_id
                WHERE choices.choice_id = options.choice_id
                    AND choices.bin_id = options.bin_id
                    AND choices.status = 'active'
                    AND user_bins.user_id = @userId
            )
    `).run({ optionId, userId: getDefaultUser() });

    if (result.changes === 0) {
        throw new Error("No deletable option found for that ID.");
    }

    return { option_id: optionId, deleted: true };
}

// Check that the option can change status before saving it.
function changeOptionStatus(optionId, allowedStatuses, newStatus) {
    if (!Number.isSafeInteger(optionId) || optionId <= 0) {
        throw new Error("A valid option ID is required.");
    }

    const change = db.transaction(() => {
        const option = db.prepare(`
            SELECT options.status
            FROM options
            JOIN choices ON choices.choice_id = options.choice_id
                AND choices.bin_id = options.bin_id
            JOIN user_bins ON user_bins.bin_id = choices.bin_id
            WHERE options.option_id = ? AND options.is_do_nothing = 0
                AND choices.status = 'active' AND user_bins.user_id = ?
        `).get(optionId, getDefaultUser());

        if (option === undefined) {
            throw new Error("No option eligible for drop or restore was found for that ID.");
        }
        if (!allowedStatuses.includes(option.status)) {
            throw new Error("This option cannot change to that status.");
        }

        setOptionStatus(optionId, newStatus, null);
        return { option_id: optionId, status: newStatus };
    });

    return change.immediate();
}

// Add a candidate option to a choice (looks up the choice's bin_id). Returns option_id.
function addOption(choiceId, sessionId, option) {
    const {
        description,
        outcomes = null,
        pros = null,
        cons = null,
        status = "considering",
        expectedDate = null,
        mentionDaysBefore = null,
        source = 'stated'
    } = option;

    const bin = db.prepare(
        `
        SELECT bin_id FROM choices 
        WHERE choice_id = ?
        `
    ).get(choiceId);

    if (bin === undefined) { throw new Error("Choice " + choiceId + " not found."); }
    const insert = db.prepare(
        `
        INSERT INTO options (bin_id,choice_id,description,is_do_nothing,outcomes,pros,cons,status,expected_date,mention_days_before,source)
        VALUES (?,?,?,0,?,?,?,?,?,?,?)
        `
    ).run(bin.bin_id, choiceId, description, outcomes, pros, cons, status, expectedDate, mentionDaysBefore, source);

    return insert.lastInsertRowid;

}

// Add an option straight to an advise bin with no choice yet (rule A6 before a choice exists; A2 proposes one later). Returns option_id.
function addOptionToBin(binId, sessionId, option) {
    const {
        description,
        outcomes = null,
        pros = null,
        cons = null,
        status = "considering",
        expectedDate = null,
        mentionDaysBefore = null,
        source = 'stated'
    } = option;

    const bin = db.prepare(
        `
            SELECT mm_role FROM user_bins 
            WHERE bin_id = ?
        `
    ).get(binId);

    if (bin === undefined || bin.mm_role !== "advise") { throw new Error("Bin " + binId + " is not an advise bin"); }

    const insert = db.prepare(
        `
        INSERT INTO options (bin_id, description, is_do_nothing, outcomes, pros, cons, status, expected_date, mention_days_before, source)
        VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?)
        `
    ).run(binId, description, outcomes, pros, cons, status, expectedDate, mentionDaysBefore, source);

    return insert.lastInsertRowid;
}

// Attach a bin's loose options (choice_id IS NULL) to a choice in that same bin, e.g. after the user accepts an A2 proposal. Returns how many were linked.
function linkOptionsToChoice(binId, choiceId) {
    const choice = db.prepare(
        `
        SELECT bin_id FROM choices 
        WHERE choice_id = ?
        `
    ).get(choiceId);

    if (choice === undefined || binId !== choice.bin_id) { throw new Error("choice " + choiceId + " does not exist"); }

    const update = db.prepare(
        `
        UPDATE options SET choice_id = ?, updated_at = datetime('now','localtime')
        WHERE bin_id =? AND choice_id IS NULL
        `
    ).run(choiceId, binId);

    return update.changes;
}

// The user's active and decided choices, each with an `options` array (JOIN through user_bins).
function getActiveChoices(userId) {

    const userChoices = db.prepare(
        `
        SELECT choices.* FROM choices
        JOIN user_bins ON choices.bin_id = user_bins.bin_id
        WHERE user_bins.user_id = ? AND choices.status IN ('active','decided')
        ORDER BY choices.choice_id
        `
    ).all(userId);
    const arr = userChoices.map(choice => ({
        ...choice, options:
            db.prepare(

                `
            SELECT * FROM options
            WHERE choice_id = ?
            ORDER BY is_do_nothing, created_at
            `
            ).all(choice.choice_id)
    }));
    return arr;


}


// Change an option's status and log it in status_history (transaction). Returns .changes.
function setOptionStatus(optionId, newStatus, sessionId) {
    const update = db.transaction(() => {
        const option = db.prepare(
            `
            SELECT status FROM options
            WHERE option_id = ?
            `
        ).get(optionId);

        if (option === undefined) { throw new Error("option doesn't exist "); }

        const changes = db.prepare(

            `
            UPDATE options SET status = ?, updated_at = datetime('now','localtime')
            WHERE option_id = ?
            `
        ).run(newStatus, optionId);

        db.prepare(
            `
            INSERT INTO status_history (option_id, old_status, new_status, session_id)
            VALUES (?,?,?,?)
            `
        ).run(optionId, option.status, newStatus, sessionId);
        return changes.changes
    });

    return update();

}

// Change a choice's status and log it in status_history (transaction). Returns .changes.
function setChoiceStatus(choiceId, newStatus, sessionId) {
    const update = db.transaction(() => {
        const choice = db.prepare(
            `
            SELECT status FROM choices
            WHERE choice_id = ?
            `
        ).get(choiceId);

        if (choice === undefined) { throw new Error("choice doesn't exist "); }

        const changes = db.prepare(

            `
            UPDATE choices SET status = ?, updated_at = datetime('now','localtime')
            WHERE choice_id = ?
            `
        ).run(newStatus, choiceId);

        db.prepare(
            `
            INSERT INTO status_history (choice_id, old_status, new_status, session_id)
            VALUES (?,?,?,?)
            `
        ).run(choiceId, choice.status, newStatus, sessionId);
        return changes.changes
    });

    return update();

}

// Update outcomes, pros, cons or expected date; keeps old values for fields not passed (COALESCE). Returns .changes.
function updateOption(optionId, fields) {
    const {
        outcomes = null,
        pros = null,
        cons = null,
        expectedDate = null,
        mentionDaysBefore = null
    } = fields;

    const update = db.prepare(
        `
        UPDATE options SET 
        outcomes = COALESCE(?,outcomes), pros = COALESCE(?,pros), cons = COALESCE(?,cons), expected_date = COALESCE (?,expected_date), mention_days_before = COALESCE(?,mention_days_before), updated_at = datetime('now','localtime')
        WHERE option_id = ?
        `
    ).run(outcomes, pros, cons, expectedDate, mentionDaysBefore, optionId);
    return update.changes;
}


// Save the option the user selected for an active choice.
function recordDecision(choiceId, optionId, { confirmed = false } = {}) {
    if (confirmed !== true) {
        throw new Error("Confirm the user's selection before recording a decision.");
    }
    if (!Number.isSafeInteger(optionId) || optionId <= 0) {
        throw new Error("A valid option ID is required.");
    }

    const record = db.transaction(() => {
        const choice = getChoiceDetails(choiceId);
        if (choice.status !== "active") {
            throw new Error("Only active choices can be decided.");
        }

        const selected = choice.options.find(option => option.option_id === optionId);
        if (selected === undefined || selected.status === "dropped") {
            throw new Error("Select an option that belongs to this choice and is still under consideration.");
        }

        // Keep dropped options as they are and record each status change.
        for (const option of choice.options) {
            if (option.status === "dropped") {
                continue;
            }

            const status = option.option_id === optionId ? "chosen" : "not_chosen";
            if (option.status !== status) {
                setOptionStatus(option.option_id, status, null);
            }
        }

        setChoiceStatus(choiceId, "decided", null);
        return { choice_id: choiceId, option_id: optionId, status: "decided" };
    });

    return record.immediate();
}

// Mark a decision implemented after the user confirms they acted on it.
function markDecisionImplemented(choiceId, { confirmed = false } = {}) {
    if (confirmed !== true) {
        throw new Error("Confirm that the user acted on the decision.");
    }

    const markImplemented = db.transaction(() => {
        const choice = getChoiceDetails(choiceId);

        if (choice.status !== "decided") {
            throw new Error("Only decided choices can be marked implemented.");
        }

        // A decision must have exactly one chosen option.
        const chosenOptions = choice.options.filter(option => option.status === "chosen");
        if (chosenOptions.length !== 1) {
            throw new Error("The choice must have exactly one chosen option.");
        }

        setChoiceStatus(choiceId, "implemented", null);
        return {
            choice_id: choiceId,
            option_id: chosenOptions[0].option_id,
            status: "implemented"
        };
    });

    return markImplemented.immediate();
}

// Mark an option chosen, save a decision diary entry, link it via decision_entry_id (transaction). Returns entry_id.
function chooseOption(optionId, reason, sessionId, userId) {
    const choose = db.transaction(() => {
        const option = db.prepare(
            `
        SELECT description, bin_id FROM options
        WHERE option_id = ?
        `
        ).get(optionId);

        if (option === undefined) { throw new Error("option " + optionId + " not found"); }

        setOptionStatus(optionId, "chosen", sessionId);
        const option_desc = "Chose " + option.description;

        const inserted = db.prepare(
            `
        INSERT INTO diary_entries (user_id, bin_id, entry_type, content, reason,happened_on, source,origin_session_id)
        VALUES (?,?,'decision',?,?,date('now','localtime'),'stated',?)
        `
        ).run(userId, option.bin_id, option_desc, reason, sessionId).lastInsertRowid;

        db.prepare(
            `
        UPDATE options SET decision_entry_id = ?
        WHERE option_id =?
        `
        ).run(inserted, optionId);
        return inserted
    });
    return choose();

}

// Turn plan steps into ordered tasks linked to the choice, positions 1, 2, 3... (transaction). Returns task ids.
function makePlan(choiceId, steps, sessionId, userId) {
    const makePlan = db.transaction(() => {
        const choice = db.prepare(
            `
            SELECT choice_id FROM choices
            WHERE choice_id = ?
            `).get(choiceId);
        if (choice === undefined) { throw new Error("choice " + choiceId + " not found"); }
        const taskArray = steps.map((step, i) => {
            return addTask(userId, sessionId, { ...step, choiceId, position: i + 1 })
        }
        );
        return taskArray
    });
    return makePlan();
}

module.exports = { createChoice, listChoices, searchChoices, getChoiceDetails, updateChoice, dropChoice, reopenChoice, deleteChoice, addChoice, createOption, updateOptionDescription, updateOptionEvaluation, dropOption, restoreOption, deleteOption, addOption, addOptionToBin, linkOptionsToChoice, getActiveChoices, setOptionStatus, setChoiceStatus, updateOption, recordDecision, markDecisionImplemented, chooseOption, makePlan, };
