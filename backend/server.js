require('dotenv').config();
const express = require('express');
const path = require('path');
const supabase = require('./supabase');

const app = express();
const DEFAULT_PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, '..');

app.use(express.static(PUBLIC_DIR));
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-role');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

function requireAdmin(req, res, next) {
    const role = (req.headers['x-user-role'] || '').toString().toLowerCase();
    if (role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Admin role required' });
}

/* -------- DEFAULT ROUTE -------- */
app.get('/', (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

/* ======================================================
   AUTH ENDPOINTS
   ====================================================== */

/* -------- GOOGLE OAUTH SYNC -------- */
app.post('/api/v1/auth/google-sync', async (req, res) => {
    const { email, name, avatar } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
    }

    // Enforce @ppsu.ac.in domain on backend too
    if (!email.endsWith('@ppsu.ac.in')) {
        return res.status(403).json({ success: false, message: 'Only @ppsu.ac.in emails are allowed' });
    }

    try {
        // Check if user exists
        const { data: existing } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (existing) {
            // User exists — just return success
            return res.json({ success: true, message: 'User already exists', email });
        }

        // Create new user with a random password (Google users don't need one)
        const randomPass = 'google_' + Math.random().toString(36).substr(2, 16);
        const { error } = await supabase
            .from('users')
            .insert([{ email, password: randomPass, role: 'user' }]);

        if (error) {
            console.error('[GOOGLE_SYNC]', error);
            return res.status(500).json({ success: false, message: error.message });
        }

        console.log(`[GOOGLE_SYNC] New user created: ${email} (via Google)`);
        return res.json({ success: true, message: 'User created via Google', email });
    } catch (error) {
        console.error('[GOOGLE_SYNC]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* -------- SIGNUP -------- */
app.post('/api/v1/users/signup', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
        // Check if user already exists
        const { data: existing } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (existing) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        // Insert new user
        const { data, error } = await supabase
            .from('users')
            .insert([{ email, password, role: role || 'user' }])
            .select()
            .single();

        if (error) {
            console.error('[SIGNUP] Error:', error.message);
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.json({
            success: true,
            email: data.email,
            role: data.role,
            message: 'Signup successful!'
        });
    } catch (error) {
        console.error('[SIGNUP]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* -------- LOGIN -------- */
app.post('/api/v1/users/login', async (req, res) => {
    const { email, password, role } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // ADMIN LOGIN (hardcoded for now)
    if (role && role.toLowerCase() === 'admin') {
        if (email === 'admin' && password === '1234') {
            return res.json({
                success: true,
                message: 'Admin login successful',
                email: 'Admin',
                role: 'admin'
            });
        } else {
            return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
        }
    }

    // STUDENT LOGIN via Supabase
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(401).json({ success: false, message: 'Invalid login credentials' });
        }

        if (user.password !== password) {
            return res.status(401).json({ success: false, message: 'Invalid login credentials' });
        }

        return res.json({
            success: true,
            message: 'Login successful',
            email: user.email,
            role: user.role
        });
    } catch (error) {
        console.error('[LOGIN]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ======================================================
   USER ENDPOINTS
   ====================================================== */

/* -------- ENROLL IN GAME -------- */
app.post('/api/v1/users/enroll', async (req, res) => {
    const { email, gameName } = req.body;

    if (!email || !gameName) {
        return res.status(400).json({ success: false, message: 'Email and gameName are required' });
    }

    try {
        // Check user exists
        const { data: user } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Insert enrollment (upsert to handle duplicates gracefully)
        const { error } = await supabase
            .from('enrollments')
            .upsert([{ user_email: email, game_name: gameName }], {
                onConflict: 'user_email,game_name'
            });

        if (error) {
            console.error('[ENROLL] Error:', error.message);
            return res.status(400).json({ success: false, message: error.message });
        }

        return res.json({ success: true, message: `Enrolled in ${gameName}` });
    } catch (error) {
        console.error('[ENROLL]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* -------- GET SINGLE USER PROFILE -------- */
app.get('/api/v1/users/:email', async (req, res) => {
    const email = decodeURIComponent(req.params.email);

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (error || !user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get enrollments
        const { data: enrollments } = await supabase
            .from('enrollments')
            .select('game_name, enrolled_at')
            .eq('user_email', email);

        const enrolled = (enrollments || []).map(e => e.game_name);
        const activities = (enrollments || []).map(e => ({
            action: 'enrolled',
            game: e.game_name,
            timestamp: e.enrolled_at
        }));

        return res.json({
            success: true,
            user: {
                password: user.password,
                role: user.role,
                enrolled,
                activities
            }
        });
    } catch (error) {
        console.error('[GET_USER]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* -------- ADMIN: GET ALL USERS -------- */
app.get('/api/v1/users', requireAdmin, async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('*');

        if (error) {
            console.error('[GET_USERS]', error);
            return res.status(500).json({ success: false, message: 'Failed to fetch users' });
        }

        // Get all enrollments
        const { data: allEnrollments } = await supabase
            .from('enrollments')
            .select('user_email, game_name, enrolled_at');

        // Build the response object keyed by email (matching original format)
        const usersObj = {};
        (users || []).forEach(u => {
            const userEnrollments = (allEnrollments || []).filter(e => e.user_email === u.email);
            usersObj[u.email] = {
                password: u.password,
                role: u.role,
                enrolled: userEnrollments.map(e => e.game_name),
                activities: userEnrollments.map(e => ({
                    action: 'enrolled',
                    game: e.game_name,
                    timestamp: e.enrolled_at
                }))
            };
        });

        res.json({ success: true, users: usersObj });
    } catch (error) {
        console.error('[GET_USERS]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* -------- ADMIN: DELETE USER -------- */
app.delete('/api/v1/users/:email', requireAdmin, async (req, res) => {
    const email = decodeURIComponent(req.params.email);

    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('email', email);

        if (error) {
            return res.status(404).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'User deleted' });
    } catch (error) {
        console.error('[DELETE_USER]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* -------- ADMIN: UPDATE USER ROLE -------- */
app.patch('/api/v1/users/:email/role', requireAdmin, async (req, res) => {
    const email = decodeURIComponent(req.params.email);
    const { role } = req.body;

    if (!role || !['user', 'admin', 'coach'].includes(role.toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Invalid role provided' });
    }

    try {
        const { data, error } = await supabase
            .from('users')
            .update({ role: role.toLowerCase() })
            .eq('email', email)
            .select()
            .single();

        if (error || !data) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: `Role updated to ${role}` });
    } catch (error) {
        console.error('[UPDATE_ROLE]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ======================================================
   CONTACT ENDPOINTS
   ====================================================== */

app.post('/api/v1/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    try {
        const { error } = await supabase
            .from('contacts')
            .insert([{ name, email, subject, message }]);

        if (error) {
            console.error('[CONTACT]', error);
            return res.status(500).json({ success: false, message: error.message });
        }

        return res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('[CONTACT]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/v1/contacts', requireAdmin, async (req, res) => {
    try {
        const { data: contacts, error } = await supabase
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        res.json({ success: true, contacts: contacts || [] });
    } catch (error) {
        console.error('[CONTACTS]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ======================================================
   PASSWORD RESET
   ====================================================== */
const RESET_TOKENS = {};

app.post('/api/v1/password-reset', async (req, res) => {
    const { email, step, code, newPassword } = req.body;

    if (step === 'request') {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('email')
                .eq('email', email)
                .single();

            if (!user) {
                return res.status(404).json({ success: false, message: 'Email not found' });
            }

            const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
            RESET_TOKENS[email] = { code: resetCode, timestamp: Date.now() };
            console.log(`[RESET] Reset code for ${email}: ${resetCode}`);

            return res.json({ success: true, message: 'Reset code sent (check console)' });
        } catch (error) {
            console.error('[RESET]', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    } else if (step === 'confirm') {
        try {
            const resetData = RESET_TOKENS[email];
            if (!resetData || resetData.code !== code) {
                return res.status(400).json({ success: false, message: 'Invalid reset code' });
            }
            if (Date.now() - resetData.timestamp > 3600000) {
                delete RESET_TOKENS[email];
                return res.status(400).json({ success: false, message: 'Reset code expired' });
            }

            const { error } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('email', email);

            if (error) {
                return res.status(500).json({ success: false, message: error.message });
            }

            delete RESET_TOKENS[email];
            return res.json({ success: true, message: 'Password reset successful' });
        } catch (error) {
            console.error('[RESET]', error);
            res.status(500).json({ success: false, message: 'Server error' });
        }
    }
});

/* ======================================================
   TOURNAMENTS
   ====================================================== */

app.get('/api/v1/tournaments', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('tournaments')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Map to match frontend expected format
        const tournaments = (data || []).map(t => ({
            id: t.id,
            name: t.name,
            venue: t.venue,
            sport: t.sport,
            image: t.image,
            createdAt: t.created_at
        }));

        res.json({ success: true, tournaments });
    } catch (error) {
        console.error('[TOURNAMENTS]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/v1/tournaments', requireAdmin, async (req, res) => {
    const { name, venue, sport } = req.body;
    if (!name || !venue) {
        return res.status(400).json({ success: false, message: 'Name and venue required' });
    }

    try {
        // Default images based on sport
        let defaultImage = "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=800&auto=format&fit=crop";
        if (sport?.toLowerCase() === 'football') defaultImage = "https://images.unsplash.com/photo-1508344928928-7165b67de128?q=80&w=800&auto=format&fit=crop";
        if (sport?.toLowerCase() === 'basketball') defaultImage = "https://images.unsplash.com/photo-1518605364462-ff9b09fa5d07?q=80&w=800&auto=format&fit=crop";
        if (sport?.toLowerCase() === 'cricket') defaultImage = "https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=800&auto=format&fit=crop";
        if (sport?.toLowerCase() === 'chess') defaultImage = "https://images.unsplash.com/photo-1586165368502-1bad197a6461?q=80&w=800&auto=format&fit=crop";

        const { data: newT, error } = await supabase
            .from('tournaments')
            .insert([{ name, venue, sport: sport || 'General', image: defaultImage }])
            .select()
            .single();

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        // Count student users for notification simulation
        const { data: students } = await supabase
            .from('users')
            .select('email')
            .eq('role', 'user');

        const emailCount = (students || []).length;
        (students || []).forEach(s => {
            console.log(`[EMAIL SIMULATOR] Sending email to ${s.email}: New Tournament '${name}' added at '${venue}'!`);
        });

        res.json({
            success: true,
            message: `Tournament added! Notified ${emailCount} students via email.`,
            tournament: {
                id: newT.id,
                name: newT.name,
                venue: newT.venue,
                sport: newT.sport,
                image: newT.image,
                createdAt: newT.created_at
            }
        });
    } catch (error) {
        console.error('[TOURNAMENTS]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.delete('/api/v1/tournaments/:id', requireAdmin, async (req, res) => {
    try {
        const { error } = await supabase
            .from('tournaments')
            .delete()
            .eq('id', req.params.id);

        if (error) {
            return res.status(500).json({ success: false, message: error.message });
        }

        res.json({ success: true, message: 'Deleted successfully' });
    } catch (error) {
        console.error('[TOURNAMENTS]', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

/* ======================================================
   STORE / PRODUCTS
   ====================================================== */

app.get('/api/v1/products', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) {
            console.error('[PRODUCTS]', error);
            return res.json([]);
        }

        res.json(data || []);
    } catch (error) {
        console.error('[PRODUCTS]', error);
        res.json([]);
    }
});

app.post('/api/v1/products', requireAdmin, async (req, res) => {
    const { name, category, price, image, description } = req.body;
    if (!name || !category || !price) {
        return res.status(400).json({ success: false, message: 'Name, category and price are required' });
    }
    try {
        const { data, error } = await supabase
            .from('products')
            .insert([{ name, category, price: Number(price), image, description }])
            .select()
            .single();
        if (error) throw error;
        res.json({ success: true, message: 'Product added', product: data });
    } catch (error) {
        console.error('[POST_PRODUCT]', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.patch('/api/v1/products/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    if (updates.price) updates.price = Number(updates.price);
    try {
        const { data, error } = await supabase
            .from('products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        res.json({ success: true, message: 'Product updated', product: data });
    } catch (error) {
        console.error('[PATCH_PRODUCT]', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/v1/products/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id);
        if (error) throw error;
        res.json({ success: true, message: 'Product deleted' });
    } catch (error) {
        console.error('[DELETE_PRODUCT]', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/create-order', (req, res) => {
    const { amount, currency } = req.body;
    const mockOrder = {
        id: "order_" + Math.random().toString(36).substr(2, 9),
        amount: amount * 100,
        currency: currency || "INR",
        status: "created"
    };
    res.json(mockOrder);
});

app.post('/api/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id } = req.body;
    res.json({ success: true, message: "Payment verified (Demo Mode)" });
});

/* -------- HEALTH CHECK -------- */
app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, message: 'Server is running', database: 'Supabase' });
});

/* -------- START SERVER -------- */
function startServer(port) {
    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`🚀 Server is running on http://localhost:${port}`);
        console.log(`📦 Database: Supabase (${process.env.SUPABASE_URL})`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            if (port < DEFAULT_PORT + 10) {
                console.warn(`Port ${port} is busy. Trying ${port + 1}...`);
                return startServer(port + 1);
            }
            console.error(`Could not start server. Ports ${DEFAULT_PORT}-${DEFAULT_PORT + 10} are busy.`);
        } else {
            console.error('Server error:', err);
        }
    });

    return server;
}

const server = startServer(DEFAULT_PORT);

process.on('uncaughtException', (err) => {
    console.error('There was an uncaught error', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});