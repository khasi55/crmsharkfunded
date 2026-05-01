import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function main() {
    console.log("Fetching latest certificates...");
    const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('issued_at', { ascending: false })
        .limit(2);
        
    if (error) {
        console.error("Error:", error);
    } else if (data) {
        data.forEach(cert => {
            console.log(`--- Certificate: ${cert.title} ---`);
            console.log(`User ID: ${cert.user_id}`);
            console.log(`Image URL: ${cert.image_url}`);
            console.log(`Description: ${cert.description}`);
            console.log(`Issued At: ${cert.issued_at}`);
        });
    }
}

main();
