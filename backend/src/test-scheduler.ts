import { startRiskMonitor } from './services/risk-scheduler';

// We run it with an interval of 1 second just once, then exit
console.log("Starting manual RiskMonitor cycle...");
startRiskMonitor(100);

setTimeout(() => {
    console.log("Shutting down manual test.");
    process.exit(0);
}, 10000);
