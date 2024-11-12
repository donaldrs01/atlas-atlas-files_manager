const redis = require('redis')

class RedisClient {
    constructor() {
        // create client
        this.client = redis.createClient();
        // set connection flag to false initially
        this.connected = false;

        // if error connecting to client, log error and ensure connected flag = false
        this.client.on('error', err => {
            console.log(err);
            this.connected = false;
        });

        // if client connects successfully, set connected flag to true, otherwise false
        this.client.on('connect', () => {
            console.log('Connected to Redis');
            this.connected = true;
        });
    }
    // isAlive function returns value of connected flag to check status
    isAlive() {
        return this.connected;
    }

    // asynchronous function 'get' to retrieve value stored at given key
    async get(key) {
        if (this.isAlive()) {
            return new Promise((resolve, reject) => {
                this.client.get(key, (err, value) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(value);
                });
            });
        } else {
            return null;
        }
    }
    // asynchronous function 'set' to set a value at a certain key with given expiration time in seconds
    async set(key, value, duration) {
        if (this.isAlive()) {
            return new Promise((resolve, reject) => {
                this.client.set(key, value, 'EX', duration, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }
    // async function 'del' that takes key (str) as argument and removes the value from Redis
    async del(key) {
        if (this.isAlive()) {
            return new Promise((resolve, reject) => {
                this.client.del(key, (err) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve();
                });
            });
        }
    }
}

// Create and export instance of RedisClient
const redisClient = new RedisClient();
module.exports = redisClient;
