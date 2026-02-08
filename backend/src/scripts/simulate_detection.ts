
import { supabase } from '../lib/supabase';

async function simulateDetection() {
    const { data: challenges } = await supabase.from('challenges').select('challenge_type, group').limit(50);

    console.log('--- Detection Simulation ---');
    console.log('Searching for \\S\\ and \\SF\\ (literal backslashes)');

    challenges?.forEach(c => {
        const group = c.group || '';
        const currentGroup = group.toUpperCase();
        const currentType = (c.challenge_type || '').toLowerCase();

        // Admin.ts logic
        // currentGroup.includes('\\SF\\') means "search for the string '\SF\'"
        const isPrime = currentGroup.includes('\\SF\\') || currentType.includes('prime');
        const isLite = (currentGroup.includes('\\S\\') && !currentGroup.includes('\\SF\\')) || currentType.includes('lite');

        // Detailed check
        const hasS = currentGroup.includes('\\S\\');
        const hasSF = currentGroup.includes('\\SF\\');

        console.log(`Group: ${group.padEnd(25)} | Type: ${c.challenge_type.padEnd(20)} | isPrime: ${String(isPrime).padEnd(5)} | isLite: ${String(isLite).padEnd(5)} | hasS: ${hasS} | hasSF: ${hasSF}`);
    });
}

simulateDetection();
