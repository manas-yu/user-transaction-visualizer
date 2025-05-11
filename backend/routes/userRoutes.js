const express = require('express');
const User = require('../models/userModel');

const router = express.Router();

/**
 * POST /users
 * Create or update a user
 */
router.post('/', async (req, res) => {
    try {
        const userData = req.body;

        if (!userData.name) {
            return res.status(400).json({ error: 'Name is required' });

            module.exports = router;
        }

        const user = await User.createOrUpdate(userData);
        res.status(201).json(user);
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * GET /users
 * Get all users with optional filters
 */
router.get('/', async (req, res) => {
    try {
        // Extract any filters from query params
        const filters = {};
        if (req.query.email) filters.email = req.query.email;
        if (req.query.phone) filters.phone = req.query.phone;

        const users = await User.getAll(filters);
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /users/:id
 * Get a user by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const user = await User.getById(req.params.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

/**
 * DELETE /users/:id
 * Delete a user by ID
 */
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await User.delete(req.params.id);

        if (!deleted) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

module.exports = router;