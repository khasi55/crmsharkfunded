import { Search, ChevronDown, TrendingUp, Briefcase, ShoppingCart, Loader2, Filter, RefreshCw, Plus, Archive, X, AlertCircle } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/AccountContext";
import { fetchFromBackend } from "@/lib/backend-api";
import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface AccountSwitcherProps {
    isOpen?: boolean;
    onClose?: () => void;
    className?: string;
}

export default function AccountSwitcher({ isOpen, onClose, className }: AccountSwitcherProps = {}) {
    const { accounts, selectedAccount, setSelectedAccount, loading, refreshAccounts, archiveAccount } = useAccount();
    const [searchQuery, setSearchQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showArchived, setShowArchived] = useState(false);
    const [archiveTarget, setArchiveTarget] = useState<any | null>(null);

    // Filter states
    const [typeFilter, setTypeFilter] = useState("All Types");
    const [stateFilter, setStateFilter] = useState("All States");
    const [phaseFilter, setPhaseFilter] = useState("All Phases");
    const [showTypeDropdown, setShowTypeDropdown] = useState(false);
    const [showStateDropdown, setShowStateDropdown] = useState(false);
    const [showPhaseDropdown, setShowPhaseDropdown] = useState(false);



    // Mobile modal handling
    const isMobileModal = isOpen !== undefined;

    const handleRefresh = async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            if (selectedAccount) {
                // Trigger manual sync of trades from MT5 - Manual Override
                await fetchFromBackend('/api/mt5/sync-trades', {
                    method: 'POST',
                    body: JSON.stringify({
                        login: selectedAccount.login,
                        user_id: selectedAccount.user_id
                    })
                });
            }
            // Reload the entire page to reflect changes
            window.location.reload();
        } catch (error) {
            console.error("Refresh failed:", error);
            setIsRefreshing(false);
        }
    };

    // Filter accounts based on search query and filters
    const filteredAccounts = useMemo(() => {
        let filtered = accounts;

        // Apply Archival Filter
        filtered = filtered.filter(acc => (acc.is_archived === true) === showArchived);

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(acc =>
                acc.account_number.toLowerCase().includes(query) ||
                (acc.login?.toString() || '').includes(query) ||
                (acc.status && acc.status.toLowerCase().includes(query)) ||
                (acc.account_type && acc.account_type.toLowerCase().includes(query))
            );
        }

        // Apply Type filter (account_type)
        if (typeFilter !== "All Types") {
            filtered = filtered.filter(acc => {
                const type = acc.account_type || '';
                if (typeFilter === "Buy") return type.toLowerCase().includes('challenge'); // Assumption based on "Buy" usually meaning new challenges
            
                return true;
            });
        }

        // Apply State filter (status)
        if (stateFilter !== "All States") {
            filtered = filtered.filter(acc => {
                const status = acc.status?.toLowerCase() || '';
                if (stateFilter === "Open") return status === 'active';
                if (stateFilter === "Closed") return status === 'breached' || status === 'passed' || status === 'failed';
                // "Pending" is usually a status itself
                if (stateFilter === "Pending") return status === 'pending';
                return true;
            });
        }

        // Apply Phase filter
        if (phaseFilter !== "All Phases") {
            filtered = filtered.filter(acc => {
                // Logic to determine phase. 
                // Assuming 'account_type' or similar field holds phase info, or we deduce it.
                // For now, simple string match if available, or just pass through.
                // The card shows "PHASE 1", so maybe we check that.
                const type = acc.account_type || '';
                if (phaseFilter === "Phase 1") return type.includes('phase_1') || type.includes('evaluation');
                if (phaseFilter === "Phase 2") return type.includes('phase_2') || type.includes('verification');
                if (phaseFilter === "Funded") return type.includes('funded');
                return true;
            });
        }

        return filtered;
    }, [accounts, searchQuery, typeFilter, stateFilter, phaseFilter, showArchived]);


    // Calculate PnL based on equity (floating) or balance (closed)
    const getPnL = (acc: typeof accounts[0]) => {
        const initialBalance = acc.initial_balance || 100000;
        // Use equity if available and non-zero, otherwise fallback to balance
        // This prevents showing -100% PnL if equity is 0 due to sync lag
        const currentValue = (acc.equity && acc.equity > 0) ? acc.equity : acc.balance;
        return currentValue - initialBalance;
    };

    // Get status label from account status
    const getStatusLabel = (status: string) => {
        switch (status.toLowerCase()) {
            case 'active': return 'Active';
            case 'passed': return 'Passed';
            case 'failed': return 'Not Passed';
            case 'closed': return 'Closed';
            default: return status;
        }
    };

    if (loading && !isMobileModal) {
        return (
            <div className={cn("flex flex-col h-full bg-[#050923] border border-white/5 rounded-2xl p-4 min-w-[280px]", className)}>
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            </div>
        );
    }

    // Mobile modal wrapper
    if (isMobileModal && isOpen) {
        return (
            <>
                {/* Overlay */}
                <motion.div
                    key="account-switcher-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                />

                {/* Modal */}
                <motion.div
                    key="account-switcher-modal"
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed inset-x-0 bottom-0 z-[9999] h-[85vh] bg-[#050923] rounded-t-3xl border-t border-white/5 overflow-hidden flex flex-col shadow-2xl"
                >
                    {/* Drag Handle */}
                    <div className="flex justify-center pt-2 pb-1">
                        <div className="w-12 h-1 bg-white/20 rounded-full" />
                    </div>

                    {loading ? (
                        <div className="flex-1 flex items-center justify-center min-h-[300px]">
                            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                        </div>
                    ) : (
                        <AccountSwitcherContent
                            accounts={accounts}
                            selectedAccount={selectedAccount}
                            setSelectedAccount={(acc: typeof selectedAccount) => {
                                setSelectedAccount(acc);
                                onClose?.();
                            }}
                            loading={loading}
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            isRefreshing={isRefreshing}
                            handleRefresh={handleRefresh}
                            filteredAccounts={filteredAccounts}
                            getPnL={getPnL}
                            getStatusLabel={getStatusLabel}
                            isMobile={true}
                            showArchived={showArchived}
                            setShowArchived={setShowArchived}
                            archiveAccount={archiveAccount}
                            onArchiveClick={(acc: any) => setArchiveTarget(acc)}
                            // Filter Props
                            typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                            stateFilter={stateFilter} setStateFilter={setStateFilter}
                            phaseFilter={phaseFilter} setPhaseFilter={setPhaseFilter}
                            showTypeDropdown={showTypeDropdown} setShowTypeDropdown={setShowTypeDropdown}
                            showStateDropdown={showStateDropdown} setShowStateDropdown={setShowStateDropdown}
                            showPhaseDropdown={showPhaseDropdown} setShowPhaseDropdown={setShowPhaseDropdown}
                        />
                    )}
                </motion.div>
            </>
        );
    }

    // Desktop version
    return (
        <div className={cn(
            "flex flex-col h-full bg-[#050923] border border-white/5 rounded-2xl overflow-hidden shadow-2xl shadow-black/20",
            className
        )}>
            {/* Header Section */}
            <AccountSwitcherContent
                accounts={accounts}
                selectedAccount={selectedAccount}
                setSelectedAccount={setSelectedAccount}
                loading={loading}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isRefreshing={isRefreshing}
                handleRefresh={handleRefresh}
                filteredAccounts={filteredAccounts}
                getPnL={getPnL}
                getStatusLabel={getStatusLabel}
                isMobile={false}
                showArchived={showArchived}
                setShowArchived={setShowArchived}
                archiveAccount={archiveAccount}
                onArchiveClick={(acc: any) => setArchiveTarget(acc)}

                // Filter Props
                typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                stateFilter={stateFilter} setStateFilter={setStateFilter}
                phaseFilter={phaseFilter} setPhaseFilter={setPhaseFilter}
                showTypeDropdown={showTypeDropdown} setShowTypeDropdown={setShowTypeDropdown}
                showStateDropdown={showStateDropdown} setShowStateDropdown={setShowStateDropdown}
                showPhaseDropdown={showPhaseDropdown} setShowPhaseDropdown={setShowPhaseDropdown}
            />

            {/* Archive Confirmation Modal - Rendered via Portal for full screen coverage */}
            {typeof document !== 'undefined' && createPortal(
                <AnimatePresence>
                    {archiveTarget && (
                        <div className="fixed inset-0 z-[10000] flex items-center justify-center px-4 overflow-hidden">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                onClick={() => setArchiveTarget(null)}
                                className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            />
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                                transition={{ type: "spring", damping: 25, stiffness: 400 }}
                                className="relative bg-[#050714]/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] w-full max-w-[420px] p-8 sm:p-10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden"
                            >
                                {/* Premium Shimmer Border */}
                                <div className="absolute inset-0 pointer-events-none rounded-[2.5rem] border border-white/10 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
                                
                                <button 
                                    onClick={() => setArchiveTarget(null)}
                                    className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all"
                                >
                                    <X size={18} />
                                </button>

                                <div className="flex flex-col items-center text-center">
                                    <div className="relative mb-8">
                                        <div className="w-24 h-24 rounded-3xl bg-blue-600/10 flex items-center justify-center text-blue-500 border border-blue-500/20 rotate-12" />
                                        <div className="absolute inset-0 w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-600/40 -rotate-3 transition-transform hover:rotate-0 duration-300">
                                            <Archive size={42} strokeWidth={1.5} />
                                        </div>
                                    </div>
                                    
                                    <h3 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
                                        {archiveTarget.is_archived ? "Restore Account" : "Archive Account"}
                                    </h3>
                                    
                                    <p className="text-gray-400 text-sm leading-relaxed mb-10 max-w-[280px]">
                                        {archiveTarget.is_archived 
                                            ? "Bringing this account back to your main list for active monitoring."
                                            : "This will move the account to your storage. You can access it anytime from the Archived view."
                                        }
                                    </p>

                                    <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 mb-10 flex items-center gap-4 text-left">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                            <TrendingUp size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-0.5">Selected Account</p>
                                            <p className="text-sm font-semibold text-white truncate">#{archiveTarget.login}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                                        <button
                                            onClick={() => setArchiveTarget(null)}
                                            className="w-full sm:flex-1 h-14 rounded-2xl bg-white/5 text-gray-300 font-bold text-sm hover:bg-white/10 hover:text-white transition-all active:scale-[0.98]"
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const targetId = archiveTarget.id;
                                                const nextState = !archiveTarget.is_archived;
                                                setArchiveTarget(null);
                                                try {
                                                    await archiveAccount(targetId, nextState);
                                                } catch (err) {
                                                    console.error("Archive operation failed");
                                                }
                                            }}
                                            className="w-full sm:flex-1 h-14 rounded-2xl bg-blue-600 text-white font-extrabold text-sm hover:bg-blue-500 shadow-lg shadow-blue-600/30 active:scale-[0.98] transition-all relative overflow-hidden group"
                                        >
                                            <span className="relative z-10">Confirm Action</span>
                                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
}

// Extracted component for reuse
function AccountSwitcherContent({
    accounts,
    selectedAccount,
    setSelectedAccount,
    loading,
    searchQuery,
    setSearchQuery,
    isRefreshing,
    handleRefresh,
    filteredAccounts,
    getPnL,
    getStatusLabel,
    showArchived, setShowArchived,
    archiveAccount,
    onArchiveClick,
    // Filter Props
    typeFilter, setTypeFilter,
    stateFilter, setStateFilter,
    phaseFilter, setPhaseFilter,
    showTypeDropdown, setShowTypeDropdown,
    showStateDropdown, setShowStateDropdown,
    showPhaseDropdown, setShowPhaseDropdown,
    isMobile
}: any) {
    return (
        <>
            <div className="p-4 sm:p-6 pb-4">
                <div className="flex flex-col gap-6 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center p-2.5 border border-blue-500/10">
                            <Image
                                src="/shark-icon.svg"
                                alt="SharkFunded"
                                width={32}
                                height={32}
                                className="object-contain"
                            />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="font-bold text-white text-lg sm:text-xl tracking-tight leading-none">Trading Accounts</h3>
                                <button
                                    onClick={handleRefresh}
                                    disabled={isRefreshing}
                                    className="p-1 text-gray-500 hover:text-white hover:bg-white/5 rounded-md transition-all"
                                    title="Sync Trades & Reload"
                                >
                                    <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
                                </button>
                            </div>
                            <p className="text-sm font-medium text-gray-500">
                                {filteredAccounts.length} {showArchived ? 'archived' : 'active'} accounts
                            </p>
                        </div>
                    </div>

                    <div className="relative flex items-center bg-[#0D1017]/50 backdrop-blur-sm p-1 rounded-2xl border border-white/5 shadow-inner w-full">
                        {/* Sliding Indicator */}
                        <motion.div
                            layoutId={isMobile ? "tab-indicator-mobile" : "tab-indicator-desktop"}
                            className="absolute inset-y-1 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30"
                            initial={false}
                            animate={{
                                x: showArchived ? '100%' : '0%',
                                width: 'calc(50% - 4px)',
                                left: '4px'
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        />
                        
                        <button
                            onClick={() => setShowArchived(false)}
                            className={cn(
                                "relative flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all z-10 whitespace-nowrap",
                                !showArchived ? "text-white" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            Active List
                        </button>
                        <button
                            onClick={() => setShowArchived(true)}
                            className={cn(
                                "relative flex-1 py-3 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all z-10 whitespace-nowrap",
                                showArchived ? "text-white" : "text-gray-500 hover:text-gray-300"
                            )}
                        >
                            Archived List
                        </button>
                    </div>
                </div>

                {/* HIDING BUY CHALLENGE AS REQUESTED
                <Link
                    href="/challenges"
                    className="w-full bg-blue-600 active:bg-blue-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all mb-4 sm:mb-6 shadow-lg shadow-blue-500/20 touch-manipulation"
                >
                    <ShoppingCart size={18} /> BUY CHALLENGE
                </Link>
                */}

                {/* Search Bar */}
                <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                    <input
                        type="text"
                        placeholder="Search accounts..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#13161C] border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* Account List */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 pb-20 sm:pb-6 space-y-3 custom-scrollbar touch-pan-y">
                {filteredAccounts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 bg-[#13161C]/50 rounded-2xl border border-dashed border-white/5">
                        <Archive className="mx-auto mb-3 opacity-20" size={32} />
                        <p className="text-sm font-medium">No {showArchived ? 'archived' : 'active'} accounts found</p>
                    </div>
                ) : (
                    filteredAccounts.map((acc: any) => {
                        const isSelected = selectedAccount?.id === acc.id;
                        const pnl = getPnL(acc);
                        const status = getStatusLabel(acc.status);
                        const displayEquity = (acc.equity && acc.equity > 0) ? acc.equity : acc.balance;

                        return (
                            <motion.div
                                key={acc.id}
                                layoutId={isSelected ? "selected-account" : undefined}
                                onClick={() => setSelectedAccount(acc)}
                                className={cn(
                                    "p-4 rounded-xl border cursor-pointer transition-all relative group overflow-hidden active:scale-98 touch-manipulation",
                                    isSelected
                                        ? "bg-[#131E29] border-blue-500/30"
                                        : "bg-[#13161C] border-transparent active:border-white/10"
                                )}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0",
                                            isSelected ? "bg-blue-500/20 text-blue-400" : "bg-[#1C212B] text-gray-500"
                                        )}>
                                            <TrendingUp size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold text-white text-sm truncate pr-2">
                                                {acc.account_number}
                                                <span className="text-gray-500 text-xs font-normal ml-2">#{acc.login}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold px-2.5 py-1 rounded-md capitalize shrink-0 ml-2",
                                        status.toLowerCase() === 'active' ? "bg-blue-500/10 text-blue-400" :
                                            status.toLowerCase() === 'passed' ? "bg-green-500/10 text-green-400" :
                                                (status.toLowerCase() === 'failed' || status.toLowerCase() === 'not passed') ? "bg-red-500/10 text-red-400" :
                                                    "bg-white/5 text-gray-400"
                                    )}>
                                        {status}
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onArchiveClick(acc);
                                        }}
                                        className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-md transition-all ml-1 opacity-0 group-hover:opacity-100"
                                        title={acc.is_archived ? "Restore Account" : "Archive Account"}
                                    >
                                        <Archive size={14} className={acc.is_archived ? "text-blue-400" : ""} />
                                    </button>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">EQUITY</p>
                                        <p className="text-white font-bold text-sm">${displayEquity.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">PNL</p>
                                        <p className={cn("font-bold text-sm", pnl >= 0 ? "text-green-400" : "text-red-400")}>
                                            {pnl >= 0 ? "+" : ""}{pnl.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>
        </>
    );
}
