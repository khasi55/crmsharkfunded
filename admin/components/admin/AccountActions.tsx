"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ban, AlertOctagon, RefreshCw, ScrollText, X, Pencil, DollarSign, Zap, MoreHorizontal, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { executeAccountAction, getAccountTrades, updateUserEmail, adjustMT5Balance, changeAccountLeverage, syncMT5Trades } from "@/app/actions/mt5-actions";

interface AccountActionsProps {
    accountId: string;
    login: number;
    currentStatus: string;
    userId?: string;
    currentEmail?: string;
    challengeType?: string;
    upgradedTo?: string;
    onRefresh?: () => void; // Add refresh callback
}

export function AccountActions({ accountId, login, currentStatus, userId, currentEmail, challengeType, upgradedTo, onRefresh }: AccountActionsProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [showTrades, setShowTrades] = useState(false);
    const [trades, setTrades] = useState<any[]>([]);
    const [loadingTrades, setLoadingTrades] = useState(false);

    // Email Update State
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [newEmail, setNewEmail] = useState(currentEmail || "");
    const [updatingEmail, setUpdatingEmail] = useState(false);

    // Context Menu State
    const [showMoreActions, setShowMoreActions] = useState(false);

    // Balance Adjustment State
    const [showBalanceModal, setShowBalanceModal] = useState(false);
    const [adjustAmount, setAdjustAmount] = useState("");
    const [adjustComment, setAdjustComment] = useState("Admin Adjustment");
    const [adjustingBalance, setAdjustingBalance] = useState(false);

    // Leverage Adjustment State
    const [showLeverageModal, setShowLeverageModal] = useState(false);
    const [newLeverage, setNewLeverage] = useState("100");
    const [adjustingLeverage, setAdjustingLeverage] = useState(false);

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
            if (onRefresh) onRefresh();
            else router.refresh();
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
            if (onRefresh) onRefresh();
            else router.refresh();
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
                if (onRefresh) onRefresh();
                else router.refresh();
            }
        } catch (error) {
            toast.error("Failed to update email");
        } finally {
            setUpdatingEmail(false);
        }
    };

    const handleAdjustBalance = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountNum = parseFloat(adjustAmount);
        if (isNaN(amountNum)) return toast.error("Invalid amount");

        setAdjustingBalance(true);
        try {
            const result = await adjustMT5Balance(login, amountNum, adjustComment);
            if (result.error) throw new Error(result.error);
            toast.success(result.message);
            setShowBalanceModal(false);
            if (onRefresh) onRefresh();
            else router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setAdjustingBalance(false);
        }
    };

    const handleChangeLeverage = async (e: React.FormEvent) => {
        e.preventDefault();
        const levNum = parseInt(newLeverage);
        if (isNaN(levNum)) return toast.error("Invalid leverage");

        setAdjustingLeverage(true);
        try {
            const result = await changeAccountLeverage(login, levNum);
            if (result.error) throw new Error(result.error);
            toast.success(result.message);
            setShowLeverageModal(false);
            if (onRefresh) onRefresh();
            else router.refresh();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setAdjustingLeverage(false);
        }
    };

    const handleSync = async () => {
        setLoading(true);
        try {
            const result = await syncMT5Trades(login);
            if (result.error) throw new Error(result.error);
            toast.success(result.message);
            // Optionally reload to show new trades if viewing trades
            if (showTrades) fetchTrades();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-end gap-1.5 py-1">
                {/* 1. Sync */}
                <button
                    onClick={handleSync}
                    disabled={loading}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all active:scale-95 disabled:opacity-50 border border-transparent hover:border-blue-200"
                    title="Sync Trades"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                </button>

                {/* 2. Adjust Balance */}
                <button
                    onClick={() => setShowBalanceModal(true)}
                    className="p-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-all active:scale-95 border border-transparent hover:border-orange-200"
                    title="Adjust Balance"
                >
                    <DollarSign size={16} />
                </button>

                {/* 3. Disable/Enable */}
                {currentStatus === 'active' || currentStatus === 'passed' ? (
                    <button
                        onClick={() => handleAction('disable')}
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all active:scale-95 disabled:opacity-50 border border-transparent hover:border-red-200"
                        title="Disable Account"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                    </button>
                ) : (
                    <button
                        onClick={() => handleAction('enable')}
                        disabled={loading}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-95 disabled:opacity-50 border border-transparent hover:border-emerald-200"
                        title="Enable Account"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    </button>
                )}

                {/* 4. More Actions Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setShowMoreActions(!showMoreActions)}
                        className={`p-2 rounded-lg transition-all active:scale-95 border ${showMoreActions ? 'bg-gray-100 border-gray-300 text-gray-900' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        title="More Actions"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {showMoreActions && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMoreActions(false)}
                            />
                            <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in duration-150 origin-top-right">
                                <div className="p-1">
                                    <button
                                        onClick={() => { setShowLeverageModal(true); setShowMoreActions(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-indigo-600 rounded-lg transition-colors"
                                    >
                                        <Zap size={16} className="text-indigo-500" />
                                        <span>Change Leverage</span>
                                    </button>

                                    <button
                                        onClick={() => { fetchTrades(); setShowMoreActions(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-lg transition-colors"
                                    >
                                        <ScrollText size={16} className="text-blue-500" />
                                        <span>Trade History</span>
                                    </button>

                                    {userId && (
                                        <button
                                            onClick={() => { setShowEmailModal(true); setShowMoreActions(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
                                        >
                                            <Pencil size={16} className="text-gray-500" />
                                            <span>Edit Email</span>
                                        </button>
                                    )}

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
                                                onClick={() => { handleUpgrade(); setShowMoreActions(false); }}
                                                className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-green-700 hover:bg-green-50 rounded-lg transition-colors"
                                            >
                                                <Zap size={16} className="text-green-600" />
                                                <span>UPGRADE</span>
                                            </button>
                                        );
                                    })()}

                                    <div className="border-t border-gray-100 my-1 mx-2" />

                                    <button
                                        onClick={() => { handleAction('stop-out'); setShowMoreActions(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <AlertOctagon size={16} />
                                        <span>STOP OUT</span>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Trades Modal, Email Modal, etc. continue below */}
            </div>

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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Amount (e.g. 500 or -500)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={adjustAmount}
                                    onChange={(e) => setAdjustAmount(e.target.value)}
                                    placeholder="Enter amount..."
                                    className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Comment</label>
                                <input
                                    type="text"
                                    value={adjustComment}
                                    onChange={(e) => setAdjustComment(e.target.value)}
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
                                    disabled={adjustingBalance}
                                    className="px-3 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-md flex items-center gap-2"
                                >
                                    {adjustingBalance && <Loader2 size={14} className="animate-spin" />}
                                    Adjust Balance
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
                        <form onSubmit={handleChangeLeverage} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Leverage (e.g. 100)</label>
                                <input
                                    type="number"
                                    required
                                    value={newLeverage}
                                    onChange={(e) => setNewLeverage(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
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
                                    disabled={adjustingLeverage}
                                    className="px-3 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-md flex items-center gap-2"
                                >
                                    {adjustingLeverage && <Loader2 size={14} className="animate-spin" />}
                                    Change Leverage
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
