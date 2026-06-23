// requireRole.js
// Authorization guard. Runs AFTER authenticate (which attaches req.user).
// Pass in the roles allowed to hit this route.

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden!' });
        }
        next();
    };
}

module.exports = requireRole;