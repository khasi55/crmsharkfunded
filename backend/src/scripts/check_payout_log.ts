
import { supabase } from '../lib/supabase';

async function checkIP() {
    const targetIP = '2401:4900:882d:481:18dc:997e:1810:5333';
    console.log(`Checking for IP: ${targetIP}`);

    // 1. Check system_logs
    // Searching in details->>ip and details->>ip_address
    const { data: logs, error: logError } = await supabase
        .from('system_logs')
        .select('*')
        .or(`details->>ip_address.eq.${targetIP},details->>ip.eq.${targetIP}`)
        .order('created_at', { ascending: false });

    if (logError) console.error('Log Error:', logError);
    else console.log(`Found ${logs?.length || 0} logs for IP.`);

    if (logs && logs.length > 0) {
        logs.forEach(l => console.log(JSON.stringify(l, null, 2)));
    } else {
        console.log('No logs found for this IP.');
    }

    // 2. Check api_sessions
    const { data: sessions, error: sessError } = await supabase
        .from('api_sessions')
        .select('*, profiles(email)')
        .eq('ip_address', targetIP)
        .order('last_seen', { ascending: false });

    if (sessError) console.error('Session Error:', sessError);
    else console.log(`Found ${sessions?.length || 0} sessions for IP.`);

    if (sessions && sessions.length > 0) {
        sessions.forEach(s => console.log(`[${s.last_seen}] User: ${(s as any).profiles?.email} - Active: ${s.is_active}`));
    } else {
        console.log('No sessions found for this IP.');
    }
}

checkIP();
