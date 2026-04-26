export const pricingConfig = {
    Prime: {
        '5K': { price: '$39' },
        '10K': { price: '$70' },
        '25K': { price: '$170' },
        '50K': { price: '$356' },
        '100K': { price: '$641' },
    },
    LiteTwoStep: {
        '5K': { price: '$24' },
        '10K': { price: '$47' },
        '25K': { price: '$113' },
        '50K': { price: '$213' },
        '100K': { price: '$356' },
    },
    LiteOneStep: {
        '5K': { price: '$34' },
        '10K': { price: '$63' },
        '25K': { price: '$141' },
        '50K': { price: '$299' },
        '100K': { price: '$570' },
    },
    InstantLite: {
        '3K': { price: '$44' },
        '6K': { price: '$73' },
        '12K': { price: '$111' },
        '25K': { price: '$269' },
        '50K': { price: '$710' },
        '100K': { price: '$1140' },
    },
    InstantPrime: {
        '5K': { price: '$49' },
        '10K': { price: '$83' },
        '25K': { price: '$199' },
        '50K': { price: '$350' },
        '100K': { price: '$487' },
    },
    DirectFunded: {
        '1K': { price: '$19' }, // Placeholder price
        '5K': { price: '$49' },
        '10K': { price: '$89' },
        '25K': { price: '$199' },
        '50K': { price: '$349' },
        '100K': { price: '$599' },
    },
    Bolt: {
        '1.5K': { price: '$45' },
        '3K': { price: '$81' },
        '6K': { price: '$159' },
        '9K': { price: '$301' },
    }
} as const;

export const getSizeKey = (size: number): string => {
    if (size === 1500) return '1.5K';
    if (size >= 1000) {
        return `${size / 1000}K`;
    }
    return `${size}`;
};

export const getConfigKey = (type: string, model: string): keyof typeof pricingConfig | null => {
    const t = type.toLowerCase();
    const m = model.toLowerCase();

    if (m === 'bolt') return 'Bolt';
    if (t === 'funded' || t === 'direct_funded') {
        return 'DirectFunded';
    }
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
