const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const oldDbPath = path.resolve(__dirname, '../doctor_portal.db');
const newDbPath = path.resolve(__dirname, 'blood.db');

const oldDb = new sqlite3.Database(oldDbPath, sqlite3.OPEN_READONLY);
const newDb = new sqlite3.Database(newDbPath);

newDb.serialize(() => {
    newDb.run("DELETE FROM blood_donors"); // Clear existing if any (optional)

    oldDb.all("SELECT * FROM blood_donors", [], (err, rows) => {
        if (err) {
            console.error("Error reading old DB:", err);
            return;
        }

        console.log(`Migrating ${rows.length} donors...`);
        const stmt = newDb.prepare("INSERT INTO blood_donors (id, name, blood_group, phone, location, last_donation_date, age) VALUES (?, ?, ?, ?, ?, ?, ?)");

        rows.forEach(row => {
            stmt.run([row.id, row.name, row.blood_group, row.phone, row.location, row.last_donation_date, row.age]);
        });

        stmt.finalize(() => {
            console.log("Migration complete.");
            oldDb.close();
            newDb.close();
        });
    });
});
