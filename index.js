require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());


// Import routes
const routes = require('./routes/router');

// Use routes
app.use(routes);



app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
