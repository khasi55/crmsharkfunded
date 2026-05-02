"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { fetchFromBackend } from "@/lib/backend-api";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface DayStats {
    dayName: string; // Mon, Tue, etc.
    pnl: number;
    count: number;
}

export default function DailyPerformance() {
    const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
    const [dailyData, setDailyData] = useState<DayStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [bestDay, setBestDay] = useState<string>('');

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    useEffect(() => {
        if (dashboardData.analysis?.daily_stats) {
            const stats = dashboardData.analysis.daily_stats;

            const result = stats.slice(-7).map((s: any) => ({
                dayName: dayNames[new Date(s.date).getDay()],
                pnl: s.profit,
                count: s.trades
            }));

            // Find Best Day
            let maxPnL = -Infinity;
            let best = '';
            result.forEach((d: any) => {
                if (d.pnl > maxPnL) {
                    maxPnL = d.pnl;
                    best = d.dayName;
                }
            });

            setDailyData(result);
            setBestDay(best);
            setLoading(false);
        } else if (dashboardLoading.global) {
            setLoading(true);
        }
    }, [dashboardData.analysis, dashboardLoading.global]);

    if (loading) return <div className="h-full bg-[#050923]/50 animate-pulse rounded-2xl" />;

    // Find max abs value for scaling bars
    const maxValue = Math.max(...dailyData.map(d => Math.abs(d.pnl)), 100); // Min 100 to avoid div by zero

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#050923] border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-full relative overflow-hidden"
        >
            {/* Header */}
            <div className="flex justify-between items-start z-10 mb-6">
                <h3 className="text-lg font-bold text-white">Daily Performance</h3>
                {bestDay && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Best Day</span>
                        <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-xs font-bold">{bestDay}</span>
                    </div>
                )}
            </div>

            {/* Chart Area */}
            <div className="flex items-end justify-between gap-2 h-[180px] z-10 w-full px-2">
                {dailyData.map((day) => {
                    const heightPercent = Math.min((Math.abs(day.pnl) / maxValue) * 100, 100);
                    const isPositive = day.pnl >= 0;

                    return (
                        <div key={day.dayName} className="flex flex-col items-center gap-2 flex-1 group">
                            {/* Bar Container */}
                            <div className="h-[120px] w-full flex items-end justify-center relative">
                                {/* Bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(heightPercent, 2)}%` }} // Min 2% visibility
                                    transition={{ duration: 0.8, type: 'spring' }}
                                    className={cn(
                                        "w-[10px] sm:w-[14px] md:w-[18px] rounded-t-sm relative transition-colors",
                                        isPositive ? "bg-green-500" : "bg-red-500"
                                    )}
                                >
                                    {/* Tooltip on Hover */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 border border-white/10 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                                        ${day.pnl.toFixed(2)}
                                        <div className="text-gray-500">{day.count} Trades</div>
                                    </div>
                                </motion.div>

                                {/* Reflection/Glow Base */}
                                <div className={cn(
                                    "absolute bottom-0 w-full h-1 blur-[4px]",
                                    isPositive ? "bg-green-500/50" : "bg-red-500/50"
                                )}></div>
                            </div>

                            {/* PnL Label */}
                            <div className={cn("text-[9px] sm:text-[10px] font-bold", isPositive ? "text-green-500" : "text-red-500")}>
                                {day.pnl >= 1000 ? `${(day.pnl / 1000).toFixed(1)}k` : day.pnl.toFixed(0)}
                            </div>

                            {/* Day Label */}
                            <div className="text-[10px] font-bold text-gray-500 uppercase">{day.dayName}</div>
                        </div>
                    );
                })}
            </div>

            {/* Background Glow */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-blue-900/10 to-transparent pointer-events-none"></div>

        </motion.div>
    );
}
