const express = require('express');
const Transaction = require('../models/transactionModel');

const router = express.Router();

/**
 * POST /transactions
 * Create or update a transaction
 */
router.post('/', async (req, res) => {
    try {
        const transactionData = req.body;

        // Validate required fields
        if (!transactionData.amount) {
            return res.status(400).json({ error: 'Amount is required' });
        }

        if (!transactionData.fromUserId && !transactionData.toUserId) {
            return res.status(400).json({ error: 'At least one user (sender or receiver) is required' });
        }

        const transaction = await Transaction.createOrUpdate(transactionData);
        res.status(201).json(transaction);
    } catch (error) {
        console.error('Error creating transaction:', error);
        res.status(500).json({ error: 'Failed to create transaction' });
    }
});

/**
 * GET /transactions
 * Get all transactions with optional filters
 */
router.get('/', async (req, res) => {
    try {
        // Extract any filters from query params
        const filters = {};
        if (req.query.status) filters.status = req.query.status;
        if (req.query.minAmount) filters.minAmount = req.query.minAmount;
        if (req.query.maxAmount) filters.maxAmount = req.query.maxAmount;
        if (req.query.currency) filters.currency = req.query.currency;

        const transactions = await Transaction.getAll(filters);
        res.status(200).json(transactions);
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({ error: 'Failed to fetch transactions' });
    }
});

/**
 * GET /transactions/:id
 * Get a transaction by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const transaction = await Transaction.getById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.status(200).json(transaction);
    } catch (error) {
        console.error('Error fetching transaction:', error);
        res.status(500).json({ error: 'Failed to fetch transaction' });
    }
});

/**
 * DELETE /transactions/:id
 * Delete a transaction by ID
 */
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Transaction.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ error: 'Transaction not found' });
        }

        res.status(200).json({ message: 'Transaction deleted successfully' });
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ error: 'Failed to delete transaction' });
    }
});

module.exports = router;