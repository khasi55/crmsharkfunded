"use client";

import { useRouter } from "next/navigation";
import { ArrowUp, Ban, XCircle, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { executeAccountAction } from "@/app/actions/mt5-actions";

interface PassedAccountActionsProps {
    accountId: string;
    accountLogin: string;
    upgradedTo?: string;
    currentStatus?: string;
}

type ActionType = 'breach' | 'reject';

export default function PassedAccountActions({ accountId, accountLogin, upgradedTo, currentStatus }: PassedAccountActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [actionType, setActionType] = useState<ActionType | null>(null);
    const [reason, setReason] = useState("");
    const [comment, setComment] = useState("");

    const handleDisableEnable = async (action: 'disable' | 'enable') => {
        const actionName = action === 'disable' ? 'Disable' : 'Enable';
        if (!confirm(`Are you sure you want to ${actionName.toUpperCase()} account ${accountLogin}?`)) {
            return;
        }

        setLoading(true);
        try {
            const loginNum = parseInt(accountLogin);
            if (isNaN(loginNum)) throw new Error("Invalid account login");

            const result = await executeAccountAction(loginNum, action);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success(`${actionName} successful`);
                router.refresh();
            }
        } catch (error: any) {
            console.error(`${actionName} error:`, error);
            toast.error(`Failed to ${action} account: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!confirm(`Are you sure you want to upgrade account ${accountLogin} to the next phase?`)) {
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/admin/upgrade-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId })
            });

            if (response.ok) {
                toast.success('Account upgraded successfully!');
                router.refresh();
            } else {
                const error = await response.json();
                toast.error(`Error: ${error.message || 'Failed to upgrade account'}`);
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            toast.error('Failed to upgrade account');
        } finally {
            setLoading(false);
        }
    };

    const openActionModal = (type: ActionType) => {
        setActionType(type);
        setReason(type === 'breach' ? 'Manual Breach' : 'Upgrade Rejected');
        setShowModal(true);
    };

    const handleAction = async () => {
        if (!actionType) return;

        setLoading(true);
        const endpoint = actionType === 'breach' ? '/api/admin/breach-account' : '/api/admin/reject-account';

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, reason, comment })
            });

            if (response.ok) {
                toast.success(`Account ${actionType === 'breach' ? 'breached' : 'rejected'} successfully!`);
                setShowModal(false);
                router.refresh();
            } else {
                const error = await response.json();
                toast.error(`Error: ${error.message || 'Action failed'}`);
            }
        } catch (error) {
            console.error(`${actionType} error:`, error);
            toast.error(`Failed to ${actionType} account`);
        } finally {
            setLoading(false);
        }
    };

    if (upgradedTo) return null;

    const isActiveOrPassed = currentStatus === 'active' || currentStatus === 'passed';

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-all hover:shadow"
                >
                    {loading && actionType === null ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={13} strokeWidth={2.5} />}
                    Upgrade
                </button>

                {isActiveOrPassed ? (
                    <button
                        onClick={() => handleDisableEnable('disable')}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 hover:border-rose-200 bg-white shadow-sm"
                        title="Disable Account"
                    >
                        <Ban size={13} />
                        Disable
                    </button>
                ) : (
                    <button
                        onClick={() => handleDisableEnable('enable')}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all border border-slate-200 hover:border-emerald-200 bg-white shadow-sm"
                        title="Enable Account"
                    >
                        <Loader2 size={13} />
                        Enable
                    </button>
                )}

                <button
                    onClick={() => openActionModal('breach')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all border border-slate-200 hover:border-amber-200 bg-white shadow-sm"
                    title="Breach Account"
                >
                    <Ban size={13} />
                    Breach
                </button>

                <button
                    onClick={() => openActionModal('reject')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all border border-slate-200 hover:border-rose-200 bg-white shadow-sm"
                    title="Reject Pass"
                >
                    <XCircle size={13} />
                    Reject
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-[15px] text-slate-800 flex items-center gap-2">
                                {actionType === 'breach' ? <Ban size={16} className="text-amber-500" /> : <XCircle size={16} className="text-rose-500" />}
                                <span className="capitalize">{actionType}</span> Account <span className="font-mono text-indigo-600">{accountLogin}</span>
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                                    Reason
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                                    Admin Comment <span className="text-slate-400 font-normal">(Sent in Email)</span>
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={3}
                                    placeholder="Enter details for the user..."
                                    className="w-full px-3.5 py-2.5 text-[14px] bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all shadow-sm"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 p-5 bg-slate-50/80 border-t border-slate-100 mt-2">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={loading}
                                className={`px-4 py-2 text-[13px] font-semibold text-white rounded-xl shadow-sm transition-all focus:ring-4 outline-none flex items-center gap-2 ${actionType === 'breach'
                                    ? 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600/20'
                                    : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600/20'
                                    }`}
                            >
                                {loading && <Loader2 size={14} className="animate-spin" />}
                                Confirm {actionType === 'breach' ? 'Breach' : 'Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
