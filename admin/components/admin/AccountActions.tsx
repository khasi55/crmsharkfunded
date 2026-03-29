"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ban, AlertOctagon, RefreshCw, ScrollText, X, Pencil, DollarSign, Zap, MoreHorizontal, ChevronDown, Key, ChevronRight, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { executeAccountAction, getAccountTrades, updateUserEmail, adjustMT5Balance, changeAccountLeverage, syncMT5Trades, changeAccountPassword } from "@/app/actions/mt5-actions";

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

    // Password Change State
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [showMasterPassModal, setShowMasterPassModal] = useState(false);
    const [masterPassword, setMasterPassword] = useState("");
    const [investorPassword, setInvestorPassword] = useState("");
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const generateRandomPassword = (length = 12) => {
        const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        const lower = 'abcdefghjkmnpqrstuvwxyz';
        const digits = '23456789';
        const symbols = '!@#$%&*';
        const all = upper + lower + digits + symbols;

        let password = '';
        // Guarantee at least one of each
        password += upper.charAt(Math.floor(Math.random() * upper.length));
        password += lower.charAt(Math.floor(Math.random() * lower.length));
        password += digits.charAt(Math.floor(Math.random() * digits.length));
        password += symbols.charAt(Math.floor(Math.random() * symbols.length));

        // Fill the rest
        for (let i = password.length; i < length; i++) {
            password += all.charAt(Math.floor(Math.random() * all.length));
        }

        // Shuffle
        return password.split('').sort(() => 0.5 - Math.random()).join('');
    };

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

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!masterPassword && !investorPassword) return toast.error("Provide at least one password");

        setUpdatingPassword(true);
        try {
            const result = await changeAccountPassword(login, masterPassword || undefined, investorPassword || undefined);
            if (result.error) throw new Error(result.error);
            toast.success(result.message);
            setShowPasswordModal(false);
            setShowMasterPassModal(false);
            setMasterPassword("");
            setInvestorPassword("");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setUpdatingPassword(false);
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
            <div className="flex flex-wrap items-center justify-start gap-2.5 w-full">
                {/* 1. Sync */}
                <button
                    onClick={handleSync}
                    disabled={loading}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 border border-indigo-100/50"
                    title="Sync Trades"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    <span className="whitespace-nowrap">Sync</span>
                </button>

                {/* 2. Adjust Balance */}
                <button
                    onClick={() => setShowBalanceModal(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 rounded-xl font-semibold transition-all active:scale-[0.98] border border-amber-100/50"
                    title="Adjust Balance"
                >
                    <DollarSign size={16} />
                    <span className="whitespace-nowrap">Balance</span>
                </button>

                {/* 3. Disable/Enable */}
                {currentStatus === 'active' || currentStatus === 'passed' ? (
                    <button
                        onClick={() => handleAction('disable')}
                        disabled={loading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 border border-red-100/50"
                        title="Disable Account"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
                        <span className="whitespace-nowrap">Disable</span>
                    </button>
                ) : (
                    <button
                        onClick={() => handleAction('enable')}
                        disabled={loading}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-xl font-semibold transition-all active:scale-[0.98] disabled:opacity-50 border border-emerald-100/50"
                        title="Enable Account"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        <span className="whitespace-nowrap">Enable</span>
                    </button>
                )}

                {/* 4. More Actions Dropdown */}
                <div className="relative flex-none">
                    <button
                        onClick={() => setShowMoreActions(!showMoreActions)}
                        className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all active:scale-[0.98] border ${showMoreActions ? 'bg-gray-100 border-gray-300 text-gray-900 shadow-inner' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm'}`}
                        title="More Actions"
                    >
                        <MoreHorizontal size={18} />
                    </button>

                    {showMoreActions && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setShowMoreActions(false)}
                            />
                            <div className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in duration-150 origin-bottom-right">
                                <div className="p-1.5 space-y-0.5">
                                    <button
                                        onClick={() => { setShowLeverageModal(true); setShowMoreActions(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-indigo-100 text-indigo-600">
                                            <Zap size={14} />
                                        </div>
                                        <span>Change Leverage</span>
                                    </button>

                                    <button
                                        onClick={() => { fetchTrades(); setShowMoreActions(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-blue-100 text-blue-600">
                                            <ScrollText size={14} />
                                        </div>
                                        <span>Trade History</span>
                                    </button>

                                    {userId && (
                                        <button
                                            onClick={() => { setShowEmailModal(true); setShowMoreActions(false); }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors"
                                        >
                                            <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gray-200 text-gray-600">
                                                <Pencil size={14} />
                                            </div>
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
                                                className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50 rounded-xl transition-colors mt-1 border border-emerald-100"
                                            >
                                                <div className="flex items-center justify-center w-6 h-6 rounded-md bg-emerald-100 text-emerald-600">
                                                    <Zap size={14} />
                                                </div>
                                                <span>UPGRADE ACCOUNT</span>
                                            </button>
                                        );
                                    })()}

                                    <div className="border-t border-gray-100 my-1.5 mx-2" />

                                    <button
                                        onClick={() => { setShowMasterPassModal(true); setShowMoreActions(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 group"
                                    >
                                        <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            <Key size={16} strokeWidth={2.5} />
                                        </span>
                                        <div className="text-left">
                                            <p className="font-bold">Change Master Pass</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Quick update only</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setShowPasswordModal(true); setShowMoreActions(false); }}
                                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 group"
                                    >
                                        <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <ShieldCheck size={16} strokeWidth={2.5} />
                                        </span>
                                        <div className="text-left">
                                            <p className="font-bold">Manage Credentials</p>
                                            <p className="text-[10px] text-slate-400 font-medium">Update Master or Investor</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { handleAction('stop-out'); setShowMoreActions(false); }}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                    >
                                        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-red-100 text-red-600">
                                            <AlertOctagon size={14} />
                                        </div>
                                        <span>STOP OUT EXECUTED</span>
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
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-900">Update Email</h3>
                            <button onClick={() => setShowEmailModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateEmail} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-700">New Email Address</label>
                                <input
                                    type="email"
                                    required
                                    value={newEmail}
                                    onChange={(e) => setNewEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-medium text-gray-900"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEmailModal(false)}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={updatingEmail}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {updatingEmail && <Loader2 size={16} className="animate-spin" />}
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Balance Modal */}
            {showBalanceModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-900">Adjust Balance - {login}</h3>
                            <button onClick={() => setShowBalanceModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleAdjustBalance} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-700">Adjustment Amount <span className="text-gray-400 font-normal ml-1">e.g. 500 or -500</span></label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <DollarSign className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={adjustAmount}
                                        onChange={(e) => setAdjustAmount(e.target.value)}
                                        placeholder="Enter amount..."
                                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-mono font-bold text-gray-900 placeholder:font-sans placeholder:font-medium placeholder:text-gray-400"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-700">Comment / Reason</label>
                                <input
                                    type="text"
                                    value={adjustComment}
                                    onChange={(e) => setAdjustComment(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 outline-none transition-all font-medium text-gray-900"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowBalanceModal(false)}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjustingBalance}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {adjustingBalance && <Loader2 size={16} className="animate-spin" />}
                                    Adjust Balance
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Leverage Modal */}
            {showLeverageModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-900">Change Leverage - {login}</h3>
                            <button onClick={() => setShowLeverageModal(false)} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleChangeLeverage} className="p-6 space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-bold text-gray-700">New Leverage <span className="text-gray-400 font-normal ml-1">e.g. 100</span></label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <span className="text-gray-400 font-bold">1:</span>
                                    </div>
                                    <input
                                        type="number"
                                        required
                                        value={newLeverage}
                                        onChange={(e) => setNewLeverage(e.target.value)}
                                        className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-mono font-bold text-gray-900"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowLeverageModal(false)}
                                    className="px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={adjustingLeverage}
                                    className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl flex items-center gap-2 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    {adjustingLeverage && <Loader2 size={16} className="animate-spin" />}
                                    Change Leverage
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 7. Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                                    <Key size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Change passwords</h3>
                                    <p className="text-xs text-slate-400 font-medium">Account: <span className="font-mono">{login}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setShowPasswordModal(false)} className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordChange} className="p-8 space-y-6">
                            <div className="space-y-4">
                                {/* Master Password */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Master Password</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={masterPassword}
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            placeholder="Leave empty to keep current"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all outline-none"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setMasterPassword(generateRandomPassword())}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-blue-50 text-blue-500 rounded-xl transition-all"
                                            title="Auto-generate"
                                        >
                                            <RefreshCw size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>

                                {/* Investor Password */}
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">Investor Password</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={investorPassword}
                                            onChange={(e) => setInvestorPassword(e.target.value)}
                                            placeholder="Leave empty to keep current"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all outline-none"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setInvestorPassword(generateRandomPassword())}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-blue-50 text-blue-500 rounded-xl transition-all"
                                            title="Auto-generate"
                                        >
                                            <RefreshCw size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updatingPassword || (!masterPassword && !investorPassword)}
                                className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white rounded-2xl py-4 font-bold transition-all shadow-lg shadow-slate-900/10 hover:shadow-blue-600/20 flex items-center justify-center gap-2 group text-sm"
                            >
                                {updatingPassword ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Updating credentials...
                                    </>
                                ) : (
                                    <>
                                        Save Changes
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* 8. Master Password Only Modal */}
            {showMasterPassModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-blue-100 text-blue-600 rounded-2xl shadow-sm">
                                    <Key size={22} strokeWidth={2.5} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 leading-tight">Master Password</h3>
                                    <p className="text-xs text-slate-400 font-medium">Account: <span className="font-mono">{login}</span></p>
                                </div>
                            </div>
                            <button onClick={() => setShowMasterPassModal(false)} className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handlePasswordChange} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">New Master Password</label>
                                    <div className="relative group">
                                        <input
                                            type="text"
                                            value={masterPassword}
                                            required
                                            onChange={(e) => setMasterPassword(e.target.value)}
                                            placeholder="Enter new master password"
                                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-semibold text-slate-900 placeholder:text-slate-300 focus:border-blue-500 focus:bg-white transition-all outline-none"
                                        />
                                        <button 
                                            type="button"
                                            onClick={() => setMasterPassword(generateRandomPassword())}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-blue-50 text-blue-500 rounded-xl transition-all"
                                            title="Auto-generate"
                                        >
                                            <RefreshCw size={16} strokeWidth={2.5} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={updatingPassword || !masterPassword}
                                className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-200 text-white rounded-2xl py-4 font-bold transition-all shadow-lg shadow-slate-900/10 hover:shadow-blue-600/20 flex items-center justify-center gap-2 group text-sm"
                            >
                                {updatingPassword ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        Update Master Password
                                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" strokeWidth={3} />
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}
