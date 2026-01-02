const { createClient } = require('@libsql/client');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

console.log("Migration started...");

// Remote Client (Turso)
const remoteDb = createClient({
    url: process.env.DB_URL,
    authToken: process.env.DB_TOKEN,
});

// Local Database (SQLite File)
const localDbPath = path.resolve(__dirname, 'blood.db');
const localDb = new sqlite3.Database(localDbPath);

async function migrate() {
    try {
        console.log(`Targeting Remote DB: ${process.env.DB_URL}`);

        // 1. Create Tables in Remote (Idempotent)
        console.log("Creating remote tables...");
        await remoteDb.execute(`CREATE TABLE IF NOT EXISTS blood_donors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT,
            blood_group TEXT,
            phone TEXT,
            location TEXT,
            last_donation_date TEXT,
            age INTEGER
        )`);

        await remoteDb.execute(`CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password TEXT
        )`);

        // 2. Read Local Data
        console.log("Reading from local blood.db...");
        localDb.all("SELECT * FROM blood_donors", async (err, rows) => {
            if (err) {
                console.error("Error reading local db:", err);
                return;
            }
            console.log(`Found ${rows.length} donors locally. transferring to cloud...`);

            // 3. Batch Insert into Remote
            // Note: Parallelizing heavily might hit rate limits, so we'll do sequential or small batches.
            // For 700 rows, sequential is fine and safer.
            let successCount = 0;
            for (const row of rows) {
                try {
                    // Check if exists to avoid duplicates (Optional, but good if run multiple times)
                    // Simplified: Just insert. Since we just created tables or they might be empty.
                    // Ideally we should check unique constraint or clear table.
                    // Let's assume database is fresh or we want to append.

                    await remoteDb.execute({
                        sql: "INSERT INTO blood_donors (name, blood_group, phone, location, last_donation_date, age) VALUES (?, ?, ?, ?, ?, ?)",
                        args: [row.name, row.blood_group, row.phone, row.location, row.last_donation_date, row.age]
                    });
                    successCount++;
                    if (successCount % 50 === 0) process.stdout.write('.');
                } catch (e) {
                    console.error(`\nFailed to migrate ${row.name}:`, e.message);
                }
            }
            console.log(`\nMigration complete! Successfully migrated ${successCount}/${rows.length} donors.`);

            // Migrate Admin
            localDb.get("SELECT * FROM admins WHERE username = 'admin'", async (err, row) => {
                if (row) {
                    try {
                        const existing = await remoteDb.execute({ sql: "SELECT * FROM admins WHERE username = 'admin'", args: [] });
                        if (existing.rows.length === 0) {
                            await remoteDb.execute({
                                sql: "INSERT INTO admins (username, password) VALUES (?, ?)",
                                args: [row.username, row.password]
                            });
                            console.log("Admin account migrated.");
                        } else {
                            console.log("Admin already exists in cloud.");
                        }
                    } catch (e) {
                        console.error("Admin migration error:", e);
                    }
                }
                console.log("DONE.");
            });
        });

    } catch (err) {
        console.error("Migration Fatal Error:", err);
    }
}

migrate();
