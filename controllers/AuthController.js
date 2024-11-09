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
        const [email, password] = credentials.split(':');

        if (!email || !password) {
            return res.status(401).send({ error: 'Unauthorized'});
        }
        // Password hashing
    }
}