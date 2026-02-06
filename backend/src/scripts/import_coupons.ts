
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load env from backend root
dotenv.config({ path: resolve(__dirname, '../../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const CSV_PATH = '/Users/viswanathreddy/Desktop/Sharkfunded/SharkfundedCRM/Shark Funded - Add Coupon (1).csv';

async function importCoupons() {
    console.log('🚀 Starting Coupon Import V2...');

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ CSV file not found at: ${CSV_PATH}`);
        process.exit(1);
    }

    const content = fs.readFileSync(CSV_PATH, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    const dataLines = lines.slice(2);

    console.log(`📋 Found ${dataLines.length} coupons in CSV.`);

    // --- STEP 1: Fetch ALL Auth Users (to map Email -> ID) ---
    console.log('🔐 Fetching existing Auth Users...');
    const emailToAuthIdMap = new Map<string, string>();
    let page = 1;
    let hasMore = true;

    while (hasMore) {
        const { data: { users }, error } = await supabase.auth.admin.listUsers({
            page: page,
            perPage: 1000
        });

        if (error) {
            console.error('❌ Failed to list users:', error);
            process.exit(1);
        }

        if (!users || users.length === 0) {
            hasMore = false;
        } else {
            users.forEach(u => {
                if (u.email) emailToAuthIdMap.set(u.email.toLowerCase().trim(), u.id);
            });
            console.log(`   Loaded page ${page}, total so far: ${emailToAuthIdMap.size}`);
            if (users.length < 1000) hasMore = false; // Less than limit means last page
            page++;
        }
    }

    // --- STEP 2: Fetch Existing Profiles (to avoid duplicate insert) ---
    console.log('👤 Fetching existing Profiles...');
    const existingProfileIds = new Set<string>();
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id');

    if (profileError) {
        console.error('❌ Failed to fetch profiles:', profileError);
    } else {
        profiles?.forEach(p => existingProfileIds.add(p.id));
    }
    console.log(`   Found ${existingProfileIds.size} existing profiles.`);

    // --- STEP 3: Ensure Every CSV Affiliate Has User + Profile ---
    console.log('� Reconciling Users & Profiles...');
    const finalEmailToIdMap = new Map<string, string>();

    const csvEmails = new Set<string>();
    for (const line of dataLines) {
        const cols = line.split(',');
        const email = cols[5]?.trim();
        if (email && email.includes('@')) {
            csvEmails.add(email.toLowerCase());
        }
    }

    for (const email of csvEmails) {
        let userId = emailToAuthIdMap.get(email);

        // A. Create User if missing
        if (!userId) {
            console.log(`✨ Creating NEW Auth User: ${email}`);
            const { data: userData, error: createError } = await supabase.auth.admin.createUser({
                email: email,
                password: 'SharkFunded2025!',
                email_confirm: true,
                user_metadata: {
                    full_name: email.split('@')[0],
                    source: 'coupon_import'
                }
            });

            if (createError) {
                console.error(`❌ Failed to create user ${email}:`, createError.message);
                continue;
            }
            if (userData.user) {
                userId = userData.user.id;
                emailToAuthIdMap.set(email, userId); // Cache it
            }
        }

        // B. Create Profile if missing
        if (userId && !existingProfileIds.has(userId)) {
            // console.log(`   Creating missing Profile for: ${email} (${userId})`);
            const { error: insertProfileError } = await supabase
                .from('profiles')
                .upsert({
                    id: userId,
                    email: email,
                    full_name: email.split('@')[0]
                }, { onConflict: 'id' });

            if (insertProfileError) {
                console.error(`❌ Failed to create profile for ${email}:`, insertProfileError.message);
            } else {
                existingProfileIds.add(userId);
            }
        }

        if (userId) {
            finalEmailToIdMap.set(email, userId);
        }
    }

    console.log(`✅ Ready to import coupons with ${finalEmailToIdMap.size} valid linked affiliates.`);

    // --- STEP 4: Import Coupons ---
    let successCount = 0;
    let failCount = 0;

    for (const line of dataLines) {
        const cols = line.split(',');
        if (cols.length < 5) continue;

        const code = cols[1]?.trim();
        const percentageStr = cols[2]?.trim();
        const statusStr = cols[3]?.trim();
        const expiryStr = cols[4]?.trim();
        const email = cols[5]?.trim();
        const commissionStr = cols[6]?.trim();

        if (!code) continue;

        const discountValue = parseFloat(percentageStr) || 0;
        const isActive = statusStr.toLowerCase() === 'active';

        let validUntil = null;
        if (expiryStr) {
            try {
                const parts = expiryStr.split('/');
                if (parts.length === 3) {
                    validUntil = new Date(parseInt(parts[2]), parseInt(parts[0]) - 1, parseInt(parts[1]));
                }
            } catch (e) { }
        }

        let affiliateId = null;
        if (email) {
            affiliateId = finalEmailToIdMap.get(email.toLowerCase()) || null;
        }

        const commissionRate = parseFloat(commissionStr) || 0;

        const payload: any = {
            code,
            discount_type: 'percentage',
            discount_value: discountValue,
            is_active: isActive,
            valid_until: validUntil,
            affiliate_id: affiliateId,
            commission_rate: (commissionRate > 0) ? commissionRate : null,
            max_uses_per_user: null,
            description: `Imported via CSV`
        };

        try {
            const { error } = await supabase
                .from('discount_coupons')
                .upsert(payload, { onConflict: 'code' });

            if (error) {
                console.error(`❌ Failed to import ${code}:`, error.message);
                failCount++;
            } else {
                successCount++;
            }
        } catch (err) {
            // console.error(`❌ Exception for ${code}:`, err);
            failCount++;
        }
    }

    console.log(`\n🎉 Import Complete!`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
}

importCoupons();
