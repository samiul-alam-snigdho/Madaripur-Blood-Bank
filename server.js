const express = require('express');
const cors = require('cors');
const db = require('./database');
const path = require('path');
const session = require('express-session');

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Setup
app.use(session({
    secret: 'blood_donor_network_secret',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 3600000 } // 1 hour
}));

app.use(express.static(path.join(__dirname, 'public')));

// Middleware to check auth
const requireAuth = (req, res, next) => {
    if (req.session.userId) {
        if (req.session.admin) { // Changed to check for req.session.admin
            next();
        } else {
            res.status(401).json({ error: 'Unauthorized' });
        }
    };

    // --- AUTH API ---

    // 1. Admin Login
    app.post('/admin/login', async (req, res) => {
        const { username, password } = req.body;
        try {
            const result = await db.execute({
                sql: "SELECT * FROM admins WHERE username = ? AND password = ?",
                args: [username, password]
            });

            if (result.rows.length > 0) {
                req.session.admin = true;
                res.json({ success: true });
            } else {
                res.json({ success: false });
            }
        } catch (err) {
            console.error("Login Error:", err);
            res.status(500).json({ error: "Database error" });
        }
    });

    app.post('/api/logout', (req, res) => {
        req.session.destroy();
        res.json({ message: 'Logged out' });
    });

    app.get('/api/check-auth', (req, res) => {
        if (req.session.admin) { // Changed to check for req.session.admin
            res.json({ authenticated: true }); // Removed username as it's not stored in session.admin
        } else {
            res.json({ authenticated: false });
        }
    });

    // --- BLOOD DONOR API ---

    // Get all blood donors (with optional sorting)
    app.get('/api/blood-donors', async (req, res) => {
        const { blood_group, location } = req.query;
        let query = "SELECT * FROM blood_donors";
        let params = [];
        let conditions = [];

        if (blood_group) {
            conditions.push("blood_group = ?");
            params.push(blood_group);
        }
        if (location) {
            conditions.push("location LIKE ?");
            params.push(`%${location}%`);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY name COLLATE NOCASE ASC"; // Keep original sorting logic

        try {
            const result = await db.execute({
                sql: query,
                args: params
            });
            res.json(result.rows);
        } catch (err) {
            console.error("Fetch Donors Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // Add a new blood donor
    app.post('/api/blood-donors', async (req, res) => {
        const { name, blood_group, phone, location, last_donation_date, age } = req.body;

        if (!name || !blood_group || !phone || !location) {
            return res.status(400).json({ error: "All fields are required" });
        }

        try {
            const result = await db.execute({
                sql: `INSERT INTO blood_donors (name, blood_group, phone, location, last_donation_date, age)
                  VALUES (?, ?, ?, ?, ?, ?)`,
                args: [name, blood_group, phone, location, last_donation_date, age]
            });
            // LibSQL doesn't directly return lastID like sqlite3.
            // If lastID is needed, a separate query might be required or rely on the client's auto-increment behavior.
            // For now, assuming success is enough.
            res.json({ success: true, message: 'Blood donor registered successfully' });
        } catch (err) {
            console.error("Add Donor Error:", err);
            res.status(500).json({ error: err.message });
        }
    });

    // Delete blood donor
    app.delete('/api/blood-donors/:id', requireAuth, async (req, res) => {
        const id = req.params.id;
        try {
            const result = await db.execute({
                sql: "DELETE FROM blood_donors WHERE id = ?",
                args: [id]
            });
            args: [name, blood_group, phone, location, last_donation_date, age]
        });
    // LibSQL doesn't directly return lastID like sqlite3.
    // If lastID is needed, a separate query might be required or rely on the client's auto-increment behavior.
    // For now, assuming success is enough.
    res.json({ success: true, message: 'Blood donor registered successfully' });
} catch (err) {
    console.error("Add Donor Error:", err);
    res.status(500).json({ error: err.message });
}
});

// Delete blood donor
app.delete('/api/blood-donors/:id', requireAuth, async (req, res) => {
    const id = req.params.id;
    try {
        const result = await db.execute({
            sql: "DELETE FROM blood_donors WHERE id = ?",
            args: [id]
        });
        if (result.rowsAffected > 0) {
            res.json({ success: true, message: "Deleted successfully" });
        } else {
            res.status(404).json({ success: false, message: "Donor not found" });
        }
    } catch (err) {
        console.error("Delete Donor Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Blood Donor Server running at http://localhost:${PORT}`);
});
```
