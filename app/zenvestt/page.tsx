"use client";

import { useAccount } from "@/contexts/AccountContext";
import { motion } from "framer-motion";
import { Sparkles, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { fetchFromBackend } from "@/lib/backend-api";

export default function ZenvesttPage() {
    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center space-y-8 max-w-4xl mx-auto">

            {/* Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="space-y-6"
            >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 font-medium text-sm">
                    <Sparkles className="w-4 h-4" />
                    <span>Coming Soon</span>
                </div>

                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600">
                        Zenvest
                    </span>
                    <br />
                    Journaling Trading.
                </h1>

                <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    We are crafting the ultimate ecosystem for professional traders.
                    Prepare for institutional-grade analytics, automated journal syncing, and
                    AI-driven performance insights.
                </p>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full pt-12"
            >
                {[
                    { title: "Advanced Analytics", desc: "Deep dive into your trading behavior with precision metrics." },
                    { title: "Seamless Sync", desc: "Real-time trade synchronization across all your accounts." },
                    { title: "AI Insights", desc: "Actionable feedback to refine your strategy and boost profitability." }
                ].map((item, i) => (
                    <div key={i} className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                        <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                        <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                ))}
            </motion.div>

            {/* Notification Form (Visual Only for now) */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-8"
            >

            </motion.div>

        </div>
    );
}
