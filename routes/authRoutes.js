const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.get('/auth', authController.auth);
router.get('/callback', authController.callback);

module.exports = router;
