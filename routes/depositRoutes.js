const express = require('express');
const router = express.Router();
const depositController = require('../controllers/depositController');

router.post('/deposit', depositController.createDeposit);

module.exports = router;
