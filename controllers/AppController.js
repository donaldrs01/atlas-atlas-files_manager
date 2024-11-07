// app controller
const db = require('../utils/db');
const redis = require('../utils/redis');

exports.getStatus = async (req, res) => {
    try {
        const dbAlive = await db.isAlive();
        const redisAlive = await redis.isAlive();

        res.status(200).json({
            redis: redisAlive,
            db: dbAlive
        });
    } catch (error) {
        console.error('error checking connections', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Could not verify redis or db connection.'
        });
    }
};

exports.getStats = async (req, res) => {
    try {
        const userCount = await db.nbUsers();
        const fileCount = await db.nbFiles();

        res.status(200).json({
            users: userCount,
            files: fileCount
        });
    } catch (error) {
        console.error('Error fetching data', error);
        res.status(500).json({
            error: 'Internal server error',
            message: 'Could not fetch data for users or files.'
        });
    }
}