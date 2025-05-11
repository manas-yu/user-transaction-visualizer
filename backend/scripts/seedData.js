const { getSession, initializeDb } = require('../db/neo4jConnection');
const User = require('../models/userModel');
const Transaction = require('../models/transactionModel');

/**
 * Clear all data from the database
 */
async function clearDatabase() {
    const session = getSession();
    try {
        console.log('Clearing database...');
        await session.run('MATCH (n) DETACH DELETE n');
        console.log('Database cleared successfully');
    } catch (error) {
        console.error('Error clearing database:', error);
        throw error;
    } finally {
        await session.close();
    }
}

/**
 * Seed the database with sample users and transactions
 */
async function seedDatabase() {
    try {
        console.log('Starting database seeding...');

        // Initialize the database connection
        initializeDb();

        // Clear existing data
        await clearDatabase();

        // Create sample users
        console.log('Creating sample users...');
        const users = await createSampleUsers();

        // Create sample transactions
        console.log('Creating sample transactions...');
        await createSampleTransactions(users);

        console.log('Database seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
}

/**
 * Create sample users with shared attributes
 * @returns {Array} Created users
 */
async function createSampleUsers() {
    const sampleUsers = [
        {
            id: 'user1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+1234567890',
            address: {
                street: '123 Main St',
                city: 'New York',
                country: 'USA'
            },
            paymentMethods: [
                { type: 'credit_card', last4: '1234', provider: 'visa' }
            ]
        },
        {
            id: 'user2',
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+1987654321',
            address: {
                street: '456 Elm St',
                city: 'Los Angeles',
                country: 'USA'
            },
            paymentMethods: [
                { type: 'credit_card', last4: '5678', provider: 'mastercard' }
            ]
        },
        {
            id: 'user3',
            name: 'Bob Johnson',
            email: 'bob@example.com',
            phone: '+1122334455',
            address: {
                street: '789 Oak St',
                city: 'Chicago',
                country: 'USA'
            },
            paymentMethods: [
                { type: 'credit_card', last4: '9012', provider: 'amex' }
            ]
        },
        {
            id: 'user4',
            name: 'Alice Brown',
            email: 'alice@example.com',
            phone: '+1567890123',
            address: {
                street: '321 Pine St',
                city: 'San Francisco',
                country: 'USA'
            },
            paymentMethods: [
                { type: 'credit_card', last4: '3456', provider: 'visa' },
                { type: 'bank_account', last4: '7890', bank: 'Chase' }
            ]
        },
        {
            id: 'user5',
            name: 'Charlie Davis',
            email: 'charlie@example.com',
            phone: '+1234567890', // Same phone as John Doe for shared attribute
            address: {
                street: '654 Cedar St',
                city: 'Boston',
                country: 'USA'
            },
            paymentMethods: [
                { type: 'credit_card', last4: '7890', provider: 'discover' }
            ]
        },
        {
            id: 'user6',
            name: 'Eva Wilson',
            email: 'eva@example.com',
            phone: '+1654987321',
            address: {
                street: '123 Main St', // Same address as John Doe for shared attribute
                city: 'New York',
                country: 'USA'
            },
            paymentMethods: [
                { type: 'credit_card', last4: '1234', provider: 'visa' } // Same payment method as John Doe
            ]
        },
        {
            id: 'user7',
            name: 'David Miller',
            email: 'david@example.com',
            phone: '+1098765432',
            address: {
                street: '987 Market St',
                city: 'Seattle',
                country: 'USA'
            },
            paymentMethods: [
                { type: 'bank_account', last4: '7890', bank: 'Chase' } // Same as Alice's second payment method
            ]
        }
    ];

    const createdUsers = [];

    for (const userData of sampleUsers) {
        const user = await User.createOrUpdate(userData);
        createdUsers.push(user);
        console.log(`Created user: ${user.name} (${user.id})`);
    }

    return createdUsers;
}

/**
 * Create sample transactions
 * @param {Array} users - Created users
 */
async function createSampleTransactions(users) {
    const sampleTransactions = [
        {
            id: 'tx1',
            amount: 100.00,
            currency: 'USD',
            timestamp: '2023-01-01T12:00:00Z',
            status: 'completed',
            fromUserId: 'user1', // John to Jane
            toUserId: 'user2',
            ipAddress: '192.168.1.1',
            deviceId: 'device123'
        },
        {
            id: 'tx2',
            amount: 50.00,
            currency: 'USD',
            timestamp: '2023-01-02T12:00:00Z',
            status: 'completed',
            fromUserId: 'user2', // Jane to Bob
            toUserId: 'user3',
            ipAddress: '192.168.1.2',
            deviceId: 'device456'
        },
        {
            id: 'tx3',
            amount: 200.00,
            currency: 'USD',
            timestamp: '2023-01-03T12:00:00Z',
            status: 'completed',
            fromUserId: 'user3', // Bob to Alice
            toUserId: 'user4',
            ipAddress: '192.168.1.3',
            deviceId: 'device789'
        },
        {
            id: 'tx4',
            amount: 75.00,
            currency: 'USD',
            timestamp: '2023-01-04T12:00:00Z',
            status: 'completed',
            fromUserId: 'user1', // John to Charlie (who shares phone)
            toUserId: 'user5',
            ipAddress: '192.168.1.1', // Same IP as tx1
            deviceId: 'device123' // Same device as tx1
        },
        {
            id: 'tx5',
            amount: 125.00,
            currency: 'USD',
            timestamp: '2023-01-05T12:00:00Z',
            status: 'completed',
            fromUserId: 'user2', // Jane to Eva
            toUserId: 'user6',
            ipAddress: '192.168.1.4',
            deviceId: 'device456' // Same device as tx2
        },
        {
            id: 'tx6',
            amount: 300.00,
            currency: 'USD',
            timestamp: '2023-01-06T12:00:00Z',
            status: 'completed',
            fromUserId: 'user6', // Eva to David
            toUserId: 'user7',
            ipAddress: '192.168.1.5',
            deviceId: 'device101'
        },
        {
            id: 'tx7',
            amount: 150.00,
            currency: 'USD',
            timestamp: '2023-01-07T12:00:00Z',
            status: 'completed',
            fromUserId: 'user4', // Alice to John
            toUserId: 'user1',
            ipAddress: '192.168.1.6',
            deviceId: 'device202'
        },
        {
            id: 'tx8',
            amount: 80.00,
            currency: 'USD',
            timestamp: '2023-01-08T12:00:00Z',
            status: 'completed',
            fromUserId: 'user7', // David to Bob
            toUserId: 'user3',
            ipAddress: '192.168.1.7',
            deviceId: 'device303'
        },
        {
            id: 'tx9',
            amount: 500.00,
            currency: 'USD',
            timestamp: '2023-01-09T12:00:00Z',
            status: 'completed',
            fromUserId: 'user5', // Charlie to Eva
            toUserId: 'user6',
            ipAddress: '192.168.1.1', // Same IP as tx1 and tx4
            deviceId: 'device123' // Same device as tx1 and tx4
        },
        {
            id: 'tx10',
            amount: 1000.00,
            currency: 'USD',
            timestamp: '2023-01-10T12:00:00Z',
            status: 'completed',
            fromUserId: 'user3', // Bob to Jane
            toUserId: 'user2',
            ipAddress: '192.168.1.3', // Same IP as tx3
            deviceId: 'device789' // Same device as tx3
        }
    ];

    for (const txData of sampleTransactions) {
        const transaction = await Transaction.createOrUpdate(txData);
        console.log(`Created transaction: ${transaction.id} (${txData.fromUserId} -> ${txData.toUserId})`);
    }
}

// Run the seeding function
seedDatabase();