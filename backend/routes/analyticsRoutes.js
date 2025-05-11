const express = require('express');
const { findShortestPath, clusterTransactions } = require('../utils/graphAnalyticsUtils');

const router = express.Router();

/**
 * GET /analytics/shortestPath
 * Find the shortest path between two users
 */
router.get('/shortestPath', async (req, res) => {
    try {
        const { sourceUserId, targetUserId, maxDepth } = req.query;

        // Validate required parameters
        if (!sourceUserId || !targetUserId) {
            return res.status(400).json({
                error: 'Missing required parameters',
                requiredParams: ['sourceUserId', 'targetUserId']
            });
        }

        // Parse maxDepth if provided
        const parsedMaxDepth = maxDepth ? parseInt(maxDepth, 10) : 5;

        // Validate maxDepth is a positive integer
        if (isNaN(parsedMaxDepth) || parsedMaxDepth <= 0) {
            return res.status(400).json({
                error: 'maxDepth must be a positive integer'
            });
        }

        // Find shortest path
        const pathResult = await findShortestPath(sourceUserId, targetUserId, parsedMaxDepth);

        res.status(200).json(pathResult);
    } catch (error) {
        console.error('Error finding shortest path:', error);
        res.status(500).json({ error: 'Failed to find shortest path', details: error.message });
    }
});

module.exports = router;