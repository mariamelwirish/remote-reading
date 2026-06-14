const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authenticate = require('../middleware/auth');
const {getPresignedUrl} = require('../utils/s3');


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
        res.status(500).json({ error: 'Internal Server Error'});
    }
});

module.exports = router;