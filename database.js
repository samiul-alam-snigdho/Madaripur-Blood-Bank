const { createClient } = require('@libsql/client');
const path = require('path');
require('dotenv').config();

const dbUrl = process.env.DB_URL || `file:${path.resolve(__dirname, 'blood.db')}`;
const authToken = process.env.DB_TOKEN;

const db = createClient({
    url: dbUrl,
    authToken: authToken,
});

async function initDB() {
    try {
        // Blood Donors Table
        await db.execute(`CREATE TABLE IF NOT EXISTS blood_donors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            blood_group TEXT,
            phone TEXT,
            location TEXT,
            last_donation_date TEXT,
            age INTEGER
        )`);

        // Admins Table
        await db.execute(`CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        // Seed default admin
        const result = await db.execute({
            sql: "SELECT * FROM admins WHERE username = ?",
            args: ['admin']
        });

        if (result.rows.length === 0) {
            await db.execute({
                sql: "INSERT INTO admins (username, password) VALUES (?, ?)",
                args: ['admin', 'password']
            });
            console.log("Default admin user created.");
        }

        console.log(`Connected to database at ${dbUrl}`);
    } catch (err) {
        console.error("Database initialization failed:", err);
    }
}

// Initialize on start
initDB();

module.exports = db;
