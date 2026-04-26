const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// POST /api/v1/auth/login
router.post('/login', async (req, res) => {
    // try, catch block to handle errors
    try {
        // destructure email and password from request body
        const {email, password} = req.body;

        // Validate input 
        if(! email || !password) {
            return res.status(400).json({error: 'Email and password are required'});
        }

        // Find user by email
        /* 
            FOR ME:
                1. asynchronous operation: sends a query to MySQL and waits for the response.
                2. await pauses this function until the response arrives, then continues. 
                3. ? is a placeholder. mysql2 replaces it with the value from the array [email]
        */
        const [rows] = await pool.query( 
            'SELECT * FROM users WHERE email = ? AND is_active = TRUE', 
            [email]
        );

        if(rows.length === 0) {
            return res.status(401).json({error: 'Invalid credentials'});
        }

        const user = rows[0];

        // Check Password.
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if(!passwordMatch) {
            return res.status(401).json({error: 'Invalid credentials'});
        }

        // Generate JWT Token
        const token = jwt.sign(
            {id: user.id, role: user.role}, // Payload
            process.env.JWT_SECRET, // Secret Key
            {expiresIn: process.env.JWT_EXPIRES_IN}
        );

        // Return response: JWT Token + Basic User Info.
        /* FOR ME: The frontend stores the token and sends it with every subsequent request. */
        res.json({
            token, 
            user: {
                id: user.id,
                hospital_id: user.hospital_id,
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                role: user.role
            }
        });


    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/v1/auth/signup
router.post('/signup', async(req, res) => {
    try {
        // Signup request requires invite token (from email invite) and password.
        const {token, password} = req.body;

        if(!token || !password) {
            return res.status(400).json({error: 'Token and password are required.'});
        }

        if(password.length < 8) {
            return res.status(400).json({error: 'Password must be at least 8 characters.'});
        }

        // Find user by invite token.
        // FOR ME: Three conditions must all be true -> token exists, token has not been used, token is not expired.
        const [rows] = await pool.query(
            'SELECT * FROM users WHERE invite_token = ? AND invite_used = FALSE AND invite_token_expires_at > NOW()',
            [token]
        );

        if(rows.length === 0) {
            return res.status(400).json({error: 'Invalid or expired invite token.'});
        }

        const user = rows[0];

        // Hash password.
        const password_hash = await bcrypt.hash(password, 12); // Hashes password with cost factor of 12.

        // Activate Account: stores hashed password, marks token as used, clear the token.
        await pool.query(
            'UPDATE users SET password_hash = ?, invite_used = TRUE, invite_token = NULL WHERE id = ?',
            [password_hash, user.id]
        );


        res.status(200).json({ message: 'Account activated successfully. You can now log in.' });


    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error.' });
    }
});



module.exports = router;
