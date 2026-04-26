require('dotenv').config();
const express = require('express');
const pool = require('./config/db');
const authRoutes = require('./routes/auth'); // Imports the auth authorization routes defined in auth.js

const app = express();
const PORT = process.env.PORT || 3000;


// Middleware
app.use(express.json());
app.use('/api/v1/auth', authRoutes); // Mounts the auth routes at /api/v1/auth. 
                                     // FOR ME: for example, the login route will be accessible at /api/v1/auth/login.

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