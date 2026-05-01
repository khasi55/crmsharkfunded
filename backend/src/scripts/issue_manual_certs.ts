import { CertificateService } from '../services/certificate-service';
import { supabase } from '../lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function issueBothCertificates() {
    const email = 'siddareddy1947@gmail.com';
    console.log(`🎯 Issuing both certificates to ${email}...`);
    
    // 1. Get user by email
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('email', email)
        .single();
    
    if (profileError || !profile) {
        console.error(`User with email ${email} not found in profiles table.`);
        return;
    }

    console.log(`Found user: ${profile.full_name} (${profile.id})`);

    // 2. Issue Phase 1 Certificate
    console.log("Issuing Phase 1 Certificate...");
    const cert1 = await CertificateService.issueCertificate(
        profile.id,
        '00000000-0000-0000-0000-000000000001', // Dummy ID for tracking
        'Phase 1'
    );
    if (cert1) console.log("✅ Step 1 Certificate Issued.");

    // 3. Issue Phase 2 Certificate
    console.log("Issuing Phase 2 Certificate...");
    const cert2 = await CertificateService.issueCertificate(
        profile.id,
        '00000000-0000-0000-0000-000000000002', // Dummy ID for tracking
        'Phase 2'
    );
    if (cert2) console.log("✅ Step 2 Certificate Issued.");

    console.log("\n🎉 Done! Both certificates have been stored in the DB and emails have been triggered.");
}

issueBothCertificates();
