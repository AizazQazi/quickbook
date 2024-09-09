const express = require('express');
const router = express.Router();
const OAuthClient = require('intuit-oauth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Use uploads directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage: storage });

// Initialize OAuth Client
const oauthClient = new OAuthClient({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    environment: process.env.ENVIRONMENT,
    redirectUri: process.env.REDIRECT_URL
});

// OAuth Authorization Route
router.get('/auth', (req, res) => {
    const authUrl = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: 'Init'
    });
    res.redirect(authUrl);
});

// OAuth Callback Route
router.get('/callback', async (req, res) => {
    try {
        const authResponse = await oauthClient.createToken(req.url);
        const realmId = oauthClient.getToken().realmId;
        console.log('Realm ID (Company ID):', realmId);
        res.redirect('/payments');
    } catch (error) {
        console.log('Error during OAuth process:', error);
        res.status(500).send('Error during OAuth process');
    }
});

// Payments Route
router.get('/payments', async (req, res) => {
    try {
        const token = oauthClient.getToken();
        const realmId = token.realmId;
        const response = await oauthClient.makeApiCall({
            url: `https://${process.env.ENVIRONMENT}-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=select * from Payment&minorversion=40`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.access_token}`
            }
        });

        console.log('Response Body:', response.body);

        const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        res.json(data);
    } catch (error) {
        console.log("Error during API call:", error);
        res.status(500).send('Error during API call');
    }
});

// File Upload Route
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        console.log('File Uploaded:', req.file);

        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                console.log('CSV Data:', results);
                res.send('File uploaded and parsed successfully.');
            });
        
    } catch (error) {
        console.log('Error during file upload and parsing:', error);
        res.status(500).send('Error during file upload and parsing');
    }
});


router.put('/deposit', async (req, res) => {
    console.log("Making deposit");
    console.log("Request body:", req.body);  // Add this line to debug

    try {
        const { date, account, category, amount, memo, data_file } = req.body;

        if (!date || !account || !category || !amount || !memo || !data_file) {
            throw new Error("Missing required fields");
        }

        // Retrieve OAuth token and realmId (company ID)
        const token = oauthClient.getToken();
        const realmId = token.realmId;

        const depositPayload = {
            "TxnDate": date,
            "DepositToAccountRef": {
                "value": account
            },
            "Line": [
                {
                    "Amount": amount,
                    "DetailType": "DepositLineDetail",
                    "DepositLineDetail": {
                        "AccountRef": {
                            "value": category
                        },
                        "Memo": memo
                    }
                }
            ]
        };

        const response = await oauthClient.makeApiCall({
            url: `https://${process.env.ENVIRONMENT}-quickbooks.api.intuit.com/v3/company/${realmId}/deposit`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token.access_token}`
            },
            body: JSON.stringify(depositPayload)
        });

        const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        res.status(201).json({
            message: 'Deposit created successfully',
            deposit: data
        });

    } catch (error) {
        console.error("Error during deposit creation:", error);
        res.status(500).send('Error during deposit creation');
    }
});



module.exports = router;
