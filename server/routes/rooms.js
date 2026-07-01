// rooms.js
const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { v4: uuidv4 } = require('uuid');

// GET /api/v1/rooms
// List all rooms with live occupancy, optional filter on active state.
router.get('/', authenticate, requireRole('nurse', 'admin'), async(req, res) => {
    const {active} = req.query;

    const clauses = [
        `SELECT r.id, r.room_number, r.capacity, r.is_active,
                COUNT(b.id) AS occupied
         FROM rooms r
         LEFT JOIN babies b
                ON b.room_id = r.id AND b.status = 'active'`
    ];
    const params = [];

    if(active !== undefined) {
        if(active !== 'true' && active !== 'false') {
            return res.status(400).json({ error: "Query param 'active' must be 'true' or 'false'" });
        }
        clauses.push('WHERE r.is_active = ?');
        params.push(active === 'true');
    }

    clauses.push('GROUP BY r.id, r.room_number, r.capacity, r.is_active');
    clauses.push('ORDER BY r.room_number ASC');
    const sql = clauses.join(' ');

    try {
        const [rooms] = await pool.query(sql, params);
        return res.status(200).json(rooms);
    } catch (err) {
        console.error('GET /rooms error:', err);
        return res.status(500).json({ error: 'Failed to fetch rooms' });
    }
});
// GET /api/v1/rooms/available
// List only active rooms that still have free capacity.
// Feeds the reassignment UI so it never offers a full room.
router.get('/available', authenticate, requireRole('nurse', 'admin'), async (req, res) => {
    try {
        const [rooms] = await pool.query(
            `SELECT r.id, r.room_number, r.capacity,
                    COUNT(b.id) AS occupied
             FROM rooms r
             LEFT JOIN babies b
                    ON b.room_id = r.id AND b.status = 'active'
             WHERE r.is_active = TRUE
             GROUP BY r.id, r.room_number, r.capacity
             HAVING occupied < r.capacity
             ORDER BY r.room_number ASC`
        );

        return res.status(200).json(rooms);
    } catch (err) {
        console.error('GET /rooms/available error:', err);
        return res.status(500).json({ error: 'Failed to fetch available rooms' });
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
            `SELECT id, first_name, last_name, date_of_birth, gender,
                    admission_date, status
             FROM babies
             WHERE room_id = ? AND status = 'active'
             ORDER BY created_at DESC`,
            [id]
        );

        return res.status(200).json(babies);
    } catch(err) {
        console.error('GET /rooms/:id/babies error:', err);
        return res.status(500).json({ error: 'Failed to fetch babies for room' });
    }
});

// POST /api/v1/rooms
// Create a new room (Admin + Nurse).
router.post('/', authenticate, requireRole('admin', 'nurse'), async (req, res) => {
    const {room_number, capacity} = req.body;

    // Validate room_number
    if (!room_number || typeof room_number !== 'string' || room_number.trim() === '') {
        return res.status(400).json({ error: 'Room Number is required!' });
    }

    // Validate capacity: optional, defaults to 1, must be a positive integer
    let finalCapacity = 1;
    if (capacity !== undefined) {
        if (!Number.isInteger(capacity) || capacity < 1) {
            return res.status(400).json({ error: 'Capacity must be a positive integer!' });
        }
        finalCapacity = capacity;
    }

    const trimmedRoomNumber = room_number.trim();

    try {
        // Guard against duplicate room_number (schema enforces UNIQUE, but we check
        // first to return a clean 409 instead of a raw DB error).
        const [existing] = await pool.query(
            'SELECT id FROM rooms WHERE room_number = ?',
            [trimmedRoomNumber]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'A room with that number already exists!' });
        }

        const id = uuidv4();
        await pool.query(
            `INSERT INTO rooms (id, room_number, capacity, is_active)
             VALUES (?, ?, ?, TRUE)`,
            [id, trimmedRoomNumber, finalCapacity]
        );

        return res.status(201).json({
            id,
            room_number: trimmedRoomNumber,
            capacity: finalCapacity,
            is_active: true
        });

    } catch(err) {
        console.error('POST /rooms error:', err);
        return res.status(500).json({ error: 'Failed to create room!' });
    }
});


module.exports = router;