const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const PUBLIC_DIR = path.join(__dirname, '..');
const DB_FILE = path.join(__dirname, 'users.json');

app.use(express.static(PUBLIC_DIR));
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Request logging for debugging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

/* -------- DEFAULT ROUTE -------- */
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'home.html'));
});

/* -------- READ USERS -------- */
async function readUsers() {
    try {
        const data = await fs.readFile(DB_FILE, 'utf8');
        const trimmed = data.trim();
        if (!trimmed) return {};
        const users = JSON.parse(trimmed);
        console.log(`[GET] Users database read successfully (${Object.keys(users).length} users)`);
        return users;
    } catch (error) {
        console.error("[ERROR] Failed to read users database:", error.message);
        return {};
    }
}

/* -------- WRITE USERS -------- */
async function writeUsers(users) {
    await fs.writeFile(DB_FILE, JSON.stringify(users, null, 2));
}

/* -------- SIGNUP -------- */
app.post('/api/v1/users/signup', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    try {
        const users = await readUsers();

        if (users[email]) {
            return res.status(400).json({
                success: false,
                message: 'User already exists'
            });
        }

        users[email] = { password, role: role || 'user' };
        await writeUsers(users);

        return res.json({
            success: true,
            email: email,
            role: role || 'user',
            message: 'Signup successful!'
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/* -------- LOGIN -------- */
app.post('/api/v1/users/login', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Email and password are required'
        });
    }

    // ADMIN LOGIN
    if (role && role.toLowerCase() === 'admin') {
        if (email === 'admin' && password === '123') {
            return res.json({
                success: true,
                message: 'Admin login successful',
                email: 'Admin',
                role: 'admin'
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }
    }

    // STUDENT LOGIN
    try {
        const users = await readUsers();

        const userData = users[email];
        const storedPass = typeof userData === 'object' ? userData.password : userData;
        const storedRole = typeof userData === 'object' ? userData.role : 'user';

        if (userData && storedPass === password) {
            return res.json({
                success: true,
                message: 'Login successful',
                email,
                role: storedRole
            });
        } else {
            return res.status(401).json({
                success: false,
                message: 'Invalid login credentials'
            });
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

/* -------- ADMIN: GET ALL USERS -------- */
app.get('/api/v1/users', async (req, res) => {
    try {
        const users = await readUsers();
        res.json({ success: true, users });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* -------- START SERVER -------- */
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
    } else {
        console.error('Server error:', err);
    }
});

process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});