"use client";

import { useState } from "react";
import { Search, Loader2, Server, User, Mail, DollarSign, Activity, Gauge, TrendingUp, TrendingDown } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AccountActions } from "@/components/admin/AccountActions";
import { toast } from "sonner";

interface Account {
    id: string;
    user_id: string;
    challenge_number: string | null;
    initial_balance: number;
    current_balance?: number;
    current_equity?: number;
    plan_type: string;
    login: number | null;
    status: string;
    challenge_type: string;
    created_at: string;
    mt5_group?: string;
    group?: string;
    leverage?: number;
    profiles?: {
        full_name: string | null;
        email: string | null;
    };
}

export default function MT5ActionsClient() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [account, setAccount] = useState<Account | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const login = searchQuery.trim().replace(/\D/g, ''); // Only numbers
        if (!login) {
            setAccount(null); // Clear previous results if query is empty
            return;
        }

        setSearching(true);
        setAccount(null);

        try {
            const response = await fetch(`/api/mt5/accounts?login=${login}`);
            if (!response.ok) throw new Error("Search failed");

            const data = await response.json();
            // Since we filter by login in backend now, the first result should be it
            if (data.accounts && data.accounts.length > 0) {
                setAccount(data.accounts[0]);
                toast.success(`Account ${login} found`);
            } else {
                toast.error(`Account with login ${login} not found in database.`);
            }
        } catch (error) {
            console.error("Search error:", error);
            toast.error("Failed to search for account. Backend might be offline.");
        } finally {
            setSearching(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="space-y-1 mt-2 mb-8 text-center sm:text-left">
                <h1 className="text-2xl font-bold tracking-tight text-gray-900">MT5 Account Actions</h1>
                <p className="text-gray-500 font-medium text-sm">Search and adjust active trading accounts</p>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 p-6 sm:p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Enter MT5 Login..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-14 pr-4 py-4 bg-gray-50/50 hover:bg-white border border-gray-200 rounded-2xl text-lg font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:font-medium placeholder:text-gray-400"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={searching || !searchQuery.trim()}
                        className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 disabled:bg-gray-300 disabled:shadow-none transition-all flex items-center justify-center gap-2 sm:w-auto w-full"
                    >
                        {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                        <span>Search</span>
                    </button>
                </form>
            </div>

            {account && (
                <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] animate-in fade-in slide-in-from-bottom-4 duration-300">
                    {/* Header */}
                    <div className="bg-white px-6 py-5 sm:px-8 sm:py-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100/50">
                                <Server className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">{account.login}</h2>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-0.5">{account.challenge_type}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 self-start sm:self-auto">
                            <StatusBadge status={account.status} />
                        </div>
                    </div>

                    <div className="p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-50/30">
                        {/* Info Cards - Bento Layout */}
                        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* User Details */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                                        <User className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trader Profile</h3>
                                </div>
                                <p className="text-lg font-bold text-gray-900 truncate" title={account.profiles?.full_name || "Unknown"}>
                                    {account.profiles?.full_name || "Unknown"}
                                </p>
                                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                                    <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                                    <span className="truncate" title={account.profiles?.email || ""}>{account.profiles?.email || "No email"}</span>
                                </div>
                            </div>

                            {/* Financials */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-2">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-gray-50 rounded-lg text-gray-400">
                                        <DollarSign className="h-4 w-4" />
                                    </div>
                                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Metrics</h3>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="space-y-0.5">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balance</p>
                                        <p className="text-xl font-black text-gray-900">${account.current_balance?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                    <div className="space-y-0.5 text-right">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Equity</p>
                                        <p className={`text-xl font-black ${account.current_equity && account.current_balance && account.current_equity >= account.current_balance ? 'text-emerald-600' : 'text-blue-600'}`}>
                                            ${account.current_equity?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Group & Plan */}
                            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm sm:col-span-2 flex flex-col sm:flex-row gap-6">
                                <div className="flex-1 flex gap-4 items-center">
                                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 border border-indigo-100/50">
                                        <TrendingUp className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trading Group</p>
                                        <p className="text-sm font-bold text-gray-900 font-mono mt-0.5 bg-gray-50 px-2 py-0.5 rounded inline-block border border-gray-200">{account.mt5_group || account.group || "-"}</p>
                                    </div>
                                </div>
                                <div className="w-px bg-gray-100 hidden sm:block" />
                                <div className="flex-1 flex gap-4 items-center">
                                    <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100/50">
                                        <Activity className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan / Lev</p>
                                        <p className="text-sm font-bold text-gray-900 mt-0.5 uppercase">{account.plan_type || "-"} <span className="text-gray-400 ml-1">@ 1:{account.leverage || '?'}</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-4 bg-white rounded-2xl p-1 border border-indigo-100 shadow-sm relative flex flex-col">
                            {/* Decorative background with its own overflow hidden */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10" />
                            </div>
                            <div className="p-5 border-b border-gray-50 flex items-center justify-between relative z-10">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    <h3 className="text-sm font-bold text-gray-900">Admin Controls</h3>
                                </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col justify-center relative">
                                <AccountActions
                                    accountId={account.id}
                                    login={account.login || 0}
                                    currentStatus={account.status}
                                    userId={account.user_id}
                                    currentEmail={account.profiles?.email || ""}
                                    challengeType={account.challenge_type}
                                    onRefresh={() => handleSearch({ preventDefault: () => { } } as any)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!account && !searching && (
                <div className="text-center py-20 px-8 bg-white rounded-3xl border border-dashed border-gray-200 shadow-sm">
                    <div className="h-16 w-16 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-500">
                        <Server className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Search</h3>
                    <p className="text-gray-500 max-w-sm mx-auto font-medium">Enter an MT5 Login above. We'll pull the trader's profile, financials, and administrative controls instantly.</p>
                </div>
            )}
        </div>
    );
}
