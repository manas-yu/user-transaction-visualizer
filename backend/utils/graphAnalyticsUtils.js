/**
 * Utility functions for graph analytics
 */
const { getSession } = require('../db/neo4jConnection');

/**
 * Find the shortest path between two users
 * @param {string} sourceUserId - ID of the source user
 * @param {string} targetUserId - ID of the target user
 * @param {number} maxDepth - Maximum path length to search for (optional, default: 5)
 * @returns {Object} The shortest path details
 */
async function findShortestPath(sourceUserId, targetUserId, maxDepth = 5) {
    const session = getSession();

    try {
        // Validate that both users exist
        const userCheckQuery = `
            MATCH (source:User {id: $sourceUserId}), (target:User {id: $targetUserId})
            RETURN source, target
        `;

        const userCheckResult = await session.run(userCheckQuery, {
            sourceUserId,
            targetUserId
        });

        if (userCheckResult.records.length === 0) {
            throw new Error('One or both users not found');
        }

        // Find shortest path between users
        // This query will find paths that can go through:
        // - Direct user relationships
        // - Common transactions
        // - Users connected via shared attributes
        const query = `
            MATCH path = shortestPath(
                (source:User {id: $sourceUserId})-[*..${maxDepth}]-(target:User {id: $targetUserId})
            )
            RETURN path, length(path) AS pathLength
        `;

        const result = await session.run(query, {
            sourceUserId,
            targetUserId
        });

        if (result.records.length === 0) {
            return { pathExists: false, message: 'No path found between users' };
        }

        // Process the path to make it more readable
        const path = result.records[0].get('path');
        const pathLength = result.records[0].get('pathLength');

        const nodes = path.segments.map(segment => segment.start).concat([path.segments[path.segments.length - 1].end]);
        const relationships = path.segments.map(segment => segment.relationship);

        // Format nodes and relationships for better readability
        const formattedNodes = nodes.map(node => ({
            id: node.properties.id,
            type: node.labels[0],
            properties: node.properties
        }));

        const formattedRelationships = relationships.map(rel => ({
            type: rel.type,
            properties: rel.properties
        }));

        // Build path as array of objects representing each step
        const pathSteps = [];
        for (let i = 0; i < relationships.length; i++) {
            pathSteps.push({
                from: formattedNodes[i],
                relationship: formattedRelationships[i],
                to: formattedNodes[i + 1]
            });
        }

        return {
            pathExists: true,
            pathLength,
            path: pathSteps
        };
    } finally {
        await session.close();
    }
}

/**
 * Perform clustering analysis on transactions
 * @param {string} attribute - Attribute to cluster by (e.g., 'ip', 'deviceId')
 * @param {number} minClusterSize - Minimum number of transactions to form a cluster
 * @returns {Array} Clusters of transactions
 */
async function clusterTransactions(attribute, minClusterSize = 2) {
    const session = getSession();

    try {
        // Validate attribute
        const validAttributes = ['ipAddress', 'deviceId', 'currency', 'status', 'amount'];
        if (!validAttributes.includes(attribute)) {
            throw new Error(`Invalid attribute: ${attribute}. Valid options are: ${validAttributes.join(', ')}`);
        }

        // Query to find clusters of transactions based on the specified attribute
        const query = `
            MATCH (t:Transaction)
            WHERE t.${attribute} IS NOT NULL
            WITH t.${attribute} AS shared, collect(t) AS transactions
            WHERE size(transactions) >= $minClusterSize
            RETURN shared, 
                   [x IN transactions | x.id] AS transactionIds,
                   size(transactions) AS clusterSize
            ORDER BY clusterSize DESC
        `;

        const result = await session.run(query, { minClusterSize });

        return result.records.map(record => ({
            attribute,
            value: record.get('shared'),
            transactionIds: record.get('transactionIds'),
            clusterSize: record.get('clusterSize')
        }));
    } finally {
        await session.close();
    }
}

module.exports = {
    findShortestPath,
    clusterTransactions
};