export const pricingConfig = {
    Prime: {
        '5K': { price: '$85' },
        '10K': { price: '$99' },
        '25K': { price: '$340' },
        '50K': { price: '$590' },
        '100K': { price: '$870' },
    },
    LiteTwoStep: {
        '5K': { price: '$33' },
        '10K': { price: '$63' },
        '25K': { price: '$141' },
        '50K': { price: '$270' },
        '100K': { price: '$630' },
    },
    LiteOneStep: {
        '5K': { price: '$63' },
        '10K': { price: '$99' },
        '25K': { price: '$207' },
        '50K': { price: '$307' },
        '100K': { price: '$634' },
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
