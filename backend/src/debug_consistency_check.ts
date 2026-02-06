
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { RulesService } from './services/rules-service';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Mock supabase if needed or use environment
// But RulesService imports supabase from lib/supabase which uses env. 
// So ensuring env is set is enough.

async function run() {
    console.log("Checking consistency for account 14f14cba-1620-4622-96a1-aa7d3f30cd9b...");
    try {
        const result = await RulesService.checkConsistency('14f14cba-1620-4622-96a1-aa7d3f30cd9b');
        console.log("Result:", JSON.stringify(result, null, 2));
    } catch (e) {
        console.error(e);
    }
}

run();
