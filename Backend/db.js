const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'tasks.db');

let db = null;

// Initialize the database
async function initDB() {
    const SQL = await initSqlJs();

    // Load existing database if it exists, otherwise create new
    if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
        console.log('Database loaded from:', dbPath);
    } else {
        db = new SQL.Database();
        console.log('New database created at:', dbPath);
    }

    // Create tasks table if it doesn't exist
    db.run(`
        CREATE TABLE IF NOT EXISTS tasks (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            title        TEXT NOT NULL,
            description  TEXT DEFAULT '',
            deadline     TEXT DEFAULT NULL,
            priority     TEXT DEFAULT 'low',
            completed    INTEGER DEFAULT 0,
            created_at   TEXT DEFAULT (datetime('now', 'localtime')),
            completed_at TEXT DEFAULT NULL
        );
    `);

    // Save to persist the schema
    saveDB();

    return db;
}

// Save database to file
function saveDB() {
    if (db) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

// Get the database instance
function getDB() {
    return db;
}

module.exports = { initDB, getDB, saveDB };
