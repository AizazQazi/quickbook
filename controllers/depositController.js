// const quickBooksService = require('../services/quickBooksService');

// exports.createDeposit = async (req, res) => {
//     try {
//         const { date, account, category, amount, memo, data_file } = req.body;
//         const token = oauthClient.getToken();
//         const realmId = token.realmId;

//         const depositPayload = quickBooksService.buildDepositPayload(date, account, category, amount, memo);
//         const response = await quickBooksService.createDeposit(realmId, depositPayload, token.access_token);

//         res.status(201).json({
//             message: 'Deposit created successfully',
//             deposit: response.data
//         });
//     } catch (error) {
//         console.error("Error creating deposit:", error);
//         res.status(500).send('Error during deposit creation');
//     }
// };
