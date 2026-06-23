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

module.exports = router;
