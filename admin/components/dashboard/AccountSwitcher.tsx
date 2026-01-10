"use client";

import { Search, ChevronDown, TrendingUp, Briefcase, ShoppingCart, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/AccountContext";
import Link from "next/link";

interface AccountSwitcherProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function AccountSwitcher({ isOpen, onClose }: AccountSwitcherProps = {}) {
    const { accounts, selectedAccount, setSelectedAccount, loading } = useAccount();
    const [searchQuery, setSearchQuery] = useState("");

    // Filter accounts based on search query
    const filteredAccounts = useMemo(() => {
        if (!searchQuery.trim()) return accounts;
        const query = searchQuery.toLowerCase();
        return accounts.filter(acc =>
            acc.account_number.toLowerCase().includes(query) ||
            acc.account_type.toLowerCase().includes(query)
        );
    }, [accounts, searchQuery]);

    // Calculate PnL based on balance and equity
    const getPnL = (acc: typeof accounts[0]) => {
        const initialBalance = acc.initial_balance || 100000;
        return acc.balance - initialBalance;
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

    // Get account type icon based on type
    const getAccountIcon = (type: string) => {
        const typeUpper = type.toUpperCase();
        if (typeUpper.includes('PHASE') || typeUpper.includes('EVALUATION')) {
            return TrendingUp;
        }
        return Briefcase;
    };

    if (loading) {
        return (
            <div className="hidden md:flex flex-col h-full bg-gray-900 border-r border-white/5 min-w-[320px] max-w-[320px]">
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Overlay */}
            {
                isOpen && (
                    <div
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
                    />
                )
            }

            <div className={cn(
                "flex-col h-full bg-gray-900 border-r border-white/5 min-w-[320px] max-w-[320px] transition-transform duration-300 z-50",
                "hidden md:flex", // Desktop: always flex
                // Mobile: Fixed position, slide in/out based on isOpen
                "md:relative md:translate-x-0",
                isOpen ? "fixed inset-y-0 left-0 flex translate-x-0" : "fixed inset-y-0 left-0 flex -translate-x-full"
            )}>
                {/* User Header */}
                <div className="p-5 border-b border-white/5">
                    <div className="flex items-center gap-3.5 mb-5">
                        <div className="w-11 h-11 rounded-full border border-white/10 p-[2px]">
                            <div className="w-full h-full bg-white/5 rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {selectedAccount?.account_number?.charAt(0) || 'S'}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-bold text-white text-base">Trading Accounts</h3>
                            <p className="text-xs text-gray-500">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    <Link
                        href="/challenges"
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm transition-all shadow-lg shadow-blue-500/20"
                    >
                        <ShoppingCart size={16} /> BUY CHALLENGE
                    </Link>
                </div>

                {/* Filters */}
                <div className="px-3 py-2 grid grid-cols-3 gap-1 border-b border-white/5 bg-black/20">
                    {["Type", "State", "Phase"].map((filter, i) => (
                        <button key={i} className="flex items-center justify-center gap-1 text-[11px] font-semibold text-gray-400 hover:text-white hover:bg-white/5 py-1.5 rounded-lg transition-all border border-transparent hover:border-white/5">
                            {filter} <ChevronDown size={10} />
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="p-3 border-b border-white/5">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-hover:text-blue-400 transition-colors" size={14} />
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/20 border border-white/5 focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 rounded-xl py-2 pl-9 pr-3 text-sm outline-none transition-all placeholder:text-gray-600 text-white"
                        />
                    </div>
                </div>

                {/* Account List */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
                    {filteredAccounts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <Briefcase className="w-12 h-12 text-gray-600 mb-3" />
                            <p className="text-gray-500 text-sm">
                                {accounts.length === 0 ? "No accounts found" : "No matching accounts"}
                            </p>
                            {accounts.length === 0 && (
                                <Link
                                    href="/challenges"
                                    className="mt-3 text-blue-400 hover:text-blue-300 text-sm font-medium"
                                >
                                    Get your first challenge →
                                </Link>
                            )}
                        </div>
                    ) : (
                        filteredAccounts.map((acc) => {
                            const isSelected = selectedAccount?.id === acc.id;
                            const pnl = getPnL(acc);
                            const status = getStatusLabel(acc.status);
                            const AccountIcon = getAccountIcon(acc.account_type);

                            return (
                                <div
                                    key={acc.id}
                                    onClick={() => setSelectedAccount(acc)}
                                    className={cn(
                                        "p-4 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden group",
                                        isSelected
                                            ? "bg-blue-500/10 border-blue-500/50"
                                            : "bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10"
                                    )}
                                >
                                    {/* Active Indicator */}
                                    {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />}

                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className={cn(
                                                "w-8 h-8 rounded-lg flex items-center justify-center border",
                                                isSelected ? "bg-blue-500/20 text-blue-400 border-blue-500/20" : "bg-white/5 text-gray-500 border-white/5 group-hover:border-white/10"
                                            )}>
                                                <AccountIcon size={16} />
                                            </div>
                                            <div>
                                                <p className={cn("font-bold text-sm tracking-tight", isSelected ? "text-white" : "text-gray-300")}>
                                                    {acc.account_number}
                                                </p>
                                                <p className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">{acc.account_type}</p>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                                            status === "Passed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                                                status === "Not Passed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                                                    status === "Active" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                                                        "bg-white/10 text-gray-400 border-white/10"
                                        )}>
                                            {status}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 mt-2 pt-2 border-t border-white/5">
                                        <div>
                                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">Balance</p>
                                            <p className="font-bold text-sm text-gray-200">${acc.balance.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-0.5">PnL</p>
                                            <p className={cn("font-bold text-sm", pnl >= 0 ? "text-green-400" : "text-red-400")}>
                                                {pnl >= 0 ? "+" : ""}{pnl.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </>
    );
}
