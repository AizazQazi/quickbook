const quickBooksService = require('../services/quickBooksService');
const OAuthClient = require('intuit-oauth');
const axios = require('axios');
const fs = require('fs');
const csv = require('csv-parser');


// Initialize the OAuth client with environment variables
const oauthClient = new OAuthClient({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    environment: process.env.ENVIRONMENT,
    redirectUri: process.env.REDIRECT_URL
});

// This function generates the authorization URL and redirects the user
exports.auth = (req, res) => {
    const authUrl = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: 'Init'
    });
    res.redirect(authUrl);
};

// This function handles the OAuth callback and creates a token
exports.callback = async (req, res) => {
    try {
        // Create a token using the authorization response from the callback URL
        const authResponse = await oauthClient.createToken(req.url);
        console.log('Auth Response:', authResponse);

        // Get the token object
        const token = oauthClient.getToken();
        
        // Safely extract the token properties
        const realmId = token.realmId || 'N/A';  // Get realmId or set 'N/A' if not present
        const accessToken = token.access_token || 'N/A';  // Get access_token or set 'N/A'
        const refreshToken = token.refresh_token || 'N/A';  // Get refresh_token or set 'N/A'
        const expiresIn = token.expires_in || 'N/A';  // Get expires_in or set 'N/A'

        // Send a JSON response with token details
        res.json({
            accessToken: accessToken,
            refreshToken: refreshToken,
            realmId: realmId,
            expiresIn: expiresIn
        });
    } catch (error) {
        console.error('Error during OAuth process:', error.message);
        // Send an error response if token creation fails
        res.status(500).send('Error during OAuth process');
    }
};

exports.datafiles = async (req, res) => {
    try {
        const accessToken = req.headers['authorization']?.split(' ')[1];
        const realmId = req.headers['realmid'];

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

        if (response.status === 200) {
            res.json({
                dataFiles: [response.data.CompanyInfo.CompanyName]
            });
        } else {
            throw new Error(`API Error: ${response.status} - ${response.statusText}`);
        }

    } catch (error) {
        console.error("Error fetching QuickBooks data files:", error.response?.data || error.message || error);
        res.status(500).json({ error: `Error fetching QuickBooks data files: ${error.response?.data?.fault?.error[0]?.message || error.message || error}` });
    }
};

// for Accounts
exports.getAccounts = async (req, res) => {
    const { dataFile } = req.query;
    const accessToken = req.headers['authorization']?.split(' ')[1];
    const realmId = req.headers['realmid'];

    if (!accessToken || !realmId) {
        return res.status(400).json({ error: 'Token and realm ID are required' });
    }

    try {
        const accounts = await quickBooksService.getAccounts(realmId, accessToken, dataFile);
        res.json(accounts);
    } catch (error) {
        console.error("Error fetching accounts:", error);
        res.status(500).send('Error fetching accounts');
    }
};

// For deposit
exports.createDeposit = async (req, res) => {
    try {
        const { date, account, category, amount, memo, data_file } = req.body;
        const token = oauthClient.getToken();
        const realmId = token.realmId;

        const depositPayload = quickBooksService.buildDepositPayload(date, account, category, amount, memo);
        const response = await quickBooksService.createDeposit(realmId, depositPayload, token.access_token);

        res.status(201).json({
            message: 'Deposit created successfully',
            deposit: response.data
        });
    } catch (error) {
        console.error("Error creating deposit:", error);
        res.status(500).send('Error during deposit creation');
    }
};

exports.uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const results = [];
    fs.createReadStream(req.file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', () => {
            console.log('CSV Data:', results);
            res.send('File uploaded and parsed successfully.');
        });
};

//  for payments
exports.getPayments = async (req, res) => {
    try {
        const token = oauthClient.getToken();
        const realmId = token.realmId;
        const response = await quickBooksService.getPayments(realmId, token.access_token);

        res.json(response);
    } catch (error) {
        console.error("Error fetching payments:", error);
        res.status(500).send('Error fetching payments');
    }
};

// for categories
exports.getCategories= async(req,res)=>{
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

    } 
    catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ error: 'Error fetching categories' });
    }
}