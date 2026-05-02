"use client";

import { motion } from "framer-motion";
import { AccountProvider } from "@/contexts/AccountContext";
import BehavioralBias from "@/components/overview/BehavioralBias";
import BalanceHistoryChart from "@/components/overview/BalanceHistoryChart";
import DayPerformanceChart from "@/components/overview/DayPerformanceChart";
import LevelBadge from "@/components/overview/LevelBadge";
import InstrumentStats from "@/components/overview/InstrumentStats";
import SessionStats from "@/components/overview/SessionStats";
import ProfitabilityGauge from "@/components/overview/ProfitabilityGauge";
import { Activity } from "lucide-react";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { fetchFromBackend } from "@/lib/backend-api";
import PageLoader from "@/components/ui/PageLoader";

function OverviewContent() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            // Use backend helper
            const data = await fetchFromBackend('/api/overview/stats');
            setStats(data.overview);
        } catch (error) {
            console.error("Failed to fetch overview stats", error);
        } finally {
            setLoading(false);
        }
    };





    return (
        <div className="flex h-screen overflow-hidden bg-transparent text-slate-900 relative">
            <PageLoader isLoading={loading} />
            <div className="flex-1 p-8 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* Page Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-between items-center mb-8"
                    >
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
                                Overview
                            </h1>
                            <p className="text-slate-500 text-sm mt-1">Detailed performance analytics and behavioral insights</p>
                        </div>
                    </motion.div>



                    {/* Top Row: Balance Chart + Behavioral Bias + Daily Performance */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[350px]">
                        {/* Large Chart Area (Balance History) - Span 4 */}
                        <BalanceHistoryChart data={stats?.balanceHistory} />

                        {/* Behavioral Bias - Span 4 */}
                        <div className="lg:col-span-4 min-h-[350px]">
                            <BehavioralBias
                                totalTrades={stats?.totalTrades}
                                buyCount={stats?.buyCount}
                                sellCount={stats?.sellCount}
                            />
                        </div>

                        {/* Trading Day Performance - Span 4 */}
                        <div className="lg:col-span-4 min-h-[350px]">
                            <DayPerformanceChart data={stats?.dailyChartData} />
                        </div>
                    </div>

                    {/* Middle Row: Level + Profitability Gauge */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Level Badge - Span 7 */}
                        <div className="lg:col-span-7 h-[280px]">
                            <LevelBadge />
                        </div>

                        {/* Profitability Gauge - Span 5 */}
                        <div className="lg:col-span-5 h-[280px]">
                            <ProfitabilityGauge
                                winRate={stats?.profitability?.winRate}
                                tradesTaken={stats?.totalTrades}
                                wonPct={stats?.profitability?.wonPct}
                                lostPct={stats?.profitability?.lostPct}
                                wonCount={stats?.profitability?.wonCount}
                                lostCount={stats?.profitability?.lostCount}
                                avgHolding={stats?.profitability?.avgHolding}
                            />
                        </div>
                    </div>

                    {/* Bottom Row: Instrument Stats + Session Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px]">
                        {/* Instrument Stats */}
                        <div className="h-full">
                            <InstrumentStats instruments={stats?.instruments} />
                        </div>

                        {/* Session Stats */}
                        <div className="h-full">
                            <SessionStats sessions={stats?.sessions} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function OverviewPage() {
    return (
        <AccountProvider>
            <OverviewContent />
        </AccountProvider>
    )
}
