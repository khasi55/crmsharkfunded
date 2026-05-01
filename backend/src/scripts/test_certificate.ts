import { CertificateService } from '../services/certificate-service';
import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function testIssuance() {
    console.log("🧪 Testing Certificate Issuance...");
    
    // Get a real user to test with (replace with your test UUID or it will pick the first user)
    const { data: users } = await supabase.from('profiles').select('id, email').limit(1);
    
    if (!users || users.length === 0) {
        console.error("No users found to test with.");
        return;
    }

    const testUser = users[0];
    console.log(`Using test user: ${testUser.email} (${testUser.id})`);

    const result = await CertificateService.issueCertificate(
        testUser.id,
        '00000000-0000-0000-0000-000000000000', // Dummy challenge ID
        'Phase 1'
    );

    if (result) {
        console.log("✅ Certificate issued and email triggered!");
        console.log("Check the 'certificates' table in Supabase.");
    } else {
        console.error("❌ Failed to issue certificate.");
    }
}

testIssuance();
