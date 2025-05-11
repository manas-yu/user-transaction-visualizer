const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const relationshipRoutes = require('./routes/relationshipRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const exportRoutes = require('./routes/exportRoutes');
const { initializeDb } = require('./db/neo4jConnection');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Create exports directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync('./exports')) {
    fs.mkdirSync('./exports', { recursive: true });
}

// Database initialization
initializeDb();

// Routes
app.use('/users', userRoutes);
app.use('/transactions', transactionRoutes);
app.use('/relationships', relationshipRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/export', exportRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

module.exports = app;