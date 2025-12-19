"use client";

import { motion } from "framer-motion";
import { AccountProvider } from "@/contexts/AccountContext";
import BehavioralBias from "@/components/overview/BehavioralBias";
import DayPerformanceChart from "@/components/overview/DayPerformanceChart";
import LevelBadge from "@/components/overview/LevelBadge";
import InstrumentStats from "@/components/overview/InstrumentStats";
import SessionStats from "@/components/overview/SessionStats";
import ProfitabilityGauge from "@/components/overview/ProfitabilityGauge";
import { Activity } from "lucide-react";

function OverviewContent() {
    return (
        <div className="flex h-screen overflow-hidden bg-[#0a0f1c] text-white">
            <div className="flex-1 p-8 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
                <div className="max-w-[1600px] mx-auto space-y-6">

                    {/* Page Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-between items-center mb-8"
                    >
                        <div>
                            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                                Overview
                            </h1>
                            <p className="text-gray-400 text-sm mt-1">Detailed performance analytics and behavioral insights</p>
                        </div>
                    </motion.div>

                    {/* Top Row: Balance Chart + Behavioral Bias + Daily Performance */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[350px]">
                        {/* Large Chart Area (Balance History Placeholder) - Span 4 */}
                        <div className="lg:col-span-4 bg-[#121826]/30 border border-white/5 rounded-2xl p-6 relative overflow-hidden group min-h-[350px] flex flex-col">
                            <h3 className="text-white font-medium text-lg mb-4 relative z-10 flex items-center justify-between">
                                Balance History
                                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider bg-white/5 px-2 py-0.5 rounded">All Time</span>
                            </h3>
                            <div className="flex-1 flex items-center justify-center text-gray-500 text-sm relative z-10 border border-dashed border-white/10 rounded-xl bg-[#0a0f1c]/50">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/5">
                                        <Activity className="w-8 h-8 text-blue-400" />
                                    </div>
                                    <p className="text-gray-400 font-medium">Chart Visualization</p>
                                    <p className="text-[10px] text-gray-600 mt-1">Coming Soon</p>
                                </div>
                            </div>
                        </div>

                        {/* Behavioral Bias - Span 4 */}
                        <div className="lg:col-span-4 min-h-[350px]">
                            <BehavioralBias />
                        </div>

                        {/* Trading Day Performance - Span 4 */}
                        <div className="lg:col-span-4 min-h-[350px]">
                            <DayPerformanceChart />
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
                            <ProfitabilityGauge />
                        </div>
                    </div>

                    {/* Bottom Row: Instrument Stats + Session Stats */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px]">
                        {/* Instrument Stats */}
                        <div className="h-full">
                            <InstrumentStats />
                        </div>

                        {/* Session Stats */}
                        <div className="h-full">
                            <SessionStats />
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
