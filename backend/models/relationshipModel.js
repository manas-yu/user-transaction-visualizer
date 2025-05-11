const { getSession } = require('../db/neo4jConnection');

/**
 * Relationship model for querying connections between entities
 */
class Relationship {
    /**
     * Get all connections of a user
     * @param {string} userId - User ID
     * @returns {Object} User connections data
     */
    static async getUserConnections(userId) {
        const session = getSession();
        try {
            // Get direct user connections (shared attributes)
            const userConnectionsResult = await session.run(
                `
        MATCH (u:User {id: $userId})-[r]->(connectedUser:User)
        RETURN connectedUser, type(r) as relationshipType, properties(r) as properties
        `,
                { userId }
            );

            // Get user-to-transaction connections (sent/received)
            const transactionConnectionsResult = await session.run(
                `
        MATCH (u:User {id: $userId})-[r1:SENT_MONEY]->(t:Transaction)
        OPTIONAL MATCH (t)-[r2:RECEIVED_BY]->(receiver:User)
        RETURN t, receiver, type(r1) as fromRelationship, properties(r1) as fromProperties,
               type(r2) as toRelationship, properties(r2) as toProperties
        UNION
        MATCH (u:User {id: $userId})<-[r1:RECEIVED_BY]-(t:Transaction)
        OPTIONAL MATCH (sender:User)-[r2:SENT_MONEY]->(t)
        RETURN t, sender as receiver, type(r1) as fromRelationship, properties(r1) as fromProperties,
               type(r2) as toRelationship, properties(r2) as toProperties
        `,
                { userId }
            );

            // Get direct user-to-user transfer connections
            const directTransfersResult = await session.run(
                `
        MATCH (u:User {id: $userId})-[r:TRANSFERRED_TO]->(receiver:User)
        RETURN receiver, collect(r) as transfers, 'OUTGOING' as direction
        UNION
        MATCH (sender:User)-[r:TRANSFERRED_TO]->(u:User {id: $userId})
        RETURN sender as receiver, collect(r) as transfers, 'INCOMING' as direction
        `,
                { userId }
            );

            // Format the connections
            const connections = {
                user: {
                    id: userId,
                },
                connectedUsers: userConnectionsResult.records.map(record => {
                    const user = record.get('connectedUser').properties;
                    const relType = record.get('relationshipType');
                    const properties = record.get('properties');

                    return {
                        user,
                        relationship: {
                            type: relType,
                            properties
                        }
                    };
                }),
                transactions: transactionConnectionsResult.records.map(record => {
                    const transaction = record.get('t').properties;
                    const receiver = record.get('receiver') ? record.get('receiver').properties : null;
                    const fromRelType = record.get('fromRelationship');
                    const fromProps = record.get('fromProperties');
                    const toRelType = record.get('toRelationship');
                    const toProps = record.get('toProperties');

                    return {
                        transaction,
                        connectedUser: receiver,
                        relationship: {
                            from: {
                                type: fromRelType,
                                properties: fromProps
                            },
                            to: receiver ? {
                                type: toRelType,
                                properties: toProps
                            } : null
                        }
                    };
                }),
                directTransfers: directTransfersResult.records.map(record => {
                    const user = record.get('receiver').properties;
                    const transfers = record.get('transfers').map(transfer => transfer.properties);
                    const direction = record.get('direction');

                    return {
                        user,
                        transfers,
                        direction
                    };
                })
            };

            return connections;
        } catch (error) {
            console.error('Error fetching user connections:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get all connections of a transaction
     * @param {string} transactionId - Transaction ID
     * @returns {Object} Transaction connections data
     */
    static async getTransactionConnections(transactionId) {
        const session = getSession();
        try {
            // Get users involved in the transaction
            const involvedUsersResult = await session.run(
                `
        MATCH (sender:User)-[r1:SENT_MONEY]->(t:Transaction {id: $transactionId})
        OPTIONAL MATCH (t)-[r2:RECEIVED_BY]->(receiver:User)
        RETURN sender, receiver, r1, r2
        `,
                { transactionId }
            );

            // Get related transactions (by shared attributes)
            const relatedTransactionsResult = await session.run(
                `
        MATCH (t:Transaction {id: $transactionId})-[r]->(relatedTx:Transaction)
        RETURN relatedTx, type(r) as relationshipType, properties(r) as properties
        `,
                { transactionId }
            );

            // Format the connections
            const connections = {
                transaction: {
                    id: transactionId,
                },
                involvedUsers: involvedUsersResult.records.map(record => {
                    const sender = record.get('sender') ? record.get('sender').properties : null;
                    const receiver = record.get('receiver') ? record.get('receiver').properties : null;
                    const sentRelationship = record.get('r1') ? record.get('r1').properties : null;
                    const receivedRelationship = record.get('r2') ? record.get('r2').properties : null;

                    return {
                        sender,
                        receiver,
                        relationships: {
                            sent: sentRelationship,
                            received: receivedRelationship
                        }
                    };
                }),
                relatedTransactions: relatedTransactionsResult.records.map(record => {
                    const transaction = record.get('relatedTx').properties;
                    const relType = record.get('relationshipType');
                    const properties = record.get('properties');

                    return {
                        transaction,
                        relationship: {
                            type: relType,
                            properties
                        }
                    };
                })
            };

            return connections;
        } catch (error) {
            console.error('Error fetching transaction connections:', error);
            throw error;
        } finally {
            await session.close();
        }
    }
}

module.exports = Relationship;
