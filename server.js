//
require('dotenv').config(); // Load environmental variables

const express = require('express');
const routes = require('./routes/index');

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json()); // allows for JSON parsing 
app.use('/', routes);
app.listen(port, () => {
    console.log('server is running');
});