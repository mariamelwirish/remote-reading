require('dotenv').config();
const express = require('express');
const pool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check route
app.get('/', (req, res) => {
  res.json({ message: 'Remote Reading API is running' });
});

// Test database connection then start server
pool.getConnection()
  .then(connection => {
    console.log('Database connected successfully');
    connection.release();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  });