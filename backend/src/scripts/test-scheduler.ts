import { startRiskMonitor } from '../services/risk-scheduler';
startRiskMonitor(5); // Run every 5s for the test
setTimeout(() => process.exit(0), 10000); // Quit after 10s
