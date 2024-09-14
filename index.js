const express = require('express');
const app = express();
require('dotenv').config();
const qb_registrytab=require('./routes/qb_registry tab');

app.use(express.json());

app.use('/', qb_registrytab);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
