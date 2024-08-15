require('dotenv').config();
const express = require('express');
const OAuthClient = require('intuit-oauth');

const app = express();
const port = 3000;

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


app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
