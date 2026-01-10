"use client";

import { useEffect, useState } from "react";
import { Check, X, Filter, Loader2, Wallet, Calendar, User, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

interface Withdrawal {
    id: string;
    user_id: string;
    amount: number;
    status: string;
    payout_method: string;
    payout_details: any;
    created_at: string;
    processed_at: string | null;
    rejection_reason: string | null;
    profiles: {
        email: string;
        full_name: string;
    };
}

export default function AdminAffiliatesClient() {
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [filteredWithdrawals, setFilteredWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");

    // Action State
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    useEffect(() => {
        if (statusFilter === 'all') {
            setFilteredWithdrawals(withdrawals);
        } else {
            setFilteredWithdrawals(withdrawals.filter(w => w.status === statusFilter));
        }
    }, [withdrawals, statusFilter]);

    const fetchWithdrawals = async () => {
        try {
            const res = await fetch('/api/affiliates/withdrawals');
            const data = await res.json();
            if (res.ok) {
                setWithdrawals(data.withdrawals || []);
            }
        } catch (error) {
            console.error("Error fetching withdrawals:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (id: string, status: 'approved' | 'rejected', reason?: string) => {
        setProcessingId(id);
        try {
            const res = await fetch(`/api/affiliates/withdrawals/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, rejection_reason: reason })
            });

            if (res.ok) {
                // Update local state
                setWithdrawals(prev => prev.map(w =>
                    w.id === id ? { ...w, status, processed_at: new Date().toISOString(), rejection_reason: reason || null } : w
                ));
                if (status === 'rejected') {
                    setRejectId(null);
                    setRejectReason("");
                }
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Error updating status");
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Affiliate Withdrawals</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage payout requests from affiliates</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 flex gap-4 items-center">
                <Filter className="h-4 w-4 text-slate-500" />
                <button
                    onClick={() => setStatusFilter("all")}
                    className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                        statusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    All
                </button>
                <button
                    onClick={() => setStatusFilter("pending")}
                    className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                        statusFilter === "pending" ? "bg-amber-100 text-amber-700" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    Pending
                </button>
                <button
                    onClick={() => setStatusFilter("approved")}
                    className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                        statusFilter === "approved" ? "bg-emerald-100 text-emerald-700" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    Approved
                </button>
                <button
                    onClick={() => setStatusFilter("rejected")}
                    className={cn(
                        "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                        statusFilter === "rejected" ? "bg-red-100 text-red-700" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    Rejected
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">User</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Amount</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Method</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Status</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Date</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                                        Loading requests...
                                    </td>
                                </tr>
                            ) : filteredWithdrawals.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No withdrawal requests found.
                                    </td>
                                </tr>
                            ) : (
                                filteredWithdrawals.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                    <User size={14} />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900">{item.profiles?.full_name || "Unknown"}</div>
                                                    <div className="text-xs text-slate-500">{item.profiles?.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-medium text-slate-900 text-base">
                                                ${item.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="flex items-center gap-1.5 text-slate-700 capitalize font-medium">
                                                    <CreditCard size={14} />
                                                    {item.payout_method.replace('_', ' ')}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono mt-1 max-w-[200px] truncate" title={JSON.stringify(item.payout_details)}>
                                                    {item.payout_method === 'crypto' ? item.payout_details?.address : 'Bank Details'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={cn(
                                                "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
                                                item.status === 'pending' ? "bg-amber-100 text-amber-800" :
                                                    item.status === 'approved' || item.status === 'processed' ? "bg-emerald-100 text-emerald-800" :
                                                        "bg-red-100 text-red-800"
                                            )}>
                                                {item.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            <div className="flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs mt-1">
                                                {new Date(item.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {item.status === 'pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleAction(item.id, 'approved')}
                                                        disabled={processingId === item.id}
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-all disabled:opacity-50"
                                                        title="Approve"
                                                    >
                                                        {processingId === item.id ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectId(item.id)}
                                                        disabled={processingId === item.id}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-all disabled:opacity-50"
                                                        title="Reject"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reject Modal */}
            {rejectId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Reject Withdrawal</h3>
                        <p className="text-sm text-slate-500 mb-4">
                            Please provide a reason for rejecting this withdrawal request.
                        </p>
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none mb-4 min-h-[100px]"
                            placeholder="Reason for rejection..."
                        />
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => { setRejectId(null); setRejectReason(""); }}
                                className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleAction(rejectId, 'rejected', rejectReason)}
                                disabled={!rejectReason.trim() || processingId === rejectId}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {processingId === rejectId && <Loader2 size={14} className="animate-spin" />}
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
