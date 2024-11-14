The files manager project is a culmination of several of the core concepts of our fourth trimsester at Atlas. It creates an API that handles the uploading, saving and retrieval of different file types. It then handles connections to both Redis, which handles user session and authentication data in-memory for quick access, and MongoDB as our database for file storage. The final product is a secure and persistent file management system.

Our tech stack for this project includes:  
Node.js  
Express  
MongoDB  
Redis  
JavaScript  

We used a routing system to organize our different endpoints and associate them with different controllers.

For user authentication, we set up a /connect and /disconnect endpoint. After extracting user info, our application uses SHA1 password hashing to authorize the user for DB access. Once granted access, they are generated a token which has a 24-hour lifespan and are allowed user access to our file management system.

Once connected to the MongoDB, users have access to set a file operation endpoints which allow for the uploading, retrieval and listing of various files.
**Upload Files**
To upload files, utilize the /files/upload endpoint. The metadata will be stored in MongoDB and a unique fileID is created for the file.
**Retrieve Files**
For file retrieval, utilize the /files/:id endpoint, where 'id' references the unique file ID. This endpoint will retrieve the metadata of the file along with any file content.
**Listing Files**
To list all files, utilize the /files endpoint. For larger datasets, our application uses pagination as it returns the appropriate data.

For further security, the /files/:id/publish and /files/:id/unpublish endpoints can be used by authenticated users to make certain files publicly accessible or to make them private again. 
