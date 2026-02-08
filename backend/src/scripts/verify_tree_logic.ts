
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function verify() {
    console.log("🌳 Verifying Affiliate Tree Logic...");

    try {
        // 1. Fetch (with pagination)
        let allProfiles: any[] = [];
        let page = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;

        while (hasMore) {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, email, full_name, referral_code, referred_by')
                .or('referral_code.neq.null,referred_by.not.is.null')
                .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

            if (error) throw error;

            if (data && data.length > 0) {
                allProfiles = allProfiles.concat(data);
                if (data.length < PAGE_SIZE) {
                    hasMore = false;
                } else {
                    page++;
                }
            } else {
                hasMore = false;
            }
        }

        console.log(`Fetched total ${allProfiles.length} profiles.`);

        // Check for specific user
        const targetId = '04a05ed2-1e1d-45aa-86d2-d0572501e7ed';
        const target = allProfiles?.find(p => p.id === targetId);
        if (target) {
            console.log("✅ Target Affiliate Found in Fetch Result:", target.email);
        } else {
            console.error("❌ Target Affiliate NOT FOUND in Fetch Result.");
        }

        // 2. Map
        const profileMap = new Map<string, any>();
        const referredUsersMap = new Map<string, any[]>();
        const relevantUserIds = new Set<string>();

        allProfiles?.forEach(p => {
            profileMap.set(p.id, { ...p });
        });

        allProfiles?.forEach(p => {
            if (p.referred_by && profileMap.has(p.referred_by)) {
                if (!referredUsersMap.has(p.referred_by)) {
                    referredUsersMap.set(p.referred_by, []);
                }
                referredUsersMap.get(p.referred_by)?.push(p);
                relevantUserIds.add(p.id);
            }
        });

        console.log(`Found ${referredUsersMap.size} active affiliates properly linked via UUID.`);

        if (referredUsersMap.has(targetId)) {
            console.log(`✅ Target Affiliate has ${referredUsersMap.get(targetId)?.length} direct referrals linked.`);
        } else {
            console.log(`⚠️ Target Affiliate has 0 direct referrals in tree logic.`);
        }

        if (referredUsersMap.size > 0) {
            console.log("Sample Affiliate Logic Successful.");
        } else {
            console.log("No active affiliates found (might be expected if no referrals yet).");
            // Check if we have anyone with a code
            const withCode = allProfiles?.filter(p => p.referral_code).length;
            console.log(`Profiles with referral_code: ${withCode}`);
        }

    } catch (e: any) {
        console.error("Verification Error:", e);
    }
}

verify();
