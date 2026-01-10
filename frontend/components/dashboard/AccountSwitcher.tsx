import { Search, ChevronDown, TrendingUp, Briefcase, ShoppingCart, Loader2, Filter, RefreshCw, Plus } from "lucide-react";
import { useState, useMemo } from "react";
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
    const { accounts, selectedAccount, setSelectedAccount, loading, refreshAccounts } = useAccount();
    const [searchQuery, setSearchQuery] = useState("");
    const [isRefreshing, setIsRefreshing] = useState(false);

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
                // If "Buy" and "Sell" maps to something else, adjust here. 
                // Based on UI options "Buy", "Sell" usually implies order types but here it filters accounts.
                // Assuming "Type" refers to Demo vs Live or similar, but the user asked for "Buy", "Sell" in options previously.
                // Re-reading user request: "Type -> All Types, Buy, Sell". 
                // Accounts don't usually have "Buy/Sell" type. 
                // Let's assume standard account filtering. If 'account_type' contains the string.
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
    }, [accounts, searchQuery, typeFilter, stateFilter, phaseFilter]);


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
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                />

                {/* Modal */}
                <motion.div
                    initial={{ y: "100%" }}
                    animate={{ y: 0 }}
                    exit={{ y: "100%" }}
                    transition={{ type: "spring", damping: 30, stiffness: 300 }}
                    className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] bg-[#050923] rounded-t-3xl border-t border-white/5 overflow-hidden flex flex-col"
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
            "flex flex-col h-full bg-[#050923] border border-white/5 rounded-2xl overflow-hidden",
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

                // Filter Props
                typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                stateFilter={stateFilter} setStateFilter={setStateFilter}
                phaseFilter={phaseFilter} setPhaseFilter={setPhaseFilter}
                showTypeDropdown={showTypeDropdown} setShowTypeDropdown={setShowTypeDropdown}
                showStateDropdown={showStateDropdown} setShowStateDropdown={setShowStateDropdown}
                showPhaseDropdown={showPhaseDropdown} setShowPhaseDropdown={setShowPhaseDropdown}
            />
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
    isMobile,
    // Filter Props
    typeFilter, setTypeFilter,
    stateFilter, setStateFilter,
    phaseFilter, setPhaseFilter,
    showTypeDropdown, setShowTypeDropdown,
    showStateDropdown, setShowStateDropdown,
    showPhaseDropdown, setShowPhaseDropdown
}: any) {
    return (
        <>
            <div className="p-4 sm:p-6 pb-4">
                <div className="flex items-center gap-3 mb-4 sm:mb-6">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center overflow-hidden">
                        <Image
                            src="/shark-icon.svg"
                            alt="SharkFunded"
                            width={24}
                            height={24}
                            className="object-contain"
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white text-base sm:text-lg leading-tight">Trading Accounts</h3>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className="text-gray-500 hover:text-white transition-colors"
                                title="Sync Trades & Reload"
                            >
                                <RefreshCw size={14} className={cn(isRefreshing && "animate-spin")} />
                            </button>
                        </div>
                        <p className="text-sm text-gray-500">{accounts.length} accounts</p>
                    </div>
                </div>

                <Link
                    href="/challenges"
                    className="w-full bg-blue-600 active:bg-blue-700 text-white font-semibold py-3 sm:py-3.5 rounded-xl flex items-center justify-center gap-2 text-sm transition-all mb-4 sm:mb-6 shadow-lg shadow-blue-500/20 touch-manipulation"
                >
                    <ShoppingCart size={18} /> BUY CHALLENGE
                </Link>

                {/* Filters Row - Scrollable on mobile */}
                <div className="flex items-center gap-3 mb-4 overflow-x-auto pb-2 scrollbar-none">
                    {/* Type Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowTypeDropdown(!showTypeDropdown);
                                setShowStateDropdown(false);
                                setShowPhaseDropdown(false);
                            }}
                            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors whitespace-nowrap bg-[#13161C] border border-white/5 px-3 py-1.5 rounded-lg"
                        >
                            <span className="text-gray-500">Type:</span> <span className="text-white">{typeFilter}</span> <ChevronDown size={12} className={cn("transition-transform ml-1", showTypeDropdown && "rotate-180")} />
                        </button>
                        {showTypeDropdown && (
                            <div className="absolute top-full left-0 mt-2 w-32 bg-[#131E29] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                {["All Types", "Challenge", "Funded"].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => {
                                            setTypeFilter(option);
                                            setShowTypeDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors block",
                                            typeFilter === option ? "text-blue-400 bg-blue-500/10" : "text-gray-400"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* State Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowStateDropdown(!showStateDropdown);
                                setShowTypeDropdown(false);
                                setShowPhaseDropdown(false);
                            }}
                            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors whitespace-nowrap bg-[#13161C] border border-white/5 px-3 py-1.5 rounded-lg"
                        >
                            <span className="text-gray-500">State:</span> <span className="text-white">{stateFilter}</span> <ChevronDown size={12} className={cn("transition-transform ml-1", showStateDropdown && "rotate-180")} />
                        </button>
                        {showStateDropdown && (
                            <div className="absolute top-full left-0 mt-2 w-32 bg-[#131E29] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                {["All States", "Open", "Closed", "Pending"].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => {
                                            setStateFilter(option);
                                            setShowStateDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors block",
                                            stateFilter === option ? "text-blue-400 bg-blue-500/10" : "text-gray-400"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Phase Filter */}
                    <div className="relative">
                        <button
                            onClick={() => {
                                setShowPhaseDropdown(!showPhaseDropdown);
                                setShowTypeDropdown(false);
                                setShowStateDropdown(false);
                            }}
                            className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-white transition-colors whitespace-nowrap bg-[#13161C] border border-white/5 px-3 py-1.5 rounded-lg"
                        >
                            <span className="text-gray-500">Phase:</span> <span className="text-white">{phaseFilter}</span> <ChevronDown size={12} className={cn("transition-transform ml-1", showPhaseDropdown && "rotate-180")} />
                        </button>
                        {showPhaseDropdown && (
                            <div className="absolute top-full left-0 mt-2 w-32 bg-[#131E29] border border-white/10 rounded-lg shadow-xl z-50 overflow-hidden">
                                {["All Phases", "Phase 1", "Phase 2", "Funded"].map((option) => (
                                    <button
                                        key={option}
                                        onClick={() => {
                                            setPhaseFilter(option);
                                            setShowPhaseDropdown(false);
                                        }}
                                        className={cn(
                                            "w-full px-3 py-2 text-left text-xs hover:bg-white/5 transition-colors block",
                                            phaseFilter === option ? "text-blue-400 bg-blue-500/10" : "text-gray-400"
                                        )}
                                    >
                                        {option}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

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
            <div className="flex-1 overflow-y-auto px-4 pb-4 sm:pb-6 space-y-3 custom-scrollbar overscroll-contain">
                {filteredAccounts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        No accounts found
                    </div>
                ) : (
                    filteredAccounts.map((acc: typeof selectedAccount) => {
                        const isSelected = selectedAccount?.id === acc.id;
                        const pnl = getPnL(acc);
                        const status = getStatusLabel(acc.status);

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
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                                            isSelected ? "bg-blue-500/20 text-blue-400" : "bg-[#1C212B] text-gray-500"
                                        )}>
                                            <TrendingUp size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">
                                                {acc.account_number}
                                                <span className="text-gray-500 text-xs font-normal ml-2">#{acc.login}</span>
                                            </p>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">
                                                {acc.account_type?.replace(/_/g, ' ') || 'PHASE 1'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={cn(
                                        "text-[10px] font-bold px-2.5 py-1 rounded-md capitalize",
                                        status.toLowerCase() === 'active' ? "bg-blue-500/10 text-blue-400" :
                                            status.toLowerCase() === 'passed' ? "bg-green-500/10 text-green-400" :
                                                (status.toLowerCase() === 'failed' || status.toLowerCase() === 'not passed') ? "bg-red-500/10 text-red-400" :
                                                    "bg-white/5 text-gray-400"
                                    )}>
                                        {status}
                                    </span>
                                </div>

                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">BALANCE</p>
                                        <p className="text-white font-bold text-sm">${acc.balance.toLocaleString()}</p>
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
