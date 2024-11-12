const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const RedisClient = require('../utils/redis');

class FilesController {
    // Handles logic of POST /files endpoint
    static async postUpload(req, res) {
        // Retrieve ID from X-Token
        const token = req.headers['x-token'];
        const userId = await RedisClient.get(`auth_${token}`);
        // Check for user authentication
        if (!userId) {
            return res.status(401).send({ error: 'Unauthorized' });
        }
        // Extract different parts of file from request body
        const { name, type, parentId = 0, isPublic = false, data } = req.body;
        // File part validation
        if (!name) { // Missing name
            return res.status(400).send({ error: "Missing name" });
        }
        if (!['folder', 'file', 'image'].includes(type)) { // Missing or incompatible type
            return res.status(400).send({ error: "Missing type" });
        }
        if (!data && type !== 'folder') { // Missing data in non-folder
            return res.status(400).send({ error: "Missing data" });
        }
        // Validation checks for when parentID is set (not default value of 0 in root directory)
        // Makes sure that parentID provided refers to a folder, not a file
        let parentFile = null; // holds parent file retrieved from DB
        if (parentId !== 0) { // User placed file in directory other than root
            // Fetch file with _id that matches parentId in 'files' collection
            parentFile = await dbClient.getCollection('files').findOne({ _id: ObjectId(parentId) });
            if (!parentFile) {
                return res.status(400).send({ error: 'Parent not found' });
            }
            if (parentFile.type !== 'folder') {
                return res.status(400).send({ error: "Parent is not a folder" });
            }
        }
        const newFile = {
            userId,
            name,
            type,
            isPublic,
            parentId,
        };
        // If type is folder, add newFile into DB and return newFile with ID and all properties
        if (type === 'folder') {
            const result = await dbClient.getCollection('files').insertOne(newFile);
            // Spread operator allows all properties of result to be included in response
            return res.status(201).send({ id: result.insertedId, ...newFile })
        }
        // Define local storage path based on env variable OR default location
        const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
        // If folder specified by path doesn't exist, create it
        if (!fs.existsSync(folderPath)) {
            // Recursive setting allows for automatic creation of all parent folders leading to subfolder if they don't exist
            fs.mkdirSync(folderPath, { recursive: true }); 
        }
        // Create unique local path and store file here
        const localPath = path.join(folderPath, uuidv4());
        try {
            await fs.promises.writeFile(localPath, Buffer.from(data, 'base64'));
        } catch (err) {
            console.error('Error storing file', err);
            return res.status(500).send({ error: 'Storage error' });
        }
        // For files and images, add localPath attribute to the document
        newFile.localPath = localPath;
        // Insert the newFile into the 'files' collection of DB
        try {
            const result = await dbClient.getCollection('files').insertOne(newFile);
            return res.status(201).send({ id: result.insertedId, ...newFile});
        } catch (err) {
            console.error('Error inserting file into database', err);
            return res.status(500).send({ error: 'Server error' });
        }
    }
    static async getShow(req, res) {
        // handles logic of GET '/files/:id' endpoint
        const token = req.headers['x-token'];
        // Retrieve ID from X-Token
        const userId = await RedisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).send({ error: 'Unauthorized' });
        }
        // retrieve fileID from parameters
        const { id: fileId } = req.params
        // retrieve file from collection using fileId matching with _id
        const file = await dbClient.getCollection('files').findOne({ _id: ObjectId(fileId) });
        // if no file or if file user id doesn't match given id, return error
        if (!file) {
            return res.status(404).send({ error: 'Not found' });
        }
        if (file.userId !== userId) {
            return res.status(404).send({ error: 'Not found' });
        }
        // return found file
        return res.status(200).send(file);
    }


}

module.exports = FilesController;