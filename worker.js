const fs = require('fs');
const path = require('path');
const thumbnail = require('image-thumbnail');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const RedisClient = require('../utils/redis');
const mime = require('mime-types');
const Queue = require('bull');
const { error } = require('console');

const fileQueue = new Queue('fileQueue');

fileQueue.process(async (job) => {
    const { userId, fileId } = job.data;
    if (!userId) {
        throw new Error('Missing userId');
    }
    if (!fileId) {
        throw new Error('Missing fileId')
    }
    const file = await dbClient.getCollection('files').findOne(
        { _id: ObjectId(fileId), userId,}
    );
    if (!file) {
        throw new Error ('File not found');
    }
    const originalFilePath = file.path;
    const widths = [500, 250, 100];
})