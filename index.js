require('dotenv').config();
const express = require('express');
const OAuthClient = require('intuit-oauth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
const port = 3000;

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir); // Use the uploads directory
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
    }
});

const upload = multer({ storage: storage });

const oauthClient = new OAuthClient({
    clientId: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    environment: process.env.ENVIRONMENT,
    redirectUri: process.env.REDIRECT_URL
});

app.get("/auth", (req, res) => {
    const authUrl = oauthClient.authorizeUri({
        scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
        state: 'Init'
    });
    res.redirect(authUrl);
});

app.get("/callback", async (req, res) => {
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

app.get("/payments", async (req, res) => {
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
        
        // Log response body to understand its structure
        console.log('Response Body:', response.body);

        // Check if the response body is already an object
        const data = typeof response.body === 'string' ? JSON.parse(response.body) : response.body;
        
        // Send JSON response
        res.json(data);

    } catch (error) {
        console.log("Error during API call:", error);
        res.status(500).send('Error during API call');
    }
});

app.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No file uploaded.');
        }

        console.log('File Uploaded:', req.file);

        // Parse the uploaded CSV file
        const results = [];
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                console.log('CSV Data:', results);

                // Here you can process the results, e.g., saving to database or further processing
                res.send('File uploaded and parsed successfully.');
            });
        
    } catch (error) {
        console.log('Error during file upload and parsing:', error);
        res.status(500).send('Error during file upload and parsing');
    }
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
