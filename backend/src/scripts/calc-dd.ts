const sod = 4780;
const percent = 3;
const limit = sod * (1 - (percent / 100));
const lossAmount = sod * (percent / 100);

console.log(`SOD: $${sod}`);
console.log(`Daily Limit: ${percent}%`);
console.log(`Max Loss Amount: $${lossAmount.toFixed(2)}`);
console.log(`Breach Threshold (Equity Drops Below): $${limit.toFixed(2)}`);
