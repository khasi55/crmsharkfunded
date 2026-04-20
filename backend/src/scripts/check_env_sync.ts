import * as dotenv from 'dotenv';
import * as path from 'path';

function maskSecret(secret: string | undefined) {
    if (!secret) return "NOT FOUND";
    return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

console.log("--- ENV Diagnostic Tool ---");

// Check Root .env
const rootEnv = dotenv.config({ path: path.resolve(__dirname, '../../.env') }).parsed;
console.log("[Root .env] JWT_SECRET:", maskSecret(rootEnv?.JWT_SECRET));

// Check Backend .env
const backendEnv = dotenv.config({ path: path.resolve(__dirname, '../../backend/.env') }).parsed;
console.log("[Backend .env] JWT_SECRET:", maskSecret(backendEnv?.JWT_SECRET));

// Check Admin .env
const adminEnv = dotenv.config({ path: path.resolve(__dirname, '../../admin/.env') }).parsed;
console.log("[Admin .env] JWT_SECRET:", maskSecret(adminEnv?.JWT_SECRET));
