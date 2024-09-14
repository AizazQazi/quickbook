const quickBooksService = require('../services/quickBooksService');

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
