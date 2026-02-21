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
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [wallets, setWallets] = useState<WalletAddress[]>([]);
    const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // Edit Wallet State
    const [editingWallet, setEditingWallet] = useState<WalletAddress | null>(null);
    const [newAddress, setNewAddress] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (activeTab === 'requests') {
            fetchPayouts();
        } else if (activeTab === 'wallets') {
            fetchWallets();
        } else {
            fetchBankDetails();
        }
    }, [activeTab]);

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

    const handleUpdateWallet = async () => {
        if (!editingWallet || !newAddress) return;

        setIsUpdating(true);
        try {
            const response = await fetch(`/api/payouts/admin/wallets/${editingWallet.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    wallet_address: newAddress,
                    is_locked: editingWallet.is_locked // Keep current lock status or we could force true
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update wallet');
            }

            toast.success('Wallet updated successfully');
            setEditingWallet(null);
            fetchWallets(); // Refresh list
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setIsUpdating(false);
        }
    };

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

    const filteredBanks = bankDetails.filter(b =>
        b.profiles?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.bank_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.account_number?.toLowerCase().includes(searchQuery.toLowerCase())
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
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payouts Management</h1>

                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${activeTab === 'requests'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Requests
                    </button>
                    <button
                        onClick={() => setActiveTab('wallets')}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${activeTab === 'wallets'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Wallets
                    </button>
                    <button
                        onClick={() => setActiveTab('banks')}
                        className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${activeTab === 'banks'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Bank Details
                    </button>
                </div>
            </div>

            {activeTab === 'requests' ? (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">User</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Account</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Metrics</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Inv. Password</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Amount</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Method</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Date</th>
                                    <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {requests?.map((req) => (
                                    <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-900">
                                                {req.profiles?.full_name || "Unknown User"}
                                            </div>
                                            <div className="text-xs text-slate-500">{req.profiles?.email}</div>
                                        </td>

                                        {/* Account ID */}
                                        <td className="px-6 py-4">
                                            {req.account_info?.login ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-slate-700">{req.account_info.login}</span>
                                                    <button
                                                        onClick={() => copyToClipboard(req.account_info!.login, 'Login ID')}
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic">N/A</span>
                                            )}
                                        </td>

                                        {/* Metrics (Equity / Balance) */}
                                        <td className="px-6 py-4">
                                            {req.account_info ? (
                                                <div className="flex flex-col text-xs">
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-slate-500">Eq:</span>
                                                        <span className="font-medium text-slate-900">{formatCurrency(req.account_info.equity)}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-2">
                                                        <span className="text-slate-500">Bal:</span>
                                                        <span className="text-slate-700">{formatCurrency(req.account_info.balance)}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>

                                        {/* Investor Password */}
                                        <td className="px-6 py-4">
                                            {req.account_info?.investor_password ? (
                                                <div className="flex items-center gap-2 group/pass">
                                                    <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs text-slate-600 font-mono">
                                                        {req.account_info.investor_password}
                                                    </code>
                                                    <button
                                                        onClick={() => copyToClipboard(req.account_info!.investor_password!, 'Investor Password')}
                                                        className="opacity-0 group-hover/pass:opacity-100 text-slate-400 hover:text-slate-600 transition-opacity"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">Not found</span>
                                            )}
                                        </td>

                                        <td className="px-6 py-4 font-medium text-slate-900">${req.amount}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="capitalize text-slate-600">{req.payout_method}</span>
                                                {req.payout_method === 'bank' && (
                                                    <span className="text-[10px] text-slate-400 font-mono italic">Direct Transfer</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={req.status} />
                                        </td>
                                        <td className="px-6 py-4 text-slate-500 text-xs">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/payouts/${req.id}`}
                                                className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                            >
                                                Process
                                                <ChevronRight className="ml-2 h-4 w-4" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {requests?.length === 0 && (
                                    <tr key="no-requests">
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                                            No payout requests found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : activeTab === 'wallets' ? (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <input
                                type="text"
                                placeholder="Search by email or wallet..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">User</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Wallet Address</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Type</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Created</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredWallets.map((wallet) => (
                                        <tr key={wallet.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">
                                                    {wallet.profiles?.full_name || "Unknown User"}
                                                </div>
                                                <div className="text-xs text-slate-500">{wallet.profiles?.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                        {wallet.wallet_address}
                                                    </span>
                                                    <button
                                                        onClick={() => copyToClipboard(wallet.wallet_address, 'Wallet Address')}
                                                        className="text-slate-400 hover:text-slate-600"
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                                    {wallet.wallet_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {wallet.is_locked ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                                        <StatusBadge status="Locked" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                        <StatusBadge status="Active" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(wallet.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingWallet(wallet);
                                                        setNewAddress(wallet.wallet_address);
                                                    }}
                                                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                                                >
                                                    Edit
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredWallets.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                                {loading ? "Loading wallets..." : "No wallet addresses found"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <input
                                type="text"
                                placeholder="Search by name, email, bank or account..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">User</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Bank Details</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Account Numbers</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                                        <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Created</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredBanks.map((bank) => (
                                        <tr key={bank.id} className="group hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900">
                                                    {bank.profiles?.full_name || "Unknown User"}
                                                </div>
                                                <div className="text-xs text-slate-500">{bank.profiles?.email}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{bank.bank_name}</span>
                                                    <span className="text-xs text-slate-500">{bank.account_holder_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase w-12">ACC:</span>
                                                        <span className="font-mono text-slate-700">{bank.account_number}</span>
                                                    </div>
                                                    {bank.ifsc_code && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase w-12">IFSC:</span>
                                                            <span className="font-mono text-slate-700">{bank.ifsc_code}</span>
                                                        </div>
                                                    )}
                                                    {bank.swift_code && (
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase w-12">SWIFT:</span>
                                                            <span className="font-mono text-slate-700">{bank.swift_code}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {bank.is_locked ? (
                                                    <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium whitespace-nowrap">
                                                        <StatusBadge status="Locked" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium whitespace-nowrap">
                                                        <StatusBadge status="Active" />
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs text-right">
                                                {new Date(bank.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredBanks.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                                                {loading ? "Loading bank details..." : "No bank details found"}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingWallet && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-900">Edit Wallet Address</h3>
                            <button
                                onClick={() => setEditingWallet(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <EyeOff size={18} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    User
                                </label>
                                <div className="text-sm font-medium text-slate-900">
                                    {editingWallet.profiles.full_name} ({editingWallet.profiles.email})
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
                                    Wallet Type
                                </label>
                                <div className="text-sm text-slate-700">
                                    {editingWallet.wallet_type}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                                    New Wallet Address
                                </label>
                                <textarea
                                    className="w-full min-h-[80px] rounded-lg border border-slate-200 p-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                    value={newAddress}
                                    onChange={(e) => setNewAddress(e.target.value)}
                                    placeholder="Enter new wallet address..."
                                />
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                                <strong>Warning:</strong> Changing a user's wallet address is a sensitive operation. Ensure you have verified the new address.
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3">
                            <button
                                onClick={() => setEditingWallet(null)}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpdateWallet}
                                disabled={isUpdating || !newAddress || newAddress === editingWallet.wallet_address}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                            >
                                {isUpdating ? "Updating..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
