const express = require('express');
const router = express.Router();
const qb_registrytab=require('../controllers/qb_registry tab controller')

// const paymentController = require('../controllers/paymentController');
// const datafiles_Controller = require('../controllers/datafiles_controller');
// const accountController = require('../controllers/accountController');
// const authController = require('../controllers/authController');
// const depositController = require('../controllers/depositController');
// const fileController = require('../controllers/fileController');
const multer = require('multer');


const upload = multer({ dest: 'uploads/' });

router.post('/upload', upload.single('file'), qb_registrytab.uploadFile);

router.get('/auth', qb_registrytab.auth);
router.get('/callback', qb_registrytab.callback);
router.get('/payments', qb_registrytab.getPayments);
router.post('/deposit', qb_registrytab.createDeposit);
router.get('/accounts', qb_registrytab.getAccounts);
router.post('/datafiles', qb_registrytab.datafiles);
router.post('/categories', qb_registrytab.getCategories);


module.exports = router;