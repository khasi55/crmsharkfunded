"use client";

import { useEffect, useState, use } from "react";
import EquityCurveChart from "@/components/dashboard/EquityCurveChart";
import TradingObjectives from "@/components/dashboard/TradingObjectives";
import TradeHistory from "@/components/dashboard/TradeHistory";
import TradeMonthlyCalendar from "@/components/dashboard/TradeMonthlyCalendar";
import TradeAnalysis from "@/components/dashboard/TradeAnalysis";
import RiskAnalysis from "@/components/dashboard/RiskAnalysis";
import PageLoader from "@/components/ui/PageLoader";
import Image from "next/image";
import { motion } from "framer-motion";
import { Copy, Check, QrCode } from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from 'qrcode.react';

export default function PublicDashboardPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                setLoading(true);
                // Correct path based on server.ts mounting
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.sharkfunded.co';
                const response = await fetch(`${backendUrl}/api/public-performance/performance/${token}`);
                if (!response.ok) throw new Error('Shared dashboard not found');
                const result = await response.json();
                console.log("✅ Public data fetched:", result);
                setData(result);
            } catch (err: any) {
                console.error("Fetch error:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchPublicData();
    }, [token]);

    if (loading) return <PageLoader isLoading={true} text="LOADING PERFORMANCE..." />;

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#EDF6FE] flex flex-col items-center justify-center p-4 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-[#050923] border border-white/10 rounded-[2.5rem] p-10 md:p-14 shadow-2xl max-w-lg w-full relative overflow-hidden"
                >
                    <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8">
                        <Image src="/shark-icon.svg" alt="error" width={48} height={48} className="w-full h-full object-contain p-4" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-3">Private Dashboard</h1>
                    <p className="text-gray-400 text-sm md:text-base max-w-sm mx-auto leading-relaxed">
                        This trading performance is private or the link has expired. Join SharkFunded to start your journey.
                    </p>
                    <a
                        href="https://sharkfunded.com"
                        className="inline-block mt-10 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-600/20"
                    >
                        Visit sharkfunded.com
                    </a>

                    {/* Background decorative glow */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                </motion.div>
            </div>
        );
    }

    const { account, objectives, trades, equityCurve, analysis, risk } = data;

    return (
        <div className="min-h-screen bg-[#EDF6FE] text-slate-900 font-sans selection:bg-blue-500/10">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 px-4 md:px-8 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 flex items-center justify-center shrink-0">
                                <Image src="/shark-icon.svg" alt="logo" width={40} height={40} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-xl font-black text-slate-900 tracking-tight">
                                SharkFunded
                            </span>
                        </Link>
                        <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                        <div className="hidden sm:block">
                            <h2 className="font-extrabold text-sm text-slate-500 uppercase tracking-widest leading-none mb-1.5">Trading Performance</h2>
                            <div className="flex items-center gap-1.5">
                                <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                                <p className="text-[11px] text-blue-600 font-black uppercase tracking-wider leading-none">
                                    {account.account_type}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Right Section: Auth Actions */}
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors hidden sm:block"
                        >
                            Login
                        </Link>
                        <Link
                            href="https://app.sharkfunded.com/checkoutpage"
                            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                        >
                            Get Started
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
                {/* Affiliate Code Card v2 */}
                {account.referral_code && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-8 bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm"
                    >
                        <div className="flex flex-col text-center sm:text-left">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-900 mb-1">
                                Use my referral code: <span className="font-bold text-blue-600">{account.referral_code}</span>
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-500">
                                Sign up and receive a discount on your evaluation
                            </p>
                        </div>

                        <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                            <QRCodeSVG
                                value={`https://app.sharkfunded.com/signup?ref=${account.referral_code}`}
                                size={64}
                                level="M"
                                includeMargin={false}
                            />
                        </div>
                    </motion.div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Analysis & Trading Data */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-[#050923] border border-white/10 p-6 rounded-2xl shadow-xl shadow-blue-900/10">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Equity</p>
                                <p className="text-2xl font-bold text-white">${account.current_equity.toLocaleString()}</p>
                            </div>
                            <div className="bg-[#050923] border border-white/10 p-6 rounded-2xl shadow-xl shadow-blue-900/10">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Balance</p>
                                <p className="text-2xl font-bold text-white">${account.current_balance.toLocaleString()}</p>
                            </div>
                            <div className="bg-[#050923] border border-white/10 p-6 rounded-2xl shadow-xl shadow-blue-900/10">
                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Initial Balance</p>
                                <p className="text-2xl font-bold text-white">${account.initial_balance.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Trade Analysis Gauges */}
                        <TradeAnalysis trades={analysis.all} isPublic={true} />

                        {/* Chart Area */}
                        <div className="relative">
                            <EquityCurveChart
                                account={account}
                                trades={trades}
                                initialBalance={account.initial_balance}
                                initialData={equityCurve}
                                isPublic={true}
                            />
                        </div>

                        {/* Risk Analysis */}
                        <RiskAnalysis account={account} data={risk} isPublic={true} />

                        {/* Monthly Calendar */}
                        <TradeMonthlyCalendar trades={analysis.all} isPublic={true} />

                        {/* Trade History */}
                        <div className="relative">
                            <TradeHistory trades={trades} isPublic={true} />
                        </div>
                    </div>

                    {/* Right Column: Objectives */}
                    <div className="space-y-8">
                        <div className="sticky top-24">
                            <TradingObjectives objectives={objectives} account={account} isPublic={true} />
                        </div>
                    </div>
                </div>
            </main>

            <footer className="border-t border-slate-200 py-12 text-center text-slate-500">
                <div className="max-w-7xl mx-auto px-4">
                    <p className="text-sm mb-4">Verification provided by <span className="font-bold text-slate-900">SharkFunded Performance Labs</span></p>
                    <p className="text-xs uppercase tracking-widest font-bold text-blue-600">Become a Funded Shark</p>
                </div>
            </footer>
        </div>
    );
}
