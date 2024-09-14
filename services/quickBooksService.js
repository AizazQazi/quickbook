const axios = require('axios');

exports.getPayments = async (realmId, accessToken) => {
    const baseUrl = process.env.ENVIRONMENT === 'sandbox'
        ? 'https://sandbox-quickbooks.api.intuit.com'
        : 'https://quickbooks.api.intuit.com';

    const response = await axios.get(`${baseUrl}/v3/company/${realmId}/query?query=select * from Payment&minorversion=40`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    return response.data;
};

exports.buildDepositPayload = (date, account, category, amount, memo) => {
    return {
        TxnDate: date,
        DepositToAccountRef: {
            value: account
        },
        Line: [
            {
                Amount: amount,
                DetailType: 'DepositLineDetail',
                DepositLineDetail: {
                    AccountRef: {
                        value: category
                    },
                    Memo: memo
                }
            }
        ]
    };
};

exports.createDeposit = async (realmId, depositPayload, accessToken) => {
    const baseUrl = process.env.ENVIRONMENT === 'sandbox'
        ? 'https://sandbox-quickbooks.api.intuit.com'
        : 'https://quickbooks.api.intuit.com';

    const response = await axios.post(`${baseUrl}/v3/company/${realmId}/deposit?minorversion=73`, depositPayload, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    return response;
};

exports.getAccounts = async (realmId, accessToken) => {
    const baseUrl = process.env.ENVIRONMENT === 'sandbox'
        ? 'https://sandbox-quickbooks.api.intuit.com'
        : 'https://quickbooks.api.intuit.com';

    const response = await axios.get(`${baseUrl}/v3/company/${realmId}/query?query=SELECT * FROM Account&minorversion=65`, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });

    const accounts = response.data.QueryResponse.Account || [];
    return accounts.filter(account => account.AccountType === 'Bank' || account.AccountType === 'Credit Card');
};
