const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');

dotenv.config();

const NEO4J_URI = process.env.NEO4J_URI || 'neo4j://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';

let driver;

/**
 * Initialize Neo4j database connection
 */
async function initializeDb() {
    try {
        driver = neo4j.driver(
            NEO4J_URI,
            neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD),
            { maxConnectionPoolSize: 50 }
        );

        console.log('Connected to Neo4j database');

        await createConstraintsWithRetry();

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
        await session.run(`
            CREATE CONSTRAINT user_id_unique IF NOT EXISTS
            FOR (u:User) REQUIRE u.id IS UNIQUE
        `);

        await session.run(`
            CREATE CONSTRAINT transaction_id_unique IF NOT EXISTS
            FOR (t:Transaction) REQUIRE t.id IS UNIQUE
        `);

        console.log('Database constraints created successfully');
    } finally {
        await session.close();
    }
}

/**
 * Retry logic for constraint creation
 */
async function createConstraintsWithRetry(retries = 5, delay = 3000) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await createConstraints();
            return;
        } catch (err) {
            console.error(`Attempt ${attempt} failed to create constraints: ${err.message}`);
            if (attempt === retries) {
                throw err;
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

function getSession() {
    return driver.session();
}

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
