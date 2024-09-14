const axios = require('axios');
const quickBooksService = require('../services/quickBooksService');

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