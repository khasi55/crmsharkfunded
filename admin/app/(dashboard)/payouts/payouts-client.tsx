"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import { ChevronRight, Copy, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PayoutRequest {
    id: string;
    amount: number;
    payout_method: string;
    status: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    };
    account_info?: {
        login: string;
        investor_password?: string;
        equity?: number;
        balance?: number;
        account_type?: string;
    };
}

interface WalletAddress {
    id: string;
    user_id: string;
    wallet_address: string;
    wallet_type: string;
    is_locked: boolean;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    };
}

interface BankDetail {
    id: string;
    user_id: string;
    bank_name: string;
    account_number: string;
    account_holder_name: string;
    ifsc_code?: string;
    swift_code?: string;
    is_locked: boolean;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    };
}

export default function AdminPayoutsClient() {
    const [activeTab, setActiveTab] = useState<'requests' | 'wallets' | 'banks'>('requests');
    const [requestStatusFilter, setRequestStatusFilter] = useState<'pending' | 'approved' | 'processed' | 'rejected' | 'all'>('pending');
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [wallets, setWallets] = useState<WalletAddress[]>([]);
    const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;


    useEffect(() => {
        // Reset page on tab change
        setCurrentPage(1);
        setSearchQuery('');

        if (activeTab === 'requests') {
            fetchPayouts();
        } else if (activeTab === 'wallets') {
            fetchWallets();
        } else {
            fetchBankDetails();
        }
    }, [activeTab]);

    // Reset pagination when search query or filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, requestStatusFilter]);

    async function fetchPayouts() {
        setLoading(true);
        try {
            const response = await fetch('/api/payouts/admin');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch payouts');
            }

            setRequests(data.payouts || []);
        } catch (err: any) {
            console.error('Error fetching payouts:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchWallets() {
        setLoading(true);
        try {
            const response = await fetch('/api/payouts/admin/wallets');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch wallets');
            }

            setWallets(data.wallets || []);
        } catch (err: any) {
            console.error('Error fetching wallets:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function fetchBankDetails() {
        setLoading(true);
        try {
            const response = await fetch('/api/payouts/admin/bank-details');
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch bank details');
            }

            setBankDetails(data.bankDetails || []);
        } catch (err: any) {
            console.error('Error fetching bank details:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }


    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    const formatCurrency = (val?: number) => {
        if (val === undefined || val === null) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const filteredWallets = wallets.filter(w =>
        w.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.wallet_address?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredRequests = requests.filter(req => {
        const matchesStatus = requestStatusFilter === 'all' || req.status?.toLowerCase() === requestStatusFilter;
        const matchesSearch = !searchQuery ||
            req.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            String(req.account_info?.login || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            req.payout_method?.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesStatus && matchesSearch;
    });

    const filteredBanks = bankDetails.filter(b =>
        b.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.account_number?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Pagination Calculations
    const getPaginatedData = (data: any[]) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return data.slice(startIndex, startIndex + itemsPerPage);
    };

    const paginatedRequests = getPaginatedData(filteredRequests);
    const paginatedWallets = getPaginatedData(filteredWallets);
    const paginatedBanks = getPaginatedData(filteredBanks);

    const totalPagesRequests = Math.ceil(filteredRequests.length / itemsPerPage) || 1;
    const totalPagesWallets = Math.ceil(filteredWallets.length / itemsPerPage) || 1;
    const totalPagesBanks = Math.ceil(filteredBanks.length / itemsPerPage) || 1;

    // Reusable Pagination Component inline
    const PaginationControls = ({ totalPages }: { totalPages: number }) => (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-gray-500 font-medium">
                Page {currentPage} of {totalPages}
            </span>
            <div className="flex gap-2">
                <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Previous
                </button>
                <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    Next
                </button>
            </div>
        </div>
    );

    if (loading && requests.length === 0 && wallets.length === 0 && bankDetails.length === 0) {
        return (
            <div className="space-y-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payouts Management</h1>
                <div className="flex items-center justify-center py-12">
                    <div className="text-slate-500">Loading...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payouts Management</h1>
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-2xl border border-gray-100 p-6 shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">Payouts Management</h1>
                    <p className="text-[14px] text-gray-500 font-medium mt-1">Manage withdrawal requests, wallets, and bank details</p>
                </div>

                <div className="inline-flex rounded-xl border border-gray-100 bg-gray-50/80 p-1.5 shadow-sm">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`rounded-lg px-5 py-2 text-[14px] font-semibold transition-all ${activeTab === 'requests'
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                            }`}
                    >
                        Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('wallets')}
                        className={`rounded-lg px-5 py-2 text-[14px] font-semibold transition-all ${activeTab === 'wallets'
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                            }`}
                    >
                        Wallets
                    </button>
                    <button
                        onClick={() => setActiveTab('banks')}
                        className={`rounded-lg px-5 py-2 text-[14px] font-semibold transition-all ${activeTab === 'banks'
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-100/50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100/50'
                            }`}
                    >
                        Bank Details
                    </button>
                </div>
            </div>

            {activeTab === 'requests' ? (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {/* Status Sub-Navigation & Search */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="flex flex-wrap gap-2">
                            {['pending', 'approved', 'processed', 'rejected', 'all'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setRequestStatusFilter(status as any)}
                                    className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition-all ${requestStatusFilter === status
                                        ? 'bg-blue-100 text-blue-700 shadow-sm border border-blue-200'
                                        : 'bg-white text-gray-500 hover:bg-gray-100 border border-gray-200'
                                        }`}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>
                        <div className="w-full md:max-w-xs">
                            <input
                                type="text"
                                placeholder="Search by name, email or account..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-[14px] font-medium text-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 px-4 py-2 transition-all shadow-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-[14px]">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">User</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Account</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Metrics</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Inv. Password</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Amount</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Method</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Status</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Date</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {paginatedRequests.map((req) => (
                                    <tr key={req.id} className="group hover:bg-gray-50/80 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-semibold text-gray-900">
                                                    {req.profiles?.full_name || "Unknown User"}
                                                </span>
                                                <span className="text-[12px] text-gray-500">{req.profiles?.email}</span>
                                            </div>
                                        </td>

                                        {/* Account ID */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {req.account_info?.login ? (
                                                <div className="flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[13px] font-mono font-semibold text-gray-900">{req.account_info.login}</span>
                                                        <button
                                                            onClick={() => copyToClipboard(req.account_info!.login, 'Login ID')}
                                                            className="text-gray-400 hover:text-blue-600 transition-colors"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    </div>
                                                    {req.account_info.account_type && (
                                                        <div className="flex items-center">
                                                            <span className="inline-flex py-0.5 px-2 rounded font-semibold text-[10px] uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                                                                {req.account_info.account_type}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-[13px]">N/A</span>
                                            )}
                                        </td>

                                        {/* Metrics (Equity / Balance) */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {req.account_info ? (
                                                <div className="flex flex-col text-[12px]">
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-gray-500 font-medium">Eq:</span>
                                                        <span className="font-semibold text-blue-600">{formatCurrency(req.account_info.equity)}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-gray-500 font-medium">Bal:</span>
                                                        <span className="font-semibold text-gray-900">{formatCurrency(req.account_info.balance)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>

                                        {/* Investor Password */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {req.account_info?.investor_password ? (
                                                <div className="flex items-center gap-2 group/pass">
                                                    <code className="bg-gray-100 px-2 py-1 rounded-md text-[12px] text-gray-600 font-mono font-medium border border-gray-200">
                                                        {req.account_info.investor_password}
                                                    </code>
                                                    <button
                                                        onClick={() => copyToClipboard(req.account_info!.investor_password!, 'Investor Password')}
                                                        className="opacity-0 group-hover/pass:opacity-100 text-gray-400 hover:text-blue-600 transition-all"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 italic text-[13px]">Not found</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 text-[14px]">${req.amount?.toLocaleString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="capitalize text-[13px] font-medium text-gray-700">{req.payout_method}</span>
                                                {req.payout_method === 'bank' && (
                                                    <span className="text-[11px] text-gray-500 font-mono italic mt-0.5">Direct Transfer</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 font-medium text-[12px]">
                                            {new Date(req.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Link
                                                href={`/payouts/${req.id}`}
                                                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                            >
                                                Process
                                                <ChevronRight className="ml-1.5 h-4 w-4 opacity-70" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {filteredRequests.length === 0 && (
                                    <tr key="no-requests">
                                        <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <p className="text-[14px] font-medium text-gray-900 mb-1">No requests found</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls totalPages={totalPagesRequests} />
                </div>
            ) : activeTab === 'wallets' ? (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="max-w-md w-full">
                            <input
                                type="text"
                                placeholder="Search by email or wallet address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-[14px] font-medium text-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 px-4 py-2.5 transition-all shadow-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-[14px]">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">User</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Wallet Address</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Type</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Status</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {paginatedWallets.map((wallet) => (
                                    <tr key={wallet.id} className="group hover:bg-gray-50/80 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-semibold text-gray-900">
                                                    {wallet.profiles?.full_name || "Unknown User"}
                                                </span>
                                                <span className="text-[12px] text-gray-500">{wallet.profiles?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[13px] font-mono font-medium text-gray-700 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200">
                                                    {wallet.wallet_address}
                                                </span>
                                                <button
                                                    onClick={() => copyToClipboard(wallet.wallet_address, 'Wallet Address')}
                                                    className="text-gray-400 hover:text-blue-600 transition-colors"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 uppercase tracking-wide">
                                                {wallet.wallet_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {wallet.is_locked ? (
                                                <span className="inline-flex items-center gap-1 text-[12px] text-amber-600 font-semibold">
                                                    <StatusBadge status="Locked" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600 font-semibold">
                                                    <StatusBadge status="Active" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[12px] text-gray-500 font-medium">
                                            {new Date(wallet.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                                {filteredWallets.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500 text-[14px]">
                                            {loading ? "Loading wallets..." : "No wallet addresses found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls totalPages={totalPagesWallets} />
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="max-w-md w-full">
                            <input
                                type="text"
                                placeholder="Search by name, email, bank or account..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white border border-gray-200 text-[14px] font-medium text-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 px-4 py-2.5 transition-all shadow-sm outline-none"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto w-full">
                        <table className="w-full text-left text-[14px]">
                            <thead className="bg-gray-50/80 border-b border-gray-100">
                                <tr>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">User</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Bank Details</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Account Numbers</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Status</th>
                                    <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap text-right">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {paginatedBanks.map((bank) => (
                                    <tr key={bank.id} className="group hover:bg-gray-50/80 transition-colors duration-200">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-semibold text-gray-900">
                                                    {bank.profiles?.full_name || "Unknown User"}
                                                </span>
                                                <span className="text-[12px] text-gray-500">{bank.profiles?.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{bank.bank_name}</span>
                                                <span className="text-[12px] text-gray-500">{bank.account_holder_name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase w-12 tracking-wide">ACC:</span>
                                                    <span className="font-mono font-medium text-[13px] text-gray-800 bg-gray-50 border border-gray-200 px-1.5 rounded">{bank.account_number}</span>
                                                </div>
                                                {bank.ifsc_code && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase w-12 tracking-wide">IFSC:</span>
                                                        <span className="font-mono font-medium text-[13px] text-gray-800">{bank.ifsc_code}</span>
                                                    </div>
                                                )}
                                                {bank.swift_code && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-400 font-bold uppercase w-12 tracking-wide">SWIFT:</span>
                                                        <span className="font-mono font-medium text-[13px] text-gray-800">{bank.swift_code}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {bank.is_locked ? (
                                                <span className="inline-flex items-center gap-1 text-[12px] text-amber-600 font-semibold whitespace-nowrap">
                                                    <StatusBadge status="Locked" />
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600 font-semibold whitespace-nowrap">
                                                    <StatusBadge status="Active" />
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-[12px] font-medium text-right">
                                            {new Date(bank.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </td>
                                    </tr>
                                ))}
                                {filteredBanks.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 text-[14px]">
                                            {loading ? "Loading bank details..." : "No bank details found"}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <PaginationControls totalPages={totalPagesBanks} />
                </div>
            )}

        </div>
    );
}
