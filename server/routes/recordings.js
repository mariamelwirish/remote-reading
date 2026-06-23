// recordings.js

/*
STRUCTURE
1. Imports
2. Multer configuration
3. POST /recordings route handler:
   a. Validate file exists
   b. Validate MIME type
   c. Read duration using music-metadata
   d. Upload to S3
   e. Create recording row in DB
   f. Write status history row
   g. Return success response
*/

// Imports
const express = require('express'); // creates mini exoress app
const router = express.Router();
const multer = require('multer'); // file upload middleware
const mm = require('music-metadata'); // music metadata library, used to read duration of audio files
const pool = require('../config/db'); // database connection 
const authenticate = require('../middleware/auth'); // JWT middleware
const {uploadAudio} = require('../utils/s3'); // s3 upload utility function
const {notifyParentScheduled, notifyParentRescheduled, notifyParentRejected} = require('../utils/ses');
const { v4: uuidv4 } = require('uuid');
const requireRole = require('../middleware/requireRole');



// Multer Configuration: store file in memory, validate MIME type, limit size to 50MB
const upload = multer({
    storage: multer.memoryStorage(), // keeps the file in the server's RAM as a buffer instead of saving it to disk
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit in bytes
    fileFilter: (req, file, cb) => { // a function multer calls for every incoming file.
        if (file.mimetype.startsWith('audio/')) { // check the MIME type (supports all audio types).
            cb(null, true); // accept the file
        } else {
            cb(new Error('Only audio files are allowed'), false); // reject the file
        }
    }
});

// POST /api/v1/recordings
// Parents upload audio recordings for their children
router.post('/', authenticate, requireRole('parent'), upload.single('audio'), async (req, res) => { // using multer middleware to handle single file upload with field name 'audio'
   try {

        // 2. Check if file exists
        if (!req.file) {
            return res.status(400).json({ error: 'Audio file is required!' });
        }

        // 3. Get text fields from request body
       const { baby_id, title, description } = req.body;
        if (!baby_id) {
            return res.status(400).json({ error: 'baby_id is required' });
        }
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Title is required' });
        }
        if (!description || description.trim() === '') {
            return res.status(400).json({ error: 'Description is required' });
        }

        // 4. Verify the parent is linked to the baby
        const [parentBaby] = await pool.query(
            'SELECT id from parent_baby WHERE parent_id = ? AND baby_id = ?',
            [req.user.id, baby_id] 
        );
        if (parentBaby.length === 0) {
            return res.status(403).json({ error: 'You are not linked to this baby!' });
        }

        // 5. Read audio duration using music-metadata 
        const metadata = await mm.parseBuffer(req.file.buffer, req.file.mimetype);
        const duration_seconds = Math.round(metadata.format.duration); // round to nearest second

        // 6. Upload audio file to S3 
        const s3_key = await uploadAudio(req.file.buffer, req.file.mimetype);

        // 7. Generate UUID for the recording
        const recording_id = uuidv4();

        // 8. Create recording row in database
        await pool.query(
            `INSERT INTO recordings (id, baby_id, parent_id, title, description, s3_key, duration_seconds, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')`,
            [recording_id, baby_id, req.user.id, title.trim(), description.trim(), s3_key, duration_seconds]
        );

        // 9. Write first status history entry
        await pool.query(
            `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by)
            VALUES (?, NULL, 'pending_review', ?)`,
            [recording_id, req.user.id]
        );

        // 10. Return success
        res.status(201).json({
            message: 'Recording uploaded successfully',
            recording_id,
            duration_seconds
        });
   } catch (err) {
        console.error('Error uploading recording:', err);
        res.status(500).json({ error: 'Internal server error' });
   }
});

// PATCH /api/v1/rercordings/:id/review
// Nurse or Admin reviews a recording: schedule or reject.
router.patch ('/:id/review', authenticate, requireRole('admin', 'nurse'), async(req, res) => {
    try {
        const recording_id = req.params.id;
        const {action, scheduled_time, note} = req.body;

        // 2. Validate Action.
        const validActions = ['schedule', 'reject'];
        if(!action || !validActions.includes(action)) {
            return res.status(400).json({error: 'action must be schedule or reject!'});
        }

        // 3. Fetch the recording.
        const [recordings] = await pool.query(
            `SELECT r.*, b.id AS baby_id 
            FROM recordings r
            JOIN babies b ON r.baby_id = b.id
            WHERE r.id = ?
            `,
            [recording_id]
        );

        if(recordings.length === 0) {
            return res.status(404).json({error: 'Recording not found!'});
        }

        const recording = recordings[0];

        // 4. GUARD: played recordings can't be unchanged.
        // This is because they went out from the queue. If they need to be changed, it is handled later at the MQTT.
        if(recording.status === 'played') {
            return res.status(400).json({error: 'Cannot review a recording that has already been played!'});
        }

        // 5. Fetch parent info
        const [parentRows] = await pool.query(
            'SELECT id, first_name, email FROM users WHERE id = ?',
            [recording.parent_id]
        );

        if (parentRows.length === 0) {
            return res.status(500).json({ error: 'Parent user not found for this recording' });
        }

        const parent = parentRows[0];

        // 6. Fetch baby name
        const [babyRows] = await pool.query(
            'SELECT first_name FROM babies WHERE id = ?',
            [recording.baby_id]
        );
        
        const babyName = babyRows[0].first_name;

        // SCHEDULE.
        if (action === 'schedule') {
            if(!scheduled_time) {
                return res.status(400).json({error: 'Scheduling Time is required!'});
            }

            const scheduledDate = new Date(scheduled_time);
            if (isNaN(scheduledDate.getTime())) {
                return res.status(400).json({ error: 'Scheduling Time is not valid format!' });
            }

            if (scheduledDate <= new Date()) {
                return res.status(400).json({ error: 'Scheduling Time must be in the future!' });
            }

            // Convert to MySQL-compatible format (YYYY-MM-DD HH:MM:SS)
            const mysqlScheduledTime = scheduledDate.toISOString().slice(0, 19).replace('T', ' ');

            const schedule_id = uuidv4();

            // Cancel any existing pending schedule before creating a new one.
            await pool.query(
                `UPDATE schedules SET status = 'cancelled' WHERE recording_id = ? AND status = 'pending'`,
                [recording_id]
            );

            // Now create the new one.
            await pool.query(
                `INSERT INTO schedules (id, recording_id, scheduled_by, scheduled_time, trigger_type, status, created_at)
                VALUES (?, ?, ?, ?, 'scheduled', 'pending', NOW())`,
                [schedule_id, recording_id, req.user.id, mysqlScheduledTime]
            );

            // Update recording status to scheduled.
            await pool.query(
                `UPDATE recordings
                 SET status = 'scheduled', reviewed_at = NOW(), reviewed_by = ?
                 WHERE id = ?`,
                [req.user.id, recording_id]
            );

            // Write status history row
            await pool.query(
                `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by)
                 VALUES (?, ?, 'scheduled', ?)`,
                [recording_id, recording.status, req.user.id]
            );  
            

            const [updated] = await pool.query(
                'SELECT id, baby_id, parent_id, title, status, duration_seconds, uploaded_at, reviewed_at, reviewed_by FROM recordings WHERE id = ?',
                [recording_id]
            );

            // Send SES email to the parent.
            try {
                if (recording.status === 'scheduled') {
                    // Was already scheduled before — this is a reschedule
                    await notifyParentRescheduled(
                        parent.email,
                        parent.first_name,
                        babyName,
                        recording.title,
                        scheduled_time
                    );
                } else {
                    // Fresh schedule from pending_review or rejected
                    await notifyParentScheduled(
                        parent.email,
                        parent.first_name,
                        babyName,
                        recording.title,
                        scheduled_time
                    );
                }
            } catch(emailErr) {
                console.error('SES email failed (schedule):', emailErr);
                return res.status(200).json({
                    message: 'Recording scheduled successfully but email notification failed!',
                    recording: updated[0],
                    schedule_id
                });
            }

            return res.status(200).json({
                message: 'Recording scheduled successfully',
                recording: updated[0],
                schedule_id
            });
        }

        // REJECT.
        if (action === 'reject') {
            if (!note || note.trim() === '') {
                return res.status(400).json({ error: 'note is required for reject action' });
            }

            // Cancel any pending schedule for this recording
            await pool.query(
                `UPDATE schedules SET status = 'cancelled' WHERE recording_id = ? AND status = 'pending'`,
                [recording_id]
            );

            // Update recording status to rejected
            await pool.query(
                `UPDATE recordings
                 SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ?
                 WHERE id = ?`,
                [req.user.id, recording_id]
            );

            // Write status history row
            await pool.query(
                `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by, note)
                 VALUES (?, ?, 'rejected', ?, ?)`,
                [recording_id, recording.status, req.user.id, note.trim()]
            );

            const [updated] = await pool.query(
                'SELECT id, baby_id, parent_id, title, status, duration_seconds, uploaded_at, reviewed_at, reviewed_by FROM recordings WHERE id = ?',
                [recording_id]
            );

            // Send SES email to the parent.
            try {
                await notifyParentRejected(
                    parent.email,
                    parent.first_name,
                    babyName,
                    recording.title,
                    note.trim()
                );
            } catch(emailErr) {
                console.error('SES email failed (reject):', emailErr);
                return res.status(200).json({
                    message: 'Recording rejected but email notification failed!',
                    recording: updated[0]
                });
            }

            return res.status(200).json({
                message: 'Recording rejected',
                recording: updated[0]
            });
        }
    } catch(err) {
        console.error('PATCH /recordings/:id/review error:', err);
        return res.status(500).json({ error: 'Internal server error!' });
    }
});

module.exports = router;