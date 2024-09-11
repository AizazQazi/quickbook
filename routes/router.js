const express = require('express');
const router = express.Router();
const OAuthClient = require('intuit-oauth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const axios = require('axios');


// the uploads directory must exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Using uploads directory
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
        // Get OAuth token after authorization
        const authResponse = await oauthClient.createToken(req.url);
        
        
        const token = oauthClient.getToken();

        if (!token) {
            throw new Error('Token is undefined');
        }

        const realmId = token.realmId || 'N/A'; // Use a fallback if realmId is not defined
        console.log('Realm ID (Company ID):', realmId);

        // Check if `expires_in` exists in the token
        const expiresIn = token.token && token.token.expires_in ? token.token.expires_in : 'N/A';

        // Send token and other relevant details to the frontend
        res.json({
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            realmId: realmId,
            expiresIn: expiresIn // Token expiry time (fallback to 'N/A' if missing)
        });

        //   res.redirect('/payments');
        //   res.redirect('/datafiles');

    } catch (error) {
        console.log('Error during OAuth process:', error.message);
        res.status(500).send('Error during OAuth process');
    }
});

// router.get('/callback', async (req, res) => {
//     try {
//         const authResponse = await oauthClient.createToken(req.url);
//         const realmId = oauthClient.getToken().realmId;
//         console.log('Realm ID (Company ID):', realmId);
//         // res.redirect('/payments');
//         res.redirect('/deposit');
//     } catch (error) {
//         console.log('Error during OAuth process:', error);
//         res.status(500).send('Error during OAuth process');
//     }
// });

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

// // for deposit
// router.put('/deposit', async (req, res) => {
//     console.log("Making deposit");
//     console.log("Request body:", req.body);  // Add this line to debug

//     try {
//         const { date, account, category, amount, memo, data_file } = req.body;

//         if (!date || !account || !category || !amount || !memo || !data_file) {
//             throw new Error("Missing required fields");
//         }

//         // Retrieve OAuth token and realmId (company ID)
//         const token = oauthClient.getToken();
//         const realmId = token.realmId;

//         const depositPayload = {
//             "TxnDate": date,
//             "DepositToAccountRef": {
//                 "value": account
//             },
//             "Line": [
//                 {
//                     "Amount": amount,
//                     "DetailType": "DepositLineDetail",
//                     "DepositLineDetail": {
//                         "AccountRef": {
//                             "value": category
//                         },
//                         "Memo": memo
//                     }
//                 }
//             ]
//         };

//         const response = await oauthClient.makeApiCall({
//             url: `https://${process.env.ENVIRONMENT}-quickbooks.api.intuit.com/v3/company/${realmId}/deposit`,
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${token.access_token}`
//             },
//             body: JSON.stringify(depositPayload)
//         });

//         const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
//         res.status(201).json({
//             message: 'Deposit created successfully',
//             deposit: data
//         });

//     } catch (error) {
//         console.error("Error during deposit creation:", error);
//         res.status(500).send('Error during deposit creation');
//     }
// });


// /deposit don't use just in case + testing endpoint
router.get('/deposit', async (req, res) => {
    console.log("Making deposit");

    // Sample data as provided
    const depositPayload = {
        "Line": [
            {
                "DetailType": "DepositLineDetail",
                "Amount": 20.0,
                "ProjectRef": {
                    "value": "42991284"
                },
                "DepositLineDetail": {
                    "AccountRef": {
                        "name": "Unapplied Cash Payment Income",
                        "value": "87"
                    }
                }
            }
        ],
        "DepositToAccountRef": {
            "name": "Checking",
            "value": "35"
        }
    };

    try {
        // Retrieve OAuth token and realmId (company ID)
        const token = await oauthClient.getToken();
        const realmId = token.realmId;

        // Determine environment base URL
        const baseURL = process.env.ENVIRONMENT === 'sandbox' 
            ? 'https://sandbox-quickbooks.api.intuit.com' 
            : 'https://quickbooks.api.intuit.com';

        // Make the API call to QuickBooks to create the deposit
        const response = await axios.post(
            `${baseURL}/v3/company/${realmId}/deposit?minorversion=73`,
            depositPayload,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token.access_token}`
                }
            }
        );

        // Check if the response is successful
        if (response.status !== 200 && response.status !== 201) {
            console.error(`QuickBooks API Error: ${response.status} - ${response.statusText}`);
            console.error(`Response Body: ${JSON.stringify(response.data)}`);
            return res.status(response.status).json({ error: `QuickBooks API Error: ${response.statusText}` });
        }

        // Respond with the result of the deposit creation
        res.status(201).json({
            message: 'Deposit created successfully',
            deposit: response.data
        });

    } catch (error) {
        console.error("Error during deposit creation:", error);
        res.status(500).json({ error: 'Error during deposit creation' });
    }
});


// Route to get QuickBooks data files

router.post('/datafiles', async (req, res) => {
    try {
        
        const accessToken = req.headers['authorization']?.split(' ')[1]; // Extract Bearer token
        const realmId = req.headers['realmid']; // Extract realmId from headers

        console.log("Access token is::", accessToken);
        console.log("Realm ID is::", realmId);

        if (!accessToken) {
            return res.status(400).json({ error: 'No access token provided' });
        }

        if (!realmId) {
            return res.status(400).json({ error: 'No realm ID provided' });
        }

        const baseURL = process.env.ENVIRONMENT === 'sandbox'
            ? 'https://sandbox-quickbooks.api.intuit.com'
            : 'https://quickbooks.api.intuit.com';

        const response = await axios.get(
            `${baseURL}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=40`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}` 
                }
            }
        );

        if (response.status !== 200) {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

        res.json({
            dataFiles: [response.data.CompanyInfo.CompanyName]
        });

    } catch (error) {
        console.error("Error fetching QuickBooks data files:", error.message || error);
        res.status(500).json({ error: `Error fetching QuickBooks data files: ${error.message || error}` });
    }
});

// router.get('/datafiles', ensureAuthenticated, async (req, res) => {
//     try {
//         // Retrieve OAuth token
//         const token = oauthClient.getToken();
//         const realmId = token.realmId;

//         // Check if realmId is available
//         if (!realmId) {
//             throw new Error('Realm ID is not available');
//         }

//         // Make API call to QuickBooks
//         const response = await oauthClient.makeApiCall({
//             url: `https://${process.env.ENVIRONMENT}-quickbooks.api.intuit.com/v3/company/${realmId}/companyinfo/${realmId}?minorversion=40`,
//             method: 'GET',
//             headers: {
//                 'Content-Type': 'application/json',
//                 'Authorization': `Bearer ${token.access_token}`
//             }
//         });

//         // Check for successful response
//         if (response.statusCode !== 200) {
//             throw new Error(`API Error: ${response.statusCode} - ${response.statusMessage}`);
//         }

//         // Parse response body
//         const companyData = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        
//         // Send response with company name
//         res.json({ dataFiles: [companyData.CompanyInfo.CompanyName] });

//     } catch (error) {
//         // Log error and send response
//         console.error("Error fetching QuickBooks data files:", error);
//         res.status(500).json({ error: `Error fetching QuickBooks data files: ${error.message}` });
//     }
// });

// datafiles endpoint

// router.post('/datafiles', async (req, res) => {
//     try {
        
//         const { accessToken, realmId } = req.body;
//         console.log("access token is::", accessToken)
//         console.log("id is::", realmId)
//         if (!accessToken) {
//             throw new Error('No access token provided');
//         }

//         if (!realmId) {
//             throw new Error('No realm ID provided');
//         }

//         const baseURL = process.env.ENVIRONMENT === 'sandbox'
//             ? 'https://sandbox-quickbooks.api.intuit.com'
//             : 'https://quickbooks.api.intuit.com';

//         const response = await axios.get(
//             `${baseURL}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=40`,
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${accessToken}`
//                 }
//             }
//         );

//         if (response.status !== 200) {
//             throw new Error(`API Error: ${response.status} - ${response.statusText}`);
//         }

//         res.json({
//             dataFiles: [response.data.CompanyInfo.CompanyName]
//         });

//     } catch (error) {
//         console.error("Error fetching QuickBooks data files:", error.message || error);
//         res.status(500).json({ error: `Error fetching QuickBooks data files: ${error.message || error}` });
//     }
// });

// Dummy Test Endpoint for datafiles


// Dummy Test Endpoint fo accounts

// router.get('/accounts', async (req, res) => {
//     const { dataFile } = req.query; // Get the selected data file from query parameters

//     if (!dataFile) {
//         return res.status(400).json({ error: 'Data file is required' });
//     }

//     try {
//         // Retrieve OAuth token and realmId (company ID)
//         const token = await oauthClient.getToken();
//         const realmId = token.realmId;

//         // Make the API call to QuickBooks to get all accounts for the selected data file
//         const response = await axios.get(
//             `https://${process.env.ENVIRONMENT}-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Account&minorversion=65`,
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token.access_token}`
//                 }
//             }
//         );

//         const accounts = response.data.QueryResponse.Account || [];

//         // Filter accounts to only include Bank and Credit Card accounts
//         const filteredAccounts = accounts.filter(account =>
//             account.AccountType === 'Bank' || account.AccountType === 'Credit Card'
//         );

//         // Respond with the filtered accounts
//         res.status(200).json({
//             accounts: filteredAccounts.map(account => ({
//                 name: account.Name,
//                 id: account.Id
//             }))
//         });

//     } catch (error) {
//         console.error("Error fetching accounts:", error);
//         res.status(500).json({ error: 'Error fetching accounts' });
//     }
// });

router.get('/accounts', async (req, res) => {
    const { dataFile } = req.query; 
    const authHeader = req.headers['authorization'];
    const realmId=req.headers['realmid']


    console.log("token received is::", authHeader)

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Invalid or missing token' });
    }

    const token = authHeader.split(' ')[1]; 
    console.log("token after split is::", token)
    if (!dataFile) {
        return res.status(400).json({ error: 'Data file is required' });
    }

    
    try {
       
        const response = await axios.get(
            `https://${process.env.ENVIRONMENT}-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Account&minorversion=65`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            }
        );

        const accounts = response.data.QueryResponse.Account || [];

        // Filter accounts to only include Bank and Credit Card accounts
        const filteredAccounts = accounts.filter(account =>
            account.AccountType === 'Bank' || account.AccountType === 'Credit Card'
        );

        res.status(200).json({
            accounts: filteredAccounts.map(account => ({
                name: account.Name,
                id: account.Id
            }))
        });

    } catch (error) {
        console.error("Error fetching accounts:", error);

        // Checking for specific error response from QuickBooks API
        if (error.response) {
            const { status, statusText, data } = error.response;
            return res.status(status).json({ error: statusText, details: data });
        }

        res.status(500).json({ error: 'Error fetching accounts' });
    }
});

// for categories dropdown
router.post('/categories', async (req, res) => {
    
    const accessToken = req.headers['authorization']?.split(' ')[1]; // Extract Bearer token
    const realmId = req.headers['realmid']; // Extract realmId from headers
    const dataFiles = req.body.dataFiles; // Still receive dataFiles from body if needed

    console.log("Token is::", accessToken);
    console.log("RealmId is::", realmId);
    console.log("Data file is::", dataFiles);

    
    if (!accessToken) {
        return res.status(400).json({ error: 'Token is required' });
    }
    if (!realmId) {
        return res.status(400).json({ error: 'Realm ID is required' });
    }
    if (!dataFiles) {
        return res.status(400).json({ error: 'Data file is required' });
    }

    try {
        // Make the API call to QuickBooks to get all accounts for the selected data file
        const response = await axios.get(
            `https://${process.env.ENVIRONMENT}-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=SELECT * FROM Account&minorversion=65`,
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}` // Use token from headers
                }
            }
        );

        const accounts = response.data.QueryResponse.Account || [];

        // Filter accounts to only include Expense and Income accounts
        const filteredCategories = accounts.filter(account =>
            ['Expense', 'Income'].includes(account.AccountType)
        );

        // Map the filtered accounts to include name, id, and account type
        const categories = filteredCategories.map(account => ({
            name: account.Name,
            id: account.Id,
            type: account.AccountType
        }));

        
        res.status(200).json({ categories });

    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: 'Error fetching categories' });
    }
});




// function ensureAuthenticated(req, res, next) {
//     try {
//         const token = oauthClient.getToken();
//         if (!token) {
//             return res.status(401).json({ error: 'Not authenticated. Please log in through /auth.' });
//         }

//         if (token.isExpired()) {
//             // Refresh token logic if token is expired
//             oauthClient.refresh()
//                 .then(authResponse => {
//                     console.log('Token refreshed successfully.');
//                     next(); // Proceed after refreshing token
//                 })
//                 .catch(error => {
//                     console.error('Token refresh failed:', error);
//                     return res.status(401).json({ error: 'Failed to refresh token. Please log in through /auth.' });
//                 });
//         } else {
//             next();
//         }
//     } catch (error) {
//         return res.status(500).json({ error: `Error checking authentication: ${error.message}` });
//     }
// }



module.exports = router;
