"use client";

import { Calendar, Hash, BarChart3, TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { cn } from "@/lib/utils";

interface StatItem {
    label: string;
    value: string;
    icon: any;
    color?: string;
}

export default function DetailedStats() {
    const { selectedAccount, loading } = useAccount();

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

        // Calculate stats from account data
        // These would ideally come from trade data associated with the account
        const balance = selectedAccount.balance || 0;

        const initialBalance = selectedAccount.initial_balance || 100000;
        // PnL calculated dynamically from account balance
        const pnl = balance - initialBalance;

        return [
            { label: "Number of Days", value: "1", icon: Calendar },
            { label: "Total Trades Taken", value: "0", icon: Hash },
            { label: "Total Lots Used", value: "0.00", icon: BarChart3 },
            { label: "Biggest Win", value: pnl > 0 ? `+$${pnl.toLocaleString()}` : "$0.00", icon: TrendingUp, color: "text-green-400" },
            { label: "Biggest Loss", value: pnl < 0 ? `-$${Math.abs(pnl).toLocaleString()}` : "$0.00", icon: TrendingDown, color: "text-red-400" },
        ];
    };

    const stats = getStats();

    if (loading) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-white">Detailed Stats</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="p-5 rounded-xl border border-white/10 bg-gray-900 flex items-center justify-center min-h-[100px]">
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
                <h2 className="text-lg font-bold text-white">Detailed Stats</h2>
                {selectedAccount && (
                    <span className="text-xs text-gray-500 font-medium">
                        {selectedAccount.account_number}
                    </span>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="p-5 rounded-xl border border-white/10 bg-gray-900 group hover:border-white/20 transition-all">
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
