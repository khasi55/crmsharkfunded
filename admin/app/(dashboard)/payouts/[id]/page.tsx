"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useParams } from "next/navigation";
import { Copy, CheckCircle, XCircle, Info, Hash, Play, StopCircle, RefreshCw, HandCoins, Building2, User, Wallet, FileText } from "lucide-react";

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
    metadata?: {
        bank_details?: {
            bank_name: string;
            account_number: string;
            account_holder_name: string;
            ifsc_code?: string;
            swift_code?: string;
        };
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
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const formatCurrency = (val?: number) => {
        if (val === undefined || val === null) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    };

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(label);
        setTimeout(() => setCopiedField(null), 2000);
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
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm mt-8">
                    <RefreshCw className="w-8 h-8 animate-spin text-emerald-500" />
                    <p className="font-medium">Loading payout details...</p>
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="mx-auto max-w-4xl space-y-6 mt-8">
                <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center shadow-sm">
                    <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-red-900 mb-1">Failed to load payout</h3>
                    <p className="text-sm text-red-700">{error || 'Payout not found'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-6 lg:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                            <HandCoins className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Process Payout</h1>
                    </div>
                    <p className="text-sm text-gray-500 ml-[3.25rem]">Review and manage withdrawal request details.</p>
                </div>
                <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-xl border border-gray-200 shadow-sm">
                    <span className="text-sm font-medium text-gray-500">Current Status:</span>
                    <StatusBadge status={request.status} />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">

                {/* Left Column - Main Details (Span 7) */}
                <div className="lg:col-span-7 space-y-6">
                    {/* Payment Details Card */}
                    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                        <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-400" />
                                Payment Details
                            </h2>
                        </div>
                        <div className="p-6">
                            <dl className="space-y-6 text-sm">
                                {/* Amount & Method Row */}
                                <div className="grid grid-cols-2 gap-4 pb-6 border-b border-gray-100">
                                    <div>
                                        <dt className="text-sm font-medium text-gray-500 mb-1">Amount Requested</dt>
                                        <dd className="font-extrabold text-3xl text-emerald-600 tracking-tight">{formatCurrency(request.amount)}</dd>
                                    </div>
                                    <div className="text-right">
                                        <dt className="text-sm font-medium text-gray-500 mb-1">Payout Method</dt>
                                        <dd className="inline-flex items-center gap-1.5 font-bold capitalize text-gray-900 bg-gray-100 px-3 py-1 rounded-lg">
                                            {request.payout_method === 'bank' ? <Building2 className="w-4 h-4 text-gray-500" /> : <Wallet className="w-4 h-4 text-gray-500" />}
                                            {request.payout_method}
                                        </dd>
                                    </div>
                                </div>

                                {/* Account Information */}
                                {request.account_info && (
                                    <div className="space-y-4">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trading Account Info</h3>
                                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 rounded-xl bg-gray-50/80 p-5 border border-gray-100/80">
                                            <div className="space-y-1 group">
                                                <dt className="text-xs font-medium text-gray-500">Login ID</dt>
                                                <div className="flex items-center gap-2">
                                                    <dd className="font-mono font-bold text-gray-900 text-base">{request.account_info.login}</dd>
                                                    <button
                                                        onClick={() => copyToClipboard(request.account_info!.login, 'Login ID')}
                                                        className="p-1 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors tooltip"
                                                        title="Copy Login"
                                                    >
                                                        {copiedField === 'Login ID' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1 group">
                                                <dt className="text-xs font-medium text-gray-500">Investor Password</dt>
                                                <div className="flex items-center gap-2">
                                                    <dd className="font-mono font-medium bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-700 text-sm shadow-sm">
                                                        {request.account_info.investor_password || 'N/A'}
                                                    </dd>
                                                    {request.account_info.investor_password && (
                                                        <button
                                                            onClick={() => copyToClipboard(request.account_info!.investor_password!, 'Investor Password')}
                                                            className="p-1 rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
                                                            title="Copy Password"
                                                        >
                                                            {copiedField === 'Investor Password' ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-1 border-t border-gray-200 pt-3 col-span-2 grid grid-cols-2 gap-4">
                                                <div>
                                                    <dt className="text-xs font-medium text-gray-500">Current Equity</dt>
                                                    <dd className="font-bold text-gray-900 text-base">{formatCurrency(request.account_info.equity)}</dd>
                                                </div>
                                                <div>
                                                    <dt className="text-xs font-medium text-gray-500">Current Balance</dt>
                                                    <dd className="font-bold text-gray-900 text-base">{formatCurrency(request.account_info.balance)}</dd>
                                                </div>
                                            </div>

                                            <div className="col-span-2 flex flex-wrap gap-2 pt-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-gray-200 text-xs font-medium text-gray-600">
                                                    Type: {request.account_info.account_type}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-gray-200 text-xs font-medium text-gray-600 font-mono">
                                                    Grp: {request.account_info.group || '-'}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-1 rounded bg-white border border-gray-200 text-xs font-medium text-gray-600">
                                                    Size: ${request.account_info.account_size?.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Destination Details */}
                                {request.payout_method === 'bank' && request.metadata?.bank_details && (
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Destination Account</h3>
                                        <dd className="rounded-xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                                            <div className="grid grid-cols-2 gap-y-5 gap-x-4">
                                                <div>
                                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Bank Name</p>
                                                    <p className="font-bold text-gray-900 font-medium">{request.metadata.bank_details.bank_name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Account Holder</p>
                                                    <p className="font-bold text-gray-900 font-medium">{request.metadata.bank_details.account_holder_name}</p>
                                                </div>
                                                <div className="col-span-2">
                                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Account Number</p>
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-mono font-bold text-lg text-emerald-800 tracking-wide bg-white px-3 py-1.5 rounded-lg border border-emerald-200/50 shadow-sm select-all inline-block">
                                                            {request.metadata.bank_details.account_number}
                                                        </p>
                                                        <button
                                                            onClick={() => copyToClipboard(request.metadata!.bank_details!.account_number, 'Account Number')}
                                                            className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                            title="Copy Account Number"
                                                        >
                                                            {copiedField === 'Account Number' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                                {request.metadata.bank_details.ifsc_code && (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">IFSC Code</p>
                                                        <p className="font-mono font-bold text-gray-800">{request.metadata.bank_details.ifsc_code}</p>
                                                    </div>
                                                )}
                                                {request.metadata.bank_details.swift_code && (
                                                    <div>
                                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">SWIFT Code</p>
                                                        <p className="font-mono font-bold text-gray-800">{request.metadata.bank_details.swift_code}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </dd>
                                    </div>
                                )}

                                {request.wallet_address && (
                                    <div className="space-y-3 pt-2">
                                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Destination Crypto Wallet</h3>
                                        <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 shadow-sm flex items-center justify-between gap-4">
                                            <dd className="font-mono break-all text-sm font-semibold text-indigo-900 flex-1">{request.wallet_address}</dd>
                                            <button
                                                onClick={() => copyToClipboard(request.wallet_address, 'Wallet')}
                                                className="shrink-0 p-2 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors"
                                            >
                                                {copiedField === 'Wallet' ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Processed Info (Transaction ID / Rejection) */}
                                {(request.transaction_id || request.rejection_reason) && (
                                    <div className="pt-4 border-t border-gray-100 space-y-4">
                                        {request.transaction_id && (
                                            <div>
                                                <dt className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                    <Hash className="w-3.5 h-3.5" /> Transaction Record
                                                </dt>
                                                <dd className="font-mono break-all rounded-lg bg-gray-50 border border-gray-200 p-3 text-sm font-medium text-gray-700 flex justify-between items-center group">
                                                    {request.transaction_id}
                                                    <button
                                                        onClick={() => copyToClipboard(request.transaction_id!, 'Transaction ID')}
                                                        className="text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        {copiedField === 'Transaction ID' ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </dd>
                                            </div>
                                        )}

                                        {request.rejection_reason && (
                                            <div>
                                                <dt className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                    <StopCircle className="w-3.5 h-3.5" /> Rejection Reason
                                                </dt>
                                                <dd className="rounded-lg bg-red-50 border border-red-100 p-4 text-sm font-medium text-red-800 leading-relaxed">
                                                    {request.rejection_reason}
                                                </dd>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>
                </div>

                {/* Right Column - User Info & Actions (Span 5) */}
                <div className="lg:col-span-5 space-y-6">
                    {/* User Profile Card */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-blue-700 flex items-center justify-center font-bold text-lg shadow-inner ring-1 ring-blue-50">
                                {request.profiles?.full_name?.charAt(0) || <User className="w-5 h-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="text-lg font-bold text-gray-900 truncate">{request.profiles?.full_name}</h3>
                                <p className="text-sm font-medium text-gray-500 truncate">{request.profiles?.email}</p>
                                <div className="mt-2 text-xs text-gray-400 font-medium">Requested on {new Date(request.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                            </div>
                        </div>
                    </div>

                    {/* Action Card (Only if pending) */}
                    {request.status === 'pending' && (
                        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                            <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                                <h2 className="text-base font-bold text-gray-900">Process Action</h2>
                            </div>
                            <div className="p-6 space-y-8">
                                {/* Approve Form */}
                                <form onSubmit={handleApprove} className="space-y-4">
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex gap-3 items-start">
                                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-semibold text-blue-900">Auto-Generate ID</p>
                                            <p className="mt-1 text-xs text-blue-700/80 leading-relaxed">
                                                A unique ID is automatically generated upon approval. Or, provide a custom hash below.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Custom Transaction Hash
                                            <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={transactionId}
                                            onChange={(e) => setTransactionId(e.target.value)}
                                            placeholder="Optional blockchain hash..."
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all font-mono"
                                            disabled={processing}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={processing}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                    >
                                        {processing ? (
                                            <><RefreshCw className="w-4 h-4 animate-spin md:-ml-4" /> Processing...</>
                                        ) : (
                                            <><CheckCircle className="w-4 h-4" /> Approve Payout</>
                                        )}
                                    </button>
                                </form>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100" /></div>
                                    <div className="relative flex justify-center text-xs"><span className="bg-white px-3 font-medium text-gray-400 uppercase tracking-widest">Or</span></div>
                                </div>

                                {/* Reject Form */}
                                <form onSubmit={handleReject} className="space-y-3 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider">
                                            Rejection Reason
                                            <span className="text-red-400 ml-1">*</span>
                                        </label>
                                        <textarea
                                            value={rejectionReason}
                                            onChange={(e) => setRejectionReason(e.target.value)}
                                            placeholder="Explain why this payout is being rejected..."
                                            required
                                            rows={3}
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50/50 p-3 text-sm text-gray-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/20 focus:bg-white transition-all resize-none"
                                            disabled={processing}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={processing || !rejectionReason.trim()}
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-red-100 text-red-600 px-4 py-3 text-sm font-bold hover:bg-red-50 hover:border-red-200 focus:outline-none focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                                    >
                                        <StopCircle className="w-4 h-4" /> Deny Payout
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
