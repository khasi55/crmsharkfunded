"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, CreditCard, Loader2, ArrowRight, Menu, LogIn, UserPlus, Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PublicSidebar from "@/components/layout/PublicSidebar";

// Mock Data
const PLAN_DETAILS: Record<string, any> = {
    "5K": { price: 49, level: "Starter", features: ["$5,000 Account Balance", "No Time Limit", "1:100 Leverage"] },
    "10K": { price: 99, level: "Standard", features: ["$10,000 Account Balance", "No Time Limit", "1:100 Leverage"] },
    "25K": { price: 199, level: "Professional", features: ["$25,000 Account Balance", "No Time Limit", "1:100 Leverage"] },
    "50K": { price: 299, level: "Elite", features: ["$50,000 Account Balance", "No Time Limit", "1:100 Leverage"] },
    "100K": { price: 549, level: "Master", features: ["$100,000 Account Balance", "No Time Limit", "1:100 Leverage"] },
    "200K": { price: 999, level: "Legend", features: ["$200,000 Account Balance", "No Time Limit", "1:100 Leverage"] },
};

const CHALLENGE_TYPES = [
    { id: "1step", title: "One Step Challenge", description: "Fastest evaluation, 9% profit target", features: ["Only 1 Phase", "Higher Drawdown"] },
    { id: "2step", title: "Two Step Challenge", description: "Traditional evaluation, 8% & 5% targets", features: ["Two Phases", "Standard Drawdown"] },
    { id: "instant", title: "Instant Funding", description: "No evaluation, start earning immediately", features: ["Instant Access", "Lower Leverage"] },
];

function CheckoutContent() {
    const searchParams = useSearchParams();
    const planParam = searchParams.get("plan");

    // State
    const [selectedPlan, setSelectedPlan] = useState<string>("5K");
    const [challengeType, setChallengeType] = useState<string>("2step");
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        firstName: "", lastName: "", email: "", country: "", terms: false
    });

    useEffect(() => {
        if (planParam && PLAN_DETAILS[planParam]) setSelectedPlan(planParam);
    }, [planParam]);

    const plan = PLAN_DETAILS[selectedPlan] || PLAN_DETAILS["5K"];

    const handleContinue = () => {
        if (currentStep < 3) setCurrentStep(currentStep + 1);
        else handleSubmit();
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            // Determine model based on challenge type
            let model = 'challenger'; // default
            let type = '2-step'; // default

            if (challengeType === '1step') type = '1-step';
            else if (challengeType === 'instant') type = 'instant';

            // Map plan "5K" -> 5000
            const size = Number(selectedPlan.replace('K', '000'));

            const response = await fetch('/api/payment/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    model,
                    size,
                    platform: 'MT5', // Defaulting to MT5 as per UI
                    gateway: 'sharkpay',
                    customerName: `${formData.firstName} ${formData.lastName}`,
                    customerEmail: formData.email,
                    country: formData.country
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Failed to create order');

            if (data.paymentUrl) {
                window.location.href = data.paymentUrl;
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
        <div className="flex-1 flex flex-col h-full relative w-full bg-[#EDF6FE] md:rounded-3xl md:my-4 md:mr-4 overflow-hidden border border-slate-200/50 shadow-2xl">
            {/* 
               Dashboard uses bg-[#EDF6FE] (Light Blue/White). 
               We keep this frame but make the inner content dark to suit the checkout theme 
               OR we keep it dark if the user prefers dark. 
               The user said "same to same dashboard". 
               If the dashboard is light (based on layout.tsx bg-[#EDF6FE]), then this should be too?
               However, the checkout page was fully dark. 
               I will keep the outer structure pure layout.tsx, and the inner <main> can be dark to preserve the checkout aesthetic 
               while respecting the "rounded sidebar" layout request.
            */}
            <main className="flex-1 overflow-y-auto w-full relative bg-[#0a0f1c]">

                {/* Stepper Header */}
                <div className="flex flex-col md:flex-row items-center justify-between p-6 md:p-8 border-b border-white/5 bg-[#0a0f1c]/90 backdrop-blur-md sticky top-0 z-20">
                    <h1 className="text-2xl font-bold text-white mb-4 md:mb-0">New Challenge</h1>

                    <div className="flex items-center gap-4 text-sm font-medium">
                        {[1, 2, 3].map((step) => (
                            <div key={step} className="flex items-center gap-2">
                                <div className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs transition-colors",
                                    currentStep >= step ? "bg-blue-500 text-white" : "bg-white/10 text-slate-500"
                                )}>
                                    {step}
                                </div>
                                <span className={cn(currentStep >= step ? "text-white" : "text-slate-500")}>
                                    {step === 1 ? "Set Up" : step === 2 ? "Register" : "Pay"}
                                </span>
                                {step < 3 && <div className="w-8 h-px bg-white/10 mx-2 hidden md:block"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-12 pb-24">
                    {/* Step 1: Configuration */}
                    <div className={cn("space-y-10", currentStep !== 1 && "hidden")}>

                        {/* Platform Select */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Globe size={18} className="text-blue-500" /> Platform
                            </h3>
                            <div className="grid grid-cols-2 gap-4 max-w-md">
                                <button className="p-4 rounded-xl border border-blue-500 bg-[#050923] text-white font-bold text-left ring-1 ring-blue-500/50 shadow-lg shadow-blue-500/10">
                                    MT5
                                    <p className="text-xs text-blue-300 font-normal mt-1">MetaTrader 5</p>
                                </button>
                                <button className="p-4 rounded-xl border border-white/5 bg-[#050923] text-slate-400 font-bold text-left hover:bg-[#0a0f2e] transition-colors">
                                    DX
                                    <p className="text-xs text-slate-500 font-normal mt-1">DXTrade</p>
                                </button>
                            </div>
                        </div>

                        {/* Trading Capital */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <CreditCard size={18} className="text-blue-500" /> Trading Capital
                            </h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                {Object.entries(PLAN_DETAILS).map(([key, details]) => (
                                    <button
                                        key={key}
                                        onClick={() => setSelectedPlan(key)}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all relative overflow-hidden text-left h-24 flex flex-col justify-end group",
                                            selectedPlan === key
                                                ? "bg-blue-600 border-blue-500 text-white shadow-xl shadow-blue-600/20"
                                                : "bg-[#050923] border-white/5 text-slate-400 hover:bg-[#0a0f2e] hover:border-white/10"
                                        )}
                                    >
                                        {selectedPlan === key && <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-white animate-pulse shadow-sm shadow-white/50"></div>}
                                        <span className="text-xs opacity-70 block mb-1 font-medium">Balance</span>
                                        <span className="text-lg font-bold">${key}</span>
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500 flex items-center gap-2">
                                <Shield size={12} />
                                With a ${selectedPlan} account, access up to 1:100 leverage.
                            </p>
                        </div>

                        {/* Challenge Type */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Loader2 size={18} className="text-blue-500" /> Challenge Type
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {CHALLENGE_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        onClick={() => setChallengeType(type.id)}
                                        className={cn(
                                            "p-5 rounded-xl border transition-all text-left relative overflow-hidden group min-h-[160px] flex flex-col justify-between",
                                            challengeType === type.id
                                                ? "bg-[#050923] border-blue-500 text-white ring-1 ring-blue-500 shadow-xl shadow-blue-900/10"
                                                : "bg-[#050923] border-white/5 text-slate-400 hover:bg-[#0a0f2e] hover:border-white/10"
                                        )}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={cn("font-bold text-lg", challengeType === type.id ? "text-white" : "text-slate-300")}>{type.title}</h4>
                                                {challengeType === type.id && <div className="bg-blue-500 rounded-full p-0.5"><Check size={12} className="text-white" /></div>}
                                            </div>
                                            <p className="text-xs text-slate-500 mb-4">{type.description}</p>
                                        </div>

                                        {type.id === "1step" && <span className="absolute top-3 right-3 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/20">POPULAR</span>}
                                        {type.id === "instant" && <span className="absolute top-3 right-3 bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20">NEW</span>}

                                        <div className="space-y-1">
                                            {type.features.map(f => (
                                                <div key={f} className="flex items-center gap-1.5 text-[10px]">
                                                    <Check size={10} className={cn(challengeType === type.id ? "text-blue-400" : "text-slate-600")} />
                                                    <span className={cn(challengeType === type.id ? "text-slate-300" : "text-slate-600")}>{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* Step 2: Register */}
                    <div className={cn("space-y-8", currentStep !== 2 && "hidden")}>

                        <div className="text-center">
                            <h2 className="text-2xl font-bold text-white mb-2">Create Your Account</h2>
                            <p className="text-slate-400 text-sm">Fill in your details to proceed with the challenge.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">First Name</label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full bg-[#050923] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Last Name</label>
                                <input
                                    type="text"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full bg-[#050923] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-400">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-[#050923] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Country</label>
                                <div className="relative">
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full bg-[#050923] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Country</option>
                                        <option value="US">United States</option>
                                        <option value="UK">United Kingdom</option>
                                        <option value="CA">Canada</option>
                                        <option value="AU">Australia</option>
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-400">Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    className="w-full bg-[#050923] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 p-4 bg-[#050923] border border-white/10 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={formData.terms}
                                    onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                                    className="peer w-5 h-5 appearance-none border border-white/20 rounded bg-white/5 checked:bg-blue-500 checked:border-blue-500 transition-colors"
                                />
                                <Check size={12} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 pointer-events-none" />
                            </div>
                            <span className="text-sm text-slate-400 leading-relaxed">
                                I confirm that I have read and agree to the <Link href="#" className="text-blue-400 hover:text-blue-300">Terms & Conditions</Link> and <Link href="#" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>.
                            </span>
                        </label>

                        {/* Summary Card */}
                        <div className="bg-[#050923] border border-white/10 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Selected Plan</p>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    ${selectedPlan} Challenge
                                    <span className="text-sm font-normal text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                                        {CHALLENGE_TYPES.find(t => t.id === challengeType)?.title}
                                    </span>
                                </h3>
                            </div>
                            <div className="text-right">
                                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Total</p>
                                <p className="text-2xl font-bold text-blue-400">${plan.price.toFixed(2)}</p>
                            </div>
                        </div>

                    </div>

                    {/* Step 3: Pay */}
                    <div className={cn("space-y-6 text-center py-20", currentStep !== 3 && "hidden")}>
                        <h2 className="text-2xl font-bold text-white">Payment</h2>
                        <p className="text-slate-400">Secure payment integration goes here.</p>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="p-6 bg-[#0a0f1c] border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
                    <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Price</p>
                            <p className="text-2xl font-bold text-white tracking-tight">${plan.price.toFixed(2)}</p>
                        </div>
                        <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <input
                                type="text"
                                placeholder="Discount Code"
                                className="bg-[#0a0f1c] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50 w-full"
                            />
                            <button className="bg-white/5 hover:bg-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium border border-white/10 transition-colors">Apply</button>
                        </div>
                    </div>

                    <button
                        onClick={handleContinue}
                        disabled={loading}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.95] transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : (
                            <>
                                {currentStep === 3 ? "Complete Order" : "Continue"}
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </div>

            </main>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <div className="flex h-screen overflow-hidden bg-[#FFFFFF] relative font-sans">
            {/* Sidebar Reusing exact dashboard structure */}
            <PublicSidebar />

            <Suspense fallback={
                <div className="flex-1 flex items-center justify-center bg-[#0a0f1c]">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
            }>
                <CheckoutContent />
            </Suspense>
        </div>
    );
}
