
import fetch from 'node-fetch';

async function checkBridge() {
    console.log("Fetching data for 889224209...");
    try {
        const response = await fetch(`http://54.144.116.126:8000/account/889224209`);
        if (!response.ok) {
            console.error(`❌ Bridge Error: ${response.status} ${response.statusText}`);
            console.error(await response.text());
            return;
        }
        const json = await response.json();
        console.log("Bridge Response:", JSON.stringify(json, null, 2));
    } catch (error) {
        console.error("Fetch Error:", error);
    }
}

checkBridge();
