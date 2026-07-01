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

module.exports = router;