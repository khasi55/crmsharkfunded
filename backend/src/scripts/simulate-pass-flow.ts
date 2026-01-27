
import { EventEntryService } from '../services/event-entry-service';
import fetch from 'node-fetch'; // Requires node-fetch if not available globally, but we'll try native fetch in Node 18+

// Creating a pass directly
async function simulateFlow() {
    try {
        console.log("1. Creating Pass...");
        const code = await EventEntryService.createPass('Simulated User', 'sim@test.com');
        console.log(`   Pass Created: ${code}`);

        console.log("2. Verifying Pass via API logic (Simulation)...");
        // We can't call localhost API easily if it's running via next dev, 
        // but we can call the service directly to verify logic.

        const result1 = await EventEntryService.verifyPass(code);
        console.log("   First Scan Result:", result1);

        if (!result1.valid) {
            console.error("   FAILED: First scan should be valid.");
        }

        console.log("3. Verifying Pass AGAIN (Duplicate Scan)...");
        const result2 = await EventEntryService.verifyPass(code);
        console.log("   Second Scan Result:", result2);

        if (result2.valid) {
            console.error("   FAILED: Second scan should be invalid (already used).");
        } else {
            console.log("   SUCCESS: Second scan correctly denied.");
        }

    } catch (e) {
        console.error("Simulation Error:", e);
    }
}

simulateFlow();
