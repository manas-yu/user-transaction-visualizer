/**
 * Utility functions for data export
 */
const { getSession } = require('../db/neo4jConnection');
const fs = require('fs');
const path = require('path');

/**
 * Export all user data in the specified format
 * @param {string} format - Export format ('json' or 'csv')
 * @returns {Object} Export result with data and metadata
 */
async function exportUsers(format) {
    const session = getSession();

    try {
        // Get all users with their properties
        const query = `
            MATCH (u:User)
            RETURN u
        `;

        const result = await session.run(query);

        const users = result.records.map(record => {
            const user = record.get('u');
            return user.properties;
        });

        return formatExport(users, format, 'users');
    } finally {
        await session.close();
    }
}

/**
 * Export all transaction data in the specified format
 * @param {string} format - Export format ('json' or 'csv')
 * @returns {Object} Export result with data and metadata
 */
async function exportTransactions(format) {
    const session = getSession();

    try {
        // Get all transactions with their properties
        const query = `
            MATCH (t:Transaction)
            RETURN t
        `;

        const result = await session.run(query);

        const transactions = result.records.map(record => {
            const transaction = record.get('t');
            return transaction.properties;
        });

        return formatExport(transactions, format, 'transactions');
    } finally {
        await session.close();
    }
}

/**
 * Export all relationship data in the specified format
 * @param {string} format - Export format ('json' or 'csv')
 * @returns {Object} Export result with data and metadata
 */
async function exportRelationships(format) {
    const session = getSession();

    try {
        // Get all relationships with source and target information
        const query = `
            MATCH (a)-[r]->(b)
            RETURN 
                labels(a) AS sourceLabels, 
                a.id AS sourceId,
                type(r) AS relationshipType,
                properties(r) AS relationshipProperties,
                labels(b) AS targetLabels,
                b.id AS targetId
        `;

        const result = await session.run(query);

        const relationships = result.records.map(record => ({
            sourceType: record.get('sourceLabels')[0],
            sourceId: record.get('sourceId'),
            type: record.get('relationshipType'),
            properties: record.get('relationshipProperties'),
            targetType: record.get('targetLabels')[0],
            targetId: record.get('targetId')
        }));

        return formatExport(relationships, format, 'relationships');
    } finally {
        await session.close();
    }
}

/**
 * Export complete graph data (users, transactions, relationships) in the specified format
 * @param {string} format - Export format ('json' or 'csv')
 * @returns {Object} Export result with data and metadata
 */
async function exportFullGraph(format) {
    const users = await exportUsers(format);
    const transactions = await exportTransactions(format);
    const relationships = await exportRelationships(format);

    if (format === 'json') {
        const fullGraph = {
            users: users.data,
            transactions: transactions.data,
            relationships: relationships.data,
            metadata: {
                userCount: users.metadata.count,
                transactionCount: transactions.metadata.count,
                relationshipCount: relationships.metadata.count,
                exportDate: new Date().toISOString()
            }
        };

        return {
            format: 'json',
            data: fullGraph,
            metadata: {
                count: {
                    users: users.metadata.count,
                    transactions: transactions.metadata.count,
                    relationships: relationships.metadata.count
                },
                exportDate: new Date().toISOString()
            }
        };
    } else {
        // For CSV format, return multiple files
        return {
            format: 'csv',
            data: {
                users: users.data,
                transactions: transactions.data,
                relationships: relationships.data
            },
            metadata: {
                count: {
                    users: users.metadata.count,
                    transactions: transactions.metadata.count,
                    relationships: relationships.metadata.count
                },
                exportDate: new Date().toISOString()
            }
        };
    }
}

/**
 * Convert data array to CSV string
 * @param {Array} data - Array of objects to convert
 * @returns {string} CSV formatted string
 */
function convertToCSV(data) {
    if (data.length === 0) return '';

    // Get all possible headers from all objects
    const headers = [];
    data.forEach(item => {
        Object.keys(item).forEach(key => {
            if (!headers.includes(key)) {
                headers.push(key);
            }
        });
    });

    // Create CSV header row
    let csvContent = headers.join(',') + '\n';

    // Add data rows
    data.forEach(item => {
        const row = headers.map(header => {
            const value = item[header] !== undefined ? item[header] : '';

            // Handle values that need quoting (contains comma, newline, or quotes)
            if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
                // Escape quotes by doubling them
                return `"${value.replace(/"/g, '""')}"`;
            } else if (typeof value === 'object' && value !== null) {
                // Stringify objects and arrays, and quote the result
                return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }

            return value;
        }).join(',');

        csvContent += row + '\n';
    });

    return csvContent;
}

/**
 * Format data for export in the specified format
 * @param {Array} data - Data to export
 * @param {string} format - Export format ('json' or 'csv')
 * @param {string} entityType - Type of entity being exported
 * @returns {Object} Formatted export data
 */
function formatExport(data, format, entityType) {
    if (format === 'json') {
        return {
            format: 'json',
            data: data,
            metadata: {
                count: data.length,
                exportDate: new Date().toISOString(),
                entityType
            }
        };
    } else if (format === 'csv') {
        return {
            format: 'csv',
            data: convertToCSV(data),
            metadata: {
                count: data.length,
                exportDate: new Date().toISOString(),
                entityType
            }
        };
    } else {
        throw new Error(`Unsupported export format: ${format}`);
    }
}

/**
 * Save export data to file
 * @param {Object} exportData - Data returned from export functions
 * @param {string} filename - Base filename (without extension)
 * @param {string} outputDir - Directory to save files (defaults to 'exports')
 * @returns {Object} Result with file paths
 */
async function saveExportToFile(exportData, filename, outputDir = 'exports') {
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');

    if (exportData.format === 'json') {
        const filePath = path.join(outputDir, `${filename}_${timestamp}.json`);
        fs.writeFileSync(filePath, JSON.stringify(exportData.data, null, 2));

        return {
            success: true,
            format: 'json',
            filePath,
            metadata: exportData.metadata
        };
    } else if (exportData.format === 'csv') {
        // Handle both single CSV and multiple CSV files
        if (typeof exportData.data === 'string') {
            // Single CSV
            const filePath = path.join(outputDir, `${filename}_${timestamp}.csv`);
            fs.writeFileSync(filePath, exportData.data);

            return {
                success: true,
                format: 'csv',
                filePath,
                metadata: exportData.metadata
            };
        } else {
            // Multiple CSV files (full graph export)
            const filePaths = {};

            for (const entityType in exportData.data) {
                const filePath = path.join(outputDir, `${filename}_${entityType}_${timestamp}.csv`);
                fs.writeFileSync(filePath, exportData.data[entityType]);
                filePaths[entityType] = filePath;
            }

            return {
                success: true,
                format: 'csv',
                filePaths,
                metadata: exportData.metadata
            };
        }
    }
}

module.exports = {
    exportUsers,
    exportTransactions,
    exportRelationships,
    exportFullGraph,
    saveExportToFile
};