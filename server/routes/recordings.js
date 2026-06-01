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
const { v4: uuidv4 } = require('uuid');


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
router.post('/', authenticate, upload.single('audio'), async (req, res) => { // using multer middleware to handle single file upload with field name 'audio'
   try {
        // 1. Check Role (only parents can upload)
        if(req.user.role !== 'parent') {
            return res.status(403).json({ error: 'Only parents can upload recordings!' });
        }

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

module.exports = router;