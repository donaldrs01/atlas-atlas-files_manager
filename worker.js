const fs = require('fs');
const path = require('path');
const thumbnail = require('image-thumbnail');
const { ObjectId } = require('mongodb');
const dbClient = require('./utils/db');
const Queue = require('bull');
const { error } = require('console');

// create bull queue
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
    const originalFilePath = file.localPath;
    const widths = [500, 250, 100];
    const thumbnailPromises = [];

    for (const width of widths) {
        const outputFilePath = path.join(
            path.dirname(originalFilePath),
            `${path.basename(originalFilePath, path.extname(originalFilePath))}_${width}${path.extname(originalFilePath)}`
        );
        const options = { width };

        const generateThumbnail = thumbnail(originalFilePath, options)
            .then((thumb) => {
                fs.writeFileSync(outputFilePath, thumb);
                return { width: outputFilePath };
            })
            .catch((err) => {
                console.error(`Error generating thumbnail for width ${width}:`, err);
            });
        thumbnailPromises.push(generateThumbnail);
    }
    await Promise.all(thumbnailPromises);
})

module.exports = { fileQueue };