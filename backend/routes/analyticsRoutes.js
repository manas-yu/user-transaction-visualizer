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


/**
 * GET /analytics/transactionClusters
 * Find clusters of transactions based on shared attributes
 */
router.get('/transactionClusters', async (req, res) => {
    try {
        const { attribute, minClusterSize } = req.query;

        // Validate required parameters
        if (!attribute) {
            return res.status(400).json({
                error: 'Missing required parameter: attribute',
                validAttributes: ['ip', 'deviceId', 'accountNumber', 'beneficiaryAccount', 'location']
            });
        }

        // Parse minClusterSize if provided
        const parsedMinSize = minClusterSize ? parseInt(minClusterSize, 10) : 2;

        // Validate minClusterSize is a positive integer
        if (isNaN(parsedMinSize) || parsedMinSize <= 0) {
            return res.status(400).json({
                error: 'minClusterSize must be a positive integer'
            });
        }

        // Get transaction clusters
        const clusters = await clusterTransactions(attribute, parsedMinSize);

        res.status(200).json({
            attribute,
            minClusterSize: parsedMinSize,
            clusterCount: clusters.length,
            clusters
        });
    } catch (error) {
        console.error('Error clustering transactions:', error);
        res.status(500).json({ error: 'Failed to cluster transactions', details: error.message });
    }
});

module.exports = router;
