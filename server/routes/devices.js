// devices.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { v4: uuidv4 } = require('uuid');

// HELPERS

// Confirm a baby exists and is active before assigning a device to it.
async function validateBabyExists(baby_id) {
    const [rows] = await pool.query(
        'SELECT id, status FROM babies WHERE id = ?',
        [baby_id]
    );
    if (rows.length === 0) return 'Baby does not exist!';
    if (rows[0].status !== 'active') return 'Baby is not active!';
    return null;
}

// GET /api/v1/devices
// Admin + Nurse: list all devices with derived room (via baby), current baby, and online status.
// Room is looked up through the baby, not stored on the device — an unassigned device
// has no room until it's assigned to a baby.
router.get('/', authenticate, requireRole('nurse', 'admin'), async (req, res) => {
    const { active } = req.query;

    const clauses = [
        `SELECT d.id, d.device_code, d.is_active, d.last_seen_at,
                b.id AS baby_id, b.first_name AS baby_first_name, b.last_name AS baby_last_name,
                r.id AS room_id, r.room_number,
                CASE
                    WHEN d.last_seen_at IS NOT NULL AND d.last_seen_at > (NOW() - INTERVAL 2 MINUTE)
                    THEN TRUE ELSE FALSE
                END AS is_online
         FROM devices d
         LEFT JOIN babies b ON b.id = d.baby_id
         LEFT JOIN rooms r ON r.id = b.room_id`
    ];
    const params = [];

    if (active !== undefined) {
        if (active !== 'true' && active !== 'false') {
            return res.status(400).json({ error: "Query param 'active' must be 'true' or 'false'" });
        }
        clauses.push('WHERE d.is_active = ?');
        params.push(active === 'true');
    }

    clauses.push('ORDER BY d.device_code ASC');
    const sql = clauses.join(' ');

    try {
        const [devices] = await pool.query(sql, params);
        return res.status(200).json(devices);
    } catch (err) {
        console.error('GET /devices error:', err);
        return res.status(500).json({ error: 'Failed to fetch devices' });
    }
});

// POST /api/v1/devices
// Admin only: register a new device (Pi) by its hardware code. No baby assigned yet —
// assignment is a separate, deliberate action via PATCH /devices/:id/assign-baby.
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
    const { device_code } = req.body;

    if (!device_code || typeof device_code !== 'string' || device_code.trim() === '') {
        return res.status(400).json({ error: 'device_code is required!' });
    }

    const trimmedCode = device_code.trim();

    try {
        // Guard against duplicate device_code (schema enforces UNIQUE; this returns a clean 409).
        const [existing] = await pool.query(
            'SELECT id, is_active FROM devices WHERE device_code = ?',
            [trimmedCode]
        );
        if (existing.length > 0) {
            const device = existing[0];
            if (device.is_active === 0) {
                return res.status(409).json({
                    error: `Device ${trimmedCode} already exists but is deactivated. Reactivate it instead of creating a new one.`,
                    device_id: device.id,
                    is_active: false
                });
            }
            return res.status(409).json({ error: 'A device with that code already exists!' });
        }

        const id = uuidv4();
        await pool.query(
            `INSERT INTO devices (id, device_code, is_active)
             VALUES (?, ?, TRUE)`,
            [id, trimmedCode]
        );

        return res.status(201).json({
            message: 'Device registered.',
            device: { id, device_code: trimmedCode, baby_id: null, is_active: true }
        });
    } catch (err) {
        console.error('POST /devices error:', err);
        return res.status(500).json({ error: 'Failed to register device' });
    }
});

// PATCH /api/v1/devices/:id
// Admin only: deactivate or reactivate a device.
router.patch('/:id', authenticate, requireRole('admin'), async (req, res) => {
    const { id } = req.params;
    const { is_active } = req.body;

    if (is_active === undefined) {
        return res.status(400).json({ error: 'is_active is required.' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM devices WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Device not found!' });
        }
        const device = rows[0];

        // Deactivating a device still serving a baby would silently stop playback
        // with no warning — guard it, same as deactivate-room guards against stranding babies.
        if (is_active === false && device.baby_id !== null) {
            return res.status(409).json({
                error: 'Device is currently assigned to a baby. Unassign it first (PATCH /devices/:id/assign-baby with baby_id: null) before deactivating.'
            });
        }

        await pool.query('UPDATE devices SET is_active = ? WHERE id = ?', [is_active, id]);

        const [[updated]] = await pool.query('SELECT * FROM devices WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Device updated.', device: updated });
    } catch (err) {
        console.error('PATCH /devices/:id error:', err);
        return res.status(500).json({ error: 'Failed to update device' });
    }
});

// PATCH /api/v1/devices/:id/assign-baby
// Nurse + Admin: assign a device to a baby, or clear it (baby_id: null).
router.patch('/:id/assign-baby', authenticate, requireRole('nurse', 'admin'), async (req, res) => {
    const { id } = req.params;
    const { baby_id } = req.body;

    if (baby_id === undefined) {
        return res.status(400).json({ error: 'baby_id is required (pass null to unassign).' });
    }

    try {
        const [rows] = await pool.query('SELECT * FROM devices WHERE id = ?', [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Device not found!' });
        }
        const device = rows[0];

        if (device.is_active !== 1) {
            return res.status(409).json({ error: 'Cannot assign a baby to an inactive device.' });
        }

        // Clearing the assignment — always safe.
        if (baby_id === null) {
            await pool.query('UPDATE devices SET baby_id = NULL WHERE id = ?', [id]);
            const [[updated]] = await pool.query('SELECT * FROM devices WHERE id = ?', [id]);
            return res.status(200).json({ message: 'Device unassigned.', device: updated });
        }

        const babyError = await validateBabyExists(baby_id);
        if (babyError) {
            return res.status(400).json({ error: babyError });
        }

        // Enforce one-to-one at the application level too (schema UNIQUE is the backstop).
        const [conflict] = await pool.query(
            'SELECT id, device_code FROM devices WHERE baby_id = ? AND id != ?',
            [baby_id, id]
        );
        if (conflict.length > 0) {
            return res.status(409).json({
                error: `This baby is already assigned to device ${conflict[0].device_code}. Unassign it there first.`,
                conflicting_device_id: conflict[0].id
            });
        }

        try {
            await pool.query('UPDATE devices SET baby_id = ? WHERE id = ?', [baby_id, id]);
        } catch (updateErr) {
            // Race-condition backstop: two requests both pass the check above, then both
            // try to claim the same baby_id — the schema's UNIQUE constraint catches it.
            if (updateErr.code === 'ER_DUP_ENTRY') {
                return res.status(409).json({ error: 'This baby was just assigned to another device.' });
            }
            throw updateErr;
        }

        const [[updated]] = await pool.query('SELECT * FROM devices WHERE id = ?', [id]);
        return res.status(200).json({ message: 'Device assigned to baby.', device: updated });
    } catch (err) {
        console.error('PATCH /devices/:id/assign-baby error:', err);
        return res.status(500).json({ error: 'Failed to assign device' });
    }
});

module.exports = router;