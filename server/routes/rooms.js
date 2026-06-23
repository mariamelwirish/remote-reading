// rooms.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// GET /api/v1/rooms.
// List all rooms with optional filter on active ones.
router.get('/', authenticate, requireRole('nurse', 'admin'), async(req, res) => {
    const {active} = req.query;

    let sql = 'SELECT id, room_number, floor, wing, is_active FROM rooms';
    const params = [];

    if(active !== undefined) {
        if(active !== 'true' && active !== 'false') {
            return res.status(400).json({ error: "Query param 'active' must be 'true' or 'false'" });
        }
        sql += ' WHERE is_active = ?';
        params.push(active === 'true');
    }

    sql += ' ORDER BY room_number ASC';

    try {
        const [rooms] = await pool.query(sql, params);
        return res.status(200).json(rooms);
    } catch (err) {
        console.error('GET /rooms error:', err);
        return res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});

// GET /api/v1/rooms/:id/babies
// All active babies in a given room (the core nurse dashboard query).
router.get('/:id/babies', authenticate, requireRole('nurse', 'admin'), async (req, res) => {
    const {id} = req.params;

    try {
        // Confirm the room exists and is active before returning babies
        const [rooms] = await pool.query(
            'SELECT id FROM rooms WHERE id = ? AND is_active = TRUE',
            [id]
        );

        if (rooms.length === 0) {
            return res.status(404).json({ error: 'Room not found!' });
        }

        const [babies] = await pool.query(
            `SELECT b.id, b.first_name, b.last_name, b.date_of_birth, b.gender,
                    b.admission_date, b.status,
                    i.id AS incubator_id, i.incubator_code
             FROM babies b
             JOIN incubators i ON b.incubator_id = i.id
             WHERE i.room_id = ? AND b.status = 'active'
             ORDER BY b.created_at DESC`,
            [id]
        );
        
        return res.status(200).json(babies);
    } catch(err) {
        console.error('GET /rooms/:id/babies error:', err);
        return res.status(500).json({ error: 'Failed to fetch babies for room' });
    }
});

module.exports = router;