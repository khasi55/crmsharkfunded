const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'accounts_verified.json');
const rawData = fs.readFileSync(filePath, 'utf8');
const data = JSON.parse(rawData);

const accounts = data.accounts || data; // Handle both wrapper or array

// Find by ID or similar equity
const targetId = '11442c80-fc51-4946-a1a7-25b2d88380b5';
const account = Array.isArray(accounts) ? accounts.find(a => a.id === targetId) : null;

if (account) {
    console.log('--- Account Found ---');
    console.log('ID:', account.id);
    console.log('Login:', account.login);
    console.log('Initial Balance:', account.initial_balance);
    console.log('Current Equity:', account.current_equity);
    console.log('Plan Type:', account.plan_type);
    console.log('Group:', account.group);
    console.log('Metadata:', JSON.stringify(account.metadata, null, 2));
} else {
    console.log('Account not found in JSON dump.');
}
