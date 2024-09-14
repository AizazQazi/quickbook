const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('../controllers/fileController');

const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), fileController.uploadFile);

module.exports = router;
