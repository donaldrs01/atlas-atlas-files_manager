const dbClient = require('../utils/db');
const RedisClient = require('../utils/redis');
const sha1 = require('sha1');
const { v4: uuidv4 } = require('uuid');

class AuthController {
    static async getConnect(req, res) {
        const authHeader = req.headers.authorization; // extract auth header from HTTP request
        if (!authHeader || !authHeader.startsWith('Basic')) { // checks for basic auth credentials
            return res.status(401).send({ error: 'Unauthorized' });
        }
        // Email/password extraction
        const base64Creds = authHeader.split(' ')[1]; // separate Auth header from b64-encoded creds
        // convert from b64 to readable ASCII string
        const creds = Buffer.from(base64Creds, 'base64').toString('ascii');
        // split incoming string into email / password
        const [email, password] = creds.split(':');

        if (!email || !password) {
            return res.status(401).send({ error: 'Unauthorized'});
        }
        // Check for hashed password
        const hashedPassword = sha1(password);
        // Check for user
        try {
            const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword});
            if (!user) {
                return res.status(401).send({ error: 'Unauthorized' });
            }
            // If user in DB, generate token
            const token = uuidv4();
            const tokenKey = `auth_${token}`;
            // Store token for 24 hours (86400 secs)
            await RedisClient.set(tokenKey, user._id.toString(), 86400);

            return res.status(200).send({ token });
        } catch (err) {
            console.error(err);
            return res.status(500).send({ error: 'Server error'})
        }
    }
    // function to disconnect (logout) user
    static async getDisconnect(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: Unauthorized });
        }
        const tokenKey = `auth_${x-token}`;
        const userId = await RedisClient.get(tokenKey);
        if (!userId) {
            return res.send(401).send({ error: 'Unauthorized' });
        }
        await RedisClient.del(tokenKey);
        return res.status(204).send();
        }
    }
    
module.exports = AuthController;