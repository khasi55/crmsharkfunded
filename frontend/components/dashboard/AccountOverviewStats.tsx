"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/AccountContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { fetchFromBackend } from "@/lib/backend-api";
import { useSocket } from "@/contexts/SocketContext";

interface StatProps {
    label: string;
    value: string;
    icon: any;
    isNegative?: boolean;
    isPositive?: boolean;
}

function StatBox({ label, value, icon: Icon, isNegative, isPositive }: StatProps) {
    return (
        <div className="bg-[#06000a] border border-white/10 rounded-3xl p-5 flex flex-col gap-2 min-w-[200px] hover:bg-white/[0.02] transition-colors relative overflow-hidden group">
            <div className="flex items-center gap-2 text-slate-500">
                <Icon size={12} className="opacity-70 group-hover:text-blue-400 transition-colors" />
                <span className="text-[10px] font-bold uppercase tracking-widest leading-none">{label}</span>
            </div>
            <p className={cn(
                "text-lg font-black tracking-tight",
                isNegative ? "text-[#ff5666]" : isPositive ? "text-[#04d97c]" : "text-white"
            )}>
                {value}
            </p>
            {/* Ambient Corner Glow */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
    );
}

export default function AccountOverviewStats() {
    // Force HMR update

    const { selectedAccount, loading } = useAccount();
    const { data: dashboardData } = useDashboardData();
    // Use state for Realized PnL
    const [realizedPnL, setRealizedPnL] = useState<number | null>(null);

    useEffect(() => {
        if (dashboardData.objectives?.stats?.net_pnl !== undefined) {
            setRealizedPnL(dashboardData.objectives.stats.net_pnl);
        }
    }, [dashboardData.objectives]);

    if (loading && !dashboardData.objectives) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-[#050923] border border-white/5 rounded-xl p-5 flex items-center justify-center min-h-[100px]">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                ))}
            </div>
        );
    }

    if (!selectedAccount) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <StatBox label="Account Size" value="--" icon={DollarSign} />
                <StatBox label="PnL" value="--" icon={TrendingUp} />
                <StatBox label="Start Date" value="--" icon={Calendar} />
            </div>
        );
    }

    const initialBalance = selectedAccount.initial_balance || 100000;

    // Format dates - these could come from the account/challenge data
    const created = selectedAccount.created_at || new Date().toISOString();
    const startDate = new Date(created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Display PnL: Calculate directly from Equity/Balance relative to Initial Balance
    // This ensures consistency with the Equity Curve and avoids dependency on potentially stale objective stats
    const currentEquity = selectedAccount.equity ?? selectedAccount.balance ?? initialBalance;
    const displayPnL = currentEquity - initialBalance;

    const isPnlNegative = displayPnL < 0;
    const isPnlPositive = displayPnL > 0;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
            <StatBox
                label="Account Size"
                value={`$${initialBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
            />
            <StatBox
                label="PnL"
                value={`${displayPnL >= 0 ? '+' : ''}$${displayPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={TrendingUp}
                isNegative={isPnlNegative}
                isPositive={isPnlPositive}
            />
            <StatBox
                label="Start Date"
                value={startDate}
                icon={Calendar}
            />
        </div>
    );
}
