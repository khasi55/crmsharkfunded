"use client";

import { useEffect, useState } from "react";
import { Check, X, Filter, Loader2, Wallet, Calendar, User, CreditCard, ChevronDown, ChevronRight, Users, LayoutList, Network } from "lucide-react";
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

interface Account {
    id: string;
    login: string;
    status: string;
    plan_type: string;
    initial_balance: number;
    current_equity: number;
}

interface ReferredUser {
    id: string;
    email: string;
    full_name: string;
    created_at: string;
    accounts: Account[];
}

interface AffiliateNode {
    id: string;
    email: string;
    full_name: string;
    referral_code: string;
    referred_count: number;
    referred_users: ReferredUser[];
}

export default function AdminAffiliatesClient() {
    const [activeTab, setActiveTab] = useState<'withdrawals' | 'tree'>('withdrawals');

    // Withdrawals State
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [filteredWithdrawals, setFilteredWithdrawals] = useState<Withdrawal[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");

    // Tree State
    const [affiliateTree, setAffiliateTree] = useState<AffiliateNode[]>([]);
    const [filteredTree, setFilteredTree] = useState<AffiliateNode[]>([]);
    const [loadingTree, setLoadingTree] = useState(false);
    const [expandedAffiliates, setExpandedAffiliates] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");

    // Action State
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [rejectId, setRejectId] = useState<string | null>(null);
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    useEffect(() => {
        if (activeTab === 'tree' && affiliateTree.length === 0) {
            fetchTree();
        }
    }, [activeTab]);

    useEffect(() => {
        if (statusFilter === 'all') {
            setFilteredWithdrawals(withdrawals);
        } else {
            setFilteredWithdrawals(withdrawals.filter(w => w.status === statusFilter));
        }
    }, [withdrawals, statusFilter]);

    // Search Logic
    useEffect(() => {
        if (!searchQuery.trim()) {
            setFilteredTree(affiliateTree);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = affiliateTree.filter(node => {
            // Check Affiliate match
            const affiliateMatch =
                node.full_name?.toLowerCase().includes(query) ||
                node.email?.toLowerCase().includes(query) ||
                node.referral_code?.toLowerCase().includes(query);

            if (affiliateMatch) return true;

            // Check Children match
            const childrenMatch = node.referred_users.some(u =>
                u.full_name?.toLowerCase().includes(query) ||
                u.email?.toLowerCase().includes(query)
            );

            return childrenMatch;
        });

        setFilteredTree(filtered);

        // Auto-expand if searching
        if (searchQuery.trim().length > 2) {
            const matches = new Set<string>();
            filtered.forEach(node => matches.add(node.id));
            setExpandedAffiliates(matches);
        }

    }, [searchQuery, affiliateTree]);

    const fetchWithdrawals = async () => {
        setLoading(true);
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

    const fetchTree = async () => {
        setLoadingTree(true);
        try {
            const res = await fetch('/api/admin/affiliates/tree');
            const data = await res.json();
            if (res.ok) {
                setAffiliateTree(data.tree || []);
                setFilteredTree(data.tree || []); // Init filtered
            }
        } catch (error) {
            console.error("Error fetching tree:", error);
        } finally {
            setLoadingTree(false);
        }
    };

    const toggleAffiliate = (id: string) => {
        const newSet = new Set(expandedAffiliates);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setExpandedAffiliates(newSet);
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
                    <h1 className="text-2xl font-semibold text-slate-900">Affiliate Management</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage payouts and view referral hierarchy</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('withdrawals')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                        activeTab === 'withdrawals'
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                >
                    <LayoutList size={16} />
                    Withdrawals
                </button>
                <button
                    onClick={() => setActiveTab('tree')}
                    className={cn(
                        "px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2",
                        activeTab === 'tree'
                            ? "border-slate-900 text-slate-900"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                >
                    <Network size={16} />
                    Affiliate Tree
                </button>
            </div>

            {activeTab === 'withdrawals' && (
                <>
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
                </>
            )}

            {activeTab === 'tree' && (
                <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search affiliate by name, email, code or referred user..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all"
                        />
                    </div>

                    {loadingTree ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                            Loading affiliate hierarchy...
                        </div>
                    ) : filteredTree.length === 0 ? (
                        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500">
                            No affiliates found matching your search.
                        </div>
                    ) : (
                        filteredTree.map((affiliate) => (
                            <div key={affiliate.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                {/* Affiliate Header */}
                                <div
                                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                                    onClick={() => toggleAffiliate(affiliate.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 rounded-full bg-indigo-100 text-indigo-700">
                                            {expandedAffiliates.has(affiliate.id) ? (
                                                <ChevronDown size={20} />
                                            ) : (
                                                <ChevronRight size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-slate-900">{affiliate.full_name || 'Unknown Affiliate'}</div>
                                            <div className="text-sm text-slate-500">{affiliate.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Referral Code</div>
                                            <div className="font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm">{affiliate.referral_code}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Referred</div>
                                            <div className="font-medium text-slate-900 flex items-center gap-1 justify-end">
                                                <Users size={14} className="text-slate-400" />
                                                {affiliate.referred_count}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Referred Users List */}
                                {expandedAffiliates.has(affiliate.id) && (
                                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 pl-12 space-y-3">
                                        <h4 className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-2 mb-2">
                                            Referred Users ({affiliate.referred_users.length})
                                        </h4>

                                        {affiliate.referred_users.length === 0 ? (
                                            <div className="text-sm text-slate-400 italic">No referrals yet.</div>
                                        ) : (
                                            affiliate.referred_users.map(user => (
                                                <div key={user.id} className="bg-white border border-slate-200 rounded-lg p-4">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                                <User size={14} />
                                                            </div>
                                                            <div>
                                                                <div className="font-medium text-slate-900">{user.full_name || 'Unknown User'}</div>
                                                                <div className="text-xs text-slate-500">{user.email}</div>
                                                            </div>
                                                        </div>
                                                        <div className="text-xs text-slate-400">
                                                            Joined {new Date(user.created_at).toLocaleDateString()}
                                                        </div>
                                                    </div>

                                                    {/* User's Accounts */}
                                                    {user.accounts && user.accounts.length > 0 ? (
                                                        <div className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden">
                                                            <table className="w-full text-left text-xs">
                                                                <thead className="bg-slate-100 text-slate-500">
                                                                    <tr>
                                                                        <th className="px-3 py-2 font-medium">Account</th>
                                                                        <th className="px-3 py-2 font-medium">Plan</th>
                                                                        <th className="px-3 py-2 font-medium">Status</th>
                                                                        <th className="px-3 py-2 font-medium text-right">Balance</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {user.accounts.map(acc => (
                                                                        <tr key={acc.id}>
                                                                            <td className="px-3 py-2 font-mono text-slate-700">
                                                                                {acc.login}
                                                                            </td>
                                                                            <td className="px-3 py-2 capitalize text-slate-600">
                                                                                {acc.plan_type}
                                                                            </td>
                                                                            <td className="px-3 py-2">
                                                                                <span className={cn(
                                                                                    "px-1.5 py-0.5 rounded text-[10px] font-medium uppercase",
                                                                                    acc.status === 'active' ? "bg-emerald-100 text-emerald-700" :
                                                                                        acc.status === 'failed' ? "bg-red-100 text-red-700" :
                                                                                            "bg-slate-200 text-slate-600"
                                                                                )}>
                                                                                    {acc.status}
                                                                                </span>
                                                                            </td>
                                                                            <td className="px-3 py-2 text-right font-mono text-slate-700">
                                                                                ${acc.current_equity?.toLocaleString()}
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    ) : (
                                                        <div className="text-xs text-slate-400 italic">No accounts found.</div>
                                                    )}
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

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
