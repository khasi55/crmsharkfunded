"use client";

import { useState } from "react";
import { Loader2, Ban, AlertOctagon, RefreshCw, ScrollText, X, Pencil, Gauge, Coins, Trophy } from "lucide-react";
import { toast } from "sonner";
import { executeAccountAction, getAccountTrades, updateUserEmail, changeAccountLeverage, adjustAccountBalance } from "@/app/actions/mt5-actions";

interface AccountActionsProps {
    accountId: string;
    login: number;
    currentStatus: string;
    userId?: string;
    currentEmail?: string;
    challengeType?: string; // Add challenge type to determine upgrade eligibility
    upgradedTo?: string; // Add upgradedTo to hide button
    currentLeverage?: number;
    variant?: 'icons' | 'labels';
    onSuccess?: () => void;
}

export function AccountActions({
    accountId, login, currentStatus, userId, currentEmail, challengeType, upgradedTo, currentLeverage,
    variant = 'icons',
    onSuccess
}: AccountActionsProps) {
    const [loading, setLoading] = useState(false);
    const [showTrades, setShowTrades] = useState(false);
    const [trades, setTrades] = useState<any[]>([]);
    const [loadingTrades, setLoadingTrades] = useState(false);

    // Email Update State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [newEmail, setNewEmail] = useState(currentEmail || "");
    const [updatingEmail, setUpdatingEmail] = useState(false);

    // Leverage State
    const [showLeverageModal, setShowLeverageModal] = useState(false);
    const [leverage, setLeverage] = useState(currentLeverage || 100);
    const [updatingLeverage, setUpdatingLeverage] = useState(false);

    // Balance State
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [adjustmentAmount, setAdjustmentAmount] = useState("");
    const [adjustmentComment, setAdjustmentComment] = useState("Admin Adjustment");
    const [updatingBalance, setUpdatingBalance] = useState(false);

    const handleAction = async (action: 'disable' | 'stop-out' | 'enable') => {
        let actionName = '';
        let confirmMsg = '';

        if (action === 'disable') {
            actionName = 'Disable Account';
            confirmMsg = `Are you sure you want to DISABLE account ${login}? This will prevent further trading.`;
        } else if (action === 'stop-out') {
            actionName = 'STOP OUT Account';
            confirmMsg = `⚠️ DANGER: Are you sure you want to STOP OUT account ${login}?\n\nThis will CLOSE ALL POSITIONS and DISABLE the account immediately.`;
        } else if (action === 'enable') {
            actionName = 'Enable Account';
            confirmMsg = `Are you sure you want to RE-ENABLE (Unbreach) account ${login}? This will allow trading again.`;
        }

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            const result = await executeAccountAction(login, action);
            if (result.error) throw new Error(result.error);
            toast.success(result.message || `${actionName} successful`);
            if (onSuccess) onSuccess();
            else window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!confirm(`Are you sure you want to UPGRADE account ${login} to the Next Phase?`)) return;
        setLoading(true);
        try {
            const response = await fetch('/api/admin/upgrade-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Upgrade failed');
            }
            toast.success('Account Upgraded Successfully!');
            if (onSuccess) onSuccess();
            else window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTrades = async () => {
        setLoadingTrades(true);
        setShowTrades(true);
        try {
            const result = await getAccountTrades(login);
            if (result.error) {
                toast.error(result.error);
            } else {
                setTrades(result.trades || []);
            }
        } catch (error) {
            toast.error("Failed to fetch trades");
        } finally {
            setLoadingTrades(false);
        }
    };

    const handleUpdateEmail = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userId || !newEmail) return;

        setUpdatingEmail(true);
        try {
            const result = await updateUserEmail(userId, newEmail);
            if (result.error) {
                toast.error(result.error);
            } else {
                toast.success("Email updated successfully");
                setShowEmailModal(false);
                if (onSuccess) onSuccess();
                else window.location.reload();
            }
        } catch (error) {
            toast.error("Failed to update email");
        } finally {
            setUpdatingEmail(false);
        }
    };

    const handleUpdateLeverage = async (e: React.FormEvent) => {
        e.preventDefault();
        setUpdatingLeverage(true);
        try {
            const result = await changeAccountLeverage(login, leverage);
            if (result.error) toast.error(result.error);
            else {
                toast.success(result.message);
                setShowLeverageModal(false);
                if (onSuccess) onSuccess();
                else window.location.reload();
            }
        } catch (error) {
            toast.error("Failed to update leverage");
        } finally {
            setUpdatingLeverage(false);
        }
    };

    const handleAdjustBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = parseFloat(adjustmentAmount);
        if (isNaN(amount)) return toast.error("Invalid amount");

        setUpdatingBalance(true);
        try {
            const result = await adjustAccountBalance(login, amount, adjustmentComment);
            if (result.error) toast.error(result.error);
            else {
                toast.success(result.message);
                setShowBalanceModal(false);
                if (onSuccess) onSuccess();
                else window.location.reload();
            }
        } catch (error) {
            toast.error("Failed to adjust balance");
        } finally {
            setUpdatingBalance(false);
        }
    };

    const renderButtons = () => {
        if (variant === 'labels') {
            return (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <button
                        onClick={fetchTrades}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-bold hover:bg-blue-100 transition-all border border-blue-100"
                    >
                        <ScrollText size={18} />
                        <span>View Trades</span>
                    </button>

                    {userId && (
                        <button
                            onClick={() => setShowEmailModal(true)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all border border-gray-200"
                        >
                            <Pencil size={18} />
                            <span>Edit Email</span>
                        </button>
                    )}

                    <button
                        onClick={() => setShowLeverageModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-700 rounded-xl font-bold hover:bg-purple-100 transition-all border border-purple-100"
                    >
                        <Gauge size={18} />
                        <span>Change Leverage</span>
                    </button>

                    <button
                        onClick={() => setShowBalanceModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl font-bold hover:bg-amber-100 transition-all border border-amber-100"
                    >
                        <Coins size={18} />
                        <span>Adjust Balance</span>
                    </button>

                    <button
                        onClick={() => handleAction('enable')}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-50 text-emerald-700 rounded-xl font-bold hover:bg-emerald-100 transition-all border border-emerald-100 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
                        <span>Enable Account</span>
                    </button>

                    <button
                        onClick={() => handleAction('disable')}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 text-orange-700 rounded-xl font-bold hover:bg-orange-100 transition-all border border-orange-100 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Ban size={18} />}
                        <span>Disable Account</span>
                    </button>

                    <button
                        onClick={() => handleAction('stop-out')}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl font-bold hover:bg-red-100 transition-all border border-red-100 disabled:opacity-50"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <AlertOctagon size={18} />}
                        <span>STOP OUT</span>
                    </button>

                    {(currentStatus === 'passed' || currentStatus === 'active') && (() => {
                        const type = (challengeType || '').toLowerCase();
                        const isFunded = type.includes('funded') || type.includes('live') || type.includes('master');
                        const canUpgrade = !isFunded && !upgradedTo && (
                            type.includes('phase 1') || type.includes('phase_1') ||
                            type.includes('step 1') || type.includes('step_1') ||
                            type.includes('1_step') || type.includes('2_step') ||
                            type.includes('phase 2') || type.includes('phase_2') ||
                            type.includes('step 2') || type.includes('step_2')
                        );

                        return canUpgrade && (
                            <button
                                onClick={handleUpgrade}
                                disabled={loading}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
                            >
                                {loading ? <Loader2 size={18} className="animate-spin" /> : <Trophy size={18} />}
                                <span>UPGRADE PHASE</span>
                            </button>
                        );
                    })()}
                </div>
            );
        }

        return (
            <div className="flex items-center gap-2">
                {userId && (
                    <button
                        onClick={() => setShowEmailModal(true)}
                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                        title="Edit Email"
                    >
                        <Pencil size={16} />
                    </button>
                )}
                <button
                    onClick={fetchTrades}
                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                    title="View Trades"
                >
                    <ScrollText size={16} />
                </button>

                <button
                    onClick={() => handleAction('disable')}
                    disabled={loading}
                    className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                    title="Disable Account"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                </button>
                <button
                    onClick={() => handleAction('stop-out')}
                    disabled={loading}
                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="STOP OUT (Close All + Disable)"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <AlertOctagon size={16} />}
                </button>

                <button
                    onClick={() => handleAction('enable')}
                    disabled={loading}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                    title="Enable / Unbreach Account"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                </button>

                <button
                    onClick={() => setShowLeverageModal(true)}
                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-md transition-colors"
                    title="Change Leverage"
                >
                    <Gauge size={16} />
                </button>

                <button
                    onClick={() => setShowBalanceModal(true)}
                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md transition-colors"
                    title="Adjust Balance"
                >
                    <Coins size={16} />
                </button>

                {/* Only show upgrade for Phase 1 and Phase 2 accounts if status is active or passed */}
                {(currentStatus === 'passed' || currentStatus === 'active') && (() => {
                    const type = (challengeType || '').toLowerCase();
                    const isFunded = type.includes('funded') || type.includes('live') || type.includes('master');
                    const canUpgrade = !isFunded && !upgradedTo && (
                        type.includes('phase 1') || type.includes('phase_1') ||
                        type.includes('step 1') || type.includes('step_1') ||
                        type.includes('1_step') || type.includes('2_step') ||
                        type.includes('phase 2') || type.includes('phase_2') ||
                        type.includes('step 2') || type.includes('step_2')
                    );

                    return canUpgrade && (
                        <button
                            onClick={handleUpgrade}
                            disabled={loading}
                            className="px-2 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                            title="Upgrade to Next Phase"
                        >
                            {loading ? <Loader2 size={12} className="animate-spin" /> : "UPGRADE"}
                        </button>
                    );
                })()}
            </div>
        );
    };

    return (
        <>
            {renderButtons()}

            {/* Trades Modal */}
            {showTrades && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-semibold text-lg">Trade History - Account {login}</h3>
                            <button onClick={() => setShowTrades(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            {loadingTrades ? (
                                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
                            ) : trades.length === 0 ? (
                                <p className="text-center text-gray-500">No trades found.</p>
                            ) : (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="p-2 border-b">Time</th>
                                            <th className="p-2 border-b">Symbol</th>
                                            <th className="p-2 border-b">Type</th>
                                            <th className="p-2 border-b text-right">Vol</th>
                                            <th className="p-2 border-b text-right">Open</th>
                                            <th className="p-2 border-b text-right">Close</th>
                                            <th className="p-2 border-b text-right">Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {trades.map((t: any) => (
                                            <tr key={t.ticket} className="hover:bg-gray-50">
                                                <td className="p-2 border-b whitespace-nowrap text-xs text-gray-500">
                                                    {new Date(t.close_time || t.open_time).toLocaleString()}
                                                </td>
                                                <td className="p-2 border-b font-medium">{t.symbol}</td>
                                                <td className={`p-2 border-b uppercase text-xs font-bold ${t.type === 'buy' ? 'text-green-600' : t.type === 'sell' ? 'text-red-600' : 'text-gray-500'}`}>
                                                    {t.type}
                                                </td>
                                                <td className="p-2 border-b text-right font-mono">{t.lots}</td>
                                                <td className="p-2 border-b text-right font-mono text-gray-500">{t.open_price}</td>
                                                <td className="p-2 border-b text-right font-mono text-gray-500">{t.close_price}</td>
                                                <td className={`p-2 border-b text-right font-mono font-bold ${t.profit_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    ${t.profit_loss?.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Email Modal */}
            {showEmailModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-semibold text-lg">Update Email</h3>
                            <button onClick={() => setShowEmailModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateEmail} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmailModal(false)}
                                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingEmail}
                                    className="px-3 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-2"
                                >
                                    {updatingEmail && <Loader2 size={14} className="animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Leverage Modal */}
            {showLeverageModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-semibold text-lg">Change Leverage - {login}</h3>
                            <button onClick={() => setShowLeverageModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateLeverage} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Leverage Value (e.g. 100)</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500 font-mono">1:</span>
                                    <input
                                        type="number"
                                        required
                                        value={leverage}
                                        onChange={(e) => setLeverage(parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowLeverageModal(false)}
                                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingLeverage}
                                    className="px-3 py-2 text-sm text-white bg-purple-600 hover:bg-purple-700 rounded-md flex items-center gap-2"
                                >
                                    {updatingLeverage && <Loader2 size={14} className="animate-spin" />}
                                    Update Leverage
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Balance Modal */}
            {showBalanceModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="font-semibold text-lg">Adjust Balance - {login}</h3>
                            <button onClick={() => setShowBalanceModal(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAdjustBalance} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (Positive to add, Negative to deduct)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    placeholder="0.00"
                                    value={adjustmentAmount}
                                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md font-mono focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                                <input
                                    type="text"
                                    value={adjustmentComment}
                                    onChange={(e) => setAdjustmentComment(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBalanceModal(false)}
                                    className="px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingBalance}
                                    className="px-3 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-md flex items-center gap-2"
                                >
                                    {updatingBalance && <Loader2 size={14} className="animate-spin" />}
                                    Adjust Balance
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
