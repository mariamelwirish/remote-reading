const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const {getPresignedUrl} = require('../utils/s3');
const {v4: uuidv4} = require('uuid');


// HELPERS
// Validate Incubators
async function validateIncubator(incubator_id, excludeBabyId = null) {
    const [incubatorRows] = await pool.query(
        'SELECT id, is_active FROM incubators WHERE id = ?',
        [incubator_id]
    );

    if(incubatorRows.length === 0) {
        return 'Incubator does not exist!';
    }

    if(incubatorRows[0].is_active !== 1) {
        return 'Incubator is inactive!';
    }

    let query;
    let params;
    if(excludeBabyId) {
        query = "SELECT id FROM babies WHERE incubator_id = ? AND status = 'active' AND id != ?";
        params = [incubator_id, excludeBabyId];
    } else {
        query = "SELECT id FROM babies WHERE incubator_id = ? AND status = 'active'";
        params = [incubator_id];
    }

    const [occupiedRows] = await pool.query(query, params);

    if (occupiedRows.length > 0) {
        return 'This incubator is already occupied by another baby!';
    }

    return null;
}

// Validate Details.
function validateBabyFields({ first_name, last_name, date_of_birth, gender, incubator_id, admission_date }, requireAll = false) {
    const validGenders = ['male', 'female', 'other'];

    if (requireAll) {
        if (!first_name || !last_name || !date_of_birth || !gender || !incubator_id || !admission_date) {
            return 'All fields are required: First Name, Last Name, Date of Birth, Gender, Incubator ID, Admission Date!';
        }
    }

    if (first_name !== undefined && first_name.trim() === '') return 'First name cannot be empty!';
    if (last_name !== undefined && last_name.trim() === '')  return 'Last name cannot be empty!';
    if (date_of_birth !== undefined && isNaN(Date.parse(date_of_birth))) return 'Invalid date of birth!';
    if (gender !== undefined && !validGenders.includes(gender)) return 'Gender must be male, female, or other!';
    if (admission_date !== undefined && isNaN(Date.parse(admission_date))) return 'Invalid admission date!';



    return null;
}

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

        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Request body is required!' });
        }

        const { first_name, last_name, date_of_birth, gender, incubator_id, admission_date } = req.body;

        // Error on Fields.
        const fieldError = validateBabyFields({ first_name, last_name, date_of_birth, gender, incubator_id, admission_date }, true);
        if (fieldError) return res.status(400).json({ error: fieldError });

        // Error on incubators.
        const incubatorError = await validateIncubator(incubator_id);
        if (incubatorError) {
            return res.status(400).json({ error: incubatorError });
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

// PATCH /babies/:id
// ADMIN ONLY: Partial Baby Updates.
router.patch('/:id', authenticate, async(req, res) => {
    try {
        const user = req.user;

        if(user.role !== 'admin') {
            return res.status(403).json({error: 'Forbidden'});
        }

        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Request body is required!' });
        }

        const babyId = req.params.id;
        const { first_name, last_name, date_of_birth, gender, incubator_id } = req.body;
        
        // Validate Fields 
        const fieldError = validateBabyFields({ first_name, last_name, date_of_birth, gender});
        if (fieldError) return res.status(400).json({ error: fieldError });

        // Validate incubator only if it was sent
        if (incubator_id !== undefined) {
            const incubatorError = await validateIncubator(incubator_id, babyId);
            if (incubatorError) return res.status(400).json({ error: incubatorError });
        }

        // Build the UPDATE query dynamically
        const fields = [];
        const values = [];

        if (first_name !== undefined)    { fields.push('first_name = ?');    values.push(first_name);    }
        if (last_name !== undefined)     { fields.push('last_name = ?');     values.push(last_name);     }
        if (date_of_birth !== undefined) { fields.push('date_of_birth = ?'); values.push(date_of_birth); }
        if (gender !== undefined)        { fields.push('gender = ?');        values.push(gender);        }
        if (incubator_id !== undefined)  { fields.push('incubator_id = ?');  values.push(incubator_id);  }

        if (fields.length === 0) {
            return res.status(400).json({ error: 'No valid fields provided for update!' });
        }

        values.push(babyId);

        const [result] = await pool.query(
            `UPDATE babies SET ${fields.join(', ')} WHERE id = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Baby not found!' });
        }

        const [updatedBaby] = await pool.query(
            'SELECT * FROM babies WHERE id = ?',
            [babyId]
        );

        return res.status(200).json({ baby: updatedBaby[0] });

    } catch(err) {
        console.error('PATCH /babies/:id error:', err);
        return res.status(500).json({ error: 'Internal Server Error!' });
    }
});

module.exports = router;