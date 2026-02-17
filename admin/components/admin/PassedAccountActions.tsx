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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md transition-colors"
                >
                    {loading && actionType === null ? <Loader2 size={14} className="animate-spin" /> : <ArrowUp size={14} />}
                    Upgrade
                </button>

                {isActiveOrPassed ? (
                    <button
                        onClick={() => handleDisableEnable('disable')}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                        title="Disable Account"
                    >
                        <Ban size={14} />
                        Disable
                    </button>
                ) : (
                    <button
                        onClick={() => handleDisableEnable('enable')}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors border border-emerald-200"
                        title="Enable Account"
                    >
                        <Loader2 size={14} />
                        Enable
                    </button>
                )}

                <button
                    onClick={() => openActionModal('breach')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 rounded-md transition-colors border border-orange-200"
                    title="Breach Account"
                >
                    <Ban size={14} />
                    Breach
                </button>

                <button
                    onClick={() => openActionModal('reject')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-200"
                    title="Reject Pass"
                >
                    <XCircle size={14} />
                    Reject
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-semibold text-lg capitalize">
                                {actionType} Account {accountLogin}
                            </h3>
                            <button
                                onClick={() => setShowModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Reason
                                </label>
                                <input
                                    type="text"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Admin Comment (Sends in Email)
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    rows={3}
                                    placeholder="Enter details for the user..."
                                    className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 p-4 border-t bg-gray-50 rounded-b-lg">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-md"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAction}
                                disabled={loading}
                                className={`px-4 py-2 text-sm text-white rounded-md flex items-center gap-2 ${actionType === 'breach' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                            >
                                {loading && <Loader2 size={16} className="animate-spin" />}
                                Confirm {actionType === 'breach' ? 'Breach' : 'Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
