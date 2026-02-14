"use client";

import { useEffect, useState } from "react";
import { Calendar, Hash, BarChart3, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { fetchFromBackend } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

interface StatItem {
    label: string;
    value: string;
    icon: any;
    color?: string;
}

export default function DetailedStats() {
    const { selectedAccount } = useAccount();
    const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
    const statsData = dashboardData.stats;
    const loading = dashboardLoading.global;

    // Create stats based on selected account
    const getStats = (): StatItem[] => {
        if (!selectedAccount) {
            return [
                { label: "Number of Days", value: "--", icon: Calendar },
                { label: "Total Trades Taken", value: "--", icon: Hash },
                { label: "Total Lots Used", value: "--", icon: BarChart3 },
                { label: "Biggest Win", value: "--", icon: TrendingUp, color: "text-green-400" },
                { label: "Biggest Loss", value: "--", icon: TrendingDown, color: "text-red-400" },
            ];
        }

        const trades = statsData?.total_trades || 0;
        const lots = statsData?.total_lots || 0;
        const win = statsData?.biggest_win || 0;
        const loss = statsData?.biggest_loss || 0;

        return [
            { label: "Number of Days", value: "1", icon: Calendar },
            { label: "Total Trades Taken", value: String(trades), icon: Hash },
            { label: "Total Lots Used", value: (lots / 100).toFixed(2), icon: BarChart3 },
            { label: "Biggest Win", value: win > 0 ? `+$${win.toFixed(2)}` : "$0.00", icon: TrendingUp, color: "text-green-400" },
            { label: "Biggest Loss", value: loss < 0 ? `-$${Math.abs(loss).toFixed(2)}` : "$0.00", icon: TrendingDown, color: "text-red-400" },
        ];
    };

    const stats = getStats();

    if (loading && !statsData) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Detailed Stats</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-5 rounded-xl border border-white/10 bg-[#050923] flex items-center justify-center min-h-[100px]">
                            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Detailed Stats</h2>
                {selectedAccount && (
                    <span className="text-xs text-gray-500 font-medium">
                        {selectedAccount.account_number}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="p-5 rounded-xl border border-white/10 bg-[#050923] group hover:border-white/20 transition-all">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 rounded-lg bg-white/5 text-gray-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors border border-transparent group-hover:border-blue-500/20">
                                <stat.icon size={16} />
                            </div>
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</span>
                        </div>
                        <p className={cn("text-xl font-bold", stat.color || "text-white")}>
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
