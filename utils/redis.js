import { createClient } from "redis";

class RedisClient {
    constructor() {
        // create client
        this.client = createClient();
        // set connection flag to false initially
        this.connected = false;

        // if error connecting to client, log error and ensure connected flag = false
        this.client.on('error', err => {
            console.log(err);
            this.connected = false;
        });

        // if client connects successfully, set connected flag to true, otherwise false
        this.client.connect()
            .then(() => {
                console.log('Connected to Redis');
                this.connected = true;
            })
            .catch((err) => {
                console.error('Failed to connect to redis');
                this.connected = false;
            })
    }
    // isAlive function returns value of connected flag to check status
    isAlive() {
        return this.connected;
    }

    // asynchronous function 'get' to retrieve value stored at given key
    async get(key) {
        if (this.isAlive()) {
            try {
                const value = await this.client.get(key);
                return value;
            } catch (err) {
                return null;
            }
        } else {
            return null;
        }
    }
    // asynchronous function 'set' to set a value at a certain key with given expiration time in seconds
    async set(key, value, duration) {
        if (this.isAlive()) {
            try {
                await this.client.set(key, value, { EX: duration });
            } catch (err) {
                console.error(`Error setting key "${key}"`, err);
            }
        }
    }
    // async function 'del' that takes key (str) as argument and removes the value from Redis
    async del(key) {
        if (this.isAlive()) {
            try {
                await this.client.del(key);
            } catch (err) {
                console.error(`Error deleting key "${key}"`, err);
            }
        }
    }
}

// Create and export instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;

