"use client";

import StatsCard from "@/components/dashboard/StatsCard";
import AccountSwitcher from "@/components/dashboard/AccountSwitcher";
import TradingObjectives from "@/components/dashboard/TradingObjectives";
import DetailedStats from "@/components/dashboard/DetailedStats";
import AccountOverviewStats from "@/components/dashboard/AccountOverviewStats";
import RiskAnalysis from "@/components/dashboard/RiskAnalysis";
import ConsistencyScore from "@/components/dashboard/ConsistencyScore";
import TradeMonthlyCalendar from "@/components/dashboard/TradeMonthlyCalendar";
import EquityCurveChart from "@/components/dashboard/EquityCurveChart";
import TradeHistory from "@/components/dashboard/TradeHistory";
import TradeAnalysis from "@/components/dashboard/TradeAnalysis";
import { DollarSign, Activity, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, MoreHorizontal, Settings, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { useState } from "react";

function DashboardContent() {
    const { selectedAccount, loading } = useAccount();

    const getStatusColor = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s === 'active') return 'text-blue-400';
        if (s === 'passed') return 'text-green-400';
        if (s === 'failed' || s === 'not passed') return 'text-red-400';
        return 'text-gray-400';
    };

    const getStatusBadgeStyle = (status: string) => {
        const s = status?.toLowerCase() || '';
        if (s === 'active') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        if (s === 'passed') return 'bg-green-500/10 text-green-400 border-green-500/20';
        if (s === 'failed' || s === 'not passed') return 'bg-red-500/10 text-red-400 border-red-500/20';
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    };

    const formatStatus = (status: string) => {
        if (!status) return 'Unknown';
        const s = status.toLowerCase();
        if (s === 'active') return 'Active';
        if (s === 'passed') return 'Passed';
        if (s === 'failed') return 'Not Passed';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState(false);

    return (
        <div className="flex h-screen overflow-hidden bg-bg-main text-white">
            {/* Sidebar Account Switcher */}
            <AccountSwitcher
                isOpen={isAccountSwitcherOpen}
                onClose={() => setIsAccountSwitcherOpen(false)}
            />

            {/* Main Content Area */}
            <div className="flex-1 p-4 md:p-8 overflow-y-auto relative scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">

                <div className="flex flex-col gap-6 max-w-[1600px] mx-auto min-h-full">

                    {/* Header inside Dashboard */}
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-900 border border-white/10 p-4 md:p-6 rounded-2xl shrink-0"
                    >
                        <div className="w-full md:w-auto">
                            <div className="flex items-center justify-between md:justify-start gap-3 mb-1">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-2xl font-bold text-white tracking-tight">
                                        {selectedAccount?.account_type || 'No Account Selected'}
                                    </h1>
                                    {selectedAccount && (
                                        <span className={cn(
                                            "px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border hidden sm:inline-block",
                                            getStatusBadgeStyle(selectedAccount.status)
                                        )}>
                                            {formatStatus(selectedAccount.status)}
                                        </span>
                                    )}
                                </div>

                                {/* Mobile Account Switcher Toggle */}
                                <button
                                    onClick={() => setIsAccountSwitcherOpen(true)}
                                    className="md:hidden p-2 bg-blue-500/10 text-blue-400 rounded-lg text-sm font-semibold border border-blue-500/20"
                                >
                                    Accounts
                                </button>
                            </div>
                            <p className="text-gray-400 text-sm font-medium flex items-center gap-2">
                                {selectedAccount ? (
                                    <>
                                        <span className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            selectedAccount.status === 'active'
                                                ? "bg-green-500 animate-pulse"
                                                : selectedAccount.status === 'passed'
                                                    ? "bg-green-500"
                                                    : "bg-red-500"
                                        )} />
                                        {selectedAccount.account_number}
                                    </>
                                ) : (
                                    <span className="text-gray-500">Select an account to view details</span>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Status Indicator */}
                            {selectedAccount && (
                                <>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-xs text-gray-500 font-medium">Status</p>
                                        <p className={cn("text-sm font-bold", getStatusColor(selectedAccount.status))}>
                                            {formatStatus(selectedAccount.status)}
                                        </p>
                                    </div>
                                    <div className="h-8 w-[1px] bg-white/10 mx-2 hidden sm:block" />
                                </>
                            )}
                            <button className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all border border-transparent hover:border-white/5">
                                <Settings size={20} />
                            </button>
                        </div>
                    </motion.div>

                    {/* Equity Curve Chart */}
                    <div className="shrink-0">
                        <EquityCurveChart />
                    </div>

                    {/* Account Overview Stats (Reference Image Style) */}
                    <div className="shrink-0">
                        <AccountOverviewStats />
                    </div>

                    {/* Trading Objectives Section */}
                    <div className="shrink-0">
                        <TradingObjectives />
                    </div>

                    {/* Trade Analysis Chart Grid */}
                    <div className="shrink-0">
                        <TradeAnalysis />
                    </div>

                    {/* Risk Analysis Grid */}
                    <div className="shrink-0">
                        <RiskAnalysis />
                    </div>

                    {/* Consistency Score */}
                    <div className="shrink-0">
                        <ConsistencyScore />
                    </div>

                    {/* Detailed Stats Grid */}
                    <div className="shrink-0">
                        <DetailedStats />
                    </div>

                    {/* Trade Monthly Calendar */}
                    <div className="shrink-0">
                        <TradeMonthlyCalendar />
                    </div>

                    {/* Trade History */}
                    <div className="shrink-0">
                        <TradeHistory />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <AccountProvider>
            <DashboardContent />
        </AccountProvider>
    );
}
