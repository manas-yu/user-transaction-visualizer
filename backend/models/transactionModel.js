const { getSession } = require('../db/neo4jConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * Transaction model for interacting with transaction nodes in Neo4j
 */
class Transaction {
    /**
     * Create or update a transaction
     * @param {Object} transactionData - Transaction data
     * @returns {Object} Created/updated transaction
     */
    static async createOrUpdate(transactionData) {
        const session = getSession();
        try {
            const id = transactionData.id || uuidv4();

            // Required transaction fields
            const baseProperties = {
                id,
                amount: transactionData.amount,
                currency: transactionData.currency || 'USD',
                timestamp: transactionData.timestamp || new Date().toISOString(),
                status: transactionData.status || 'completed',
                createdAt: transactionData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Optional fields that might be used for link detection
            if (transactionData.ipAddress) baseProperties.ipAddress = transactionData.ipAddress;
            if (transactionData.deviceId) baseProperties.deviceId = transactionData.deviceId;
            if (transactionData.location) baseProperties.location = JSON.stringify(transactionData.location);
            if (transactionData.description) baseProperties.description = transactionData.description;

            // Create or update the transaction node
            const result = await session.run(
                `
        MERGE (t:Transaction {id: $id})
        ON CREATE SET t = $properties
        ON MATCH SET t += $updateProperties
        RETURN t
        `,
                {
                    id,
                    properties: baseProperties,
                    updateProperties: { ...baseProperties, updatedAt: new Date().toISOString() }
                }
            );

            const transaction = result.records[0].get('t').properties;

            // Create links between transaction and users
            if (transactionData.fromUserId) {
                await session.run(
                    `
          MATCH (u:User {id: $userId})
          MATCH (t:Transaction {id: $transactionId})
          MERGE (u)-[r:SENT_MONEY {amount: $amount, currency: $currency}]->(t)
          RETURN r
          `,
                    {
                        userId: transactionData.fromUserId,
                        transactionId: id,
                        amount: transactionData.amount,
                        currency: transactionData.currency || 'USD'
                    }
                );
            }

            if (transactionData.toUserId) {
                await session.run(
                    `
          MATCH (u:User {id: $userId})
          MATCH (t:Transaction {id: $transactionId})
          MERGE (t)-[r:RECEIVED_BY {amount: $amount, currency: $currency}]->(u)
          RETURN r
          `,
                    {
                        userId: transactionData.toUserId,
                        transactionId: id,
                        amount: transactionData.amount,
                        currency: transactionData.currency || 'USD'
                    }
                );
            }

            // Create direct user-to-user relationship for the transaction
            if (transactionData.fromUserId && transactionData.toUserId) {
                await session.run(
                    `
          MATCH (sender:User {id: $fromUserId})
          MATCH (receiver:User {id: $toUserId})
          MERGE (sender)-[r:TRANSFERRED_TO {
            transactionId: $transactionId,
            amount: $amount,
            currency: $currency,
            timestamp: $timestamp
          }]->(receiver)
          RETURN r
          `,
                    {
                        fromUserId: transactionData.fromUserId,
                        toUserId: transactionData.toUserId,
                        transactionId: id,
                        amount: transactionData.amount,
                        currency: transactionData.currency || 'USD',
                        timestamp: transactionData.timestamp || new Date().toISOString()
                    }
                );
            }

            // Create relationships with other transactions based on shared attributes
            await this.createTransactionLinkRelationships(id, transactionData);

            return transaction;
        } catch (error) {
            console.error('Error creating/updating transaction:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Create relationships between transactions based on shared attributes
     * @param {string} transactionId - Transaction ID
     * @param {Object} transactionData - Transaction data
     */
    static async createTransactionLinkRelationships(transactionId, transactionData) {
        const session = getSession();
        try {
            // Link transactions by IP address
            if (transactionData.ipAddress) {
                await session.run(
                    `
          MATCH (t1:Transaction {id: $transactionId})
          MATCH (t2:Transaction)
          WHERE t2.ipAddress = $ipAddress AND t2.id <> $transactionId
          MERGE (t1)-[r:SHARES_IP {ipAddress: $ipAddress}]->(t2)
          RETURN r
          `,
                    { transactionId, ipAddress: transactionData.ipAddress }
                );
            }

            // Link transactions by device ID
            if (transactionData.deviceId) {
                await session.run(
                    `
          MATCH (t1:Transaction {id: $transactionId})
          MATCH (t2:Transaction)
          WHERE t2.deviceId = $deviceId AND t2.id <> $transactionId
          MERGE (t1)-[r:SHARES_DEVICE {deviceId: $deviceId}]->(t2)
          RETURN r
          `,
                    { transactionId, deviceId: transactionData.deviceId }
                );
            }

            // Link transactions by location
            if (transactionData.location) {
                const locationStr = JSON.stringify(transactionData.location);
                await session.run(
                    `
          MATCH (t1:Transaction {id: $transactionId})
          MATCH (t2:Transaction)
          WHERE t2.location = $location AND t2.id <> $transactionId
          MERGE (t1)-[r:SHARES_LOCATION {location: $location}]->(t2)
          RETURN r
          `,
                    { transactionId, location: locationStr }
                );
            }
        } catch (error) {
            console.error('Error creating transaction link relationships:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get all transactions
     * @param {Object} filters - Optional filters
     * @returns {Array} List of transactions
     */
    static async getAll(filters = {}) {
        const session = getSession();
        try {
            let query = 'MATCH (t:Transaction) ';

            // Add filters if provided
            const params = {};
            const filterConditions = [];

            if (filters.status) {
                filterConditions.push('t.status = $status');
                params.status = filters.status;
            }

            if (filters.minAmount) {
                filterConditions.push('t.amount >= $minAmount');
                params.minAmount = parseFloat(filters.minAmount);
            }

            if (filters.maxAmount) {
                filterConditions.push('t.amount <= $maxAmount');
                params.maxAmount = parseFloat(filters.maxAmount);
            }

            if (filters.currency) {
                filterConditions.push('t.currency = $currency');
                params.currency = filters.currency;
            }

            if (filterConditions.length > 0) {
                query += 'WHERE ' + filterConditions.join(' AND ') + ' ';
            }

            query += 'RETURN t ORDER BY t.timestamp DESC';

            const result = await session.run(query, params);

            return result.records.map(record => record.get('t').properties);
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get a transaction by ID
     * @param {string} id - Transaction ID
     * @returns {Object} Transaction data
     */
    static async getById(id) {
        const session = getSession();
        try {
            const result = await session.run(
                'MATCH (t:Transaction {id: $id}) RETURN t',
                { id }
            );

            if (result.records.length === 0) {
                return null;
            }

            return result.records[0].get('t').properties;
        } catch (error) {
            console.error('Error fetching transaction by ID:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Delete a transaction by ID
     * @param {string} id - Transaction ID
     * @returns {boolean} Success status
     */
    static async delete(id) {
        const session = getSession();
        try {
            const result = await session.run(
                'MATCH (t:Transaction {id: $id}) DETACH DELETE t RETURN count(t) as count',
                { id }
            );

            return result.records[0].get('count').toNumber() > 0;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        } finally {
            await session.close();
        }
    }
}

module.exports = Transaction;