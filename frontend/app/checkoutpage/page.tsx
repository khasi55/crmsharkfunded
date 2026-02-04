"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, CreditCard, Loader2, ArrowRight, Menu, LogIn, UserPlus, Globe, ChevronDown, Copy, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PublicSidebar from "@/components/layout/PublicSidebar";
import { COUNTRIES } from "@/lib/countries";
import { pricingConfig, getSizeKey, getConfigKey } from "@/components/challenges/ChallengeConfigurator";
import { fetchFromBackend } from "@/lib/backend-api";

// --- Reusable UI Component ---
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
                ? "bg-slate-100 border-transparent opacity-50 cursor-not-allowed"
                : "cursor-pointer",
            !disabled && active
                ? "bg-blue-50 border-blue-500 shadow-[0_0_0_1px_rgba(59,130,246,1)]"
                : !disabled && "bg-white border-slate-200 hover:border-slate-300"
        )}
    >
        {/* Radio Circle */}
        <div className={cn(
            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0",
            active ? "border-blue-500 bg-blue-500" : "border-slate-300",
            disabled && "border-slate-300 bg-transparent"
        )}>
            {active && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        <div className="flex flex-col">
            <span className={cn("text-sm font-bold", active ? "text-blue-900" : "text-slate-700")}>{label}</span>
            {subLabel && <span className="text-[10px] text-slate-500">{subLabel}</span>}
        </div>
    </button>
);

const SectionHeader = ({ title, sub }: { title: string, sub: string }) => (
    <div className="mb-4">
        <h3 className="text-lg font-bold text-[#0a0d20]">{title}</h3>
        <p className="text-xs text-slate-500">{sub}</p>
    </div>
);

// Constants
// Constants
const EXCHANGE_RATE_INR = 94;
const CHALLENGE_TYPES = [
    { id: "1-step", label: "One Step", desc: "Single phase evaluation" },
    { id: "2-step", label: "Two Step", desc: "Standard verification", recommended: true },
    { id: "Instant", label: "Instant", desc: "Lower risk, lower cost" }
];

const MODELS = [
    { id: "standard", label: "SharkFunded Lite", desc: "Classic model" },
    { id: "pro", label: "SharkFunded Prime", desc: "Higher leverage" }
];

const PLATFORMS = [
    { id: "mt5", label: "MetaTrader 5" }
];

function CheckoutContent() {
    const searchParams = useSearchParams();

    // Configurator State
    const [type, setType] = useState("2-step");
    const [model, setModel] = useState("standard");
    const [size, setSize] = useState(100000);
    const [platform, setPlatform] = useState("mt5");
    const [coupon, setCoupon] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
    const [couponError, setCouponError] = useState("");
    const [validatingCoupon, setValidatingCoupon] = useState(false);

    // Dynamic Pricing State
    const [pricingData, setPricingData] = useState<any>(pricingConfig);

    // Fetch dynamic pricing
    useEffect(() => {
        const loadPricing = async () => {
            try {
                // Use the new public endpoint
                const data = await fetchFromBackend('/api/config/pricing');
                if (data && Object.keys(data).length > 0) {
                    setPricingData(data);
                }
            } catch (e) {
                console.error("Failed to load pricing", e);
            }
        };
        loadPricing();
    }, []);

    // Checkout Flow State
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentUrl, setPaymentUrl] = useState("");
    const [formData, setFormData] = useState({
        firstName: "", lastName: "", email: "", country: "", phone: "", terms: false, referralCode: ""
    });

    // Dynamic Size Logic
    const availableSizes = (() => {
        const configKey = getConfigKey(type, model);
        if (!configKey) return [];
        // Use pricingData instead of pricingConfig
        const config = pricingData[configKey];
        if (!config) return [];
        const sizesStr = Object.keys(config);
        return sizesStr.map(s => parseInt(s.replace('K', '')) * 1000).sort((a, b) => a - b);
    })();

    // Ensure valid size on type/model change
    useEffect(() => {
        if (!availableSizes.includes(size)) {
            if (availableSizes.length > 0) setSize(availableSizes[0]);
        }
    }, [type, model, availableSizes, size]);

    // Pricing Calculation
    const getBasePrice = () => {
        const configKey = getConfigKey(type, model);
        if (!configKey) return 0;
        const sizeKey = getSizeKey(size);
        const config = pricingData[configKey] as any;
        if (!config) return 0;
        const sizeConfig = config[sizeKey];
        if (!sizeConfig) return 0;
        return parseInt(sizeConfig.price.replace('$', ''));
    };

    const basePriceUSD = getBasePrice();
    const discountAmount = appliedCoupon ? appliedCoupon.discount.amount : 0;
    const finalPriceUSD = Math.max(0, basePriceUSD - discountAmount);
    // const finalPriceINR = Math.round(finalPriceUSD * 84); // If implementing INR view

    const handleApplyCoupon = async () => {
        if (!coupon.trim()) return;
        setValidatingCoupon(true);
        setCouponError("");
        try {
            const data = await fetchFromBackend('/api/coupons/validate', {
                method: 'POST',
                body: JSON.stringify({ code: coupon.trim(), amount: basePriceUSD, account_type_id: null })
            });
            if (data.valid) {
                setAppliedCoupon(data);
                setCouponError("");
            } else {
                setAppliedCoupon(null);
                setCouponError(data.error || 'Invalid coupon code');
            }
        } catch (error) {
            console.error('Coupon error:', error);
            setCouponError('Failed to validate coupon');
        } finally {
            setValidatingCoupon(false);
        }
    };

    // Re-validate coupon when config changes (and price likely changes)
    useEffect(() => {
        if (appliedCoupon && coupon) {
            handleApplyCoupon();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [size, type, model]);


    const handleContinue = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
        else handleSubmit();
    };

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Explicit MT5 Group Logic
            let mt5Group = '';
            // Lite (Standard)
            if (model === 'standard') {
                if (type === 'Instant') mt5Group = 'demo\\SF\\0-Pro';
                else if (type === '1-step') mt5Group = 'demo\\SF\\1-SF';
                else if (type === '2-step') mt5Group = 'demo\\SF\\2-SF';
            }
            // Prime (Pro)
            else if (model === 'pro') {
                if (type === 'Instant') mt5Group = 'demo\\S\\0-SF';
                else if (type === '1-step') mt5Group = 'demo\\S\\1-SF';
                else if (type === '2-step') mt5Group = 'demo\\S\\2-SF';
            }

            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: type.toLowerCase(),
                    model,
                    size,
                    mt5Group,
                    platform: 'MT5',
                    gateway: 'Sharkpay',
                    customerName: `${formData.firstName} ${formData.lastName}`,
                    customerEmail: formData.email,
                    country: formData.country,
                    phone: formData.phone,
                    referralCode: formData.referralCode,
                    coupon: appliedCoupon ? coupon : undefined
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create order');

            if (data.paymentUrl) {
                setPaymentUrl(data.paymentUrl);
                setShowPaymentModal(true);
            } else {
                alert('Order created but no payment URL returned.');
            }
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Payment initialization failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full md:h-[calc(100vh-2rem)] relative w-full bg-[#EDF6FE] md:rounded-3xl md:my-4 md:mr-4 overflow-hidden border border-slate-200/50 shadow-2xl">
            <main className="flex-1 overflow-y-auto w-full relative bg-[#EDF6FE]">

                {/* Stepper Header */}
                <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 border-b border-slate-100 bg-[#EDF6FE]/90 backdrop-blur-md sticky top-0 z-20">
                    <h1 className="text-2xl font-bold text-[#0a0d20] mb-4 md:mb-0">New Challenge</h1>
                    <div className="flex items-center gap-4 text-sm font-medium">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center gap-2">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors",
                                    currentStep >= step ? "bg-blue-500 text-[#0a0d20]" : "bg-slate-200 text-slate-500"
                                )}>
                                    {step}
                                </div>
                                <span className={cn(currentStep >= step ? "text-[#0a0d20]" : "text-slate-500")}>
                                    {step === 1 ? "Configure" : step === 2 ? "Register" : "Pay"}
                                </span>
                                {step < 3 && <div className="w-8 h-px bg-slate-200 mx-2 hidden md:block"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-12 pb-24">

                    {/* Step 1: Configuration (Replaces old UI) */}
                    <div className={cn("grid grid-cols-1 xl:grid-cols-3 gap-8", currentStep !== 1 && "hidden")}>

                        {/* Config Column */}
                        <div className="xl:col-span-2 space-y-8">
                            {/* Type */}
                            <section>
                                <SectionHeader title="Challenge Type" sub="Choose your evaluation path" />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {CHALLENGE_TYPES.map(t => {
                                        const isDisabled = model === 'pro' && t.id === '1-step';
                                        return (
                                            <RadioPill
                                                key={t.id}
                                                active={type === t.id}
                                                label={t.label}
                                                subLabel={t.desc}
                                                disabled={isDisabled}
                                                onClick={() => { if (!isDisabled) setType(t.id); }}
                                            />
                                        );
                                    })}
                                </div>
                            </section>

                            {/* Model */}
                            <section>
                                <SectionHeader title="Model" sub="Choose your account tier" />
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {MODELS.map(m => (
                                        <RadioPill
                                            key={m.id}
                                            active={model === m.id}
                                            label={m.label}
                                            subLabel={m.desc}
                                            onClick={() => {
                                                setModel(m.id);
                                                if (m.id === 'pro' && type === '1-step') setType('2-step');
                                            }}
                                        />
                                    ))}
                                </div>
                            </section>

                            {/* Size */}
                            <section>
                                <SectionHeader title="Account Size" sub="Select starting balance" />
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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

                            {/* Platform */}
                            <section>
                                <SectionHeader title="Platform" sub="Trading interface" />
                                <div className="grid grid-cols-1 gap-4 max-w-sm">
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
                        </div>

                        {/* Summary Column (Sticky) */}
                        <div className="xl:col-span-1">
                            <div className="sticky top-24 space-y-6">
                                {/* Coupon */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                                    <h3 className="font-bold text-sm mb-3 text-slate-700">Have a coupon?</h3>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            placeholder="CODE"
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:border-blue-500"
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
                                            className="px-4 text-sm font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 disabled:opacity-50"
                                        >
                                            Apply
                                        </button>
                                    </div>
                                    {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
                                    {appliedCoupon && (
                                        <div className="flex items-center gap-2 text-xs text-green-600 mt-2 font-medium">
                                            <Check size={12} /> Coupon ({appliedCoupon.coupon.code}) Applied: -${discountAmount}
                                            {appliedCoupon.discount.type === 'percentage' && ` (${appliedCoupon.discount.value}% OFF)`}
                                        </div>
                                    )}
                                </div>

                                {/* Order Summary */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg">
                                    <h3 className="font-bold text-lg mb-6 border-b border-slate-100 pb-4">Order Summary</h3>
                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Plan</span>
                                            <span className="font-medium text-slate-800">${size.toLocaleString()} Account</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Type</span>
                                            <span className="font-medium text-slate-800">{CHALLENGE_TYPES.find(t => t.id === type)?.label}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Model</span>
                                            <span className="font-medium text-slate-800">{MODELS.find(m => m.id === model)?.label}</span>
                                        </div>

                                        <div className="h-px bg-slate-100 my-2" />

                                        <div className="flex justify-between items-center">
                                            <span className="text-slate-500">Subtotal</span>
                                            <span className="font-mono text-slate-700">${basePriceUSD}</span>
                                        </div>
                                        {appliedCoupon && (
                                            <div className="flex justify-between items-center text-green-600">
                                                <span>
                                                    Discount ({appliedCoupon.coupon.code})
                                                    {appliedCoupon.discount.type === 'percentage' && ` - ${appliedCoupon.discount.value}%`}
                                                </span>
                                                <span className="font-mono">-${discountAmount}</span>
                                            </div>
                                        )}

                                        <div className="h-px bg-slate-100 my-2" />

                                        <div className="flex justify-between items-end">
                                            <span className="font-bold text-lg text-slate-800">Total</span>
                                            <div className="text-right">
                                                <div className="text-2xl font-black text-blue-600">${finalPriceUSD}</div>
                                                <div className="text-xs text-slate-400">approx ₹{Math.round(finalPriceUSD * EXCHANGE_RATE_INR).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>


                    {/* Step 2: Register (Existing Logic Kept) */}
                    <div className={cn("space-y-8 max-w-4xl mx-auto", currentStep !== 2 && "hidden")}>
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#0a0d20]">Create Your Account</h2>
                            <p className="text-slate-500">Enter your details to create your secure dashboard account.</p>
                        </div>

                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Form Inputs similar to original */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-700">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Country</label>
                                <select
                                    value={formData.country}
                                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">Select Country</option>
                                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Phone Number</label>
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">Referral Code (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.referralCode}
                                    onChange={(e) => setFormData({ ...formData, referralCode: e.target.value })}
                                    className="w-full border border-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div className="md:col-span-2 pt-4">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.terms}
                                        onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                                        className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-600">I agree to the Terms & Conditions and Privacy Policy.</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Step 3: Pay */}
                    <div className={cn("space-y-6 text-center py-20", currentStep !== 3 && "hidden")}>
                        <h2 className="text-2xl font-bold text-[#0a0d20]">Complete Payment</h2>
                        <div className="flex flex-col items-center justify-center gap-6">
                            <div className="p-8 bg-white border border-blue-200 rounded-2xl shadow-xl w-64">
                                <h3 className="text-2xl font-bold text-blue-600">UPI</h3>
                                <p className="text-slate-500 text-sm mt-2">Secure Instant Payment</p>
                                <div className="mt-4 text-xl font-mono font-bold text-slate-800">
                                    ₹{Math.round(finalPriceUSD * EXCHANGE_RATE_INR).toLocaleString()}
                                </div>
                            </div>
                            <p className="text-slate-500 max-w-sm">Click "Pay with UPI" below to launch the secure payment gateway.</p>
                        </div>
                    </div>

                </div>

                {/* Footer Bar */}
                <div className="p-6 bg-[#EDF6FE] border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
                    <div className="flex items-center gap-6">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Due</p>
                            <p className="text-2xl font-bold text-[#0a0d20] tracking-tight">${finalPriceUSD.toFixed(2)}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {currentStep > 1 && (
                            <button
                                onClick={handleBack}
                                disabled={loading}
                                className="px-6 py-3 font-bold text-slate-600 hover:bg-slate-200/50 rounded-xl transition-all"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleContinue}
                            disabled={loading || (currentStep === 1 && !finalPriceUSD) || (currentStep === 2 && (!formData.email || !formData.terms))}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.95] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:active:scale-100"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (currentStep === 3 ? "Pay with UPI" : "Continue")} <ArrowRight size={18} />
                        </button>
                    </div>
                </div>

            </main>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setShowPaymentModal(false)}>
                    <div className="relative w-full h-full md:w-[600px] md:h-[800px] md:rounded-2xl overflow-hidden bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setShowPaymentModal(false)}
                            className="absolute top-4 right-4 z-10 bg-white shadow rounded-full p-2"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <iframe src={paymentUrl} className="w-full h-full border-0" title="Checkout" />
                    </div>
                </div>
            )}
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <div className="flex h-screen overflow-hidden bg-[#FFFFFF] relative font-sans">
            <PublicSidebar />
            <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#EDF6FE]"><Loader2 className="animate-spin text-blue-500" /></div>}>
                <CheckoutContent />
            </Suspense>
        </div>
    );
}
