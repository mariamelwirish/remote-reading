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
const {uploadAudio, getPresignedUrl} = require('../utils/s3'); // s3 upload + presigned URL utility functions
const {notifyParentScheduled, notifyParentRescheduled, notifyParentRejected} = require('../utils/ses');
const { v4: uuidv4 } = require('uuid');
const requireRole = require('../middleware/requireRole');
const { publishPlay, publishStop } = require('../utils/iot');



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

router.post('/', authenticate, requireRole('parent'), upload.single('audio'), async (req, res) => {
    const connection = await pool.getConnection();

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Audio file is required!' });
        }

        const { baby_id, title, description } = req.body;
        if (!baby_id) return res.status(400).json({ error: 'baby_id is required' });
        if (!title || title.trim() === '') return res.status(400).json({ error: 'Title is required' });
        if (!description || description.trim() === '') return res.status(400).json({ error: 'Description is required' });

        const [parentBaby] = await connection.query(
            'SELECT id from parent_baby WHERE parent_id = ? AND baby_id = ?',
            [req.user.id, baby_id]
        );
        if (parentBaby.length === 0) {
            return res.status(403).json({ error: 'You are not linked to this baby!' });
        }

        const metadata = await mm.parseBuffer(req.file.buffer, req.file.mimetype);
        const duration_seconds = Math.round(metadata.format.duration);

        // S3 upload happens before the transaction — it's not part of the
        // MySQL transaction (S3 isn't transactional with MySQL), so it's
        // outside beginTransaction/commit either way.
        const s3_key = await uploadAudio(req.file.buffer, req.file.mimetype);
        const recording_id = uuidv4();

        // Transaction covers just the two DB writes
        await connection.beginTransaction();

        await connection.query(
            `INSERT INTO recordings (id, baby_id, parent_id, title, description, s3_key, duration_seconds, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_review')`,
            [recording_id, baby_id, req.user.id, title.trim(), description.trim(), s3_key, duration_seconds]
        );

        await connection.query(
            `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by)
             VALUES (?, NULL, 'pending_review', ?)`,
            [recording_id, req.user.id]
        );

        await connection.commit();

        res.status(201).json({
            message: 'Recording uploaded successfully',
            recording_id,
            duration_seconds
        });
    } catch (err) {
        await connection.rollback();
        console.error('Error uploading recording:', err);

        // Orphan cleanup note below — not fixed here, flagged for hardening
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        connection.release();
    }
});


// PATCH /api/v1/recordings/:id/review
// Nurse or Admin reviews a recording: schedule or reject.
// Multi-write, so wrapped in a transaction. Email fires AFTER commit —
// an email failure must never roll back a successful DB write.
router.patch('/:id/review', authenticate, requireRole('admin', 'nurse'), async (req, res) => {
    const recording_id = req.params.id;
    const { action, scheduled_time, note } = req.body;

    // 1. Validate action (cheap guard, before touching the DB at all)
    const validActions = ['schedule', 'reject'];
    if (!action || !validActions.includes(action)) {
        return res.status(400).json({ error: 'action must be schedule or reject!' });
    }

    const connection = await pool.getConnection();

    try {
        // 2. Fetch the recording (guard read, before transaction)
        const [recordings] = await connection.query(
            `SELECT r.*, b.id AS baby_id
             FROM recordings r
             JOIN babies b ON r.baby_id = b.id
             WHERE r.id = ?`,
            [recording_id]
        );

        if (recordings.length === 0) {
            return res.status(404).json({ error: 'Recording not found!' });
        }

        const recording = recordings[0];

        if (recording.status === 'played') {
            return res.status(400).json({ error: 'Cannot review a recording that has already been played!' });
        }

        // 3. Fetch parent + baby name (needed for the email either way, still just reads)
        const [parentRows] = await connection.query(
            'SELECT id, first_name, email FROM users WHERE id = ?',
            [recording.parent_id]
        );

        if (parentRows.length === 0) {
            return res.status(500).json({ error: 'Parent user not found for this recording' });
        }

        const parent = parentRows[0];

        const [babyRows] = await connection.query(
            'SELECT first_name FROM babies WHERE id = ?',
            [recording.baby_id]
        );

        const babyName = babyRows[0].first_name;

        // ===================== SCHEDULE =====================
        if (action === 'schedule') {
            if (!scheduled_time) {
                return res.status(400).json({ error: 'Scheduling Time is required!' });
            }

            const scheduledDate = new Date(scheduled_time);
            if (isNaN(scheduledDate.getTime())) {
                return res.status(400).json({ error: 'Scheduling Time is not valid format!' });
            }

            if (scheduledDate <= new Date()) {
                return res.status(400).json({ error: 'Scheduling Time must be in the future!' });
            }

            const mysqlScheduledTime = scheduledDate.toISOString().slice(0, 19).replace('T', ' ');
            const schedule_id = uuidv4();
            const wasAlreadyScheduled = recording.status === 'scheduled';

            // 4. Open the transaction — everything below is all-or-nothing
            await connection.beginTransaction();

            await connection.query(
                `UPDATE schedules SET status = 'cancelled' WHERE recording_id = ? AND status = 'pending'`,
                [recording_id]
            );

            await connection.query(
                `INSERT INTO schedules (id, recording_id, scheduled_by, scheduled_time, trigger_type, status, created_at)
                 VALUES (?, ?, ?, ?, 'scheduled', 'pending', NOW())`,
                [schedule_id, recording_id, req.user.id, mysqlScheduledTime]
            );

            await connection.query(
                `UPDATE recordings
                 SET status = 'scheduled', reviewed_at = NOW(), reviewed_by = ?
                 WHERE id = ?`,
                [req.user.id, recording_id]
            );

            await connection.query(
                `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by)
                 VALUES (?, ?, 'scheduled', ?)`,
                [recording_id, recording.status, req.user.id]
            );

            // 5. Commit — DB writes are now permanent
            await connection.commit();

            // 6. Read-back happens after commit, on the now-committed data
            const [updated] = await connection.query(
                'SELECT id, baby_id, parent_id, title, status, duration_seconds, uploaded_at, reviewed_at, reviewed_by FROM recordings WHERE id = ?',
                [recording_id]
            );

            // 7. Email fires AFTER commit — failure here is a warning, never a rollback
            try {
                if (wasAlreadyScheduled) {
                    await notifyParentRescheduled(parent.email, parent.first_name, babyName, recording.title, scheduled_time);
                } else {
                    await notifyParentScheduled(parent.email, parent.first_name, babyName, recording.title, scheduled_time);
                }
            } catch (emailErr) {
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

        // ===================== REJECT =====================
        if (action === 'reject') {
            if (!note || note.trim() === '') {
                return res.status(400).json({ error: 'note is required for reject action' });
            }

            await connection.beginTransaction();

            await connection.query(
                `UPDATE schedules SET status = 'cancelled' WHERE recording_id = ? AND status = 'pending'`,
                [recording_id]
            );

            await connection.query(
                `UPDATE recordings
                 SET status = 'rejected', reviewed_at = NOW(), reviewed_by = ?
                 WHERE id = ?`,
                [req.user.id, recording_id]
            );

            await connection.query(
                `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by, note)
                 VALUES (?, ?, 'rejected', ?, ?)`,
                [recording_id, recording.status, req.user.id, note.trim()]
            );

            await connection.commit();

            const [updated] = await connection.query(
                'SELECT id, baby_id, parent_id, title, status, duration_seconds, uploaded_at, reviewed_at, reviewed_by FROM recordings WHERE id = ?',
                [recording_id]
            );

            try {
                await notifyParentRejected(parent.email, parent.first_name, babyName, recording.title, note.trim());
            } catch (emailErr) {
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
    } catch (err) {
        await connection.rollback();
        console.error('PATCH /recordings/:id/review error:', err);
        return res.status(500).json({ error: 'Internal server error!' });
    } finally {
        connection.release();
    }
});

router.post('/:id/play', authenticate, requireRole('admin', 'nurse'), async (req, res) => {
    const recording_id = req.params.id;
    const connection = await pool.getConnection();

    try {
        const [recordings] = await connection.query(
            `SELECT r.*, b.id AS baby_id
             FROM recordings r
             JOIN babies b ON r.baby_id = b.id
             WHERE r.id = ?`,
            [recording_id]
        );

        if (recordings.length === 0) {
            return res.status(404).json({ error: 'Recording not found!' });
        }

        const recording = recordings[0];

        if (recording.status === 'played') {
            return res.status(400).json({ error: 'Recording has already been played!' });
        }
        if (recording.status === 'rejected' || recording.status === 'cancelled') {
            return res.status(400).json({ error: `Cannot play a recording with status '${recording.status}'.` });
        }

        const [devices] = await connection.query(
            'SELECT id, device_code FROM devices WHERE baby_id = ? AND is_active = TRUE',
            [recording.baby_id]
        );

        if (devices.length === 0) {
            return res.status(400).json({ error: 'No active device is assigned to this baby yet.' });
        }

        const device = devices[0];
        const wasScheduled = recording.status === 'scheduled';

        const presigned_url = await getPresignedUrl(recording.s3_key);

        await connection.beginTransaction();

        await connection.query(
            `UPDATE schedules SET status = 'cancelled' WHERE recording_id = ? AND status = 'pending'`,
            [recording_id]
        );

        await connection.query(
            `UPDATE recordings
             SET status = 'played', reviewed_at = COALESCE(reviewed_at, NOW()), reviewed_by = COALESCE(reviewed_by, ?)
             WHERE id = ?`,
            [req.user.id, recording_id]
        );

        await connection.query(
            `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by, note)
             VALUES (?, ?, 'played', ?, ?)`,
            [recording_id, recording.status, req.user.id, wasScheduled ? 'Manual trigger (was scheduled)' : 'Manual trigger']
        );

        await connection.commit();

        const [updated] = await connection.query(
            'SELECT id, baby_id, parent_id, title, status, duration_seconds, uploaded_at, reviewed_at, reviewed_by FROM recordings WHERE id = ?',
            [recording_id]
        );

        // MQTT publish AFTER commit — a failed publish must not roll back the
        // already-committed 'played' status; it's surfaced as a warning instead.
        // If the Pi later reports a failure over MQTT (fetch_failed, etc.),
        // iotSubscriber.js will revert this back to pending_review.
        try {
            await publishPlay(device.device_code, { recording_id, presigned_url, trigger_type: 'manual' });
        } catch (mqttErr) {
            console.error('IoT publish failed (play):', mqttErr);
            return res.status(200).json({
                message: 'Recording marked as played but the device did not receive the command. Check device connectivity.',
                recording: updated[0]
            });
        }

        return res.status(200).json({
            message: 'Play command sent to device.',
            recording: updated[0]
        });
    } catch (err) {
        await connection.rollback();
        console.error('POST /recordings/:id/play error:', err);
        return res.status(500).json({ error: 'Internal server error!' });
    } finally {
        connection.release();
    }
});
// POST /api/v1/recordings/:id/stop
// Nurse or Admin stops playback mid-play. Publishes MQTT stop, then reverts
// the recording to 'pending_review' — not back to 'scheduled', since the
// original scheduled_time is now in the past and no longer meaningful. The
// nurse makes a fresh scheduling decision via PATCH /recordings/:id/review.
// Can be called from either 'awaiting_confirmation' (Pi may genuinely be
// playing right now, just hasn't confirmed yet) or 'played' (Pi already
// confirmed, but nurse wants to stop it anyway — e.g. it's looping or a
// mistake was caught after confirmation arrived).
router.post('/:id/stop', authenticate, requireRole('admin', 'nurse'), async (req, res) => {
    const recording_id = req.params.id;
    const connection = await pool.getConnection();

    try {
        const [recordings] = await connection.query(
            `SELECT r.*, b.id AS baby_id
             FROM recordings r
             JOIN babies b ON r.baby_id = b.id
             WHERE r.id = ?`,
            [recording_id]
        );

        if (recordings.length === 0) {
            return res.status(404).json({ error: 'Recording not found!' });
        }

        const recording = recordings[0];

        if (recording.status !== 'played') {
            return res.status(400).json({ error: 'Recording is not currently playing.' });
        }

        const [devices] = await connection.query(
            'SELECT id, device_code FROM devices WHERE baby_id = ? AND is_active = TRUE',
            [recording.baby_id]
        );

        if (devices.length === 0) {
            return res.status(400).json({ error: 'No active device is assigned to this baby.' });
        }

        const device = devices[0];
        const previousStatus = recording.status;

        await connection.beginTransaction();

        await connection.query(
            `UPDATE recordings SET status = 'pending_review' WHERE id = ?`,
            [recording_id]
        );

        await connection.query(
            `INSERT INTO recording_status_history (recording_id, from_status, to_status, changed_by, note)
             VALUES (?, ?, 'pending_review', ?, 'Playback stopped manually')`,
            [recording_id, previousStatus, req.user.id]
        );

        await connection.commit();

        const [updated] = await connection.query(
            'SELECT id, baby_id, parent_id, title, status, duration_seconds, uploaded_at, reviewed_at, reviewed_by FROM recordings WHERE id = ?',
            [recording_id]
        );

        try {
            await publishStop(device.device_code);
        } catch (mqttErr) {
            console.error('IoT publish failed (stop):', mqttErr);
            return res.status(200).json({
                message: 'Recording reverted to pending review, but the stop command may not have reached the device.',
                recording: updated[0]
            });
        }

        return res.status(200).json({
            message: 'Stop command sent. Recording returned to pending review.',
            recording: updated[0]
        });
    } catch (err) {
        await connection.rollback();
        console.error('POST /recordings/:id/stop error:', err);
        return res.status(500).json({ error: 'Internal server error!' });
    } finally {
        connection.release();
    }
});

module.exports = router;