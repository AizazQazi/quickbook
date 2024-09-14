const express = require('express');
const router = express.Router();
const datafiles_Controller = require('../controllers/datafiles_controller');

router.post('/datafiles', datafiles_Controller.datafiles);

module.exports = router;
