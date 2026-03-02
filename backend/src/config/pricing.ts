export const pricingConfig = {
    Prime: {
        '5K': { price: '$59' },
        '10K': { price: '$89' },
        '25K': { price: '$236' },
        '50K': { price: '$412' },
        '100K': { price: '$610' },
    },
    LiteTwoStep: {
        '5K': { price: '$30' },
        '10K': { price: '$55' },
        '25K': { price: '$125' },
        '50K': { price: '$235' },
        '100K': { price: '$440' },
    },
    LiteOneStep: {
        '5K': { price: '$48' },
        '10K': { price: '$70' },
        '25K': { price: '$150' },
        '50K': { price: '$260' },
        '100K': { price: '$550' },
    },
    InstantLite: {
        '3K': { price: '$34' },
        '6K': { price: '$59' },
        '12K': { price: '$89' },
        '25K': { price: '$249' },
        '50K': { price: '$499' },
        '100K': { price: '$799' },
    },
    InstantPrime: {
        '5K': { price: '$49' },
        '10K': { price: '$83' },
        '25K': { price: '$199' },
        '50K': { price: '$350' },
        '100K': { price: '$487' },
    }
} as const;

export const getSizeKey = (size: number): string => {
    if (size >= 1000) {
        return `${size / 1000}K`;
    }
    return `${size}`;
};

export const getConfigKey = (type: string, model: string): keyof typeof pricingConfig | null => {
    const t = type.toLowerCase();
    const m = model.toLowerCase();

    if (t === 'instant') {
        return m === 'prime' ? 'InstantPrime' : 'InstantLite';
    }
    if (m === 'prime') {
        return 'Prime';
    }
    // Lite model
    if (t === '1-step' || t === 'onestep') return 'LiteOneStep';
    if (t === '2-step' || t === 'twostep') return 'LiteTwoStep';

    return null;
};
