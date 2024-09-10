const express = require('express');
const router = express.Router();
const OAuthClient = require('intuit-oauth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const axios = require('axios');


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
        // Get OAuth token after authorization
        const authResponse = await oauthClient.createToken(req.url);
        
        // Get the token from oauthClient
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

// dummy route
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


// Route to get QuickBooks data files (or realms in case of QuickBooks Online)
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

router.post('/datafiles', async (req, res) => {
    try {
        // Extract token and realmId from the request body
        const { accessToken, realmId } = req.body;
        console.log("access token is::", accessToken)
        console.log("id is::", realmId)
        if (!accessToken) {
            throw new Error('No access token provided');
        }

        if (!realmId) {
            throw new Error('No realm ID provided');
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



// Dummy Test Endpoint for datafiles
// router.get('/datafiles', async (req, res) => {
//     try {
//         // Token and realmId from your provided data
//         const token = {
            // access_token: "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..CWLLNTnkMy7Uw5b9S5c5rA.6zkU8f69h61Fpv0aXvS4kMJtbgYDCiLB7qT4Dw-bWqbZHYUzPo9X3DBh9NdngSwqaJzjLq_NCfIScCfTrfLIXPyPcMq_blP9Efkl-bWq7eDDrHrCRmuUIQTHmK10XfbJKoGJb8BH_Icu6sBeo1N8HICh60r_DodlF_8wkZ-gZLfnjabBfIuh1uO94_447RcickupwiPOPd5i8JjUHdbHWF8w4UFeh3S6g_4zV2dfIOPjLlj5aWpt5VzPjG6GYlVH27yjO5JXd52C5QBH27t8a1hXd0oJEYuVO9S1TalnEJrDsmpnoFvCbxZwilYP6qYTMWWwlDlbIGQ3dGRqZQ9Ybb5lm2hdfuyxcTkpCKh4oMAnhchs9iW3KflUSX6ERhITZkPjYYk8WI2amOunKcpu16Gx2P4zLJ1UUO968gDHRFmKeaZHmmTmQhY75qwnYFmdZWG3J02EUYJU_q4YcMxyY5XyYlKLRVc2uJXq1MIkpov8TsHcCvdZMw-1e64QDRvkQMV-7SHCZq2PEumcMGeWFc0TDiYEbqBbwQARe7yffrq6WTWolRKcsCuSHyfLSY6zh0ww0hNXI6w0Le8vKKTppnfx7tLlndPRfvAsTvzqcnz1szAmpH6kq1yuIK_nzJqzpfLbCP-nZiAq6c-mY65g6isQ3GiO72lgLgk7E4YKSc_7slffrFMHekb77f5uW48IUeqXj8jEIE25UWEFsTFtO-9O_S_gD6ZGbkMvoyf7aHpItoFA70jwpg2B5x0wLR6OWBL1Ng5cS3ZYyh7SP7ltC42gySqq6lYNXTAFzjnQmMs1WHz_PCnjslxvQT50yJody02z1VnKZoBApNOjYCNN8Q.c_d3eaIdG3HfAQCbTjviog",
            // realmId: "9341452907407238"
//         };

//         if (!token.access_token) {
//             throw new Error('No access token available');
//         }

//         const realmId = token.realmId;
//         if (!realmId) {
//             throw new Error('No realm ID available');
//         }

//         const baseURL = process.env.ENVIRONMENT === 'sandbox'
//             ? 'https://sandbox-quickbooks.api.intuit.com'
//             : 'https://quickbooks.api.intuit.com';

//         const response = await axios.get(
//             `${baseURL}/v3/company/${realmId}/companyinfo/${realmId}?minorversion=40`,
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${token.access_token}`
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


// Middleware to check if token exists and is valid


function ensureAuthenticated(req, res, next) {
    try {
        const token = oauthClient.getToken();
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated. Please log in through /auth.' });
        }

        if (token.isExpired()) {
            // Refresh token logic if token is expired
            oauthClient.refresh()
                .then(authResponse => {
                    console.log('Token refreshed successfully.');
                    next(); // Proceed after refreshing token
                })
                .catch(error => {
                    console.error('Token refresh failed:', error);
                    return res.status(401).json({ error: 'Failed to refresh token. Please log in through /auth.' });
                });
        } else {
            next();
        }
    } catch (error) {
        return res.status(500).json({ error: `Error checking authentication: ${error.message}` });
    }
}


function ensureAuthenticated(req, res, next) {
    try {
        const token = oauthClient.getToken();
        if (!token) {
            return res.status(401).json({ error: 'Not authenticated. Please log in through /auth.' });
        }

        if (token.isExpired()) {
            // Refresh token logic if token is expired
            oauthClient.refresh()
                .then(authResponse => {
                    console.log('Token refreshed successfully.');
                    next(); // Proceed after refreshing token
                })
                .catch(error => {
                    console.error('Token refresh failed:', error);
                    return res.status(401).json({ error: 'Failed to refresh token. Please log in through /auth.' });
                });
        } else {
            next();
        }
    } catch (error) {
        return res.status(500).json({ error: 'Error checking authentication' });
    }
}


module.exports = router;
