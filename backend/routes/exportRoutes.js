const express = require('express');
const {
    exportUsers,
    exportTransactions,
    exportRelationships,
    exportFullGraph,
    saveExportToFile
} = require('../utils/exportUtils');

const router = express.Router();

/**
 * GET /export/graph
 * Export the full graph (users, transactions, relationships) in the specified format
 */
router.get('/graph', async (req, res) => {
    try {
        const format = req.query.format?.toLowerCase() || 'json';

        // Validate format
        if (!['json', 'csv'].includes(format)) {
            return res.status(400).json({
                error: 'Invalid format. Supported formats: json, csv'
            });
        }

        const result = await exportFullGraph(format);

        // Handle file download if requested
        if (req.query.download === 'true') {
            const fileResult = await saveExportToFile(result, 'full_graph', 'exports');

            // Send file download info
            return res.status(200).json({
                success: true,
                format,
                filepath: fileResult.filePath || fileResult.filePaths,
                metadata: result.metadata
            });
        }

        // Set appropriate content type for the response
        if (format === 'csv') {
            // For CSV, there are multiple files, so return metadata about them
            return res.json({
                format: 'csv',
                message: 'Multiple CSV files generated. Use download=true to save files.',
                metadata: result.metadata
            });
        } else {
            return res.json(result);
        }
    } catch (error) {
        console.error('Error exporting full graph:', error);
        res.status(500).json({ error: 'Failed to export full graph', details: error.message });
    }
});

module.exports = router;