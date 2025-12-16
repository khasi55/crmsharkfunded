"use client";

import { DollarSign, TrendingUp, Calendar, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/AccountContext";

interface StatProps {
    label: string;
    value: string;
    icon: any;
    isNegative?: boolean;
}

function StatBox({ label, value, icon: Icon, isNegative }: StatProps) {
    return (
        <div className="bg-[#1e293b]/50 border border-white/5 rounded-xl p-5 flex flex-col gap-3 min-w-[200px] hover:bg-[#1e293b] transition-colors">
            <div className="flex items-center gap-2 text-gray-400">
                <Icon size={14} className="opacity-70" />
                <span className="text-xs font-medium tracking-wide">{label}</span>
            </div>
            <p className={cn("text-xl font-medium tracking-tight", isNegative ? "text-red-400" : "text-white")}>
                {value}
            </p>
        </div>
    );
}

export default function AccountOverviewStats() {
    const { selectedAccount, loading } = useAccount();

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="bg-[#1e293b]/50 border border-white/5 rounded-xl p-5 flex items-center justify-center min-h-[100px]">
                        <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                    </div>
                ))}
            </div>
        );
    }

    if (!selectedAccount) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                <StatBox label="Account Size" value="--" icon={DollarSign} />
                <StatBox label="PnL" value="--" icon={TrendingUp} />
                <StatBox label="Start Date" value="--" icon={Calendar} />
                <StatBox label="End Date" value="--" icon={Clock} />
            </div>
        );
    }

    // Calculate PnL from balance
    const initialBalance = selectedAccount.initial_balance || 100000;
    const pnl = (selectedAccount.balance || initialBalance) - initialBalance;
    const isPnlNegative = pnl < 0;

    // Format dates - these could come from the account/challenge data
    const startDate = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            <StatBox
                label="Account Size"
                value={`$${initialBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={DollarSign}
            />
            <StatBox
                label="PnL"
                value={`${pnl >= 0 ? '+' : ''}$${pnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                icon={TrendingUp}
                isNegative={isPnlNegative}
            />
            <StatBox
                label="Start Date"
                value={startDate}
                icon={Calendar}
            />
        </div>
    );
}
