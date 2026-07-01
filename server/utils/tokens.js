// utils/tokens.js
const crypto = require('crypto');

// Generate a raw invite/reset token (goes in the email link).
function generateRawToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Hash a token for storage / lookup. SHA-256 is correct here:
// the token is already high-entropy random, so we don't need bcrypt's
// deliberate slowness or a salt — we just need a fast, irreversible fingerprint.
function hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
}

module.exports = { generateRawToken, hashToken };