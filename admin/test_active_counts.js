const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../backend/.env' });
const supabase = createClient(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    console.log("Fetching active challenge counts...");
    const [
        { count: phase1 },
        { count: phase2 },
        { count: funded },
        { count: instant },
        { count: all_phase1 },
        { count: all_phase2 }
    ] = await Promise.all([
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'active').or('challenge_type.ilike.%Phase 1%,challenge_type.ilike.%Phase_1%'),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'active').or('challenge_type.ilike.%Phase 2%,challenge_type.ilike.%Phase_2%'),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'active').or('challenge_type.ilike.%Funded%,challenge_type.ilike.%Master%'),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).eq('status', 'active').or('challenge_type.ilike.%Instant%,challenge_type.ilike.%Rapid%'),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).or('challenge_type.ilike.%Phase 1%,challenge_type.ilike.%Phase_1%'),
        supabase.from('challenges').select('*', { count: 'exact', head: true }).or('challenge_type.ilike.%Phase 2%,challenge_type.ilike.%Phase_2%')
    ]);
    
    console.log(`Active Phase 1: ${phase1} (vs All: ${all_phase1})`);
    console.log(`Active Phase 2: ${phase2} (vs All: ${all_phase2})`);
    console.log(`Active Funded: ${funded}`);
    console.log(`Active Instant: ${instant}`);
    console.log(`Sum Active: ${phase1 + phase2 + funded + instant}`);
}
run();
