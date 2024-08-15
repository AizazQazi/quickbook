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
    const parseRedirect = req.url;
    try {
        const authResponse = await oauthClient.createToken(parseRedirect);
        const realmId = oauthClient.getToken().realmId;
        console.log('Realm ID (Company ID):', realmId);
        res.redirect('/payments');
    } catch (error) {
        console.log('Error is ::', error);
        res.status(500).send('Error during OAuth process');
    }
});

app.get("/payments", async (req, res) => {
    try {
        const realmId = oauthClient.getToken().realmId;
        const response = await oauthClient.makeApiCall({
            url: `https://${process.env.ENVIRONMENT}-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=select * from Payment&minorversion=40`,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        res.json(JSON.parse(response.body));
        console.log('API Call Response:', response);

    } catch (error) {
        console.log("error is::", error);
        res.status(500).send('Error during API call');
    }
});

app.listen(port, () => {
    console.log(`Server is running on ${port}`);
});
