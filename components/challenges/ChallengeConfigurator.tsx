"use client";

import { useState } from "react";
import { Check, Info, CreditCard, ChevronDown, ChevronUp, Lock, Loader2, Copy, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

// --- Data ---
const CHALLENGE_TYPES = [
    { id: "1-step", label: "One Step", desc: "Single phase evaluation" },
    { id: "2-step", label: "Two Step", desc: "Standard verification", recommended: true },
    { id: "Instant", label: "Instant", desc: "Lower risk, lower cost" }
];

const MODELS = [
    { id: "standard", label: "SharkFunded", desc: "Classic model" },
    { id: "pro", label: "SharkFunded Pro", desc: "Higher leverage" }
];

const SIZES = [5000, 10000, 25000, 50000, 100000, 200000];

const PLATFORMS = [
    { id: "mt5", label: "MetaTrader 5" },
    { id: "tradelocker", label: "TradeLocker" }
];

// --- Utility Components ---
const RadioPill = ({
    active,
    label,
    onClick,
    subLabel = ""
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    subLabel?: string
}) => (
    <div
        onClick={onClick}
        className={cn(
            "relative flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all duration-200 select-none",
            active
                ? "bg-primary/10 border-primary shadow-[0_0_0_1px_rgba(var(--primary),1)]"
                : "bg-card border-border hover:border-gray-600"
        )}
    >
        {/* Radio Circle */}
        <div className={cn(
            "w-5 h-5 rounded-full border flex items-center justify-center transition-colors",
            active ? "border-primary bg-primary" : "border-gray-500"
        )}>
            {active && <div className="w-2 h-2 rounded-full bg-white" />}
        </div>

        <div className="flex flex-col">
            <span className={cn("text-sm font-bold", active ? "text-primary" : "text-foreground")}>{label}</span>
            {subLabel && <span className="text-[10px] text-muted-foreground">{subLabel}</span>}
        </div>
    </div>
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

    // State
    const [type, setType] = useState("2-step");
    const [model, setModel] = useState("standard");
    const [size, setSize] = useState(100000);
    const [platform, setPlatform] = useState("mt5");
    const [coupon, setCoupon] = useState("");
    const [showRules, setShowRules] = useState(true);

    const [isPurchasing, setIsPurchasing] = useState(false);
    const [purchasedCredentials, setPurchasedCredentials] = useState<any>(null);

    // Mock Price Calc
    const basePrice = (size * 0.005) + (type === "1-step" ? 50 : 0);
    const finalPrice = Math.round(basePrice);

    const handlePurchase = async () => {
        setIsPurchasing(true);
        try {
            const res = await fetch('/api/challenges/purchase', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    model,
                    size,
                    platform,
                    coupon
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                setPurchasedCredentials(data.credentials);
            } else {
                alert(data.error || 'Purchase failed');
            }
        } catch (error) {
            console.error('Purchase error:', error);
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
                <h1 className="text-3xl font-black tracking-tight text-white">New Challenge</h1>
            </div>

            <div className="flex flex-col xl:flex-row gap-12">

                {/* --- Left Column: Configuration --- */}
                <div className="flex-1 space-y-10">

                    {/* 1. Challenge Type */}
                    <section>
                        <SectionHeader title="Challenge Type" sub="Choose the type of challenge you want to take" />
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {CHALLENGE_TYPES.map(t => (
                                <RadioPill
                                    key={t.id}
                                    active={type === t.id}
                                    label={t.label}
                                    subLabel={t.desc}
                                    onClick={() => setType(t.id)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 2. Model */}
                    <section>
                        <SectionHeader title="Model" sub="Choose the trading model" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {MODELS.map(m => (
                                <RadioPill
                                    key={m.id}
                                    active={model === m.id}
                                    label={m.label}
                                    subLabel={m.desc}
                                    onClick={() => setModel(m.id)}
                                />
                            ))}
                        </div>
                    </section>

                    {/* 3. Customize Rules (Accordion) */}
                    <section className="rounded-xl border border-border bg-card/50 overflow-hidden">
                        <div
                            onClick={() => setShowRules(!showRules)}
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded bg-primary/10 text-primary">
                                    <Info size={18} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">Customise Trading Rules</h4>
                                    <p className="text-[10px] text-muted-foreground">Adjust your challenge parameters</p>
                                </div>
                            </div>
                            {showRules ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>

                        <AnimatePresence>
                            {showRules && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: "auto", opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="border-t border-border px-4 py-6 bg-card"
                                >
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-xs font-bold mb-3 text-muted-foreground">Profit Target (Phase 1)</p>
                                            <div className="flex gap-2">
                                                <button className="flex-1 py-2 text-xs font-bold rounded border border-primary bg-primary/10 text-primary">8%</button>
                                                <button className="flex-1 py-2 text-xs font-bold rounded border border-border text-muted-foreground hover:bg-white/5">10%</button>
                                            </div>
                                        </div>
                                        {/* More options placeholder */}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </section>

                    {/* 4. Account Size */}
                    <section>
                        <SectionHeader title="Account Size" sub="Choose your preferred account size" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {SIZES.map(s => (
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

                </div>


                {/* --- Right Column: Summary --- */}
                <div className="w-full xl:w-[450px] shrink-0 xl:sticky xl:top-8 space-y-6">

                    {/* Billing Details Placeholder */}
                    <div className="space-y-4">
                        <SectionHeader title="Billing Details" sub="Enter your billing info" />
                        {/* Placeholder Inputs */}
                    </div>

                    {/* Coupon Code */}
                    <div>
                        <SectionHeader title="Coupon Code" sub="Enter a coupon to get a discount" />
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Enter coupon code"
                                className="flex-1 bg-card border border-border rounded-lg px-4 py-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                                value={coupon}
                                onChange={(e) => setCoupon(e.target.value)}
                            />
                            <button className="px-6 font-bold text-sm rounded-lg bg-card border border-border hover:border-primary hover:text-primary transition-all">
                                Apply
                            </button>
                        </div>
                    </div>

                    {/* Order Summary Card */}
                    <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-border bg-muted/10">
                            <h3 className="font-bold text-lg">Order Summary</h3>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="flex justify-between items-start text-sm">
                                <span className="text-muted-foreground">${size.toLocaleString()} — {type === "1-step" ? "One Step" : type === "2-step" ? "Two Step" : "Three Step"} {model === "standard" ? "Shark" : "Shark Pro"}</span>
                                <span className="font-bold font-mono">${finalPrice.toFixed(2)}</span>
                            </div>
                            <div className="text-xs text-muted-foreground">Platform: {PLATFORMS.find(p => p.id === platform)?.label}</div>

                            <div className="h-px bg-border" />

                            <div className="flex justify-between items-end">
                                <span className="text-sm font-bold">Total</span>
                                <span className="text-3xl font-black tracking-tight">${finalPrice.toFixed(2)}</span>
                            </div>

                            {/* Terms Checkbox */}
                            <div className="bg-white/5 rounded-lg p-4 text-[11px] text-muted-foreground space-y-2">
                                <div className="flex gap-2">
                                    <input type="checkbox" className="mt-0.5" />
                                    <span>I agree with all the following terms:</span>
                                </div>
                                <ul className="list-disc pl-5 space-y-1 opacity-80">
                                    <li>I have read and agreed to the Terms of Use.</li>
                                    <li>All information matches government ID.</li>
                                </ul>
                            </div>

                            <button
                                onClick={handlePurchase}
                                disabled={isPurchasing}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                            >
                                {isPurchasing ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Complete Purchase (Mock)
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </div>
    );
}
