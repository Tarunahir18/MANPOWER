/**
 * migrate-to-supabase.js
 * One-time script to migrate existing JSON data into Supabase tables.
 * Run AFTER creating tables via schema.sql in Supabase SQL Editor.
 * 
 * Usage: node migrate-to-supabase.js
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabase = require('./supabase');

async function migrate() {
    console.log('=== MANPOWER → Supabase Migration ===\n');

    // 1. Migrate Users
    const usersFile = path.join(__dirname, 'users.json');
    if (fs.existsSync(usersFile)) {
        const usersRaw = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
        const users = Object.entries(usersRaw).map(([email, data]) => ({
            email,
            password: typeof data === 'string' ? data : data.password,
            role: (typeof data === 'object' ? data.role : 'user') || 'user',
        }));

        if (users.length > 0) {
            const { data, error } = await supabase
                .from('users')
                .upsert(users, { onConflict: 'email' });
            if (error) console.error('[USERS] Error:', error.message);
            else console.log(`[USERS] Migrated ${users.length} users ✓`);
        }

        // Migrate enrollments from user data
        const enrollments = [];
        Object.entries(usersRaw).forEach(([email, data]) => {
            if (typeof data === 'object' && data.enrolled) {
                data.enrolled.forEach(game => {
                    enrollments.push({ user_email: email, game_name: game });
                });
            }
        });

        if (enrollments.length > 0) {
            const { error } = await supabase
                .from('enrollments')
                .upsert(enrollments, { onConflict: 'user_email,game_name' });
            if (error) console.error('[ENROLLMENTS] Error:', error.message);
            else console.log(`[ENROLLMENTS] Migrated ${enrollments.length} enrollments ✓`);
        }
    } else {
        console.log('[USERS] No users.json found, skipping.');
    }

    // 2. Migrate Contacts
    const contactsFile = path.join(__dirname, 'contacts.json');
    if (fs.existsSync(contactsFile)) {
        const contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf8'));
        if (contacts.length > 0) {
            const rows = contacts.map(c => ({
                name: c.name,
                email: c.email,
                subject: c.subject,
                message: c.message,
                created_at: c.timestamp || new Date().toISOString(),
            }));
            const { error } = await supabase.from('contacts').insert(rows);
            if (error) console.error('[CONTACTS] Error:', error.message);
            else console.log(`[CONTACTS] Migrated ${rows.length} contacts ✓`);
        }
    }

    // 3. Migrate Tournaments
    const tournamentsFile = path.join(__dirname, 'tournaments.json');
    if (fs.existsSync(tournamentsFile)) {
        const tournaments = JSON.parse(fs.readFileSync(tournamentsFile, 'utf8'));
        if (tournaments.length > 0) {
            const rows = tournaments.map(t => ({
                name: t.name,
                venue: t.venue,
                sport: t.sport || 'General',
                image: t.image,
                created_at: t.createdAt || new Date().toISOString(),
            }));
            const { error } = await supabase.from('tournaments').insert(rows);
            if (error) console.error('[TOURNAMENTS] Error:', error.message);
            else console.log(`[TOURNAMENTS] Migrated ${rows.length} tournaments ✓`);
        }
    }

    // 4. Migrate Products
    const productsFile = path.join(__dirname, 'data', 'products.json');
    if (fs.existsSync(productsFile)) {
        const products = JSON.parse(fs.readFileSync(productsFile, 'utf8'));
        if (products.length > 0) {
            const rows = products.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category,
                price: p.price,
                image: p.image,
                description: p.description,
            }));
            const { error } = await supabase.from('products').upsert(rows, { onConflict: 'id' });
            if (error) console.error('[PRODUCTS] Error:', error.message);
            else console.log(`[PRODUCTS] Migrated ${rows.length} products ✓`);
        }
    }

    console.log('\n=== Migration Complete ===');
    process.exit(0);
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
