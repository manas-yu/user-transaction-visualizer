const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');

dotenv.config();

// Neo4j connection details from env variables
const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

let driver;

/**
 * Initialize Neo4j database connection
 */
function initializeDb() {
    try {
        driver = neo4j.driver(
            NEO4J_URI,
            neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
            { maxConnectionPoolSize: 50 }
        );

        console.log('Connected to Neo4j database');

        // Create constraints for unique User and Transaction IDs
        createConstraints();

        return driver;
    } catch (error) {
        console.error('Failed to connect to Neo4j:', error);
        process.exit(1);
    }
}

/**
 * Create database constraints
 */
async function createConstraints() {
    const session = driver.session();
    try {
        // Create unique constraint on User id
        await session.run(`
      CREATE CONSTRAINT user_id_unique IF NOT EXISTS
      FOR (u:User) REQUIRE u.id IS UNIQUE
    `);

        // Create unique constraint on Transaction id
        await session.run(`
      CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS
      FOR (t:Transaction) REQUIRE t.id IS UNIQUE
    `);

        console.log('Database constraints created successfully');
    } catch (error) {
        console.error('Error creating constraints:', error);
    } finally {
        await session.close();
    }
}

/**
 * Get a database session
 */
function getSession() {
    return driver.session();
}

/**
 * Close the Neo4j driver
 */
function closeDriver() {
    if (driver) {
        driver.close();
        console.log('Neo4j connection closed');
    }
}

module.exports = {
    initializeDb,
    getSession,
    closeDriver
};