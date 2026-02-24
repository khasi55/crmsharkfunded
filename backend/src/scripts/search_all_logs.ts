import fs from 'fs';
import path from 'path';

const orderId = 'SF1771942863217WH5988MZO';
const paymentId = 'po1451575594582016';
const email = 'kongnolikarnimish@gmail.com';

function searchFile(filePath: string) {
    if (!fs.existsSync(filePath)) return;
    console.log(`\n--- Searching ${filePath} ---`);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    let found = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes(orderId) || line.includes(paymentId) || line.includes(email)) {
            console.log(`Line ${i + 1}: ${line.trim()}`);
            found = true;
        }
    }

    if (!found) console.log(`No matches found in ${filePath}`);
}

searchFile('backend_request_debug.log');
searchFile('nohup.out');

// If you have a specific logs directory, you can also scan it
const logsDir = path.join(__dirname, '../../logs');
if (fs.existsSync(logsDir)) {
    fs.readdirSync(logsDir).forEach(file => {
        searchFile(path.join(logsDir, file));
    });
}
