"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Shield, Rocket, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

const accounts = [
    { size: "5k", price: 49, target: 400, daily: 250, total: 500 },
    { size: "10k", price: 99, target: 800, daily: 500, total: 1000 },
    { size: "25k", price: 199, target: 2000, daily: 1250, total: 2500 },
    { size: "50k", price: 299, target: 4000, daily: 2500, total: 5000 },
    { size: "100k", price: 499, target: 8000, daily: 5000, total: 10000, recommended: true },
];

export default function ChallengePlans() {
    const [selectedSize, setSelectedSize] = useState(accounts[3]); // Default 50k

    return (
        <div className="space-y-8" id="plans">
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-bold text-foreground tracking-tight">Select Your Challenge</h2>
                <p className="text-muted-foreground">Choose the account size that fits your trading style.</p>
            </div>

            {/* Size Selector */}
            <div className="flex flex-wrap justify-center gap-2">
                {accounts.map((acc) => (
                    <button
                        key={acc.size}
                        onClick={() => setSelectedSize(acc)}
                        className={cn(
                            "px-6 py-3 rounded-lg font-medium transition-all relative border",
                            selectedSize.size === acc.size
                                ? "bg-primary text-primary-foreground border-primary shadow-md"
                                : "bg-card text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
                        )}
                    >
                        ${acc.size.toUpperCase()}
                        {acc.recommended && (
                            <span className="absolute -top-3 -right-2 bg-orange-600 text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider border border-background">
                                Popular
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Plan Details Card */}
            <motion.div
                key={selectedSize.size}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-4xl mx-auto bg-card border border-border rounded-xl overflow-hidden p-8 shadow-sm"
            >
                <div className="grid md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-4xl font-bold text-foreground mb-2">${selectedSize.size.toUpperCase()}</h3>
                            <p className="text-muted-foreground font-medium">Evaluation Phase 1</p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 border border-primary/20 rounded-lg text-primary"><Rocket size={18} /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Profit Target (8%)</p>
                                    <p className="font-bold text-foreground">${selectedSize.target.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500"><Shield size={18} /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Max Daily Loss (5%)</p>
                                    <p className="font-bold text-foreground">${selectedSize.daily.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-500"><Shield size={18} /></div>
                                <div>
                                    <p className="text-xs text-muted-foreground uppercase font-bold tracking-wide">Max Total Loss (10%)</p>
                                    <p className="font-bold text-foreground">${selectedSize.total.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col justify-center space-y-6 md:border-l md:border-border md:pl-8">
                        <ul className="space-y-3">
                            {[
                                "Unlimited Trading Days",
                                "Bi-weekly Payouts",
                                "Scale up to $2M",
                                "News Trading Allowed",
                                "Weekend Holding Allowed"
                            ].map((feat, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Check size={16} className="text-green-500" /> {feat}
                                </li>
                            ))}
                        </ul>

                        <div className="pt-4 border-t border-border">
                            <div className="flex justify-between items-end mb-4">
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">One-time fee</p>
                                    <p className="text-3xl font-bold text-foreground">${selectedSize.price}</p>
                                </div>
                            </div>
                            <button className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg flex items-center justify-center gap-2 transition-colors shadow-md shadow-primary/20">
                                <CreditCard size={18} />
                                Get Funded Now
                            </button>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
