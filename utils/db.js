import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DBClient {
    constructor() {
        // Client creation using environmental variables stored in .env
        const uri = process.env.DB_URI;       
        // Initialize client
        this.client = new MongoClient(uri, { useUnifiedTopology: true});
        this.connected = false;
        this.db = null;

        // Connect to MongoDB
        this.client.connect()
        .then(() => {
            // Switch connection flag to 'true' when successfully connected
            this.connected = true;
            console.log('Successfully connected to MongoDB');

            // Allows this.db to reference DB as part of construction after successful connection
            this.db = this.client.db(process.env.DB_DATABASE);
        })
        .catch((err) => {
            console.error('Failure to connect to MongoDB', err);
            this.connected = false;
        });
    }

    // isAlive method to check status of MongoDB connection
    isAlive() {
        return this.connected
    }

    // nbUsers function
    async nbUsers() {
        try {
            const userCollection = this.db.collection("users");
            const docCount = await userCollection.countDocuments();
            return docCount;
        } catch (err) {
            console.error('Error fetching users collection count', err);
        }
    }

    // nbFiles function
    async nbFiles() {
        try {
            const filesCollection = this.db.collection('files');
            const docCount = await filesCollection.countDocuments();
            return docCount;
        } catch (err) {
            console.error('Error fetching files collection count', err);
        }
    }
}

// Create and export instance of dbClient
const dbClient = new DBClient();
module.exports = dbClient;
