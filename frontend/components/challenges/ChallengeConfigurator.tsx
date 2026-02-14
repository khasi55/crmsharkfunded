"use client";

import { useState, useEffect } from "react";
import { Check, Info, CreditCard, ChevronDown, ChevronUp, Lock, Loader2, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { fetchFromBackend } from "@/lib/backend-api";


export const pricingConfig = {
    Prime: {
        '5K': { price: '$59', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
        '10K': { price: '$89', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
        '25K': { price: '$236', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
        '50K': { price: '$412', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
        '100K': { price: '$610', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
    },
    LiteTwoStep: {
        '5K': { price: '$30', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
        '10K': { price: '$55', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
        '25K': { price: '$125', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
        '50K': { price: '$235', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
        '100K': { price: '$440', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
    },
    LiteOneStep: {
        '5K': { price: '$48', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
        '10K': { price: '$70', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
        '25K': { price: '$150', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
        '50K': { price: '$260', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
        '100K': { price: '$550', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
    },
    InstantLite: {
        '3K': { price: '$34', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '6K': { price: '$59', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '12K': { price: '$89', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '25K': { price: '$249', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '50K': { price: '$499', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '100K': { price: '$799', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
    },
    InstantPrime: {
        '5K': { price: '$49', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
        '10K': { price: '$83', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
        '25K': { price: '$199', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
        '50K': { price: '$350', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
        '100K': { price: '$487', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
    }
} as const;

// --- Data ---
const CHALLENGE_TYPES = [
    { id: "1-step", label: "One Step", desc: "Single phase evaluation" },
    { id: "2-step", label: "Two Step", desc: "Standard verification", recommended: true },
    { id: "Instant", label: "Instant", desc: "Lower risk, lower cost" }
];

const MODELS = [
    { id: "prime", label: "SharkFunded Prime", desc: "Higher leverage" },
    { id: "lite", label: "SharkFunded Lite", desc: "Classic model" }
];

const PLATFORMS = [
    { id: "mt5", label: "MetaTrader 5" }
];

const PAYMENT_GATEWAYS = [
    { id: "sharkpay", label: "SharkPay", currency: "INR", desc: "Pay in Indian Rupees (₹)", icon: "🇮🇳" },
    { id: "cregis", label: "Crypto (Cregis)", currency: "USD", desc: "Pay with BTC, ETH, USDT", icon: "🏆" }
];

// Helper to map size number to string key
export const getSizeKey = (size: number): string => {
    if (size >= 1000) {
        return `${size / 1000}K`;
    }
    return `${size}`;
};

// Helper to map type/model to config key
export const getConfigKey = (type: string, model: string): keyof typeof pricingConfig | null => {
    if (type === 'Instant') {
        return model === 'prime' ? 'InstantPrime' : 'InstantLite';
    }
    if (model === 'prime') {
        return 'Prime';
    }
    // Lite model
    if (type === '1-step') return 'LiteOneStep';
    if (type === '2-step') return 'LiteTwoStep';

    return null;
};


// --- Utility Components ---
const RadioPill = ({
    active,
    label,
    onClick,
    subLabel = "",
    disabled = false
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    subLabel?: string;
    disabled?: boolean;
}) => (
    <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={cn(
            "relative flex items-center gap-3 p-4 rounded-xl border text-left transition-all duration-200 select-none w-full",
            disabled
                ? "bg-muted/50 border-transparent opacity-50 cursor-not-allowed"
                : "cursor-pointer",
            !disabled && active
                ? "bg-primary/10 border-primary shadow-[0_0_0_1px_rgba(var(--primary),1)]"
                : !disabled && "bg-card border-border hover:border-gray-600"
        )}
    >
        {/* Radio Circle */}
        <div className={cn(
            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
            active ? "border-primary bg-primary" : "border-gray-500",
            disabled && "border-gray-600 bg-transparent"
        )}>
            {active && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        <div className="flex flex-col">
            <span className={cn("text-sm font-bold", active ? "text-primary" : "text-foreground")}>{label}</span>
            {subLabel && <span className="text-[10px] text-muted-foreground">{subLabel}</span>}
        </div>
    </button>
);

const SectionHeader = ({ title, sub }: { title: string, sub: string }) => (
    <div className="mb-4">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
);

// --- Success Modal ---
const SuccessModal = ({ credentials, onClose }: { credentials: any, onClose: () => void }) => {
    const CopyButton = ({ text }: { text: string }) => {
        const [copied, setCopied] = useState(false);
        const handleCopy = () => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        };
        return (
            <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
            >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
            </button>
        );
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="w-full max-w-md bg-[#0F1115] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
                <div className="relative p-6 pt-12 text-center bg-gradient-to-b from-primary/20 to-transparent">
                    <button onClick={onClose} className="absolute top-4 right-4 p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                    <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                        <Check size={32} strokeWidth={3} />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Purchase Successful!</h2>
                    <p className="text-gray-400 text-sm px-4">Your account has been created instantly. Save these credentials carefully.</p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                        {[
                            { label: "Login", value: credentials.login },
                            { label: "Password", value: credentials.masterPassword },
                            { label: "Server", value: credentials.server },
                            { label: "Platform", value: PLATFORMS.find(p => p.id === credentials.platform)?.label || credentials.platform },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                <span className="text-sm text-gray-400">{item.label}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-mono font-medium text-white">{item.value}</span>
                                    <CopyButton text={String(item.value)} />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 flex gap-3">
                        <Info className="shrink-0 text-yellow-500" size={18} />
                        <p className="text-xs text-yellow-200/80">
                            We have also sent these details to your email. You can find them later in your dashboard under "Credentials".
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all active:scale-95"
                    >
                        Go to Dashboard
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default function ChallengeConfigurator() {
    const router = useRouter();
    const supabase = createClient();

    // State
    const [type, setType] = useState("2-step");
    const [model, setModel] = useState("lite");
    const [dynamicPricing, setDynamicPricing] = useState<any>(null);

    // Fetch dynamic pricing on mount
    useEffect(() => {
        const fetchPricing = async () => {
            try {
                const data = await fetchFromBackend('/api/config/pricing', { requireAuth: false });
                if (data && Object.keys(data).length > 0) {
                    setDynamicPricing(data);
                }
            } catch (error) {
                console.warn('Failed to fetch dynamic pricing:', error);
            }
        };
        fetchPricing();
    }, []);

    // Dynamic available sizes based on current selection
    const availableSizes = (() => {
        const configKey = getConfigKey(type, model);
        if (!configKey) return [];

        const sourceConfig = (dynamicPricing && dynamicPricing[configKey]) ? dynamicPricing : pricingConfig;
        const config = sourceConfig[configKey as keyof typeof pricingConfig];

        const sizesStr = Object.keys(config);
        // Convert "5K" -> 5000
        return sizesStr.map(s => {
            const num = parseInt(s.replace('K', ''));
            return num * 1000;
        }).sort((a, b) => a - b);
    })();

    const [size, setSize] = useState(100000);

    // Reset size if current size is not in available options when type/model changes
    useEffect(() => {
        if (!availableSizes.includes(size)) {
            if (availableSizes.length > 0) {
                setSize(availableSizes[0]);
            }
        }
    }, [type, model, availableSizes, size]);

    const [platform, setPlatform] = useState("mt5");
    const [gateway, setGateway] = useState("sharkpay");
    const [coupon, setCoupon] = useState("");
    const [showRules, setShowRules] = useState(true);
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState("");
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    const [isPurchasing, setIsPurchasing] = useState(false);
    const [purchasedCredentials, setPurchasedCredentials] = useState<any>(null);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState("");

    // Clear applied coupon when configuration changes
    useEffect(() => {
        if (appliedCoupon) {
            setAppliedCoupon(null);
            setCouponError("");
        }
    }, [type, model, size]); // Re-run when these change

    // Price Calculation
    const getBasePrice = () => {
        const configKey = getConfigKey(type, model);
        if (!configKey) return 0;

        const sizeKey = getSizeKey(size);
        const sourceConfig = (dynamicPricing && dynamicPricing[configKey]) ? dynamicPricing : pricingConfig;
        const config = sourceConfig[configKey as keyof typeof pricingConfig] as any;
        const sizeConfig = config[sizeKey];

        if (!sizeConfig) return 0;

        // Remove '$' and parse
        return parseInt(sizeConfig.price.replace('$', ''));
    };

    const basePriceUSD = getBasePrice();
    // Pro multiplier is already built into the Prime prices in the config

    const discountAmount = appliedCoupon ? appliedCoupon.discount.amount : 0;
    const finalPriceUSD = Math.max(0, basePriceUSD - discountAmount);
    const finalPriceINR = Math.round(finalPriceUSD * 98); // Simple fixed rate: 98 (Synced with Gateway)


    const selectedGateway = PAYMENT_GATEWAYS.find(g => g.id === gateway);
    const displayPrice = gateway === 'sharkpay' ? finalPriceINR : finalPriceUSD;
    const displayCurrency = selectedGateway?.currency || 'USD';

    const handleApplyCoupon = async () => {
        if (!coupon.trim()) return;

        setValidatingCoupon(true);
        setCouponError("");

        try {
            const data = await fetchFromBackend('/api/coupons/validate', {
                method: 'POST',
                body: JSON.stringify({
                    code: coupon.trim(),
                    amount: basePriceUSD,
                    account_type_id: null
                })
            });

            if (data.valid) {
                setAppliedCoupon(data);
                setCouponError("");
            } else {
                setAppliedCoupon(null);
                setCouponError(data.error || 'Invalid coupon code');
            }
        } catch (error) {
            console.error('Coupon validation error:', error);
            setCouponError('Failed to validate coupon');
        } finally {
            setValidatingCoupon(false);
        }
    };

    const handlePurchase = async () => {
        setIsPurchasing(true);
        try {
            // Check authentication
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                router.push('/login');
                setIsPurchasing(false);
                return;
            }

            // Determine explicit MT5 group based on user request
            let mt5Group = '';

            // Lite Mappings
            if (model === 'lite' || model === 'standard') {
                if (type === 'Instant') mt5Group = 'demo\\S\\0-SF';
                else if (type === '1-step') mt5Group = 'demo\\S\\1-SF';
                else if (type === '2-step') mt5Group = 'demo\\S\\2-SF';
            }
            // Prime Mappings
            else if (model === 'prime' || model === 'pro') {
                if (type === 'Instant') mt5Group = 'demo\\SF\\0-Pro';
                else if (type === '1-step') mt5Group = 'demo\\SF\\1-Pro';
                else if (type === '2-step') mt5Group = 'demo\\SF\\2-Pro';
            }

            // Call backend payment API instead of direct gateway
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.sharkfunded.co';
            // EPay requires alphanumeric orderID (no hyphens or special chars)
            const orderId = `SF${Date.now()}${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const res = await fetch(`${backendUrl}/api/payments/create-order`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
                },
                body: JSON.stringify({
                    gateway, // Payment gateway (sharkpay, epay, paymid)
                    orderId: orderId,
                    amount: finalPriceUSD,
                    currency: 'USD',
                    customerEmail: user.email || '',
                    customerName: user.user_metadata?.full_name || user.email || 'Customer',
                    metadata: {
                        account_type: `${type}-${model}`,
                        account_size: size,
                        mt5_group: mt5Group,
                        platform,
                        coupon: appliedCoupon?.coupon?.code || null
                    }
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                // Open payment in iframe modal or redirect
                if (data.paymentUrl) {
                    if (gateway === 'cregis' || gateway === 'epay') {
                        // Cregis/EPay requires top-level redirect
                        window.location.href = data.paymentUrl;
                    } else {
                        setPaymentUrl(data.paymentUrl);
                        setShowPaymentModal(true);
                    }
                } else {
                    alert('Payment URL not received. Please contact support.');
                }
            } else {
                alert(data.error || 'Failed to create order');
            }
        } catch (error) {
            console.error('Order creation error:', error);
            alert('Failed to connect to server');
        } finally {
            setIsPurchasing(false);
        }
    };

    return (
        <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 font-sans text-foreground">

            <AnimatePresence>
                {purchasedCredentials && (
                    <SuccessModal
                        credentials={purchasedCredentials}
                        onClose={() => router.push('/dashboard')}
                    />
                )}
            </AnimatePresence>

            {/* Page Header */}
            <div className="mb-8 flex items-center gap-4">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h1 className="text-3xl font-black tracking-tight text-black">New Challenge</h1>
            </div>

            <div className="flex flex-col xl:flex-row gap-12">

                {/* --- Left Column: Configuration --- */}
                <div className="flex-1 space-y-10">

                    {/* 1. Model */}
                    <section>
                        <SectionHeader title="Model" sub="Choose the trading model" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {MODELS.map(m => (
                                <RadioPill
                                    key={m.id}
                                    active={model === m.id}
                                    label={m.label}
                                    subLabel={m.desc}
                                    onClick={() => {
                                        setModel(m.id);
                                        // Auto-switch to 2-step if user selects Prime while on 1-step
                                        if (m.id === 'prime' && type === '1-step') {
                                            setType('2-step');
                                        }
                                    }}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 2. Challenge Type */}
                    <section>
                        <SectionHeader title="Challenge Type" sub="Choose the type of challenge you want to take" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {CHALLENGE_TYPES.map(t => {
                                const isDisabled = model === 'prime' && t.id === '1-step';
                                return (
                                    <RadioPill
                                        key={t.id}
                                        active={type === t.id}
                                        label={t.label}
                                        subLabel={t.desc}
                                        disabled={isDisabled}
                                        onClick={() => {
                                            if (isDisabled) return;
                                            setType(t.id);
                                        }}
                                    />
                                );
                            })}
                        </div>
                    </section>



                    {/* 4. Account Size */}
                    <section>
                        <SectionHeader title="Account Size" sub="Choose your preferred account size" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {availableSizes.map(s => (
                                <RadioPill
                                    key={s}
                                    active={size === s}
                                    label={`$${s.toLocaleString()}`}
                                    onClick={() => setSize(s)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 5. Platform */}
                    <section>
                        <SectionHeader title="Trading Platform" sub="Select your preferred platform" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PLATFORMS.map(p => (
                                <RadioPill
                                    key={p.id}
                                    active={platform === p.id}
                                    label={p.label}
                                    onClick={() => setPlatform(p.id)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 6. Payment Gateway */}
                    <section>
                        <SectionHeader title="Payment Gateway" sub="Choose your preferred payment method" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {PAYMENT_GATEWAYS.map(g => (
                                <div
                                    key={g.id}
                                    onClick={() => setGateway(g.id)}
                                    className={cn(
                                        "relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none",
                                        gateway === g.id
                                            ? "bg-primary/10 border-primary shadow-[0_0_0_1px_rgba(var(--primary),1)]"
                                            : "bg-card border-border hover:border-gray-600"
                                    )}
                                >
                                    {/* Radio Circle */}
                                    <div className={cn(
                                        "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
                                        gateway === g.id ? "border-primary bg-primary" : "border-gray-500"
                                    )}>
                                        {gateway === g.id && <div className="w-2 h-2 rounded-full bg-white" />}
                                    </div>

                                    <div className="flex-1 flex items-center gap-3">
                                        <span className="text-2xl">{g.icon}</span>
                                        <div className="flex flex-col">
                                            <div className="flex items-center gap-2">
                                                <span className={cn("text-sm font-bold", gateway === g.id ? "text-primary" : "text-foreground")}>
                                                    {g.label}
                                                </span>
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-mono">
                                                    {g.currency}
                                                </span>
                                            </div>
                                            <span className="text-[10px] text-muted-foreground">{g.desc}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </div>


                {/* --- Right Column: Summary --- */}
                <div className="w-full xl:w-[450px] shrink-0 xl:sticky xl:top-8 space-y-6">

                    {/* Coupon Code */}
                    <div>
                        <SectionHeader title="Coupon Code" sub="Enter a coupon to get a discount" />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter coupon code"
                                className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all uppercase"
                                value={coupon}
                                onChange={(e) => {
                                    setCoupon(e.target.value);
                                    setCouponError("");
                                    setAppliedCoupon(null);
                                }}
                                disabled={validatingCoupon}
                            />
                            <button
                                onClick={handleApplyCoupon}
                                disabled={validatingCoupon || !coupon.trim()}
                                className="px-6 font-bold text-sm rounded-lg bg-card border border-border hover:border-primary hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {validatingCoupon ? 'Checking...' : 'Apply'}
                            </button>
                        </div>
                        {couponError && (
                            <p className="text-xs text-red-400 mt-1">{couponError}</p>
                        )}
                        {appliedCoupon && (
                            <div className="flex items-center gap-2 text-sm text-green-400 mt-1">
                                <Check size={14} />
                                <span>
                                    Coupon "{appliedCoupon.coupon.code}" applied!
                                    {appliedCoupon.discount.type === 'percentage' && ` (${appliedCoupon.discount.value}% OFF)`}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Order Summary Card */}
                    <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/10">
                            <h3 className="font-bold text-lg">Order Summary</h3>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-start text-sm">
                                <span className="text-muted-foreground">${size.toLocaleString()} — {type === "1-step" ? "One Step" : type === "2-step" ? "Two Step" : "Instant"} {model === "lite" ? "Lite" : "Prime"}</span>
                                <div className="text-right">
                                    <span className="font-bold font-mono">{displayCurrency === 'INR' ? '₹' : '$'}{(gateway === 'sharkpay' ? Math.round(basePriceUSD * 94) : basePriceUSD).toLocaleString()}</span>
                                </div>
                            </div>

                            {appliedCoupon && (
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-green-400">
                                        Discount ({appliedCoupon.coupon.code})
                                        {appliedCoupon.discount.type === 'percentage' && ` - ${appliedCoupon.discount.value}%`}
                                    </span>
                                    <span className="font-bold font-mono text-green-400">-{displayCurrency === 'INR' ? '₹' : '$'}{(gateway === 'sharkpay' ? Math.round(discountAmount * 94) : discountAmount).toLocaleString()}</span>
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground">
                                Platform: {PLATFORMS.find(p => p.id === platform)?.label}
                                <br />
                                Payment: {selectedGateway?.label} ({selectedGateway?.currency})
                            </div>

                            <div className="h-px bg-border" />

                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold">Total</span>
                                <div className="text-right">
                                    <span className="text-3xl font-black tracking-tight">
                                        {displayCurrency === 'INR' ? '₹' : '$'}{displayPrice.toLocaleString()}
                                    </span>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {displayCurrency}
                                    </div>
                                </div>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="bg-white/5 rounded-lg p-4 text-[11px] text-muted-foreground space-y-2">
                                <label className="flex gap-2 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        className="mt-0.5"
                                        checked={agreedToTerms}
                                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                                    />
                                    <span>I agree with all the following terms:</span>
                                </label>
                                <ul className="list-disc pl-5 space-y-1 opacity-80">
                                    <li>I have read and agreed to the Terms of Use.</li>
                                    <li>All information matches government ID.</li>
                                </ul>
                            </div>

                            <button
                                onClick={handlePurchase}
                                disabled={isPurchasing || !agreedToTerms}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed"
                            >
                                {isPurchasing ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Creating Order...
                                    </>
                                ) : (
                                    <>
                                        <CreditCard size={20} />
                                        {gateway === 'cregis' ? 'Pay with Crypto' : 'Proceed to Payment'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </div>

            </div>

            {/* Payment Modal with Iframe */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
                    <div className="relative w-full h-full md:w-[600px] md:h-[800px] md:rounded-2xl overflow-hidden bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        {/* Close Button */}
                        <button
                            onClick={() => setShowPaymentModal(false)}
                            className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white text-slate-700 rounded-full p-2 shadow-lg transition-all active:scale-95"
                        >
                            <X className="h-6 w-6" />
                        </button>

                        {/* Iframe */}
                        <iframe
                            src={paymentUrl}
                            className="w-full h-full border-0"
                            title="SharkPay Checkout"
                            allow="payment"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
