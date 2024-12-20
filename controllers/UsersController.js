const sha1 = require('sha1');
const dbClient = require('../utils/db');
const { ObjectId } = require('mongodb');
const RedisClient = require('../utils/redis');

class UsersController {
    static async postNew(req, res) {
        const email = req.body.email;
        const password = req.body.password;

        // Email and password verification logic
        if (!email) {
            return res.status(400).json({ error: "Missing email" });

        }

        if (!password) {
            return res.status(400).json({ error: "Missing password" });
        }

        // Checking if email already exists in DB
        try {
            const usersCollection = dbClient.getCollection('users');
            const emailExists = await usersCollection.findOne({email});
            if (emailExists) {
                return res.status(400).json({ error: "Already exists" });
            }
            // If password unique...
            // Hash password using SHA1
            const hashedPassword = sha1(password);
            // Create new user with email/password
            const newUser = {
                email: email,
                password: hashedPassword,
            }
            const userCreation = await usersCollection.insertOne(newUser);
            // Return newUser credentials (email and auto-generated ID)
            return res.status(201).json({ id: userCreation.insertedId, email });
        } catch (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: "Server error" });
        }
    }
    static async getMe(req, res) {
        const token = req.headers['x-token'];
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const tokenKey = `auth_${token}`;
        const userId = await RedisClient.get(tokenKey);
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const userInfo = await dbClient.getCollection('users').findOne({ _id: ObjectId(userId) });
        if (!userInfo) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.status(200).json({ email: userInfo.email, id: userInfo._id });
    }
}

module.exports = UsersController;