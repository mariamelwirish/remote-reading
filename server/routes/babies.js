const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const {getPresignedUrl} = require('../utils/s3');
const {v4: uuidv4} = require('uuid');


// GET api/v1/babies/:id/recordings
// Get all recordings for a specific baby
router.get('/:id/recordings', authenticate, async (req, res) => {
    try {
        const {id: baby_id} = req.params;
        const {id: user_id, role} = req.user;

        let query = `SELECT id, title, description, status, duration_seconds, 
                        s3_key, uploaded_at, reviewed_at
                    FROM recordings
                    WHERE baby_id = ?`;
        const queryParams = [baby_id]; // fills the '?' places.

        if (role === 'parent') {
            // Verify the parent is linked to the baby
            const [parentBaby] = await pool.query(
                'SELECT id FROM parent_baby WHERE parent_id = ? AND baby_id = ?',
                [user_id, baby_id]
            );

            if (parentBaby.length === 0) {
                return res.status(403).json({ error: 'You are not linked to this baby!'});
            }

            // The parent only sees their own recordings

            query += ' AND parent_id = ?'
            queryParams.push(user_id);
        }
        
        query += ' ORDER BY uploaded_at DESC';

        const [recordings] = await pool.query(query, queryParams);

        const recordingsWithUrls = await Promise.all( // Promise takes that array of promises, start them all at the same time, and returns all
            recordings.map(async (recording) => {
                const {s3_key, ...recordingData} = recording;
                const audio_url = await getPresignedUrl(s3_key);
                return { ...recordingData, audio_url};
            })
        );

        res.json({ recordings: recordingsWithUrls});
    } catch (err) {
        console.error('Error fetching recordings:', err);
        res.status(500).json({ error: 'Internal Server Error!'});
    }
});


// GET /api/v1/babies/:id
// Get a single baby's profile (role-scoped).
router.get('/:id', authenticate, async(req, res) => {
    try {
        const babyId = req.params.id;
        const user = req.user;

        // Role-based scoping
        if(user.role === 'parent') {
            const[link] = await pool.query(
                'SELECT id FROM parent_baby WHERE parent_id = ? AND baby_id = ?',
                [user.id, babyId]
            );

            if (link.length === 0) {
                return res.status(403).json({ error: 'Access Denied!' });
            }
        }

        if (user.role === 'nurse') {
            // NOTE FOR LATER: Nurses can access any active baby — room scoping enforced at dashboard level!
        }

        const [rows] = await pool.query(
            `SELECT
                b.id,
                b.first_name,
                b.last_name,
                b.date_of_birth,
                b.gender,
                b.admission_date,
                b.discharge_date,
                b.status,
                i.incubator_code,
                r.room_number,
                r.floor,
                r.wing
            FROM babies b
            JOIN incubators i ON b.incubator_id = i.id
            JOIN rooms r ON i.room_id = r.id
            WHERE b.id = ?`,
            [babyId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Baby not found!' });
        }

        return res.status(200).json(rows[0]);

    } catch(err) {
        console.error('GET /babies/:id error:', err);
        return res.status(500).json({error: 'Internal Server Error!'});
    }
});

// POST /api/v1/babies
// ADMIN ONLY - create a new baby record
router.post('/', authenticate, async(req, res) => {
    try {
        const user = req.user;
        
        if(user.role !== 'admin') {
            return res.status(403).json({error: 'Forbidden'});
        }

        const { first_name, last_name, date_of_birth, gender, incubator_id, admission_date } = req.body;

        // Error on empty field.
        if (!first_name || !last_name || !date_of_birth || !gender || !incubator_id || !admission_date) {
            return res.status(400).json({ error: 'All fields are required: First Name, Last Name, Date of Birth, Gender, Incubator ID, Admission Date' });
        }

        // Error on invalid gender.
        const validGenders = ['male', 'female', 'other']; // must match the database ENUM
        if (!validGenders.includes(gender)) {
            return res.status(400).json({ error: 'Gender must be Male, Female, or Other!' });
        }

        const [incubatorRows] = await pool.query(
            'SELECT id, is_active FROM incubators WHERE id = ?',
            [incubator_id]
        );

        // Error on invalid incubators.
        if (incubatorRows.length === 0) {
            return res.status(400).json({ error: 'Incubator does not exist!' });
        }

        // Error on inactive incubators.
        if (incubatorRows[0].is_active !== 1) {
            return res.status(400).json({ error: 'Incubator is inactive!' });
        }

        // Error on already occupied incubators. 
        const [occupiedRows] = await pool.query(
            "SELECT id FROM babies WHERE incubator_id = ? AND status = 'active'",
            [incubator_id]
        );
        if (occupiedRows.length > 0) {
            return res.status(400).json({ error: 'This incubator is already occupied by another baby!' });
        }

        const babyId = uuidv4();

        await pool.query(
            `INSERT INTO babies (id, first_name, last_name, date_of_birth, gender, incubator_id, admission_date, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW())
            `,
            [babyId, first_name, last_name, date_of_birth, gender, incubator_id, admission_date, user.id]
        );

        const [newBaby] = await pool.query(
            'SELECT * FROM babies WHERE id = ?',
            [babyId]
        );

        return res.status(201).json({ baby: newBaby[0] });

    } catch(err) {
        console.error('POST /babies error:', err);
        return res.status(500).json({ error: 'Internal Server Error!' });
    }
});

module.exports = router;