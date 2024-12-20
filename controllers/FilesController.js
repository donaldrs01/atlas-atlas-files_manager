const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongodb');
const dbClient = require('../utils/db');
const RedisClient = require('../utils/redis');
const mime = require('mime-types');
const Queue = require('bull');
const { fileQueue } = require('../worker');

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
            console.log('file inserted', result);
            if (type === 'image') {
                await fileQueue.add({ userId, fileId: result.insertedId });
            }
            return res.status(201).send({ id: result.insertedId, ...newFile});
        } catch (err) {
            console.error('Error inserting file into database', err);
            return res.status(500).send({ error: 'Server error' });
        }
    }

    // handles logic of GET '/files/:id' endpoint
    static async getShow(req, res) {
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
    // handles logic for GET '/files' with certain parentID and using pagination
    static async getIndex(req, res) {
        const token = req.headers['x-token'];
        // Retrieve ID from X-Token
        const userId = await RedisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).send({ error: 'Unauthorized' });
        }
        // store parent id and page from query with default values
        const { parentId = '0', page = 0 } = req.query;
        let parentQuery;

        if (parentId === '0') {
            parentQuery = { parentId: 0 };
        } else if (ObjectId.isValid(parentId)) {
            parentQuery = { parentId: parentId };
        } else {
            return res.status(400).send({ error: 'Invalid parentId' });
        }

        const pageNumber = parseInt(page, 10);
        try {
            // 
            const filesCollection = dbClient.getCollection('files');
            const offset = pageNumber * 20;

            // aggregate filesCollection using pagination and store in files
            const files = await filesCollection
                .find(parentQuery)
                .skip(offset)
                .limit(20)
                .toArray();
            // return list of files
            return res.status(200).send(files);
        } catch (err) {
            console.error('Error fetching files', err);
            return res.status(500).send({ error: 'Server error' });
        }
    }

    static async putPublish(req, res) {
        const token = req.headers['x-token'];
        // Retrieve ID from X-Token
        const userId = await RedisClient.get(`auth_${token}`);
        if (!userId) {
            return res.status(401).send({ error: 'Unauthorized' });
        }
        const { id: fileId } = req.params;
        try {
            // Find file by ID
            const file = await dbClient.getCollection('files').findOne({ _id: ObjectId(fileId) });
            if (!file) {
                return res.status(404).send({ error: 'Not Found'});
            }
            // Verify ownership
            if (file.userId !== userId) {
                return res.status(403).send({ error: "User doesn't have access to file"});
            }
            // When file verified, set isPublic to true
            await dbClient.getCollection('files').updateOne(
                { _id: ObjectId(fileId) },
                { $set: { isPublic: true } }
            );
            // Return updated file
            const updatedFile = await dbClient.getCollection('files').findOne({ _id: ObjectId(fileId) });
            return res.status(200).send(updatedFile);
        } catch (err) {
            console.error('Error updating file', err);
            return res.status(500).send({ error: 'Server error while updating file'});
        }
    }

    static async putUnpublish(req, res) {
        const token = req.headers['x-token'];
        const userId = await RedisClient.get(`auth_${token}`);

        if (!userId) {
            return res.status(401).send({ error: 'Unauthorized' });
        }
        const { id: fileId } = req.params;

        try {
            const file = await dbClient.getCollection('files').findOne({ _id: ObjectId(fileId) });
            if (!file) {
                return res.status(404).send({ error: 'Not found' });
            }
            if (file.userId !== userId) {
                return res.status(403).send({ error: "User doesn't have access to file"});
            }
            // Update isPublic to false
            await dbClient.getCollection('files').updateOne(
                { _id: ObjectId(fileId) },
                { $set: { isPublic: false } }
            );
            const updatedFile = await dbClient.getCollection('files').findOne({ _id: ObjectId(fileId) });
            return res.status(200).send(updatedFile);
        } catch (err) {
            console.error('Error updating file', err);
            return res.status(500).send({ error: 'Server error' });
        }
    }

    static async getFile(req, res) {
        const { id: fileId, size } = req.params;
        const token = req.headers['x-token'];
        const userId = await RedisClient.get(`auth_${token}`);
        // Find the file by its fileId
        const file = await dbClient.getCollection('files').findOne({_id: new ObjectId(fileId) });
        if (!file) { // No file linked to ID
            return res.status(404).send({ error: 'Not found' });
        }
        // Debug log
        console.log("File found:", file);
        // if size is passed as parameter, extract and create file path
        // using extracted directory name, file id, size, and original path ext name
        if (size) {
            filePath = path.join(path.dirname(file.localPath), `${fileId}_${size}${path.extname(file.localPath)}`);
        }
        // Authorization check: file is public OR user is owner of the file
        if (!file.isPublic && (!userId || file.userId !== userId)) {
            return res.status(404).send({ error: 'Not found'} );
        }
        // Check if file is a folder
        if (file.type === 'folder') {
            return res.status(400).send({ error: "A folder doesn't have content" });
        }
        // Check for local path storage
        const correctedPath = path.normalize(file.localPath);
        // Debug log
        console.log("Checking local file exists at path:", correctedPath);
        if (!fs.existsSync(correctedPath)) {
            console.log("File does not exist locally at path:", correctedPath);
            return res.status(404).send({ error: 'Not found' });
        }
        // Get MIME type and set it as content-type in res.header
        const mimeType = mime.lookup(file.name);
        res.setHeader('Content-Type', mimeType);
        // Return file content
        try {
            const fileContent = fs.readFileSync(correctedPath);
            return res.status(200).send(fileContent);
        } catch (err) {
            console.error('Error reading file', err);
            return res.status(400).send({ error: 'Server error' });
        }
    }
}

module.exports = FilesController;

// 57ec20ed-b688-4ebd-906c-2783b9e86a7b
// file id 6733ac065c1c972761ba2507
// 
// curl -XGET 0.0.0.0:5000/files/6735420ded27e4be8fd04f2b/data -so new_image.png ; file new_image.png
// curl -XGET 0.0.0.0:5000/files/6735420ded27e4be8fd04f2b/data?size=250 -so new_image.png ; file new_image.png
// curl -X POST http://0.0.0.0:5000/files -H "X-Token: 57ec20ed-b688-4ebd-906c-2783b9e86a7b" -H "Content-Type: application/json" -d '{"name": "new_image.png", "type": "file", "data": "'$(base64 -w 0 new_image.png)'"}'
// python3 image_upload.py new_image.png 57ec20ed-b688-4ebd-906c-2783b9e86a7b 6733ac065c1c972761ba2507
// curl -XPUT 0.0.0.0:5000/files/6735420ded27e4be8fd04f2b/publish -H "X-Token: 57ec20ed-b688-4ebd-906c-2783b9e86a7b" ; echo ""