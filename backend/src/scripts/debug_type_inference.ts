
function testInference() {
    const trade = {
        ticket: 8120684,
        type: 'sell',
        profit: 132.22,
        open_price: 70702.16,
        close_price: 72024.38
    };

    console.log('--- Debugging Type Inference ---');
    console.log(`Input Trade:`, trade);

    // 1. Get raw type
    let rawType = (trade.type === '0' || String(trade.type).toLowerCase() === 'buy') ? 'buy' : 'sell';
    console.log(`Raw Type: ${rawType}`);

    // 2. Calculate
    const profit = Number(trade.profit);
    const openPrice = Number(trade.open_price);
    const closePrice = Number(trade.close_price);
    const priceDelta = closePrice - openPrice;

    console.log(`Profit: ${profit}`);
    console.log(`Price Delta: ${priceDelta} (${closePrice} - ${openPrice})`);

    let finalType = rawType;

    // 3. Inference Logic
    if (Math.abs(profit) > 1.0) {
        if (profit > 0) {
            console.log('>> Trade is Profitable');
            if (priceDelta > 0) {
                console.log('>> Price went UP -> SHOULD BE BUY');
                finalType = 'buy';
            } else if (priceDelta < 0) {
                console.log('>> Price went DOWN -> SHOULD BE SELL');
                finalType = 'sell';
            }
        } else {
            console.log('>> Trade is Losing');
            if (priceDelta > 0) {
                console.log('>> Price went UP -> SHOULD BE SELL');
                finalType = 'sell';
            } else if (priceDelta < 0) {
                console.log('>> Price went DOWN -> SHOULD BE BUY');
                finalType = 'buy';
            }
        }
    }

    console.log(`Final Inferred Type: ${finalType}`);
}

testInference();
