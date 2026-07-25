// utils/ids.js
const pool = require('../config/db');

// Generates the next sequential human-readable ID for any (table, column, prefix).
// e.g. generateSequentialId('users', 'hospital_id', 'N')  -> 'N-00042'
//      generateSequentialId('babies', 'record_number', 'B') -> 'B-00017'
async function generateSequentialId(table, column, prefix) {
    // table/column are always hardcoded call-site strings, NEVER user input —
    // safe to interpolate. Placeholders (?) only work for VALUES, not identifiers,
    // so this pattern must never be used with anything coming from a request.
    const [rows] = await pool.query(
        `SELECT ${column} FROM ${table}
         WHERE ${column} LIKE ?
         ORDER BY ${column} DESC
         LIMIT 1`,
        [`${prefix}-%`]
    );

    let next = 1;
    if (rows.length > 0) {
        const lastNumber = parseInt(rows[0][column].split('-')[1], 10);
        next = lastNumber + 1;
    }
    return `${prefix}-${String(next).padStart(5, '0')}`;
}

module.exports = { generateSequentialId };