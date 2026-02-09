
import { supabase } from '../lib/supabase';

async function checkProfileCreds() {
    const email = 'd3devansh12@gmail.com';
    console.log(`🔍 Checking profile details for ${email}...`);

    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !profile) {
        console.error('❌ Profile not found:', error);
        return;
    }

    console.log('--- Dashboard Profile Details ---');
    console.log('ID:', profile.id);
    console.log('Email:', profile.email);
    console.log('Full Name:', profile.full_name);

    // Check for any suspicious plaintext fields
    const keys = Object.keys(profile);
    const passKeys = keys.filter(k => k.includes('pass') || k.includes('secret') || k.includes('key'));

    if (passKeys.length > 0) {
        console.log('⚠️ Found potential credential fields (checking values):');
        passKeys.forEach(k => {
            console.log(`  ${k}: ${profile[k]}`);
        });
    } else {
        console.log('ℹ️ No direct password fields found in public profile (Standard Supabase Auth).');
    }
}

checkProfileCreds();
