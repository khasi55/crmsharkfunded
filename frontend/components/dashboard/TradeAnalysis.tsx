"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Trade {
    id: string;
    ticket_number: string;
    symbol: string;
    type: 'buy' | 'sell';
    lots: number;
    open_price: number;
    close_price: number | null;
    open_time: string;
    close_time: string | null;
    profit_loss: number;
    commission?: number;
    swap?: number;
}

interface GaugeCardProps {
    title: string;
    centerLabel: string;
    centerValue: string | number;
    centerSubValue?: string;
    centerValueColor?: string;
    stats: {
        left: { label: string; value: string; subValue?: string };
        middle?: { label: string; value: string };
        right: { label: string; value: string; subValue?: string };
    };
    percentages: {
        left: number; // 0-100 (e.g. Win Rate)
        right: number; // 0-100 (e.g. Loss Rate)
    };
    colors: {
        left: string;
        right: string;
    };
}

const GaugeCard = ({ title, centerLabel, centerValue, centerSubValue, centerValueColor, stats, percentages, colors }: GaugeCardProps) => {
    // Circle properties
    const radius = 80;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    // We only use half circle (top half) - so arc length is PI * radius
    const arcLength = Math.PI * radius;

    // Calculate dash arrays
    // Left segment (Green/Win)
    const leftDash = (percentages.left / 100) * arcLength;
    // Right segment (Red/Loss)
    const rightDash = (percentages.right / 100) * arcLength;

    return (
        <div className="bg-[#050923] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-full relative overflow-hidden group hover:border-white/10 transition-colors">
            <h3 className="text-white font-semibold text-lg mb-6 z-10">{title}</h3>

            <div className="flex flex-col items-center z-10 relative h-[120px] justify-end">
                {/* Single Robust SVG Implementation */}
                <div className="w-[180px] h-[90px] flex items-end justify-center relative">
                    <svg width="180" height="90" viewBox="0 0 180 90" className="overflow-visible">
                        {/* Track Background */}
                        <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />

                        {/* Data Segments - Split based on percentage */}
                        {(() => {
                            const r = 80;
                            const cx = 90;
                            const cy = 90;

                            // Left percentage determines split angle
                            // 0% -> starts at 180 deg (Left, x=10)
                            // 100% -> ends at 0 deg (Right, x=170)
                            const splitAngle = Math.PI - (percentages.left / 100) * Math.PI;

                            const splitX = cx + r * Math.cos(splitAngle);
                            const splitY = cy - r * Math.sin(splitAngle);

                            // Start point (Left side)
                            const startX = 10;
                            const startY = 90;

                            // End point (Right side)
                            const endX = 170;
                            const endY = 90;

                            return (
                                <>
                                    {/* Left Arc (Wins) */}
                                    {percentages.left > 0 && (
                                        <motion.path
                                            d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${splitX} ${splitY}`}
                                            fill="none"
                                            stroke={colors.left}
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                        />
                                    )}

                                    {/* Right Arc (Losses) */}
                                    {/* Only render red arc if we have losses (percentage > 0) */}
                                    {percentages.right > 0 && (
                                        <motion.path
                                            d={`M ${splitX} ${splitY} A ${r} ${r} 0 0 1 ${endX} ${endY}`}
                                            fill="none"
                                            stroke={colors.right}
                                            strokeWidth="12"
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                                        />
                                    )}
                                </>
                            );
                        })()}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute bottom-0 mb-2 text-center">
                        <p className="text-gray-400 text-xs font-medium mb-1">{centerLabel}</p>
                        <p className={`text-xl font-bold ${centerValueColor || 'text-white'}`}>{centerValue}</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mt-8 pt-6 border-t border-white/5">
                <div className="text-center">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">{stats.left.label}</p>
                    <p className="text-white font-semibold text-sm">{stats.left.value}</p>
                    {stats.left.subValue && <p className="text-gray-500 text-[10px]">{stats.left.subValue}</p>}
                </div>
                <div className="text-center">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">{stats.middle?.label || 'Win Rate'}</p>
                    <p className="text-white font-semibold text-sm">{stats.middle?.value || `${percentages.left.toFixed(2)}%`}</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">{stats.right.label}</p>
                    <p className="text-white font-semibold text-sm">{stats.right.value}</p>
                    {stats.right.subValue && <p className="text-gray-500 text-[10px]">{stats.right.subValue}</p>}
                </div>
            </div>

            {/* Glow Effect */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 ${percentages.left > 50 ? 'bg-green-500/5' : 'bg-red-500/5'} blur-[50px] rounded-full pointer-events-none`} />
        </div>
    );
};

import { useAccount } from "@/contexts/AccountContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface TradeAnalysisProps {
    trades?: any[];
    isPublic?: boolean;
}

export default function TradeAnalysis({ trades: initialTrades, isPublic }: TradeAnalysisProps = {}) {
    const accountContext = isPublic ? null : useAccount();
    const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
    const selectedAccount = accountContext?.selectedAccount;

    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (dashboardData.analysis) {
            setStats(dashboardData.analysis);
            setLoading(false);
        } else if (dashboardLoading.global) {
            setLoading(true);
        }
    }, [dashboardData.analysis, dashboardLoading.global]);

    if (loading || !stats) return <div className="h-64 animate-pulse bg-[#050923] rounded-xl" />;

    const safeShort = stats.short_stats || { wins: 0, losses: 0, profit: 0, loss_cost: 0, total_net: 0, win_rate: 0 };
    const safeLong = stats.long_stats || { wins: 0, losses: 0, profit: 0, loss_cost: 0, total_net: 0, win_rate: 0 };
    const safeAll = {
        total: stats.total || 0,
        winRate: stats.win_rate || 0,
        lossRate: 100 - (stats.win_rate || 0),
        winsCount: stats.win_count || 0,
        lossesCount: stats.lose_count || 0
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Short Analysis */}
            <GaugeCard
                title="Short Analysis"
                centerLabel="Profit"
                centerValue={safeShort.total_net >= 0 ? `$${safeShort.total_net.toFixed(2)}` : `-$${Math.abs(safeShort.total_net).toFixed(2)}`}
                centerValueColor={safeShort.total_net >= 0 ? "text-green-400" : "text-white"}
                percentages={{ left: safeShort.win_rate, right: 100 - safeShort.win_rate }}
                stats={{
                    left: { label: `Wins (${safeShort.wins})`, value: `$${safeShort.profit.toFixed(2)}` },
                    middle: { label: "Win Rate", value: `${safeShort.win_rate.toFixed(2)}%` },
                    right: { label: `Losses (${safeShort.losses})`, value: `$${safeShort.loss_cost.toFixed(2)}` }
                }}
                colors={{ left: "#22c55e", right: "#ef4444" }}
            />

            {/* Profitability */}
            <GaugeCard
                title="Profitability"
                centerLabel="Total Trades"
                centerValue={safeAll.total}
                stats={{
                    left: { label: `${safeAll.winRate.toFixed(2)}%`, value: `Wins: ${safeAll.winsCount}` },
                    middle: { label: "", value: "" },
                    right: { label: `${safeAll.lossRate.toFixed(2)}%`, value: `Losses: ${safeAll.lossesCount}` }
                }}
                percentages={{ left: safeAll.winRate, right: safeAll.lossRate }}
                colors={{ left: "#22c55e", right: "#ef4444" }}
            />

            {/* Long Analysis */}
            <GaugeCard
                title="Long Analysis"
                centerLabel="Profit"
                centerValue={safeLong.total_net >= 0 ? `$${safeLong.total_net.toFixed(2)}` : `-$${Math.abs(safeLong.total_net).toFixed(2)}`}
                centerValueColor={safeLong.total_net >= 0 ? "text-green-400" : "text-white"}
                percentages={{ left: safeLong.win_rate, right: 100 - safeLong.win_rate }}
                stats={{
                    left: { label: `Wins (${safeLong.wins})`, value: `$${safeLong.profit.toFixed(2)}` },
                    middle: { label: "Win Rate", value: `${safeLong.win_rate.toFixed(2)}%` },
                    right: { label: `Losses (${safeLong.losses})`, value: `$${safeLong.loss_cost.toFixed(2)}` }
                }}
                colors={{ left: "#22c55e", right: "#ef4444" }}
            />
        </div>
    );
}
