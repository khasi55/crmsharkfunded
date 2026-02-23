"use client";

import { Server, Plus, Filter, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AccountActions } from "@/components/admin/AccountActions";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

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
    server?: string;
    upgraded_to?: string;
    profiles?: {
        full_name: string | null;
        email: string | null;
    };
    challenge_category?: string;
    metadata?: {
        assigned_via?: string;
        plan_type?: string;
        assignment_note?: string;
        assignment_image_url?: string;
        payment_provider?: string;
        [key: string]: any;
    };
}

export default function AdminMT5Client() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get('tab') as "first" | "second" | "funded" | "instant";
    const statusParam = searchParams.get('status');

    const [activeTab, setActiveTab] = useState<"first" | "second" | "funded" | "instant">(tabParam || "first");
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>(statusParam || "all");
    const [sizeFilter, setSizeFilter] = useState<string>("all");
    const [groupFilter, setGroupFilter] = useState<string>("all");
    const [sourceFilter, setSourceFilter] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);

    useEffect(() => {
        fetchAccounts();
    }, []);

    // Sync activeTab and statusFilter with searchParams
    useEffect(() => {
        const currentTab = searchParams.get('tab') as "first" | "second" | "funded" | "instant";
        if (currentTab && (currentTab === "first" || currentTab === "second" || currentTab === "funded" || currentTab === "instant")) {
            setActiveTab(currentTab);
        }

        const currentStatus = searchParams.get('status');
        if (currentStatus) {
            setStatusFilter(currentStatus);
        }
    }, [searchParams]);

    useEffect(() => {
        applyFilters();
        setCurrentPage(1); // Reset pagination when filters change
    }, [accounts, activeTab, statusFilter, sizeFilter, groupFilter, sourceFilter, dateFrom, dateTo, searchQuery]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/mt5/accounts');
            if (!response.ok) {
                throw new Error('Failed to fetch accounts');
            }
            const data = await response.json();
            setAccounts(data.accounts || []);
        } catch (error) {
            console.error('Error fetching MT5 accounts:', error);
            setAccounts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = () => {
        const headers = [
            "ID", "Name", "Email", "Login", "Server",
            "Initial Balance", "Current Balance", "Equity",
            "Type", "Plan", "Group", "Source", "Status", "Date"
        ];

        const csvContent = filteredAccounts.map(account => {
            const source = account.metadata?.assigned_via === 'admin_manual'
                ? 'Admin Assigned'
                : (account.metadata?.payment_provider || 'Checkout');

            return [
                account.id,
                account.profiles?.full_name || "Unknown",
                account.profiles?.email || "No email",
                account.login || "-",
                account.server || "Mazi Finance",
                account.initial_balance,
                account.current_balance || 0,
                account.current_equity || 0,
                account.challenge_type,
                account.plan_type,
                account.mt5_group || account.group || "-",
                source,
                account.status,
                new Date(account.created_at).toLocaleDateString()
            ].map(field => `"${field}"`).join(",");
        }).join("\n");

        const blob = new Blob([headers.join(",") + "\n" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `mt5_accounts_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const applyFilters = () => {
        let filtered = accounts;

        // Tab filter
        if (activeTab === "first") {
            filtered = filtered.filter(a => {
                const type = (a.challenge_type || '').toLowerCase();
                const plan = (a.plan_type || "").toLowerCase();

                // Dashboard Logic: If it's not Phase 2, Funded, or Instant, it counts as Phase 1.
                // So we exclude anything that matches the other tabs.
                const isPhase2 = type.includes('phase 2') || type.includes('phase_2') || type.includes('step 2') || type.includes('step_2');
                const isFunded = (type === "master account" || type === "funded" || type.includes('funded') || type.includes('master') || type.includes('live')) && !plan.includes("instant");
                const isInstant = type === "instant" || type === "rapid" || type.includes('instant') || plan.includes("instant");

                return !isPhase2 && !isFunded && !isInstant;
            });
        } else if (activeTab === "second") {
            filtered = filtered.filter(a => {
                const type = (a.challenge_type || '').toLowerCase();
                return type.includes('phase 2') || type.includes('phase_2') ||
                    type.includes('step 2') || type.includes('step_2');
            });
        } else if (activeTab === "funded") {
            filtered = filtered.filter(a => {
                const type = (a.challenge_type || '').toLowerCase();
                return (type === "master account" || type === "funded" ||
                    type.includes('funded')) &&
                    !a.plan_type?.toLowerCase().includes("instant");
            });
        } else if (activeTab === "instant") {
            filtered = filtered.filter(a =>
                (a.challenge_type || "").toLowerCase().includes("instant") ||
                (a.plan_type || "").toLowerCase().includes("instant")
            );
        }

        // Exclude breached/failed/upgraded accounts from all tabs UNLESS status filter is specifically set
        // Note: We now include 'disabled' in the 'all' view as per user request.
        if (statusFilter !== "breached" && statusFilter !== "failed" && statusFilter !== "disabled" && statusFilter !== "upgraded") {
            filtered = filtered.filter(a =>
                a.status !== 'breached' &&
                a.status !== 'failed' &&
                a.status !== 'upgraded' &&
                !a.upgraded_to
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            if (statusFilter === "breached") {
                filtered = filtered.filter(a =>
                    a.status === 'breached' ||
                    a.status === 'failed' ||
                    a.status === 'disabled' ||
                    a.status === 'upgraded' ||
                    !!a.upgraded_to
                );
            } else if (statusFilter === "disabled") {
                filtered = filtered.filter(a => a.status === 'disabled' || a.status === 'upgraded' || !!a.upgraded_to);
            } else {
                filtered = filtered.filter(a => a.status === statusFilter);
            }
        }

        // Size filter
        if (sizeFilter !== "all") {
            const size = parseInt(sizeFilter);
            filtered = filtered.filter(a => a.initial_balance === size);
        }

        // Group filter
        if (groupFilter !== "all") {
            filtered = filtered.filter(a => (a.mt5_group === groupFilter || a.group === groupFilter));
        }

        // Source filter
        if (sourceFilter !== "all") {
            if (sourceFilter === "admin") {
                filtered = filtered.filter(a => a.metadata?.assigned_via === 'admin_manual');
            } else if (sourceFilter === "checkout") {
                filtered = filtered.filter(a => a.metadata?.assigned_via !== 'admin_manual');
            }
        }

        // Date Range filter
        if (dateFrom) {
            const from = new Date(dateFrom);
            filtered = filtered.filter(a => new Date(a.created_at) >= from);
        }
        if (dateTo) {
            const to = new Date(dateTo);
            to.setHours(23, 59, 59, 999);
            filtered = filtered.filter(a => new Date(a.created_at) <= to);
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase().trim();
            filtered = filtered.filter(a =>
                (a.profiles?.full_name?.toLowerCase().includes(query) || false) ||
                (a.profiles?.email?.toLowerCase().includes(query) || false) ||
                (a.login?.toString().includes(query) || false) ||
                (a.challenge_number?.toLowerCase().includes(query) || false) ||
                (a.id?.toLowerCase().includes(query) || false)
            );
        }

        setFilteredAccounts(filtered);
    };

    const uniqueSizes = Array.from(new Set(accounts.map(a => a.initial_balance))).sort((a, b) => a - b);

    const MT5_GROUP_FILTERS = [
        { label: "Lite - Instant Funding", value: "demo\\S\\0-SF" },
        { label: "Lite - 1-Step Challenge", value: "demo\\S\\1-SF" },
        { label: "Lite - 2-Step Challenge", value: "demo\\S\\2-SF" },
        { label: "Prime - Instant Funding", value: "demo\\SF\\0-Pro" },
        { label: "Prime - 1-Step Challenge", value: "demo\\SF\\1-Pro" },
        { label: "Prime - 2-Step Challenge", value: "demo\\SF\\2-Pro" },
        { label: "Funded Live Account", value: "SF Funded Live" },
    ];

    // Pagination Logic
    const totalPages = Math.ceil(filteredAccounts.length / itemsPerPage);
    const paginatedAccounts = filteredAccounts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-gray-100">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">MT5 Accounts</h1>
                    <p className="mt-2 text-gray-500 max-w-2xl text-base">
                        Comprehensive management and oversight of all meta-trader 5 institutional trading accounts.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-200 text-sm font-semibold text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm active:scale-95"
                    >
                        <svg className="mr-2 h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export Data
                    </button>
                    <Link
                        href="/mt5/assign"
                        className="inline-flex items-center px-4 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-all shadow-md active:scale-95 ring-offset-2 focus:ring-2 focus:ring-gray-900"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Assign Account
                    </Link>
                </div>
            </div>

            {/* Metrics Overview - Bento Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Accounts", value: filteredAccounts.length, icon: Server, color: "gray", trend: "Live Tracking" },
                    { label: "Active Trading", value: filteredAccounts.filter(a => a.status === 'active').length, icon: Server, color: "emerald", trend: "Compliant" },
                    { label: "Phase Completed", value: filteredAccounts.filter(a => a.status === 'passed').length, icon: Server, color: "blue", trend: "Upgradable" },
                    { label: "Breached/Failed", value: filteredAccounts.filter(a => a.status === 'breached' || a.status === 'failed' || a.status === 'disabled').length, icon: Server, color: "rose", trend: "Action Required" },
                ].map((stat) => (
                    <div key={stat.label} className="relative group overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 shadow-sm hover:shadow-md transition-all duration-300">
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity">
                            <stat.icon className="h-24 w-24 text-gray-900" />
                        </div>
                        <div className="flex items-start justify-between relative z-10">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{stat.label}</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stat.value.toLocaleString()}</h3>
                                <div className="mt-3 flex items-center gap-1.5">
                                    <span className={`inline-block h-1.5 w-1.5 rounded-full bg-${stat.color}-500 animate-pulse`} />
                                    <span className="text-[10px] font-bold text-gray-500 uppercase">{stat.trend}</span>
                                </div>
                            </div>
                            <div className={`p-3 rounded-xl bg-gray-50 text-gray-600 group-hover:bg-${stat.color}-50 group-hover:text-${stat.color}-600 transition-colors`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-gray-100/80 rounded-2xl w-fit">
                {(["first", "second", "funded", "instant"] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-900"
                            }`}
                    >
                        {tab === "first" ? "Phase 1" : tab === "second" ? "Phase 2" : tab === "funded" ? "Funded" : "Instant"}
                    </button>
                ))}
            </div>

            {/* Filters Bar - Refined */}
            <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[300px]">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Universal search (Name, Login, ID, Email)..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-gray-900/5 transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-gray-900/5 cursor-pointer appearance-none min-w-[140px]"
                        >
                            <option value="all">Status: All</option>
                            <option value="active">Active Only</option>
                            <option value="passed">Passed</option>
                            <option value="disabled">Disabled</option>
                            <option value="breached">Breached</option>
                        </select>

                        <select
                            value={sizeFilter}
                            onChange={(e) => setSizeFilter(e.target.value)}
                            className="px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-gray-900/5 cursor-pointer appearance-none min-w-[120px]"
                        >
                            <option value="all">Size: All</option>
                            {uniqueSizes.map(size => (
                                <option key={size} value={size}>${(size / 1000).toFixed(0)}k</option>
                            ))}
                        </select>

                        <select
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                            className="px-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-gray-900/5 cursor-pointer appearance-none max-w-[200px]"
                        >
                            <option value="all">Server Group: All</option>
                            {MT5_GROUP_FILTERS.map(group => (
                                <option key={group.value} value={group.value}>{group.label}</option>
                            ))}
                        </select>
                    </div>

                    {(dateFrom || dateTo || statusFilter !== "all" || sizeFilter !== "all" || groupFilter !== "all" || sourceFilter !== "all" || searchQuery) && (
                        <button
                            onClick={() => {
                                setDateFrom(""); setDateTo(""); setStatusFilter("all"); setSizeFilter("all"); setGroupFilter("all"); setSourceFilter("all"); setSearchQuery("");
                            }}
                            className="text-sm font-bold text-rose-600 hover:text-rose-700 px-4"
                        >
                            Reset
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-6 border-t border-gray-50">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase text-gray-400">Date Origin</span>
                        <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl">
                            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="bg-transparent border-none text-xs font-bold focus:ring-0 p-2" />
                            <span className="text-gray-300">→</span>
                            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="bg-transparent border-none text-xs font-bold focus:ring-0 p-2" />
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold uppercase text-gray-400">Merchant Source</span>
                        <div className="flex p-0.5 bg-gray-50 rounded-xl">
                            {['all', 'admin', 'checkout'].map(src => (
                                <button
                                    key={src}
                                    onClick={() => setSourceFilter(src)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${sourceFilter === src ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}
                                >
                                    {src === 'admin' ? 'Manual' : src}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Table - Institutional Density */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Beneficiary</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Asset Profile</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">MT5 Credentials</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">Network Group</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 text-center">Protocol</th>
                                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100 text-right">Operational Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan={6} className="px-6 py-20 text-center"><div className="animate-pulse flex flex-col items-center gap-3"><div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-gray-900 animate-spin" /><span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Compiling Records...</span></div></td></tr>
                            ) : paginatedAccounts.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-400 font-medium italic">No accounts identified under current protocol.</td></tr>
                            ) : (
                                paginatedAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-900 shrink-0 capitalize">
                                                    {(account.profiles?.full_name || "U")[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 leading-none">{account.profiles?.full_name || "Restricted Access"}</div>
                                                    <div className="text-xs text-gray-500 mt-1.5 font-medium">{account.profiles?.email || "No identifier"}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-2">
                                                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase">
                                                        {(() => {
                                                            const typeStr = (account.challenge_type || '').toLowerCase();
                                                            const groupStr = (account.mt5_group || account.group || '').toLowerCase();
                                                            if (typeStr.includes('prime') || groupStr.includes('pro')) return 'Prime';
                                                            if (typeStr.includes('lite') || groupStr.includes('-sf')) return 'Lite';
                                                            return 'Standard';
                                                        })()}
                                                    </span>
                                                    <span className="font-bold text-gray-900">${account.initial_balance?.toLocaleString()}</span>
                                                </div>
                                                <div className="text-[10px] text-gray-400 mt-1.5 font-bold uppercase tracking-tight">ID: {account.challenge_number || `SF-${account.id.slice(0, 8)}`}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="font-mono text-gray-900 font-bold bg-gray-50 px-2 py-1 rounded-lg w-fit">
                                                {account.login || "UNSPECIFIED"}
                                            </div>
                                            <div className="text-[10px] text-gray-400 mt-1.5 font-bold">{account.server || "INSTITUTIONAL BRIDGE"}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-xs font-bold text-gray-700 max-w-[150px] truncate" title={account.mt5_group || account.group}>
                                                {account.mt5_group || account.group || "---"}
                                            </div>
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <span className={`h-1 w-1 rounded-full ${account.metadata?.assigned_via === 'admin_manual' ? 'bg-purple-500' : 'bg-gray-400'}`} />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">
                                                    {account.metadata?.assigned_via === 'admin_manual' ? 'Auth: Manual' : 'Auth: System'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col items-center">
                                                <AccountActions
                                                    accountId={account.id} login={account.login || 0} currentStatus={account.status}
                                                    challengeType={account.challenge_type} upgradedTo={account.upgraded_to}
                                                    userId={account.user_id} currentEmail={account.profiles?.email || undefined}
                                                    onRefresh={fetchAccounts}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex flex-col items-end gap-2">
                                                <StatusBadge status={account.status} upgradedTo={account.upgraded_to} />
                                                <span className="text-[10px] font-bold text-gray-400 tabular-nums">Logged: {new Date(account.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Section */}
                <div className="bg-gray-50/50 px-8 py-4 flex items-center justify-between">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Records {filteredAccounts.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} — {Math.min(currentPage * itemsPerPage, filteredAccounts.length)} of {filteredAccounts.length}
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <div className="flex items-center gap-1 px-2">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum
                                                ? 'bg-gray-900 text-white shadow-md'
                                                : 'text-gray-500 hover:bg-white hover:shadow-sm hover:text-gray-900'
                                                }`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
