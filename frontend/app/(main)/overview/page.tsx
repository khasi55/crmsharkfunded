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

import { useEffect, useState } from "react";
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
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
                <div className="p-4 md:p-5 max-w-[1920px] mx-auto">
                    
                    {/* Page Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-4"
                    >
                        <div>
                            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tighter leading-none">
                                Overview
                            </h1>
                            <p className="text-[11px] text-slate-500 font-medium mt-1">Detailed performance analytics and behavioral insight</p>
                        </div>
                    </motion.div>

                    {/* 
                        FULLY RESPONSIVE BENTO GRID 
                        - Tightened gap-[12px] for integrated feel
                    */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[repeat(20,minmax(0,1fr))] gap-[12px] items-start">
                        
                        {/* LEFT SIDEBAR AREA - 6 Units (30%) on Desktop */}
                        <div className="lg:col-span-6 flex flex-col gap-[12px]">
                            <BalanceHistoryChart data={stats?.balanceHistory} />
                            <LevelBadge />
                        </div>

                        {/* MAIN CONTENT AREA - 14 Units (70%) on Desktop */}
                        <div className="lg:col-span-14 flex flex-col gap-[12px]">
                            
                            {/* Row 1: Bias & Daily Performance (Split 7/7) */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-[12px]">
                                <BehavioralBias
                                    totalTrades={stats?.totalTrades}
                                    buyCount={stats?.buyCount}
                                    sellCount={stats?.sellCount}
                                />
                                <DayPerformanceChart data={stats?.dailyChartData} />
                            </div>

                            {/* Row 2: Profitability Gauge - SPANS ENTIRE MAIN AREA */}
                            <ProfitabilityGauge
                                winRate={stats?.profitability?.winRate}
                                wonCount={stats?.profitability?.wonCount}
                                lostCount={stats?.profitability?.lostCount}
                                avgHolding={stats?.profitability?.avgHolding}
                            />

                            {/* Row 3: Session Stats & Instrument Stats (Split 7/7) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                                <SessionStats sessions={stats?.sessions} />
                                <InstrumentStats instruments={stats?.instruments} />
                            </div>
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
