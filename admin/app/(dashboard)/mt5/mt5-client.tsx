"use client";

import { Server, Plus, Filter, Search } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import { useState, useEffect } from "react";

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
    server?: string;
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
    const [activeTab, setActiveTab] = useState<"first" | "second" | "funded" | "instant">("first");
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sizeFilter, setSizeFilter] = useState<string>("all");
    const [groupFilter, setGroupFilter] = useState<string>("all");
    const [sourceFilter, setSourceFilter] = useState<string>("all");
    const [dateFrom, setDateFrom] = useState<string>("");
    const [dateTo, setDateTo] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        applyFilters();
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
                account.mt5_group || "-",
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
            filtered = filtered.filter(a =>
                (a.challenge_type === "Phase 1" ||
                    a.challenge_type === "Evaluation" ||
                    a.challenge_type === "Competition" ||
                    a.challenge_type === "lite_1_step" ||
                    a.challenge_type === "lite_2_step") &&
                !(a.plan_type || "").toLowerCase().includes("instant") // Exclude Instant if they overlap
            );
        } else if (activeTab === "second") {
            filtered = filtered.filter(a => a.challenge_type === "Phase 2");
        } else if (activeTab === "funded") {
            filtered = filtered.filter(a =>
                (a.challenge_type === "Master Account" ||
                    a.challenge_type === "Funded") &&
                !a.plan_type?.toLowerCase().includes("instant")
            );
        } else if (activeTab === "instant") {
            filtered = filtered.filter(a =>
                a.challenge_type === "Instant" ||
                a.challenge_type === "Rapid" ||
                (a.plan_type || "").toLowerCase().includes("instant")
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(a => a.status === statusFilter);
        }

        // Size filter
        if (sizeFilter !== "all") {
            const size = parseInt(sizeFilter);
            filtered = filtered.filter(a => a.initial_balance === size);
        }

        // Group filter
        if (groupFilter !== "all") {
            filtered = filtered.filter(a => a.mt5_group === groupFilter);
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
            // End of day adjustment
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

    // MT5 Group options for filtering
    const MT5_GROUP_FILTERS = [
        { label: "Lite - Instant Funding", value: "demo\\S\\0-SF" },
        { label: "Lite - 1-Step Challenge", value: "demo\\S\\1-SF" },
        { label: "Lite - 2-Step Challenge", value: "demo\\S\\2-SF" },
        { label: "Prime - Instant Funding", value: "demo\\SF\\0-Pro" },
        { label: "Prime - 1-Step Challenge", value: "demo\\SF\\1-Pro" },
        { label: "Prime - 2-Step Challenge", value: "demo\\SF\\2-Pro" },
        { label: "Funded Live Account", value: "SF Funded Live" },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">MT5 Accounts</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage all MT5 trading accounts</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleExport}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <svg className="mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Export CSV
                    </button>
                    <Link
                        href="/mt5/assign"
                        className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Assign Account
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-6">
                    <button
                        onClick={() => setActiveTab("first")}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "first"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                            }`}
                    >
                        First Assessment
                    </button>
                    <button
                        onClick={() => setActiveTab("second")}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "second"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                            }`}
                    >
                        Second Assessment
                    </button>
                    <button
                        onClick={() => setActiveTab("funded")}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "funded"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                            }`}
                    >
                        Funded Accounts
                    </button>
                    <button
                        onClick={() => setActiveTab("instant")}
                        className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === "instant"
                            ? "border-indigo-600 text-indigo-600"
                            : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                            }`}
                    >
                        Instant Funding
                    </button>
                </nav>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col gap-4">
                    {/* Top Row: Search and Basic Filters */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Filter className="h-4 w-4" />
                            Filters:
                        </div>

                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search accounts..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 w-64"
                            />
                        </div>

                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="passed">Passed</option>
                            <option value="breached">Breached</option>
                            <option value="failed">Failed</option>
                        </select>

                        {/* Size Filter */}
                        <select
                            value={sizeFilter}
                            onChange={(e) => setSizeFilter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        >
                            <option value="all">All Sizes</option>
                            {uniqueSizes.map(size => (
                                <option key={size} value={size}>${size.toLocaleString()}</option>
                            ))}
                        </select>

                        {/* Group Filter */}
                        <select
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        >
                            <option value="all">All MT5 Groups</option>
                            {MT5_GROUP_FILTERS.map(group => (
                                <option key={group.value} value={group.value}>{group.label}</option>
                            ))}
                        </select>

                        {/* Source Filter */}
                        <select
                            value={sourceFilter}
                            onChange={(e) => setSourceFilter(e.target.value)}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        >
                            <option value="all">All Sources</option>
                            <option value="admin">Admin Assigned</option>
                            <option value="checkout">Checkout / Payment Gateway</option>
                        </select>
                    </div>

                    {/* Bottom Row: Date Filters */}
                    <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
                        <span className="text-sm font-medium text-gray-700">Created Between:</span>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                            />
                        </div>

                        {(dateFrom || dateTo || statusFilter !== "all" || sizeFilter !== "all" || groupFilter !== "all" || sourceFilter !== "all" || searchQuery) && (
                            <button
                                onClick={() => {
                                    setDateFrom("");
                                    setDateTo("");
                                    setStatusFilter("all");
                                    setSizeFilter("all");
                                    setGroupFilter("all");
                                    setSourceFilter("all");
                                    setSearchQuery("");
                                }}
                                className="ml-auto text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="text-2xl font-semibold text-gray-900 mt-1">{filteredAccounts.length}</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Server className="h-5 w-5 text-indigo-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Active</p>
                            <p className="text-2xl font-semibold text-gray-900 mt-1">
                                {filteredAccounts.filter(a => a.status === 'active').length}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <Server className="h-5 w-5 text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Passed</p>
                            <p className="text-2xl font-semibold text-gray-900 mt-1">
                                {filteredAccounts.filter(a => a.status === 'passed').length}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Server className="h-5 w-5 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Breached</p>
                            <p className="text-2xl font-semibold text-gray-900 mt-1">
                                {filteredAccounts.filter(a => a.status === 'breached').length}
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-red-50 flex items-center justify-center">
                            <Server className="h-5 w-5 text-red-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Accounts Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">User</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Account ID</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Package</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Size</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">MT5 Login</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Group</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Source</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        Loading accounts...
                                    </td>
                                </tr>
                            ) : filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        No accounts found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {account.profiles?.full_name || "Unknown"}
                                                </div>
                                                <div className="text-xs text-gray-700">
                                                    {account.profiles?.email || "No email"}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-900 text-xs">
                                            {account.challenge_number || `SF-${account.id.slice(0, 8)}`}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 capitalize">
                                            {account.plan_type || "Standard"}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ${account.initial_balance?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-900">
                                            {account.login || "-"}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-xs text-gray-700 font-mono">
                                            {account.mt5_group || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {account.metadata?.assigned_via === 'admin_manual' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 text-purple-700 font-medium">
                                                    Admin Assigned
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-gray-700 font-medium capitalize">
                                                    {account.metadata?.payment_provider || "Checkout"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={account.status} />
                                        </td>
                                        <td className="px-6 py-4 text-gray-900">
                                            {new Date(account.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
