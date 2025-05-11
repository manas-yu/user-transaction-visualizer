const { getSession } = require('../db/neo4jConnection');
const { v4: uuidv4 } = require('uuid');

/**
 * User model for interacting with user nodes in Neo4j
 */
class User {
    /**
     * Create or update a user
     * @param {Object} userData - User data
     * @returns {Object} Created/updated user
     */
    static async createOrUpdate(userData) {
        const session = getSession();
        try {
            const id = userData.id || uuidv4();

            // Extract shared attributes for relationship detection
            const { email, phone, address, paymentMethods } = userData;

            // Base properties that all users have
            const baseProperties = {
                id,
                name: userData.name,
                createdAt: userData.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Add optional properties if they exist
            if (email) baseProperties.email = email;
            if (phone) baseProperties.phone = phone;
            if (address) baseProperties.address = JSON.stringify(address);
            if (paymentMethods) baseProperties.paymentMethods = JSON.stringify(paymentMethods);

            // Merge (create or update) the user node
            const result = await session.run(
                `
        MERGE (u:User {id: $id})
        ON CREATE SET u = $properties
        ON MATCH SET u += $updateProperties
        RETURN u
        `,
                {
                    id,
                    properties: baseProperties,
                    updateProperties: { ...baseProperties, updatedAt: new Date().toISOString() }
                }
            );

            // Create relationships with other users based on shared attributes
            await this.createSharedAttributeRelationships(id, userData);

            const user = result.records[0].get('u').properties;

            return user;
        } catch (error) {
            console.error('Error creating/updating user:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Create relationships between users based on shared attributes
     * @param {string} userId - User ID
     * @param {Object} userData - User data with potential shared attributes
     */
    static async createSharedAttributeRelationships(userId, userData) {
        const session = getSession();
        try {
            // Create relationships based on shared email
            if (userData.email) {
                await session.run(
                    `
          MATCH (u1:User {id: $userId})
          MATCH (u2:User)
          WHERE u2.email = $email AND u2.id <> $userId
          MERGE (u1)-[r:SHARES_EMAIL {email: $email}]->(u2)
          RETURN r
          `,
                    { userId, email: userData.email }
                );
            }

            // Create relationships based on shared phone
            if (userData.phone) {
                await session.run(
                    `
          MATCH (u1:User {id: $userId})
          MATCH (u2:User)
          WHERE u2.phone = $phone AND u2.id <> $userId
          MERGE (u1)-[r:SHARES_PHONE {phone: $phone}]->(u2)
          RETURN r
          `,
                    { userId, phone: userData.phone }
                );
            }

            // Create relationships based on shared address
            if (userData.address) {
                const addressStr = JSON.stringify(userData.address);
                await session.run(
                    `
          MATCH (u1:User {id: $userId})
          MATCH (u2:User)
          WHERE u2.address = $address AND u2.id <> $userId
          MERGE (u1)-[r:SHARES_ADDRESS {address: $address}]->(u2)
          RETURN r
          `,
                    { userId, address: addressStr }
                );
            }

            // Create relationships based on shared payment methods
            if (userData.paymentMethods && userData.paymentMethods.length > 0) {
                for (const method of userData.paymentMethods) {
                    const paymentMethodStr = JSON.stringify(method);
                    await session.run(
                        `
            MATCH (u1:User {id: $userId})
            MATCH (u2:User)
            WHERE u2.id <> $userId AND 
                  ANY(pm IN u2.paymentMethods WHERE pm = $paymentMethod)
            MERGE (u1)-[r:SHARES_PAYMENT_METHOD {paymentMethod: $paymentMethod}]->(u2)
            RETURN r
            `,
                        { userId, paymentMethod: paymentMethodStr }
                    );
                }
            }
        } catch (error) {
            console.error('Error creating shared attribute relationships:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get all users
     * @param {Object} filters - Optional filters
     * @returns {Array} List of users
     */
    static async getAll(filters = {}) {
        const session = getSession();
        try {
            let query = 'MATCH (u:User) ';

            // Add filters if provided
            const params = {};
            const filterConditions = [];

            if (filters.email) {
                filterConditions.push('u.email = $email');
                params.email = filters.email;
            }

            if (filters.phone) {
                filterConditions.push('u.phone = $phone');
                params.phone = filters.phone;
            }

            if (filterConditions.length > 0) {
                query += 'WHERE ' + filterConditions.join(' AND ') + ' ';
            }

            query += 'RETURN u ORDER BY u.createdAt DESC';

            const result = await session.run(query, params);

            return result.records.map(record => record.get('u').properties);
        } catch (error) {
            console.error('Error fetching users:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Get a user by ID
     * @param {string} id - User ID
     * @returns {Object} User data
     */
    static async getById(id) {
        const session = getSession();
        try {
            const result = await session.run(
                'MATCH (u:User {id: $id}) RETURN u',
                { id }
            );

            if (result.records.length === 0) {
                return null;
            }

            return result.records[0].get('u').properties;
        } catch (error) {
            console.error('Error fetching user by ID:', error);
            throw error;
        } finally {
            await session.close();
        }
    }

    /**
     * Delete a user by ID
     * @param {string} id - User ID
     * @returns {boolean} Success status
     */
    static async delete(id) {
        const session = getSession();
        try {
            const result = await session.run(
                'MATCH (u:User {id: $id}) DETACH DELETE u RETURN count(u) as count',
                { id }
            );

            return result.records[0].get('count').toNumber() > 0;
        } catch (error) {
            console.error('Error deleting user:', error);
            throw error;
        } finally {
            await session.close();
        }
    }
}

module.exports = User;