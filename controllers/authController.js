// const OAuthClient = require('intuit-oauth');

// // Initialize the OAuth client with environment variables
// const oauthClient = new OAuthClient({
//     clientId: process.env.CLIENT_ID,
//     clientSecret: process.env.CLIENT_SECRET,
//     environment: process.env.ENVIRONMENT,
//     redirectUri: process.env.REDIRECT_URL
// });

// // This function generates the authorization URL and redirects the user
// exports.auth = (req, res) => {
//     const authUrl = oauthClient.authorizeUri({
//         scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
//         state: 'Init'
//     });
//     res.redirect(authUrl);
// };

// // This function handles the OAuth callback and creates a token
// exports.callback = async (req, res) => {
//     try {
//         // Create a token using the authorization response from the callback URL
//         const authResponse = await oauthClient.createToken(req.url);
//         console.log('Auth Response:', authResponse);

//         // Get the token object
//         const token = oauthClient.getToken();
        
//         // Safely extract the token properties
//         const realmId = token.realmId || 'N/A';  // Get realmId or set 'N/A' if not present
//         const accessToken = token.access_token || 'N/A';  // Get access_token or set 'N/A'
//         const refreshToken = token.refresh_token || 'N/A';  // Get refresh_token or set 'N/A'
//         const expiresIn = token.expires_in || 'N/A';  // Get expires_in or set 'N/A'

//         // Send a JSON response with token details
//         res.json({
//             accessToken: accessToken,
//             refreshToken: refreshToken,
//             realmId: realmId,
//             expiresIn: expiresIn
//         });
//     } catch (error) {
//         console.error('Error during OAuth process:', error.message);
//         // Send an error response if token creation fails
//         res.status(500).send('Error during OAuth process');
//     }
// };
