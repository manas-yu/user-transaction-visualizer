const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const relationshipRoutes = require('./routes/relationshipRoutes');
const { initializeDb } = require('./db/neo4jConnection');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database initialization
initializeDb();

// Routes
app.use('/users', userRoutes);
app.use('/transactions', transactionRoutes);
app.use('/relationships', relationshipRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;