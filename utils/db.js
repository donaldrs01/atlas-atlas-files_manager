import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DBClient {
    constructor() {
        
        // Client creation using environmental variables stored in .env
        const host = process.env.DB_HOST;
        const port = process.env.DB_PORT;
        const database = process.env.DB_DATABASE;
        // Use this to build the URI connection string
        const uri = `mongodb://${host}:${port}/${database}`;        
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
            this.db = this.client.db(database);
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

}