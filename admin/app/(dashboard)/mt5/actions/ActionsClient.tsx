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
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">MT5 Account Actions</h1>
                <p className="text-gray-600 font-medium">Search for an MT5 account to perform administrative adjustments</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
                <form onSubmit={handleSearch} className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Enter MT5 Login (e.g. 900909490699)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all"
                            autoFocus
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={searching || !searchQuery.trim()}
                        className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:bg-gray-400 transition-all flex items-center gap-2"
                    >
                        {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                        Search
                    </button>
                </form>
            </div>

            {account && (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-gray-50/80 px-8 py-6 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md">
                                <Server className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Login: {account.login}</h2>
                                <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{account.challenge_type}</p>
                            </div>
                        </div>
                        <StatusBadge status={account.status} />
                    </div>

                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {/* User Info */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <User className="h-4 w-4" /> User Details
                            </h3>
                            <div className="space-y-1">
                                <p className="text-lg font-bold text-gray-900">{account.profiles?.full_name || "Unknown"}</p>
                                <p className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <Mail className="h-3.5 w-3.5" /> {account.profiles?.email || "No email"}
                                </p>
                            </div>
                        </div>

                        {/* Financials */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <DollarSign className="h-4 w-4" /> Financials
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 font-bold">BALANCE</p>
                                    <p className="text-xl font-black text-emerald-600">${account.current_balance?.toLocaleString()}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 font-bold">EQUITY</p>
                                    <p className="text-xl font-black text-blue-600">${account.current_equity?.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        {/* Configuration */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Gauge className="h-4 w-4" /> Account Settings
                            </h3>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-500 font-bold">LEVERAGE</p>
                                <p className="text-lg font-bold text-purple-600">1:{account.leverage || '?'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Prominent Action Bar */}
                    <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="space-y-1">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Administrative Actions</p>
                                <p className="text-sm text-gray-600 font-medium">Perform manual adjustments and syncs for this account</p>
                            </div>
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

                    <div className="bg-blue-50/50 px-8 py-6 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-white border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                                <TrendingUp className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trading Group</p>
                                <p className="text-sm font-bold text-gray-900 font-mono">{account.mt5_group || account.group || "-"}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-lg bg-white border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                                <Activity className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Plan Type</p>
                                <p className="text-sm font-bold text-gray-900 uppercase">{account.plan_type || "-"}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {!account && !searching && (
                <div className="text-center py-20 px-8 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                    <div className="h-16 w-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-gray-400">
                        <Server className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Ready to Search</h3>
                    <p className="text-gray-500 max-w-sm mx-auto font-medium">Use the search bar above to look up an account by its MT5 Login. You can then adjust leverage, balance, and more.</p>
                </div>
            )}
        </div>
    );
}
