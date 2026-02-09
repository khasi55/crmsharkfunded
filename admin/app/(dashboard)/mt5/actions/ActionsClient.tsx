"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, Server, User, Mail, DollarSign, Activity, Gauge, TrendingUp, TrendingDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AccountActions } from "@/components/admin/AccountActions";
import { toast } from "sonner";
import Link from "next/link";

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
    upgraded_to?: string;
    profiles?: {
        full_name: string | null;
        email: string | null;
    };
}

export default function MT5ActionsClient() {
    const [searchQuery, setSearchQuery] = useState("");
    const [searching, setSearching] = useState(false);
    const [account, setAccount] = useState<Account | null>(null);

    // List State
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [loadingList, setLoadingList] = useState(false);
    const itemsPerPage = 50;

    const fetchAccountsList = async () => {
        setLoadingList(true);
        try {
            const response = await fetch(`/api/mt5/accounts?page=${currentPage}&limit=${itemsPerPage}`);
            if (!response.ok) throw new Error("Failed to fetch accounts");
            const data = await response.json();
            setAccounts(data.accounts || []);
            setTotalAccounts(data.count || 0);
        } catch (error) {
            console.error("Fetch list error:", error);
            toast.error("Failed to load accounts list");
        } finally {
            setLoadingList(false);
        }
    };

    useEffect(() => {
        fetchAccountsList();
    }, [currentPage]);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const login = searchQuery.trim().replace(/\D/g, ''); // Only numbers
        if (!login) {
            setAccount(null); // Clear previous results if query is empty
            return;
        }

        if (e) setSearching(true);
        // Don't clear account if we're just refreshing
        if (e) setAccount(null);

        try {
            const response = await fetch(`/api/mt5/accounts?login=${login}`);
            if (!response.ok) throw new Error("Search failed");

            const data = await response.json();
            // Since we filter by login in backend now, the first result should be it
            if (data.accounts && data.accounts.length > 0) {
                setAccount(data.accounts[0]);
                if (e) toast.success(`Account ${login} found`);
            } else {
                if (e) toast.error(`Account with login ${login} not found in database.`);
                else setAccount(null);
            }
        } catch (error) {
            console.error("Search error:", error);
            if (e) toast.error("Failed to search for account. Backend might be offline.");
        } finally {
            if (e) setSearching(false);
        }
    };

    const refresh = () => {
        handleSearch();
        fetchAccountsList();
    };

    const totalPages = Math.ceil(totalAccounts / itemsPerPage);

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
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

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <Gauge className="h-4 w-4" /> Account Settings
                            </h3>
                            <div className="space-y-1">
                                <p className="text-xs text-gray-500 font-bold">LEVERAGE</p>
                                <p className="text-xl font-bold text-purple-600">1:{account.leverage || '?'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-8 border-t border-gray-100 bg-gray-50/30">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2 mb-6">
                            <Activity className="h-4 w-4" /> Administrative Actions
                        </h3>
                        <AccountActions
                            accountId={account.id}
                            login={account.login || 0}
                            currentStatus={account.status}
                            currentLeverage={account.leverage}
                            userId={account.user_id}
                            currentEmail={account.profiles?.email || undefined}
                            challengeType={account.challenge_type}
                            upgradedTo={account.upgraded_to}
                            variant="labels"
                            onSuccess={refresh}
                        />
                    </div>
                </div>
            )}

            {/* Full Accounts List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-600" />
                        All Accounts List
                    </h2>
                    <Link
                        href="/mt5"
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                        View in Main Table →
                    </Link>
                </div>

                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">User / Email</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Login</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Balance</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Type</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Status</th>
                                    <th className="px-6 py-4 font-bold text-gray-400 uppercase tracking-wider text-[10px]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loadingList ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">Loading account list...</td></tr>
                                ) : accounts.length === 0 ? (
                                    <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">No accounts found.</td></tr>
                                ) : (
                                    accounts.map((acc) => (
                                        <tr key={acc.id} className={`hover:bg-gray-50 transition-colors ${account?.id === acc.id ? 'bg-blue-50/50' : ''}`}>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-900">{acc.profiles?.full_name || "Unknown"}</div>
                                                <div className="text-xs text-gray-500">{acc.profiles?.email || "No email"}</div>
                                            </td>
                                            <td className="px-6 py-4 font-mono font-bold text-blue-600">{acc.login || "-"}</td>
                                            <td className="px-6 py-4 font-black text-emerald-600">${acc.current_balance?.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-bold uppercase tracking-tight text-gray-400">{acc.challenge_type}</span>
                                            </td>
                                            <td className="px-6 py-4"><StatusBadge status={acc.status} /></td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setSearchQuery(acc.login?.toString() || "");
                                                            setAccount(acc);
                                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                                        }}
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-1.5 bg-blue-50 rounded-lg transition-all"
                                                    >
                                                        Select
                                                    </button>
                                                    <AccountActions
                                                        accountId={acc.id}
                                                        login={acc.login || 0}
                                                        currentStatus={acc.status}
                                                        challengeType={acc.challenge_type}
                                                        upgradedTo={acc.upgraded_to}
                                                        userId={acc.user_id}
                                                        currentEmail={acc.profiles?.email || undefined}
                                                        currentLeverage={acc.leverage}
                                                        onSuccess={refresh}
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Simple Pagination */}
                    <div className="px-8 py-6 bg-gray-50/50 border-t border-gray-200 flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-500">
                            Showing <span className="text-gray-900">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="text-gray-900">{Math.min(currentPage * itemsPerPage, totalAccounts)}</span> of <span className="text-gray-900">{totalAccounts}</span> accounts
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1 || loadingList}
                                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 transition-all shadow-sm"
                            >
                                <ChevronLeft className="h-5 w-5" />
                            </button>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || loadingList}
                                className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:bg-gray-50 disabled:text-gray-300 transition-all shadow-sm"
                            >
                                <ChevronRight className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
