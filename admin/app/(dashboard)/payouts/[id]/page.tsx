"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useParams } from "next/navigation";

interface PayoutRequest {
    id: string;
    amount: number;
    payout_method: string;
    wallet_address: string;
    status: string;
    created_at: string;
    rejection_reason?: string;
    transaction_id?: string;
    account_info?: {
        login: string;
        investor_password?: string;
        equity?: number;
        balance?: number;
        account_type: string;
        account_size: number;
        group?: string;
    };
    profiles: {
        full_name: string;
        email: string;
    };
}

export default function AdminPayoutDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [request, setRequest] = useState<PayoutRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [processing, setProcessing] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [transactionId, setTransactionId] = useState("");

    // ... (useEffect remains same) ...

    const formatCurrency = (val?: number) => {
        if (val === undefined || val === null) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        // We'll use a simple alert or just console if toast component isn't handy in this file,
        // but let's assume standard behavior or just rely on clipboard API success
    };

    useEffect(() => {
        if (!id) return;

        async function fetchPayout() {
            try {
                const response = await fetch(`/api/payouts/admin/${id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch payout');
                }

                setRequest(data.payout);
                if (data.payout.transaction_id) {
                    setTransactionId(data.payout.transaction_id);
                }
            } catch (err: any) {
                console.error('Error fetching payout:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchPayout();
    }, [id]);

    async function handleApprove(e: React.FormEvent) {
        // ... (same as before) ...
        e.preventDefault();
        if (!id) return;

        setProcessing(true);
        try {
            const response = await fetch(`/api/payouts/admin/${id}/approve`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    transaction_id: transactionId
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to approve payout');
            }

            router.push('/payouts');
        } catch (err: any) {
            console.error('Error approving payout:', err);
            alert(`Error: ${err.message}`);
            setProcessing(false);
        }
    }

    async function handleReject(e: React.FormEvent) {
        // ... (same as before) ...
        e.preventDefault();
        if (!id || !rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch(`/api/payouts/admin/${id}/reject`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: rejectionReason }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reject payout');
            }

            router.push('/payouts');
        } catch (err: any) {
            console.error('Error rejecting payout:', err);
            alert(`Error: ${err.message}`);
            setProcessing(false);
        }
    }

    if (loading) {
        return (
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="mx-auto max-w-4xl space-y-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
                    Error: {error || 'Payout not found'}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6 bg-white min-h-screen">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">Process Payout</h1>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Current Status:</span>
                    <StatusBadge status={request.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Payout Details */}
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                    <h2 className="mb-4 text-xl font-semibold text-gray-900">Payment Details</h2>
                    <dl className="space-y-4 text-sm">
                        <div className="flex justify-between items-center">
                            <dt className="text-gray-500">Amount</dt>
                            <dd className="font-bold text-2xl text-green-600">${request.amount}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Method</dt>
                            <dd className="font-medium capitalize text-gray-900">{request.payout_method}</dd>
                        </div>

                        {request.account_info && (
                            <div className="border-t pt-4 pb-2 space-y-3 border-gray-100">
                                <h3 className="font-semibold text-gray-900 mb-2">Account Information</h3>

                                <div className="flex justify-between items-center group">
                                    <dt className="text-gray-500">Login ID</dt>
                                    <div className="flex items-center gap-2">
                                        <dd className="font-mono font-semibold text-gray-900">{request.account_info.login}</dd>
                                        <button
                                            onClick={() => copyToClipboard(request.account_info!.login, 'Login ID')}
                                            className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Copy Login"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center group">
                                    <dt className="text-gray-500">Investor Password</dt>
                                    <div className="flex items-center gap-2">
                                        <dd className="font-mono bg-gray-50 px-2 py-0.5 rounded text-gray-700">
                                            {request.account_info.investor_password || 'N/A'}
                                        </dd>
                                        {request.account_info.investor_password && (
                                            <button
                                                onClick={() => copyToClipboard(request.account_info!.investor_password!, 'Investor Password')}
                                                className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Copy Password"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Current Equity</dt>
                                    <dd className="font-medium text-gray-900">{formatCurrency(request.account_info.equity)}</dd>
                                </div>

                                <div className="flex justify-between">
                                    <dt className="text-gray-500">Current Balance</dt>
                                    <dd className="font-medium text-gray-900">{formatCurrency(request.account_info.balance)}</dd>
                                </div>

                                <div className="pt-2 border-t border-dashed border-gray-100">
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500 text-xs">Account Type</dt>
                                        <dd className="text-xs text-gray-600">{request.account_info.account_type}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500 text-xs">Account Group</dt>
                                        <dd className="text-xs text-gray-600 font-mono">{request.account_info.group || '-'}</dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500 text-xs">Initial Size</dt>
                                        <dd className="text-xs text-gray-600">${request.account_info.account_size?.toLocaleString()}</dd>
                                    </div>
                                </div>
                            </div>
                        )}

                        {request.wallet_address && (
                            <div className="border-t pt-4 border-gray-100">
                                <dt className="mb-2 text-gray-500 font-medium">Wallet Address</dt>
                                <dd className="font-mono break-all rounded bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-3 text-xs text-gray-900">{request.wallet_address}</dd>
                            </div>
                        )}

                        {request.transaction_id && (
                            <div className="border-t pt-4 border-gray-100">
                                <dt className="mb-2 text-gray-500 font-medium">Transaction ID</dt>
                                <dd className="font-mono break-all rounded bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-3 text-xs text-gray-900">{request.transaction_id}</dd>
                            </div>
                        )}

                        {request.rejection_reason && (
                            <div className="border-t pt-4 border-gray-100">
                                <dt className="mb-2 text-gray-500 font-medium">Rejection Reason</dt>
                                <dd className="rounded bg-red-50 border border-red-200 p-3 text-xs text-red-900">{request.rejection_reason}</dd>
                            </div>
                        )}
                    </dl>
                </div>

                {/* User Info & Actions */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-xl font-semibold text-gray-900">User Information</h2>
                        <div className="flex items-center gap-4">
                            <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                                <span className="font-bold">{request.profiles?.full_name?.charAt(0) || "U"}</span>
                            </div>
                            <div>
                                <div className="font-medium text-gray-900">{request.profiles?.full_name}</div>
                                <div className="text-sm text-gray-500">{request.profiles?.email}</div>
                            </div>
                        </div>
                    </div>

                    {request.status === 'pending' && (
                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h2 className="mb-4 text-xl font-semibold text-gray-900">Actions</h2>
                            <div className="space-y-6">
                                <form onSubmit={handleApprove} className="space-y-4">
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-r-lg p-4">
                                        <div className="flex items-start">
                                            <div className="flex-shrink-0">
                                                <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                                </svg>
                                            </div>
                                            <div className="ml-3">
                                                <p className="text-sm font-medium text-blue-900">
                                                    Transaction ID Auto-Generation
                                                </p>
                                                <p className="mt-1 text-sm text-blue-700">
                                                    A unique transaction ID will be automatically generated when you approve this payout request.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Transaction Hash / ID (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            value={transactionId}
                                            onChange={(e) => setTransactionId(e.target.value)}
                                            placeholder="Enter blockchain hash or transaction ID..."
                                            className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20"
                                            disabled={processing}
                                        />
                                        <p className="text-xs text-gray-500">
                                            If left blank, a unique ID will be auto-generated.
                                        </p>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full rounded-lg bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 font-semibold text-white shadow-md hover:from-green-700 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {processing ? (
                                            <span className="flex items-center justify-center">
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Processing...
                                            </span>
                                        ) : (
                                            '✓ Approve Payout'
                                        )}
                                    </button>
                                </form>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-gray-200" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-gray-500">Or</span>
                                    </div>
                                </div>

                                <form onSubmit={handleReject} className="space-y-3">
                                    <label className="block text-sm font-medium text-gray-700">
                                        Rejection Reason
                                    </label>
                                    <textarea
                                        value={rejectionReason}
                                        onChange={(e) => setRejectionReason(e.target.value)}
                                        placeholder="Please provide a detailed reason for rejecting this payout request..."
                                        required
                                        rows={4}
                                        className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-20"
                                        disabled={processing}
                                    />
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full rounded-lg bg-gradient-to-r from-red-600 to-rose-600 px-4 py-3 font-semibold text-white shadow-md hover:from-red-700 hover:to-rose-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {processing ? 'Processing...' : '✗ Deny Payout'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
