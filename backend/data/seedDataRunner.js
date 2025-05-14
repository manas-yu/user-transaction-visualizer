const seedDatabaseFn = require('./seedData');

async function runSeed() {
    try {
        await seedDatabaseFn();
    } catch (err) {
        console.error('Seeding failed:', err);
    }
}

module.exports = runSeed;
