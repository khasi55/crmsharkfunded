"use client";

import { useRouter } from "next/navigation";
import { ArrowUp, Ban, XCircle, Loader2, X, Image as ImageIcon, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { executeAccountAction } from "@/app/actions/mt5-actions";

interface PassedAccountActionsProps {
    accountId: string;
    accountLogin: string;
    upgradedTo?: string;
    currentStatus?: string;
}

type ActionType = 'breach' | 'reject' | 'soft-breach' | 'hard-breach';

export default function PassedAccountActions({ accountId, accountLogin, upgradedTo, currentStatus }: PassedAccountActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [actionType, setActionType] = useState<ActionType | null>(null);
    const [reason, setReason] = useState("");
    const [comment, setComment] = useState("");
    const [image, setImage] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

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
        if (type === 'breach') setReason('Manual Breach');
        else if (type === 'reject') setReason('Upgrade Rejected');
        else if (type === 'soft-breach') setReason('Soft Breach Warning');
        else if (type === 'hard-breach') setReason('Hard Breach - Rule Violation');
        setImage(null);
        setImagePreview(null);
        setShowModal(true);
    };

    const handleAction = async () => {
        if (!actionType) return;

        setLoading(true);
        let evidenceUrl = '';

        // Handle Image Upload for Soft Breach
        if (actionType === 'soft-breach' && image) {
            setUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', image);
                formData.append('bucket', 'evidence');
                formData.append('path', `soft-breach/${accountLogin}-${Date.now()}.png`);

                const uploadRes = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    evidenceUrl = uploadData.url;
                } else {
                    toast.error("Failed to upload evidence image");
                }
            } catch (err) {
                console.error("Upload error:", err);
            } finally {
                setUploading(false);
            }
        }

        const endpoints: Record<ActionType, string> = {
            'breach': '/api/admin/breach-account',
            'reject': '/api/admin/reject-account',
            'soft-breach': '/api/admin/soft-breach-account',
            'hard-breach': '/api/admin/hard-breach-account'
        };

        const endpoint = endpoints[actionType];

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId, reason, comment, evidenceUrl })
            });

            if (response.ok) {
                let successMsg = `Action successful!`;
                if (actionType === 'breach') successMsg = 'Account breached successfully!';
                else if (actionType === 'reject') successMsg = 'Upgrade rejected successfully!';
                else if (actionType === 'soft-breach') successMsg = 'Soft breach processed & account upgraded!';
                else if (actionType === 'hard-breach') successMsg = 'Hard breach processed & account disabled!';

                toast.success(successMsg);
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
                    onClick={() => openActionModal('soft-breach')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all border border-emerald-200 shadow-sm"
                    title="Soft Breach (Notify + Upgrade)"
                >
                    <ArrowUp size={13} className="text-emerald-500" />
                    Soft Breach
                </button>

                <button
                    onClick={() => openActionModal('hard-breach')}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-all border border-rose-200 shadow-sm"
                    title="Hard Breach (Notify + Reject)"
                >
                    <Ban size={13} className="text-rose-500" />
                    Hard Breach
                </button>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-semibold text-[15px] text-slate-800 flex items-center gap-2">
                                {actionType === 'breach' || actionType === 'hard-breach' ? <Ban size={16} className="text-rose-500" /> : 
                                 actionType === 'soft-breach' ? <ArrowUp size={16} className="text-emerald-500" /> : 
                                 <XCircle size={16} className="text-amber-500" />}
                                <span className="capitalize">{actionType?.replace('-', ' ')}</span> Account <span className="font-mono text-indigo-600">{accountLogin}</span>
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

                            {actionType === 'soft-breach' && (
                                <div className="space-y-2">
                                    <label className="block text-[13px] font-semibold text-slate-700">
                                        Evidence Screenshot <span className="text-slate-400 font-normal">(Optional)</span>
                                    </label>
                                    
                                    {!imagePreview ? (
                                        <div className="relative group">
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setImage(file);
                                                        const reader = new FileReader();
                                                        reader.onloadend = () => setImagePreview(reader.result as string);
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                            />
                                            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 group-hover:bg-slate-100 group-hover:border-indigo-300 transition-all">
                                                <Upload className="h-6 w-6 text-slate-400 mb-2 group-hover:text-indigo-500" />
                                                <span className="text-xs text-slate-500 group-hover:text-indigo-600 font-medium">Click or drag to upload violation proof</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="relative rounded-xl overflow-hidden border border-slate-200 aspect-video bg-slate-100">
                                            <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                                            <button 
                                                onClick={() => {
                                                    setImage(null);
                                                    setImagePreview(null);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg hover:bg-rose-600 transition-colors"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
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
                                disabled={loading || uploading}
                                className={`px-4 py-2 text-[13px] font-semibold text-white rounded-xl shadow-sm transition-all focus:ring-4 outline-none flex items-center gap-2 ${
                                    actionType === 'soft-breach' || actionType === 'breach'
                                    ? 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-600/20'
                                    : 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-600/20'
                                    }`}
                            >
                                {(loading || uploading) && <Loader2 size={14} className="animate-spin" />}
                                {uploading ? 'Uploading Image...' : `Confirm ${actionType?.replace('-', ' ')}`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
