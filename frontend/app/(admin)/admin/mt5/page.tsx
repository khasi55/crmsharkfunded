"use client";

import { Server, Plus, Filter } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import { useState, useEffect } from "react";

interface Account {
    id: string;
    user_id: string;
    account_id: string | null;
    account_size: number;
    plan_type: string;
    login: number | null;
    status: string;
    current_phase: string;
    created_at: string;
    mt5_group?: string;
    profiles?: {
        full_name: string | null;
        email: string | null;
    };
    challenge_category?: string;
}

export default function AdminMT5Page() {
    const [activeTab, setActiveTab] = useState<"first" | "second" | "funded" | "instant">("first");
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [filteredAccounts, setFilteredAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sizeFilter, setSizeFilter] = useState<string>("all");
    const [groupFilter, setGroupFilter] = useState<string>("all");

    useEffect(() => {
        fetchAccounts();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [accounts, activeTab, statusFilter, sizeFilter, groupFilter]);

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

    const applyFilters = () => {
        let filtered = accounts;

        // Tab filter
        if (activeTab === "first") {
            filtered = filtered.filter(a =>
                (a.current_phase === "Phase 1" ||
                    a.current_phase === "Evaluation" ||
                    a.challenge_category === "Evaluation") &&
                !a.plan_type?.toLowerCase().includes("instant") // Exclude Instant from Phase 1/Evaluation if they overlap
            );
        } else if (activeTab === "second") {
            filtered = filtered.filter(a => a.current_phase === "Phase 2");
        } else if (activeTab === "funded") {
            filtered = filtered.filter(a =>
                (a.current_phase === "Master Account" ||
                    a.current_phase === "Funded") &&
                !a.plan_type?.toLowerCase().includes("instant") && // Exclude Instant from standard Funded tab
                a.challenge_category !== "Rapid"
            );
        } else if (activeTab === "instant") {
            filtered = filtered.filter(a =>
                a.challenge_category === "Rapid" ||
                a.current_phase === "Instant Funding" ||
                a.plan_type?.toLowerCase().includes("instant")
            );
        }

        // Status filter
        if (statusFilter !== "all") {
            filtered = filtered.filter(a => a.status === statusFilter);
        }

        // Size filter
        if (sizeFilter !== "all") {
            const size = parseInt(sizeFilter);
            filtered = filtered.filter(a => a.account_size === size);
        }

        // Group filter
        if (groupFilter !== "all") {
            filtered = filtered.filter(a => a.mt5_group === groupFilter);
        }

        setFilteredAccounts(filtered);
    };

    const uniqueSizes = Array.from(new Set(accounts.map(a => a.account_size))).sort((a, b) => a - b);

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
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Filter className="h-4 w-4" />
                        Filters:
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

                    <button
                        onClick={() => {
                            setStatusFilter("all");
                            setSizeFilter("all");
                            setGroupFilter("all");
                        }}
                        className="ml-auto text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        Clear Filters
                    </button>
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
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        Loading accounts...
                                    </td>
                                </tr>
                            ) : filteredAccounts.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
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
                                            {account.account_id || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 capitalize">
                                            {account.plan_type || "Standard"}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            ${account.account_size?.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-900">
                                            {account.login || "-"}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-xs text-gray-700 font-mono">
                                            {account.mt5_group || "-"}
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
