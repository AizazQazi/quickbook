const quickBooksService = require('../services/quickBooksService');

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
