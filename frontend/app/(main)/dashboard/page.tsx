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
import ConsistencyScore from "@/components/dashboard/ConsistencyScore";
import { ChevronRight, Key, RotateCw, Plus, LayoutDashboard, Rocket, LogOut, Share2, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { AccountProvider, useAccount } from "@/contexts/AccountContext";
import { DashboardDataProvider } from "@/contexts/DashboardDataContext";
import { useState, useEffect } from "react";
import CredentialsModal from "@/components/dashboard/CredentialsModal";
import ShareModal from "@/components/dashboard/ShareModal";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/contexts/ToastContext";
import { fetchFromBackend } from "@/lib/backend-api";

function DashboardContent() {
    const { selectedAccount, loading, accounts, refreshAccounts } = useAccount();
    const { toast } = useToast();
    const [syncing, setSyncing] = useState(false);
    const [showCredentials, setShowCredentials] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const [isSharingLoading, setIsSharingLoading] = useState(false);

    const handleToggleSharing = async (enabled: boolean) => {
        if (!selectedAccount) return;
        setIsSharingLoading(true);
        try {
            const data = await fetchFromBackend('/api/dashboard/sharing/toggle', {
                method: 'POST',
                body: JSON.stringify({
                    challengeId: selectedAccount.id,
                    enabled: enabled
                })
            });
            if (data.success) {
                toast(
                    data.is_public
                        ? "Public Sharing Enabled. Anyone with the link can view this account."
                        : "Public Sharing Disabled. The public link is now deactivated.",
                    "success"
                );
                // Refresh accounts to update the state without reloading the page
                await refreshAccounts();
            }
        } catch (error) {
            toast("Failed to update sharing settings.", "error");
        } finally {
            setIsSharingLoading(false);
        }
    };

    const copyShareLink = () => {
        if (!selectedAccount?.share_token) return;
        const link = `${window.location.origin}/p/${selectedAccount.share_token}`;
        navigator.clipboard.writeText(link);
        toast("Public dashboard link copied to clipboard!", "success");
    };

    // Mobile specific state
    const [isMobileAccountSwitcherOpen, setIsMobileAccountSwitcherOpen] = useState(false);

    // Auto-Sync Trades on Account Selection - Removed to prevent loop
    // Rely on Backend Risk Scheduler for periodic updates
    // Use manual Refresh button for instant sync

    const formatStatus = (status: string) => {
        if (!status) return 'Unknown';
        const s = status.toLowerCase();
        if (s === 'active') return 'Active';
        if (s === 'passed') return 'Passed';
        if (s === 'failed') return 'Not Passed';
        if (s === 'failed') return 'Not Passed';
        return status.charAt(0).toUpperCase() + status.slice(1);
    };

    const getDetailedAccountName = (account: any) => {
        if (!account) return 'Account';

        // 1. Try Metadata first (cleanest)
        if (account.metadata?.model && account.metadata?.type) {
            const model = account.metadata.model.charAt(0).toUpperCase() + account.metadata.model.slice(1);
            const type = account.metadata.type === 'instant' ? 'Instant' :
                account.metadata.type.replace('-', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
            return `${model} ${type}`;
        }

        // 2. Fallback to Group Parsing
        const group = account.group || '';
        if (group.includes('demo\\SF\\') || group.toUpperCase().includes('PRO')) { // Prime
            if (group.includes('1-Pro') || group.includes('1-SF')) return 'Prime 1 Step';
            if (group.includes('2-Pro') || group.includes('2-SF')) return 'Prime 2 Step';
            if (group.includes('0-Pro')) return 'Prime Instant';
            return 'Prime Account';
        }
        if (group.includes('demo\\S\\')) { // Lite
            if (group.includes('1-SF')) return 'Lite 1 Step';
            if (group.includes('2-SF')) return 'Lite 2 Step';
            if (group.includes('0-SF')) return 'Lite Instant';
            return 'Lite Account';
        }

        // 3. Fallback to Account Type
        const type = account.challenge_type || account.account_type;
        if (!type) return 'Account';
        return type.split('_')
            .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const [isLoading, setIsLoading] = useState(false);
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

    // Cohesive Loading Effect on Account Switch - REMOVED for speed
    // useEffect(() => {
    //     if (selectedAccount) {
    //         setIsLoading(true);
    //         const timer = setTimeout(() => {
    //             setIsLoading(false);
    //         }, 800);
    //         return () => clearTimeout(timer);
    //     }
    // }, [selectedAccount?.id]);

    return (
        <div className="flex h-screen overflow-hidden bg-transparent text-slate-900 relative">
            {/* Loading Overlay */}
            <PageLoader isLoading={isLoading} text="SYNCING DATA..." />

            <CredentialsModal
                isOpen={showCredentials}
                onClose={() => setShowCredentials(false)}
                account={selectedAccount as any}
            />

            <ShareModal
                isOpen={showShareModal}
                onClose={() => setShowShareModal(false)}
                account={selectedAccount as any}
                onToggleSharing={handleToggleSharing}
                isSharingLoading={isSharingLoading}
            />

            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 hover:scrollbar-thumb-gray-700">
                <div className="p-4 md:p-8 max-w-[1920px] mx-auto min-h-full">
                    {/* Top Header Row: Breadcrumbs & Actions (Always visible) */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-6 md:mb-8">
                        <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-medium overflow-x-auto">
                            <span className="whitespace-nowrap">Dashboard</span>
                            {!loading && accounts.length > 0 && (
                                <>
                                    <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
                                    <span className="whitespace-nowrap">All Challenges</span>
                                    <ChevronRight size={12} className="text-slate-400 flex-shrink-0" />
                                    <span className="text-black font-semibold whitespace-nowrap">Account {selectedAccount?.account_number || "..."}</span>
                                </>
                            )}
                        </div>

                        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
                            <button
                                onClick={handleLogout}
                                className="h-9 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-100 flex items-center text-xs font-bold transition-all gap-2 group whitespace-nowrap"
                            >
                                <LogOut size={14} className="group-hover:translate-x-0.5 transition-transform" />
                                <span className="hidden sm:inline">Log Out</span>
                            </button>

                            {/* Share Dashboard Button - Hidden as per request */}
                            {/* {selectedAccount && (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setShowShareModal(true)}
                                        className={cn(
                                            "h-9 px-3 rounded-lg border flex items-center text-xs font-bold transition-all gap-2 whitespace-nowrap",
                                            selectedAccount.is_public
                                                ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                                                : "bg-white text-slate-700 border-slate-200 hover:border-blue-500 hover:text-blue-600"
                                        )}
                                        title="Share Dashboard"
                                    >
                                        <Share2 size={14} />
                                        <span className="hidden md:inline">{selectedAccount.is_public ? "Shared" : "Share"}</span>
                                    </button>
                                </div>
                            )} */}

                            {/* User Profile Dropdown */}
                            <div className="relative">
                                <div
                                    onClick={() => setIsProfileOpen(!isProfileOpen)}
                                    className="h-9 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg border border-slate-300 flex items-center text-sm font-bold transition-colors cursor-pointer select-none"
                                >
                                    <span className="mr-2 w-6 h-6 rounded-full bg-slate-400 flex items-center justify-center text-xs text-white uppercase">
                                        {user?.email?.charAt(0) || 'U'}
                                    </span>
                                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                                    <ChevronRight className={cn("ml-2 text-slate-500 transition-transform duration-200", isProfileOpen ? "-rotate-90" : "rotate-90")} size={14} />
                                </div>

                                <AnimatePresence>
                                    {isProfileOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="absolute top-full right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 text-slate-800"
                                        >
                                            <div className="p-3 border-b border-slate-100">
                                                <p className="text-xs font-bold text-black truncate">{user?.email}</p>
                                                <p className="text-[10px] text-slate-500">Logged In</p>
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                            >
                                                <span>Log Out</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </div>

                    {!loading && accounts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 px-4 text-center min-h-[60vh]">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="border-2 border-dashed border-slate-200 rounded-[2rem] p-8 md:p-12 max-w-lg w-full bg-slate-50/20"
                            >
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100">
                                    <LayoutDashboard className="text-blue-600 w-8 h-8" strokeWidth={2} />
                                </div>

                                <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2 tracking-tight">
                                    Select an Account
                                </h2>

                                <p className="text-slate-500 text-sm mb-8 max-w-[280px] mx-auto leading-relaxed">
                                    Choose an account from the list to view its performance and metrics.
                                </p>

                                <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm max-w-[320px] mx-auto">
                                    <p className="text-slate-800 font-bold text-sm mb-1 text-center">No account found?</p>
                                    <p className="text-slate-500 text-xs mb-5 text-center px-2">Start your journey with a new challenge up to $100,000.</p>

                                    <Link
                                        href="/challenges"
                                        className="w-full flex items-center justify-center gap-2 bg-[#2a4ce1] hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-[10px] transition-all active:scale-[0.97] shadow-sm"
                                    >
                                        <Plus size={14} strokeWidth={3} />
                                        <span>Buy Challenge</span>
                                    </Link>
                                </div>
                            </motion.div>
                        </div>
                    ) : (
                        <>
                            {/* Page Title Row */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 mb-6 md:mb-8 border-b border-slate-200 pb-6 md:pb-8">
                                <h1 className="text-2xl md:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
                                    Account {selectedAccount?.account_number || "-------"}
                                </h1>
                                <button
                                    onClick={() => {
                                        if (selectedAccount && !syncing) {
                                            // Trigger refresh logic
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
                                                    toast('Synced trades successfully', 'success');
                                                } catch (err) {
                                                    toast('Sync error', 'error');
                                                } finally {
                                                    setSyncing(false);
                                                }
                                            };
                                            sync();
                                        }
                                    }}
                                    disabled={syncing || !selectedAccount}
                                    className={cn(
                                        "px-4 md:px-6 py-2 md:py-2.5 bg-slate-200 active:bg-slate-300 text-slate-700 rounded-lg text-xs md:text-sm font-bold border border-slate-300 transition-all flex items-center gap-1.5 md:gap-2 shadow-sm touch-manipulation whitespace-nowrap",
                                        syncing && "opacity-70 cursor-not-allowed"
                                    )}
                                >
                                    <RotateCw size={14} className={cn(syncing && "animate-spin text-slate-600")} />
                                    <span className="hidden sm:inline">Refresh</span>
                                    <span className="sm:hidden">Sync</span>
                                </button>
                            </div>

                            {/* Two Column Layout Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4 md:gap-6 lg:gap-8 items-start">

                                {/* Left Column: Account Switcher */}
                                <div className="hidden lg:block sticky top-8 h-[calc(100vh-4rem)] overflow-hidden rounded-2xl shadow-2xl shadow-slate-200/50">
                                    <AccountSwitcher />
                                </div>

                                {/* Mobile Switcher Toggle (Visible only on mobile) */}
                                <div className="lg:hidden mb-4">
                                    <button
                                        onClick={() => setIsMobileAccountSwitcherOpen(true)}
                                        className="w-full bg-[#050923] border border-white/5 p-4 rounded-xl flex items-center justify-between text-white font-medium shadow-lg active:scale-98 transition-transform touch-manipulation"
                                    >
                                        <span className="text-sm">Switch Account ({selectedAccount?.account_number})</span>
                                        <ChevronRight size={16} className="rotate-90" />
                                    </button>
                                    {isMobileAccountSwitcherOpen && (
                                        <AccountSwitcher
                                            isOpen={isMobileAccountSwitcherOpen}
                                            onClose={() => setIsMobileAccountSwitcherOpen(false)}
                                        />
                                    )}
                                </div>

                                {/* Right Column: Main Stats & Charts */}
                                <div className="flex flex-col gap-6 w-full min-w-0">

                                    {/* Phase 1 Status Card (Main Hero Card) */}
                                    {selectedAccount && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="bg-[#050505] border border-white/10 rounded-2xl p-4 sm:p-6 md:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden"
                                        >
                                            <div className="relative z-10">
                                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white">
                                                        {getDetailedAccountName(selectedAccount)}
                                                    </h2>

                                                    {/* Account Type Badge (Prime vs Lite) */}
                                                    {selectedAccount.group && (
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
                                                        selectedAccount.status?.toLowerCase() === 'failed'
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
                                                        selectedAccount.status?.toLowerCase() === 'failed' ? "text-red-500" : "text-blue-400"
                                                    )}>{formatStatus(selectedAccount.status)}</p>
                                                </div>
                                                <button
                                                    onClick={() => setShowCredentials(true)}
                                                    className="p-2.5 sm:p-3 bg-white/5 active:bg-white/10 rounded-xl text-gray-400 active:text-white transition-colors touch-manipulation"
                                                >
                                                    <Key size={18} className="sm:w-5 sm:h-5" />
                                                </button>
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

                                    {/* Consistency Score */}
                                    <div className="shrink-0">
                                        <ConsistencyScore />
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
            </div >
        </div >
    );
}

export default function DashboardPage() {
    return (
        <DashboardDataProvider>
            <DashboardContent />
        </DashboardDataProvider>
    );
}
