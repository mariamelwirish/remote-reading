// babies.js

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const {getPresignedUrl} = require('../utils/s3');
const {v4: uuidv4} = require('uuid');
const requireRole = require('../middleware/requireRole');


// HELPERS
// Validate Room.
async function validateRoomAvailability(room_id, excludeBabyId = null) {
    const [roomRows] = await pool.query(
        'SELECT id, capacity, is_active FROM rooms WHERE id = ?',
        [room_id]
    );
    
    if (roomRows.length === 0) {
        return 'Room does not exist!';
    }

    if (roomRows[0].is_active !== 1) {
        return 'Room is inactive!';
    }

    const room = roomRows[0];

    let countQuery = "SELECT COUNT(*) AS occupied FROM babies WHERE room_id = ? AND status = 'active'";
    const params = [room_id];

    if (excludeBabyId) {
        countQuery += ' AND id != ?';
        params.push(excludeBabyId);
    }

    const [[{ occupied }]] = await pool.query(countQuery, params);

    if (occupied >= room.capacity) {
        return 'Room is at full capacity!';
    }

    return null;
}


// Validate Details.
function validateBabyFields({ first_name, last_name, date_of_birth, gender, room_id, admission_date }, requireAll = false) {
    const validGenders = ['male', 'female', 'other'];

    if (requireAll) {
        if (!first_name || !last_name || !date_of_birth || !gender || !room_id || !admission_date) {
            return 'All fields are required: First Name, Last Name, Date of Birth, Gender, Room ID, Admission Date!';
        }
    }

    if (first_name !== undefined && first_name.trim() === '') return 'First name cannot be empty!';
    if (last_name !== undefined && last_name.trim() === '')  return 'Last name cannot be empty!';
    if (date_of_birth !== undefined && isNaN(Date.parse(date_of_birth))) return 'Invalid date of birth!';
    if (gender !== undefined && !validGenders.includes(gender)) return 'Gender must be male, female, or other!';
    if (admission_date !== undefined && isNaN(Date.parse(admission_date))) return 'Invalid admission date!';



    return null;
}

// GET api/v1/babies/ (Admin + Nurse).
// Get all babies with optional active/discharged filter.
router.get('/', authenticate, requireRole('admin', 'nurse'), async(req, res) => {
    const {status} = req.query;

    // 1. Validate status filter if provided
    const allowedStatuses = ['active', 'discharged'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter. Use active or discharged!' });
    }

    try {
        // 2. Build query dynamically based on whether ?status was passed
        let query = `
            SELECT
                b.id,
                b.first_name,
                b.last_name,
                b.date_of_birth,
                b.gender,
                b.admission_date,
                b.discharge_date,
                b.status,
                b.created_at,
                r.id AS room_id,
                r.room_number
            FROM babies b
            LEFT JOIN rooms r ON b.room_id = r.id
        `;

        const params = [];

        if (status) {
            query += ' WHERE b.status = ?';
            params.push(status);
        }

        query += ' ORDER BY b.created_at DESC';

        // 3. Run query
        const [rows] = await pool.query(query, params);

        return res.status(200).json(rows);
    } catch (err) {
        console.error('GET /babies error:', err);
        return res.status(500).json({ error: 'Internal server error!' });
    }
});


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
                r.id AS room_id,
                r.room_number
            FROM babies b
            JOIN rooms r ON b.room_id = r.id
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
router.post('/', authenticate, requireRole('admin', 'nurse'), async(req, res) => {
    try {
        const user = req.user;

        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Request body is required!' });
        }

        const { first_name, last_name, date_of_birth, gender, room_id, admission_date } = req.body;

        // Error on Fields.
        const fieldError = validateBabyFields({ first_name, last_name, date_of_birth, gender, room_id, admission_date }, true);
        if (fieldError) return res.status(400).json({ error: fieldError });

        // Error on Room.
        const roomError = await validateRoomAvailability(room_id);
        if (roomError) {
            return res.status(400).json({ error: roomError });
        }

        

        const babyId = uuidv4();

        await pool.query(
            `INSERT INTO babies (id, first_name, last_name, date_of_birth, gender, room_id, admission_date, status, created_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, NOW())
            `,
            [babyId, first_name, last_name, date_of_birth, gender, room_id, admission_date, user.id]
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
// Partial Baby Updates.
router.patch('/:id', authenticate, requireRole('admin', 'nurse'), async(req, res) => {
    try {
        const user = req.user;

        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ error: 'Request body is required!' });
        }

        const babyId = req.params.id;
        const { first_name, last_name, date_of_birth, gender, room_id } = req.body;

        // Validate Fields
        const fieldError = validateBabyFields({ first_name, last_name, date_of_birth, gender });
        if (fieldError) return res.status(400).json({ error: fieldError });

        // Validate room only if it was sent
        if (room_id !== undefined) {
            const roomError = await validateRoomAvailability(room_id, babyId);
            if (roomError) return res.status(400).json({ error: roomError });
        }

        // Build the UPDATE query dynamically
        const fields = [];
        const values = [];

        if (first_name !== undefined)    { fields.push('first_name = ?');    values.push(first_name);    }
        if (last_name !== undefined)     { fields.push('last_name = ?');     values.push(last_name);     }
        if (date_of_birth !== undefined) { fields.push('date_of_birth = ?'); values.push(date_of_birth); }
        if (gender !== undefined)        { fields.push('gender = ?');        values.push(gender);        }
        if (room_id !== undefined)       { fields.push('room_id = ?');       values.push(room_id);       }

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

// PATCH /babies/:id/discharge - Admin only. 
// Soft-discharge a baby (not fully removed from the database, but becomes inactive).
router.patch('/:id/discharge', authenticate, requireRole('admin'), async(req, res) => {
    const {id} = req.params;

    try {
        // 1. Check baby exists.
        const [rows] = await pool.query(
            'SELECT id, status FROM babies WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({error: 'Baby not found!'});
        }

        // 2. Check baby is still active.
        if(rows[0].status === 'discharged') {
            return res.status(400).json({error: 'Baby is already discharged!'});
        }

        // 3. Discharge Baby.
        const today = new Date().toISOString().split('T')[0];

        await pool.query(
            `UPDATE babies
            SET status = 'discharged', discharge_date = ?
            WHERE id = ?`,
            [today, id]
        );

        // CONSEQUENCES
        // 1. Cancel all pending schedules for this baby's recordings
        await pool.query(
            `UPDATE schedules s
            JOIN recordings r ON s.recording_id = r.id
            SET s.status = 'cancelled'
            WHERE r.baby_id = ? AND s.status = 'pending'`,
            [id]
        );

        // 2. Fetch recordings that are about to be cancelled (to preserve from_status in history)
        const [recordingsToCancel] = await pool.query(
            `SELECT id, status FROM recordings
            WHERE baby_id = ? AND status IN ('pending_review', 'scheduled')`,
            [id]
        );

        // 3. Cancel those recordings
        await pool.query(
            `UPDATE recordings
            SET status = 'cancelled'
            WHERE baby_id = ? AND status IN ('pending_review', 'scheduled')`,
            [id]
        );

        // 4. Write a history row for each cancelled recording
        if (recordingsToCancel.length > 0) {
            const historyValues = recordingsToCancel.map(r => [r.id, r.status, 'cancelled', req.user.id]);
            await pool.query(
                `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by)
                VALUES ?`,
                [historyValues]
            );
        }

        // 4. Return updated baby — after all consequences are done
        const [updated] = await pool.query(
            'SELECT * FROM babies WHERE id = ?',
            [id]
        );

        return res.status(200).json(updated[0]);
    } catch(err) {
        console.error('PATCH /babies/:id/discharge error:', err);
        return res.status(500).json({error: 'Internal Sever Error!'});
    }
});

// PATCH /babies/:id/readmit - Admin + Nurse.
// Undo discharge. Requires a room — readmission is a fresh placement,
// so the target room must be chosen and validated (never silently reuse the old one).
router.patch('/:id/readmit', authenticate, requireRole('admin', 'nurse'), async(req, res) => {
    const {id} = req.params;
    const { room_id } = req.body;

    // Validate input
    if (!room_id || typeof room_id !== 'string' || room_id.trim() === '') {
        return res.status(400).json({ error: 'room_id is required to readmit a baby!' });
    }

    try {
        // 1. Check if baby exists.
        const [rows] = await pool.query(
            'SELECT id, status FROM babies WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Baby not found!' });
        }

        // 2. Check baby is actually discharged
        if (rows[0].status === 'active') {
            return res.status(400).json({ error: 'Baby is already active!' });
        }

        // 3. Validate the target room (exists, active, free capacity).
        //    No excludeBabyId — the baby is currently discharged, so it isn't
        //    counted in occupancy anyway; it must genuinely fit as a new arrival.
        const roomError = await validateRoomAvailability(room_id);
        if (roomError) {
            return res.status(400).json({ error: roomError });
        }

        // 4. Readmit into the chosen room
        await pool.query(
            `UPDATE babies
            SET status = 'active', discharge_date = NULL, room_id = ?
            WHERE id = ?`,
            [room_id, id]
        );

        // 5. Return updated baby
        const [updated] = await pool.query(
            'SELECT * FROM babies WHERE id = ?',
            [id]
        );

        return res.status(200).json(updated[0]);
    } catch(err) {
        console.error('PATCH /babies/:id/readmit error:', err);
        return res.status(500).json({ error: 'Internal server error!' });
    }
});

// PATCH /api/v1/babies/:id/reassign-room
// Move a baby to a different room.
// Admin + Nurse. Target room must exist, be active, and have free capacity.
router.patch('/:id/reassign-room', authenticate, requireRole('admin', 'nurse'), async (req, res) => {
    const babyId = req.params.id;
    const { room_id } = req.body;

    // Validate input
    if (!room_id || typeof room_id !== 'string' || room_id.trim() === '') {
        return res.status(400).json({ error: 'room_id is required!' });
    }

    try {
        // 1. Confirm the baby exists and is active
        const [babies] = await pool.query(
            'SELECT id, status FROM babies WHERE id = ?',
            [babyId]
        );

        if (babies.length === 0) {
            return res.status(404).json({ error: 'Baby not found!' });
        }

        if (babies[0].status !== 'active') {
            return res.status(400).json({ error: 'Cannot reassign a discharged baby!' });
        }

        // 2. Validate the target room (exists, active, free capacity) —
        //    exclude this baby so re-submitting its current room isn't a false "full".
        const roomError = await validateRoomAvailability(room_id, babyId);
        if (roomError) {
            return res.status(400).json({ error: roomError });
        }

        // 3. Move the baby
        await pool.query(
            'UPDATE babies SET room_id = ? WHERE id = ?',
            [room_id, babyId]
        );

        // 4. Return the updated baby with its new room
        const [updated] = await pool.query(
            `SELECT b.id, b.first_name, b.last_name, b.status,
                    r.id AS room_id, r.room_number
             FROM babies b
             JOIN rooms r ON b.room_id = r.id
             WHERE b.id = ?`,
            [babyId]
        );

        return res.status(200).json({ baby: updated[0] });

    } catch (err) {
        console.error('PATCH /babies/:id/reassign-room error:', err);
        return res.status(500).json({ error: 'Internal Server Error!' });
    }
});

module.exports = router;