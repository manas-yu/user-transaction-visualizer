import axios from 'axios';

const API_URL = 'http://localhost:3000';

// Create axios instance with base URL
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Add timeout to prevent hanging requests
    timeout: 10000,
});

// Add response interceptor for better error handling
api.interceptors.response.use(
    response => response,
    error => {
        if (error.response) {
            // Server responded with an error status
            console.error('API Error:', {
                status: error.response.status,
                data: error.response.data,
                url: error.config.url,
                method: error.config.method
            });
        } else if (error.request) {
            // Request was made but no response received
            console.error('API No Response:', {
                url: error.config.url,
                method: error.config.method
            });
        } else {
            console.error('API Request Error:', error.message);
        }
        return Promise.reject(error);
    }
);

// Users API
export const getUsers = async () => {
    try {
        const response = await api.get('/users');
        return response.data || [];
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
};

// Transactions API
export const getTransactions = async () => {
    try {
        const response = await api.get('/transactions');
        return response.data || [];
    } catch (error) {
        console.error('Error fetching transactions:', error);
        return [];
    }
};

// User Relationships API
export const getUserRelationships = async (userId) => {
    try {
        const response = await api.get(`/relationships/user/${userId}`);
        // Ensure the response has the correct structure
        const data = response.data || {};

        return {
            user: data.user || { id: userId },
            connectedUsers: Array.isArray(data.connectedUsers) ? data.connectedUsers : [],
            transactions: Array.isArray(data.transactions) ? data.transactions : [],
            directTransfers: Array.isArray(data.directTransfers) ? data.directTransfers : []
        };
    } catch (error) {
        console.error(`Error fetching relationships for user ${userId}:`, error);
        // Return a minimal valid structure instead of throwing
        return {
            user: { id: userId },
            connectedUsers: [],
            transactions: [],
            directTransfers: []
        };
    }
};

// Transaction Relationships API
export const getTransactionRelationships = async (transactionId) => {
    try {
        const response = await api.get(`/relationships/transaction/${transactionId}`);
        return response.data || { transaction: { id: transactionId }, users: [] };
    } catch (error) {
        console.error(`Error fetching relationships for transaction ${transactionId}:`, error);

        return { transaction: { id: transactionId }, users: [] };
    }
};

// Get Complete Graph Data with better error handling
export const getCompleteGraph = async () => {
    try {
        // Fetch all users and transactions
        const [users, transactions] = await Promise.all([
            getUsers(),
            getTransactions()
        ]);

        const validUsers = Array.isArray(users) ? users.filter(user => user && user.id) : [];
        const validTransactions = Array.isArray(transactions) ? transactions.filter(tx => tx && tx.id) : [];

        console.log(`Processing ${validUsers.length} users and ${validTransactions.length} transactions`);

        // Only fetch relationships for valid users with IDs
        const userRelationshipsPromises = validUsers.map(user => getUserRelationships(user.id));

        // Use Promise.allSettled to prevent one failed relationship from breaking everything
        const userRelationshipsResults = await Promise.allSettled(userRelationshipsPromises);

        // Process results, keeping only successful ones with proper structure
        const userRelationships = userRelationshipsResults
            .filter(result => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(relationship => relationship && relationship.user && relationship.user.id);

        console.log(`Successfully processed ${userRelationships.length} user relationships`);

        return {
            users: validUsers,
            transactions: validTransactions,
            userRelationships
        };
    } catch (error) {
        console.error('Error fetching complete graph data:', error);
        // Return minimum valid structure instead of throwing
        return {
            users: [],
            transactions: [],
            userRelationships: []
        };
    }
};

export default {
    getUsers,
    getTransactions,
    getUserRelationships,
    getTransactionRelationships,
    getCompleteGraph
};