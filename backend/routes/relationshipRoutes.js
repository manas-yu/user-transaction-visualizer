const express = require('express');
const Relationship = require('../models/relationshipModel');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');

const router = express.Router();

/**
 * GET /relationships/user/:id
 * Get all connections of a user
 */
router.get('/user/:id', async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const user = await User.getById(userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const connections = await Relationship.getUserConnections(userId);
        res.status(200).json(connections);
    } catch (error) {
        console.error('Error fetching user connections:', error);
        res.status(500).json({ error: 'Failed to fetch user connections' });
    }
});

/**
 * GET /relationships/transaction/:id
 * Get all connections of a transaction
 */
router.get('/transaction/:id', async (req, res) => {
    try {
        const transactionId = req.params.id;

        // Check if transaction exists
        const transaction = await Transaction.getById(transactionId);
        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        const connections = await Relationship.getTransactionConnections(transactionId);
        res.status(200).json(connections);
    } catch (error) {
        console.error('Error fetching transaction connections:', error);
        res.status(500).json({ error: 'Failed to fetch transaction connections' });
    }
});

module.exports = router;