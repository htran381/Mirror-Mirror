const db = require("../index.js");

// Resolve the seeded Guest account by name so callers can use its stored ID
function getDefaultUser() {
    const users = db.prepare("SELECT user_id FROM users WHERE name = ?").all("Guest");
    if (users.length !== 1) {
        throw new Error("Expected exactly one default user named Guest.");
    }

    const userId = users[0].user_id;
    const studentRole = db.prepare(`
        SELECT 1
        FROM user_roles
        JOIN user_categories USING (category_id)
        WHERE user_roles.user_id = ? AND user_categories.name = ?
    `).get(userId, "Student");

    if (studentRole === undefined) {
        throw new Error("The default user Guest must have the Student persona.");
    }

    return userId;
}

module.exports = { getDefaultUser };
