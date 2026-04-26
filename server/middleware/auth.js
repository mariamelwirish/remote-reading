const jwt = require('jsonwebtoken');

// Middleware to authenticate JWT token and attach user info to request object.
const authenticateToken = (req, res, next) => {
    // FOR ME: example -> Authorization: Bearer eyJh...
    const authHeader = req.headers['authorization']; // Get the 'Authorization' header from the request.
    const token = authHeader && authHeader.split(' ')[1]; // Extract the token part (after 'Bearer ').

    if (!token) {
        return res.status(401).json({error: 'Access token required.'});
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        req.user = user; // Attaches the decoded user object to the request.
        next(); // Tells Express to continue to the next handler (e.g., the actual route handler).
    });
}

module.exports = authenticateToken;