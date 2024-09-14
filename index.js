const express = require('express');
const app = express();
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const fileRoutes = require('./routes/fileRoutes');
const depositRoutes = require('./routes/depositRoutes');
const accountRoutes = require('./routes/accountRoutes');
const datafiles=require('./routes/datafiles_route');

app.use(express.json());

// const routes= require('./routes/router')
// app.use(routes);

app.use('/', authRoutes);
app.use('/', paymentRoutes);
app.use('/', fileRoutes);
app.use('/', depositRoutes);
app.use('/', accountRoutes);
app.use('/', datafiles);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
