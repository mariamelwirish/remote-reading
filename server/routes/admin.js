// admin.js
const express = require('express');
const router = express.Router();
const { generateRawToken, hashToken } = require('../utils/tokens');
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { v4: uuidv4 } = require('uuid');
const { notifyInvite } = require('../utils/ses');

// Simple email sanity check — not exhaustive, just catches obvious junk.
const isValidEmail = (email) =>
    typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Next sequential hospital_id for a role prefix.
// prefix 'N' -> finds highest existing 'N-#####' and returns the next.
async function generateHospitalId(prefix) {
    const [rows] = await pool.query(
        `SELECT hospital_id FROM users
         WHERE hospital_id LIKE ?
         ORDER BY hospital_id DESC
         LIMIT 1`,
        [`${prefix}-%`]
    );

    let next = 1;
    if (rows.length > 0) {
        const lastNumber = parseInt(rows[0].hospital_id.split('-')[1], 10);
        next = lastNumber + 1;
    }
    return `${prefix}-${String(next).padStart(5, '0')}`;
}

// POST /api/v1/admin/nurses
// Provision a nurse account and send an invite email.
router.post('/nurses', authenticate, requireRole('admin', 'nurse'), async (req, res) => {
    const { first_name, last_name, email } = req.body;

    // 1. Validate input
    if (!first_name || first_name.trim() === '') {
        return res.status(400).json({ error: 'First name is required!' });
    }
    if (!last_name || last_name.trim() === '') {
        return res.status(400).json({ error: 'Last name is required!' });
    }
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'A valid email is required!' });
    }

    const trimmedEmail = email.trim().toLowerCase();

    try {
        // 2. Guard against duplicate email (schema is UNIQUE; this returns a clean 409)
        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [trimmedEmail]
        );
        if (existing.length > 0) {
            return res.status(409).json({ error: 'A user with that email already exists!' });
        }

        // 3. Generate identifiers + invite token
        const id = uuidv4();
        const hospital_id = await generateHospitalId('N');
        const rawToken = generateRawToken();       // emailed to the nurse
        const tokenHash = hashToken(rawToken);     // stored in the DB  
        // console.log('RAW TOKEN (dev only):', rawToken);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
            .toISOString().slice(0, 19).replace('T', ' ');

        // 4. Insert nurse — password_hash stays NULL until activation
        await pool.query(
            `INSERT INTO users
                (id, hospital_id, first_name, last_name, email, role,
                is_active, invite_token, invite_token_expires_at, invite_used, created_by)
            VALUES (?, ?, ?, ?, ?, 'nurse', TRUE, ?, ?, FALSE, ?)`,
            [id, hospital_id, first_name.trim(), last_name.trim(), trimmedEmail,
            tokenHash, expiresAt, req.user.id]     // <-- tokenHash, not rawToken
        );

        // 5. Send invite (account already exists; email is best-effort → resend-invite covers failures)
        try {
            await notifyInvite(trimmedEmail, first_name.trim(), 'nurse', rawToken);  
        } catch (emailErr) {
            console.error('SES invite email failed (nurse):', emailErr);
            return res.status(201).json({
                message: 'Nurse account created but invite email failed to send. Use resend-invite.',
                nurse: { id, hospital_id, first_name: first_name.trim(), last_name: last_name.trim(), email: trimmedEmail, role: 'nurse' }
            });
        }

        // 6. Success
        return res.status(201).json({
            message: 'Nurse account created and invite email sent.',
            nurse: { id, hospital_id, first_name: first_name.trim(), last_name: last_name.trim(), email: trimmedEmail, role: 'nurse' }
        });

    } catch (err) {
        console.error('POST /admin/nurses error:', err);
        return res.status(500).json({ error: 'Failed to create nurse account!' });
    }
});

// POST /api/v1/admin/parents
// Provision (or link) a parent to a baby.
// Two paths: brand-new parent (create + invite + link) OR existing parent (link only).
// Both writes are wrapped in a transaction — user + link succeed together or not at all.
router.post('/parents', authenticate, requireRole('admin', 'nurse'), async (req, res) => {
    const { first_name, last_name, email, baby_id, relationship } = req.body;

    // 1. Validate the link fields first (needed on BOTH paths)
    if (!baby_id) {
        return res.status(400).json({ error: 'baby_id is required!' });
    }
    if (relationship !== 'primary' && relationship !== 'secondary') {
        return res.status(400).json({ error: "relationship must be 'primary' or 'secondary'!" });
    }

    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'A valid email is required!' });
    }
    const trimmedEmail = email.trim().toLowerCase();

    // Grab a dedicated connection so all our queries run on ONE transaction.
    const connection = await pool.getConnection();

    try {
        // 2. Confirm the baby exists and is active (can't link to a discharged/missing baby)
        const [babies] = await connection.query(
            "SELECT id, first_name FROM babies WHERE id = ? AND status = 'active'",
            [baby_id]
        );
        if (babies.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Active baby not found!' });
        }

        // 3. Does a user with this email already exist?
        const [existingUsers] = await connection.query(
            'SELECT id, role FROM users WHERE email = ?',
            [trimmedEmail]
        );

        // ---- PATH A: existing user ----
        if (existingUsers.length > 0) {
            const existing = existingUsers[0];

            // Only a parent account can be linked as a parent.
            if (existing.role !== 'parent') {
                connection.release();
                return res.status(409).json({ error: 'That email belongs to a non-parent account and cannot be linked as a parent.' });
            }

            // Guard: is this parent ALREADY linked to this baby?
            const [alreadyLinked] = await connection.query(
                'SELECT id FROM parent_baby WHERE parent_id = ? AND baby_id = ?',
                [existing.id, baby_id]
            );
            if (alreadyLinked.length > 0) {
                connection.release();
                return res.status(409).json({ error: 'This parent is already linked to this baby.' });
            }

            // Link only — no new account, no invite. Single write, but keep it simple.
            try {
                await connection.query(
                    `INSERT INTO parent_baby (id, parent_id, baby_id, relationship)
                     VALUES (?, ?, ?, ?)`,
                    [uuidv4(), existing.id, baby_id, relationship]
                );
            } catch (linkErr) {
                connection.release();
                if (linkErr.sqlState === '45000') {
                    return res.status(409).json({ error: 'This baby already has two parents.' });
                }
                throw linkErr;
            }

            connection.release();
            return res.status(201).json({
                message: 'Existing parent linked to baby. No new invite sent.',
                parent_id: existing.id,
                baby_id,
                relationship
            });
        }

        // ---- PATH B: brand-new parent ----
        // Now the name fields matter (a new account needs them).
        if (!first_name || first_name.trim() === '') {
            connection.release();
            return res.status(400).json({ error: 'First name is required for a new parent!' });
        }
        if (!last_name || last_name.trim() === '') {
            connection.release();
            return res.status(400).json({ error: 'Last name is required for a new parent!' });
        }

        const id = uuidv4();
        const hospital_id = await generateHospitalId('P');
        const rawToken = generateRawToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
            .toISOString().slice(0, 19).replace('T', ' ');

        // Two writes → transaction.
        await connection.beginTransaction();

        try {
            // Write 1: the user
            await connection.query(
                `INSERT INTO users
                    (id, hospital_id, first_name, last_name, email, role,
                     is_active, invite_token, invite_token_expires_at, invite_used, created_by)
                 VALUES (?, ?, ?, ?, ?, 'parent', TRUE, ?, ?, FALSE, ?)`,
                [id, hospital_id, first_name.trim(), last_name.trim(), trimmedEmail,
                 tokenHash, expiresAt, req.user.id]
            );

            // Write 2: the parent_baby link (may trip the max-2-parents trigger)
            await connection.query(
                `INSERT INTO parent_baby (id, parent_id, baby_id, relationship)
                 VALUES (?, ?, ?, ?)`,
                [uuidv4(), id, baby_id, relationship]
            );

            await connection.commit();
        } catch (txErr) {
            await connection.rollback();
            connection.release();
            if (txErr.sqlState === '45000') {
                return res.status(409).json({ error: 'This baby already has two parents.' });
            }
            throw txErr;
        }

        connection.release();

        // Email is best-effort, OUTSIDE the transaction (email isn't a DB write to roll back).
        try {
            await notifyInvite(trimmedEmail, first_name.trim(), 'parent', rawToken);
        } catch (emailErr) {
            console.error('SES invite email failed (parent):', emailErr);
            return res.status(201).json({
                message: 'Parent account created and linked, but invite email failed. Use resend-invite.',
                parent: { id, hospital_id, email: trimmedEmail, baby_id, relationship }
            });
        }

        return res.status(201).json({
            message: 'Parent account created, linked to baby, and invite email sent.',
            parent: { id, hospital_id, email: trimmedEmail, baby_id, relationship }
        });

    } catch (err) {
        // Safety net: if we threw before releasing, release now.
        try { connection.release(); } catch (_) {}
        console.error('POST /admin/parents error:', err);
        return res.status(500).json({ error: 'Failed to create/link parent account!' });
    }
});

// POST /api/v1/admin/resend-invite
// Re-issue an invite to a user who was provisioned but hasn't activated yet.
// Overwrites the old token hash + expiry with fresh ones, re-sends the email.
router.post('/resend-invite', authenticate, requireRole('admin', 'nurse'), async (req, res) => {
    const { email } = req.body;

    // 1. Validate
    if (!email || !isValidEmail(email)) {
        return res.status(400).json({ error: 'A valid email is required!' });
    }
    const trimmedEmail = email.trim().toLowerCase();

    try {
        // 2. Find the user
        const [users] = await pool.query(
            'SELECT id, first_name, role, invite_used FROM users WHERE email = ?',
            [trimmedEmail]
        );
        if (users.length === 0) {
            return res.status(404).json({ error: 'No account found with that email!' });
        }
        const user = users[0];

        // 3. Guard: only un-activated nurse/parent accounts can be re-invited
        if (user.role === 'admin') {
            return res.status(409).json({ error: 'Admin accounts are not invite-based.' });
        }
        if (user.invite_used === 1) {
            return res.status(409).json({ error: 'This account is already activated. Nothing to resend.' });
        }

        // 4. Mint a fresh token + expiry, overwrite the old ones
        const rawToken = generateRawToken();
        const tokenHash = hashToken(rawToken);
        const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000)
            .toISOString().slice(0, 19).replace('T', ' ');

        await pool.query(
            `UPDATE users
             SET invite_token = ?, invite_token_expires_at = ?, invite_used = FALSE
             WHERE id = ?`,
            [tokenHash, expiresAt, user.id]
        );

        // 5. Re-send (best-effort, same pattern as create)
        try {
            await notifyInvite(trimmedEmail, user.first_name, user.role, rawToken);
        } catch (emailErr) {
            console.error('SES resend-invite email failed:', emailErr);
            return res.status(200).json({
                message: 'Invite token refreshed, but the email failed to send. Try again.'
            });
        }

        return res.status(200).json({
            message: 'Invite email re-sent successfully.'
        });

    } catch (err) {
        console.error('POST /admin/resend-invite error:', err);
        return res.status(500).json({ error: 'Failed to resend invite!' });
    }
});

module.exports = router;