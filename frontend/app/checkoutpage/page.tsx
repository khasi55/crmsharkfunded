"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Check, CreditCard, Loader2, ArrowRight, Menu, LogIn, UserPlus, Globe, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import PublicSidebar from "@/components/layout/PublicSidebar";
import { COUNTRIES } from "@/lib/countries";

// Mock Data
const PLAN_DETAILS: Record<string, any> = {
    "100K": { price: 549, level: "Master", features: ["$100,000 Account Balance", "No Time Limit", "1:100 Leverage"] },
};

const CHALLENGE_TYPES = [
    { id: "competition", title: "Shark Battle Ground", description: "Join the ultimate trading arena. Win prizes.", features: ["$9 Entry", "1:30 Leverage", "100K Account", "Starts Mon (Asian) - Ends Sun"] },
];

function CheckoutContent() {
    const searchParams = useSearchParams();
    const planParam = searchParams.get("plan");

    // State
    const [selectedPlan, setSelectedPlan] = useState<string>("100K");
    const [challengeType, setChallengeType] = useState<string>("competition");
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        firstName: "", lastName: "", email: "", country: "", terms: false, password: ""
    });

    useEffect(() => {
        if (planParam && PLAN_DETAILS[planParam]) setSelectedPlan(planParam);
    }, [planParam]);

    useEffect(() => {
        if (challengeType === 'competition') {
            setSelectedPlan("100K");
        }
    }, [challengeType]);

    const plan = PLAN_DETAILS[selectedPlan] || PLAN_DETAILS["5K"];

    // Override price if Competition
    if (challengeType === 'competition') {
        plan.price = 9;
    }

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
            // Determine model based on challenge type
            let model = 'challenger'; // default
            let type = '2-step'; // default

            if (challengeType === '1step') type = '1-step';
            else if (challengeType === 'instant') type = 'instant';
            else if (challengeType === 'competition') type = 'competition';

            // Map plan "5K" -> 5000
            let size = Number(selectedPlan.replace('K', '000'));

            // Force 100K for Competition
            if (type === 'competition') {
                size = 100000;
            }

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
                    country: formData.country,
                    password: formData.password
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
        <div className="flex-1 flex flex-col h-full md:h-[calc(100vh-2rem)] relative w-full bg-[#EDF6FE] md:rounded-3xl md:my-4 md:mr-4 overflow-hidden border border-slate-200/50 shadow-2xl">
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
                                    {step === 1 ? "Set Up" : step === 2 ? "Register" : "Pay"}
                                </span>
                                {step < 3 && <div className="w-8 h-px bg-slate-200 mx-2 hidden md:block"></div>}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-12 pb-24">
                    {/* Step 1: Configuration */}
                    <div className={cn("space-y-10", currentStep !== 1 && "hidden")}>

                        {/* Platform Select */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-[#0a0d20] flex items-center gap-2">
                                <Globe size={18} className="text-blue-500" /> Platform
                            </h3>
                            <div className="grid grid-cols-1 gap-4 max-w-md">
                                <button className="p-4 rounded-xl border border-blue-500 bg-white text-[#0a0d20] font-bold text-left ring-1 ring-blue-500/50 shadow-lg shadow-blue-500/10">
                                    MT5
                                    <p className="text-xs text-blue-300 font-normal mt-1">MetaTrader 5</p>
                                </button>
                            </div>
                        </div>

                        {/* Trading Capital */}
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-[#0a0d20] flex items-center gap-2">
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
                                                : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
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
                            <h3 className="text-lg font-bold text-[#0a0d20] flex items-center gap-2">
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
                                                ? "bg-white border-blue-500 text-[#0a0d20] ring-1 ring-blue-500 shadow-xl shadow-blue-900/10"
                                                : type.id === 'competition' ? "bg-gradient-to-br from-blue-50/50 to-white border-blue-200 text-slate-800 hover:border-blue-400 shadow-sm" : "bg-white border-slate-100 text-slate-500 hover:bg-slate-50 hover:border-slate-200"
                                        )}
                                    >
                                        <div>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={cn("font-bold text-lg", challengeType === type.id ? "text-[#0a0d20]" : "text-slate-700")}>{type.title}</h4>
                                                {challengeType === type.id && <div className="bg-blue-500 rounded-full p-0.5"><Check size={12} className="text-[#0a0d20]" /></div>}
                                            </div>
                                            <p className="text-xs text-slate-500 mb-4">{type.description}</p>
                                        </div>

                                        {type.id === "competition" && <span className="absolute top-3 right-3 bg-blue-100 text-blue-600 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span> LIVE</span>}

                                        {type.id === "1step" && <span className="absolute top-3 right-3 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded border border-yellow-500/20">POPULAR</span>}
                                        {type.id === "instant" && <span className="absolute top-3 right-3 bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20">NEW</span>}

                                        <div className="space-y-1">
                                            {type.features.map(f => (
                                                <div key={f} className="flex items-center gap-1.5 text-[10px]">
                                                    <Check size={10} className={cn(challengeType === type.id ? "text-blue-600" : "text-slate-600")} />
                                                    <span className={cn(challengeType === type.id ? "text-[#0a0d20] font-medium" : "text-slate-600")}>{f}</span>
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
                            <h2 className="text-2xl font-bold text-[#0a0d20] mb-2">Create Your Account</h2>
                            <p className="text-slate-500 text-sm">Fill in your details to proceed with the challenge.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-500">First Name</label>
                                <input
                                    type="text"
                                    placeholder="John"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#0a0d20] focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-500">Last Name</label>
                                <input
                                    type="text"
                                    placeholder="Doe"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#0a0d20] focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-medium text-slate-500">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="john@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#0a0d20] focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-500">Country</label>
                                <div className="relative">
                                    <select
                                        value={formData.country}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#0a0d20] focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer"
                                    >
                                        <option value="">Select Country</option>
                                        {COUNTRIES.map((c) => (
                                            <option key={c.code} value={c.code}>
                                                {c.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-500">Password</label>
                                <input
                                    type="password"
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3.5 text-[#0a0d20] focus:outline-none focus:border-blue-500/50 transition-colors"
                                />
                            </div>
                        </div>

                        {/* Terms */}
                        <label className="flex items-start gap-3 p-4 bg-white border border-slate-200 rounded-xl cursor-pointer hover:bg-white/5 transition-colors">
                            <div className="relative flex items-center mt-0.5">
                                <input
                                    type="checkbox"
                                    checked={formData.terms}
                                    onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                                    className="peer w-5 h-5 appearance-none border border-slate-200 rounded bg-white/5 checked:bg-blue-500 checked:border-blue-500 transition-colors"
                                />
                                <Check size={12} className="absolute inset-0 m-auto text-[#0a0d20] opacity-0 peer-checked:opacity-100 pointer-events-none" />
                            </div>
                            <span className="text-sm text-slate-500 leading-relaxed">
                                I confirm that I have read and agree to the <Link href="#" className="text-blue-400 hover:text-blue-300">Terms & Conditions</Link> and <Link href="#" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>.
                            </span>
                        </label>

                        {/* Summary Card */}
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
                            <div>
                                <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">Selected Plan</p>
                                <h3 className="text-xl font-bold text-[#0a0d20] flex items-center gap-2">
                                    ${selectedPlan} Challenge
                                    <span className="text-sm font-normal text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-slate-100">
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
                        <h2 className="text-2xl font-bold text-[#0a0d20]">Payment Method</h2>
                        <div className="flex flex-col items-center justify-center gap-4">
                            <div className="p-6 bg-white border border-blue-500 rounded-2xl shadow-lg shadow-blue-500/10 min-w-[200px]">
                                <h3 className="text-xl font-bold text-blue-600">UPI</h3>
                                <p className="text-slate-500 text-sm mt-1">Secure Checkout</p>
                            </div>
                            <p className="text-slate-500 max-w-sm mx-auto">Click below to proceed with your payment via UPI.</p>
                        </div>
                    </div>
                </div>

                {/* Footer Bar */}
                <div className="p-6 bg-[#EDF6FE] border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 sticky bottom-0 z-20">
                    <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Price</p>
                            <p className="text-2xl font-bold text-[#0a0d20] tracking-tight">${plan.price.toFixed(2)}</p>
                        </div>

                    </div>

                    <div className="flex items-center gap-3 w-full md:w-auto">
                        {currentStep > 1 && (
                            <button
                                onClick={handleBack}
                                disabled={loading}
                                className="w-full md:w-auto text-slate-500 hover:text-[#0a0d20] font-bold py-3 px-6 rounded-xl hover:bg-slate-200/50 transition-all"
                            >
                                Back
                            </button>
                        )}
                        <button
                            onClick={handleContinue}
                            disabled={loading}
                            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-900/20 active:scale-[0.95] transition-all flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (
                                <>
                                    {currentStep === 3 ? "Pay with UPI" : "Continue"}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </div>
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
                <div className="flex-1 flex items-center justify-center bg-[#EDF6FE]">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                </div>
            }>
                <CheckoutContent />
            </Suspense>
        </div>
    );
}
