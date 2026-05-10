"use client";
import PageLoader from "@/components/ui/PageLoader";
import StatsCard from "@/components/dashboard/StatsCard";
import AccountSwitcher from "@/components/dashboard/AccountSwitcher";
import TradingObjectives from "@/components/dashboard/TradingObjectives";
import DetailedStats from "@/components/dashboard/DetailedStats";
import AccountOverviewStats from "@/components/dashboard/AccountOverviewStats";
import RiskAnalysis from "@/components/dashboard/RiskAnalysis";

import TradeMonthlyCalendar from "@/components/dashboard/TradeMonthlyCalendar";
import EquityCurveChart from "@/components/dashboard/EquityCurveChart";
import TradeHistory from "@/components/dashboard/TradeHistory";
import TradeAnalysis from "@/components/dashboard/TradeAnalysis";
import { ChevronRight, Key, RotateCw, Plus, LayoutDashboard, Rocket, LogOut, Share2, Copy, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { DashboardDataProvider, useDashboardData } from "@/contexts/DashboardDataContext";
import { useState, useEffect } from "react";
import CredentialsModal from "@/components/dashboard/CredentialsModal";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { InAppReviewCollector } from "@/components/trustpilot/InAppReviewCollector";
import { useToast } from "@/contexts/ToastContext";

function DashboardContent() {
    const { selectedAccount, loading: accountLoading } = useAccount();
    const { loading: dataLoading, error } = useDashboardData();
    const [syncing, setSyncing] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);
    const { showToast } = useToast();

    // Mobile specific state
    const [isMobileAccountSwitcherOpen, setIsMobileAccountSwitcherOpen] = useState(false);

    const formatStatus = (status: string) => {
        if (!status) return 'Unknown';
        const s = status.toLowerCase();
        if (s === 'active') return 'Active';
        if (s === 'passed') return 'Passed';
        if (s === 'failed' || s === 'breached') return 'Breached';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const [user, setUser] = useState<any>(null);
    const [isProfileOpen, setIsProfileOpen] = useState(false);

    useEffect(() => {
        const getUser = async () => {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        }
        getUser();
    }, []);

    const handleLogout = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const loading = accountLoading || dataLoading.global;

    return (
        <div className="flex h-screen overflow-hidden bg-[#EDF6FE] text-slate-900 relative">
            <PageLoader isLoading={loading} text="SYNCING DATA..." />

            {selectedAccount && (
                <CredentialsModal
                    isOpen={showCredentials}
                    onClose={() => setShowCredentials(false)}
                    account={selectedAccount as any}
                />
            )}

            {/* Main Content Area */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
                <div className="p-4 md:p-8 max-w-[1920px] mx-auto min-h-full">

                    {error ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                <p className="text-red-400 font-medium">Failed to load dashboard data</p>
                                <p className="text-xs text-red-400/60 mt-1">{error}</p>
                            </div>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                            >
                                Retry
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Dashboard Header */}
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-6 md:mb-8">
                                <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium overflow-x-auto">
                                    <span className="whitespace-nowrap">Dashboard</span>
                                    <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
                                    <span className="whitespace-nowrap">Analytics</span>
                                    <ChevronRight size={12} className="text-slate-300 flex-shrink-0" />
                                    <span className="text-slate-900 font-bold whitespace-nowrap">Account {selectedAccount?.account_number || "..."}</span>
                                </div>

                                {/* Trustpilot Review Collector in the center of the header on desktop */}
                                <div className="hidden lg:flex flex-1 justify-center px-4">
                                    <div className="max-w-[300px] w-full">
                                        <InAppReviewCollector />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 mr-2">
                                        <Link
                                            href="/configurator"
                                            className="h-9 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                        >
                                            <Plus size={14} />
                                            <span className="hidden sm:inline">NEW ACCOUNT</span>
                                        </Link>
                                    </div>

                                    {/* Profile Dropdown */}
                                    <div className="relative">
                                        <div
                                            onClick={() => setIsProfileOpen(!isProfileOpen)}
                                            className="h-9 px-3 bg-[#0F172A] hover:bg-slate-800 text-white rounded-lg border border-white/10 flex items-center text-sm font-bold transition-colors cursor-pointer select-none shadow-lg"
                                        >
                                            <span className="mr-2 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] text-white uppercase">
                                                {user?.email?.charAt(0) || 'U'}
                                            </span>
                                            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                                            <ChevronRight className={cn("ml-2 text-gray-500 transition-transform duration-200", isProfileOpen ? "-rotate-90" : "rotate-90")} size={14} />
                                        </div>

                                        <AnimatePresence>
                                            {isProfileOpen && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0, y: 10 }}
                                                    className="absolute top-full right-0 mt-2 w-48 bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
                                                >
                                                    <div className="p-3 border-b border-white/5">
                                                        <p className="text-xs font-bold text-white truncate">{user?.email}</p>
                                                        <p className="text-[10px] text-gray-500">Live Session</p>
                                                    </div>
                                                    <button
                                                        onClick={handleLogout}
                                                        className="w-full text-left px-4 py-3 text-sm font-medium text-red-400 hover:bg-red-400/10 flex items-center gap-2 transition-colors"
                                                    >
                                                        <LogOut size={14} />
                                                        <span>Log Out</span>
                                                    </button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                             {/* Welcome Section */}
                             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6 md:mb-8 border-b border-slate-200/60 pb-6 md:pb-8">
                                 <div>
                                     <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
                                         Analytics Dashboard
                                     </h1>
                                     <p className="text-slate-500 text-sm md:text-base mt-1 font-medium">
                                         Real-time tracking for Account <span className="text-blue-600 font-mono font-bold">#{selectedAccount?.account_number || "-------"}</span>
                                     </p>
                                 </div>
                                <button
                                     onClick={() => {
                                         if (selectedAccount && !syncing) {
                                             const sync = async () => {
                                                 setSyncing(true);
                                                 try {
                                                     await fetch('/api/mt5/sync-trades', {
                                                         method: 'POST',
                                                         headers: { 'Content-Type': 'application/json' },
                                                         body: JSON.stringify({
                                                             login: selectedAccount.login,
                                                             user_id: selectedAccount.user_id
                                                         })
                                                     });
                                                     showToast('Synced trades successfully', 'success');
                                                 } catch (err) {
                                                     showToast('Sync error', 'error');
                                                 } finally {
                                                     setSyncing(false);
                                                 }
                                             };
                                             sync();
                                         }
                                     }}
                                     disabled={syncing || !selectedAccount}
                                     className={cn(
                                         "px-4 md:px-6 py-2 md:py-2.5 bg-[#0F172A] hover:bg-slate-800 text-gray-400 hover:text-white rounded-lg text-xs md:text-sm font-bold border border-white/10 transition-all flex items-center gap-1.5 md:gap-2 shadow-lg touch-manipulation whitespace-nowrap",
                                         syncing && "opacity-70 cursor-not-allowed"
                                     )}
                                 >
                                     <RotateCw size={14} className={cn(syncing && "animate-spin text-blue-400")} />
                                     <span className="hidden sm:inline">SYNC MT5 DATA</span>
                                     <span className="sm:hidden">SYNC</span>
                                 </button>
                            </div>

                            {/* Dashboard Grid Layout */}
                            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 md:gap-6 lg:gap-8 items-start">

                                 {/* Sidebar: Account Switcher */}
                                 <div className="hidden lg:block sticky top-8 h-[calc(100vh-4rem)] overflow-hidden rounded-2xl shadow-2xl shadow-black/30">
                                     <AccountSwitcher />
                                 </div>

                                {/* Mobile Switcher Trigger */}
                                 <div className="lg:hidden mb-4">
                                     <button
                                         onClick={() => setIsMobileAccountSwitcherOpen(true)}
                                         className="w-full bg-[#0F172A] border border-white/5 p-4 rounded-xl flex items-center justify-between text-white font-bold shadow-lg active:scale-98 transition-transform touch-manipulation"
                                     >
                                         <div className="flex items-center gap-3">
                                             <div className="p-2 bg-blue-500/10 rounded-lg">
                                                 <LayoutDashboard size={18} className="text-blue-400" />
                                             </div>
                                             <span className="text-sm">Account #{selectedAccount?.account_number}</span>
                                         </div>
                                         <ChevronRight size={16} className="rotate-90 text-gray-500" />
                                     </button>
                                    <AnimatePresence>
                                        {isMobileAccountSwitcherOpen && (
                                            <AccountSwitcher
                                                isOpen={isMobileAccountSwitcherOpen}
                                                onClose={() => setIsMobileAccountSwitcherOpen(false)}
                                            />
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Main Stats Display */}
                                <div className="flex flex-col gap-6 w-full min-w-0">

                                     {/* Account Header Info */}
                                     {selectedAccount && (
                                         <motion.div
                                             initial={{ opacity: 0, y: 10 }}
                                             animate={{ opacity: 1, y: 0 }}
                                             className="bg-[#0F172A] border border-white/10 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden shadow-2xl"
                                         >
                                             <div className="relative z-10">
                                                 <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                                     <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white">
                                                         {selectedAccount.account_type?.toUpperCase().replace(/_/g, ' ') || "ACTIVE ACCOUNT"}
                                                     </h2>

                                                    {/* Account Type Badge (Prime vs Lite) */}
                                                    {selectedAccount.group && !selectedAccount.group.includes('Direct-SF') && selectedAccount.account_type !== 'direct_funded' && (
                                                        <span className={cn(
                                                            "px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider",
                                                            selectedAccount.group.includes('demo\\SF\\') || selectedAccount.group.toUpperCase().includes('PRO')
                                                                ? "bg-purple-500/20 text-purple-400 border-purple-500/30" // Prime
                                                                : "bg-blue-500/20 text-blue-400 border-blue-500/30" // Lite
                                                        )}>
                                                            {selectedAccount.group.includes('demo\\SF\\') || selectedAccount.group.toUpperCase().includes('PRO') ? "PRIME" : "LITE"}
                                                        </span>
                                                    )}

                                                     {/* Phase Badge */}
                                                     <span className="px-2.5 py-0.5 rounded text-[10px] font-bold border border-white/10 bg-white/5 text-gray-300 uppercase tracking-wider">
                                                         {selectedAccount.account_type?.replace(/_/g, ' ').toUpperCase() || 'PHASE 1'}
                                                     </span>

                                                    <span className={cn(
                                                        "px-2.5 py-0.5 rounded text-[10px] font-bold border uppercase",
                                                        (selectedAccount.status?.toLowerCase() === 'failed' || selectedAccount.status?.toLowerCase() === 'breached')
                                                            ? "bg-red-500/20 text-red-400 border-red-500/20"
                                                            : "bg-green-500/20 text-green-400 border-green-500/20"
                                                    )}>
                                                        {formatStatus(selectedAccount.status)}
                                                    </span>
                                                </div>
                                                 <p className="text-gray-400 font-medium text-xs sm:text-sm flex items-center gap-2">
                                                     <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                                     ID: #{selectedAccount.login}
                                                 </p>
                                            </div>

                                             <div className="flex items-center gap-3 sm:gap-6 relative z-10">
                                                 <div className="text-left sm:text-right border-r border-white/10 pr-3 sm:pr-6 mr-1 sm:mr-2">
                                                     <p className="text-gray-500 text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-1">Status</p>
                                                     <p className={cn(
                                                         "font-bold text-base sm:text-lg",
                                                         (selectedAccount.status?.toLowerCase() === 'failed' || selectedAccount.status?.toLowerCase() === 'breached') ? "text-red-500" : "text-blue-400"
                                                     )}>{formatStatus(selectedAccount.status)}</p>
                                                </div>
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <button
                                                        onClick={() => setShowCredentials(true)}
                                                        className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] sm:text-xs font-bold transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
                                                    >
                                                        <Key size={14} className="sm:w-4 sm:h-4" />
                                                        <span>CHANGE PASSWORD</span>
                                                    </button>
                                                     <button
                                                         onClick={() => setShowCredentials(true)}
                                                         className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-400 active:text-white transition-colors touch-manipulation shadow-lg"
                                                         title="View Credentials"
                                                     >
                                                         <Eye size={18} className="sm:w-5 sm:h-5" />
                                                     </button>
                                                </div>
                                            </div>

                                             {/* Background decorative glow */}
                                             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                                        </motion.div>
                                    )}

                                    {/* Equity Curve Chart */}
                                    <div className="shrink-0">
                                        <EquityCurveChart />
                                    </div>

                                    {/* Account Overview Stats */}
                                    <div className="shrink-0">
                                        <AccountOverviewStats />
                                    </div>

                                    {/* Trading Objectives */}
                                    <div className="shrink-0">
                                        <TradingObjectives />
                                    </div>

                                    {/* Trade Analysis */}
                                    <div className="shrink-0">
                                        <TradeAnalysis />
                                    </div>

                                    {/* Risk Analysis */}
                                    <div className="shrink-0">
                                        <RiskAnalysis />
                                    </div>

                                    {/* Detailed Stats */}
                                    <div className="shrink-0">
                                        <DetailedStats />
                                    </div>

                                    {/* Trade Calendar */}
                                    <div className="shrink-0">
                                        <TradeMonthlyCalendar />
                                    </div>

                                    {/* Trade History */}
                                    <div className="shrink-0">
                                        <TradeHistory />
                                    </div>

                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function DashboardPage() {
    return (
        <DashboardDataProvider>
            <DashboardContent />
        </DashboardDataProvider>
    );
}
