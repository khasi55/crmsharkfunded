"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users, DollarSign, TrendingUp, Copy, Check, ExternalLink,
    Gift, Wallet, ArrowUpRight, X, ChevronRight, CreditCard,
    Building2, LayoutDashboard, History, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFromBackend } from "@/lib/backend-api";

// --- Types ---

interface AffiliateStat {
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    availableBalance: number;
    withdrawnAmount: number;
    pendingEarnings: number;
    conversionRate: number;
}

interface Earning {
    id: string;
    amount: number;
    description: string;
    created_at: string;
    referred_user_name?: string;
    status?: string;
    type?: 'earning' | 'withdrawal';
}

interface Withdrawal {
    id: string;
    amount: number;
    status: string;
    payout_method: string;
    created_at: string;
    rejection_reason?: string;
}

// --- Components ---

const StatCard = ({
    title,
    value,
    subValue,
    icon: Icon,
    colorClass,
    delay
}: {
    title: string,
    value: string | number,
    subValue: string,
    icon: any,
    colorClass: string,
    delay: number
}) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.4 }}
        className="relative group overflow-hidden rounded-2xl border border-white/10 bg-[#050923] p-6 hover:border-white/20 transition-all duration-300"
    >
        <div className={cn("absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-300 pointer-events-none")}>
            <Icon size={120} />
        </div>

        <div className="flex items-center gap-4 mb-4">
            <div className={cn("p-3 rounded-xl bg-opacity-10 backdrop-blur-sm", colorClass)}>
                <Icon size={24} className="opacity-90" />
            </div>
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
        </div>

        <div className="space-y-1">
            <div className="text-3xl font-bold text-white tracking-tight">{value}</div>
            <div className="text-sm text-gray-500 font-medium flex items-center gap-1.5">
                {subValue}
            </div>
        </div>
    </motion.div>
);

const TabButton = ({ active, label, onClick }: { active: boolean, label: string, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={cn(
            "relative px-6 py-3 text-sm font-medium transition-all duration-300",
            active ? "text-white" : "text-gray-500 hover:text-gray-300"
        )}
    >
        {label}
        {active && (
            <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"
            />
        )}
    </button>
);

// --- Main Page Component ---

export default function AffiliatePage() {
    const [stats, setStats] = useState<AffiliateStat>({
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        availableBalance: 0,
        withdrawnAmount: 0,
        pendingEarnings: 0,
        conversionRate: 0,
    });
    const [earnings, setEarnings] = useState<Earning[]>([]);
    const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
    const [referralCode, setReferralCode] = useState("LOADING...");
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'earnings' | 'withdrawals'>('earnings');

    // Copy States
    const [codeCopied, setCodeCopied] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);

    // Withdraw Modal
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawMethod, setWithdrawMethod] = useState("crypto");
    const [withdrawDetails, setWithdrawDetails] = useState("");
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [withdrawError, setWithdrawError] = useState("");
    const [withdrawSuccess, setWithdrawSuccess] = useState("");

    useEffect(() => {
        fetchAffiliateData();
    }, []);

    const fetchAffiliateData = async () => {
        try {
            const data = await fetchFromBackend('/api/affiliate/stats');

            if (data.affiliate) {
                setReferralCode(data.affiliate.referralCode || 'DEMO');
                setStats({
                    totalReferrals: data.affiliate.totalReferrals || 0,
                    activeReferrals: data.affiliate.activeReferrals || 0,
                    totalEarnings: Number(data.affiliate.totalEarnings) || 0,
                    availableBalance: Number(data.affiliate.availableBalance) || 0,
                    withdrawnAmount: Number(data.affiliate.withdrawnAmount) || 0,
                    pendingEarnings: Number(data.affiliate.pendingEarnings) || 0,
                    conversionRate: data.affiliate.conversionRate || 0,
                });
                setEarnings(data.affiliate.earnings || []);
                setWithdrawals(data.affiliate.withdrawals || []);
            }
        } catch (error) {
            console.error('Error fetching affiliate data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = (text: string, setCopiedState: (v: boolean) => void) => {
        navigator.clipboard.writeText(text);
        setCopiedState(true);
        setTimeout(() => setCopiedState(false), 2000);
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setWithdrawLoading(true);
        setWithdrawError("");
        setWithdrawSuccess("");

        try {
            const amount = parseFloat(withdrawAmount);
            if (isNaN(amount) || amount <= 0) throw new Error("Invalid amount");
            if (amount > stats.availableBalance) throw new Error("Insufficient balance");

            await fetchFromBackend('/api/affiliate/withdraw', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    payout_method: withdrawMethod,
                    payout_details: { address: withdrawDetails }
                })
            });

            setWithdrawSuccess("Withdrawal requested successfully!");
            setWithdrawAmount("");
            setWithdrawDetails("");

            // Refresh Data
            await fetchAffiliateData();
            setTimeout(() => {
                setShowWithdrawModal(false);
                setWithdrawSuccess("");
            }, 2000);

        } catch (err: any) {
            setWithdrawError(err.message || "Failed to request withdrawal");
        } finally {
            setWithdrawLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-transparent flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-500 h-10 w-10" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-slate-900 font-sans selection:bg-blue-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
            </div>

            <div className="relative max-w-7xl mx-auto px-6 py-12 md:py-20">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="space-y-4"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wide">
                            <Gift size={12} />
                            <span>Partner Program</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-black tracking-tight">
                            Affiliate <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Dashboard</span>
                        </h1>
                        <p className="text-black max-w-lg text-lg leading-relaxed font-medium">
                            Monitor your performance, track referrals, and withdraw your earnings directly to your preferred payment method.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <button
                            onClick={() => setShowWithdrawModal(true)}
                            disabled={stats.availableBalance <= 0}
                            className={cn(
                                "group relative inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl font-semibold text-white shadow-lg shadow-blue-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none overflow-hidden"
                            )}
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            <Wallet size={20} />
                            <span>Request Payout</span>
                            <ChevronRight size={16} className="opacity-50 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                    <StatCard
                        title="Available Balance"
                        value={`$${stats.availableBalance.toLocaleString()}`}
                        subValue="Ready to withdraw"
                        icon={Wallet}
                        colorClass="bg-emerald-500 text-emerald-400"
                        delay={0.2}
                    />
                    <StatCard
                        title="Total Earnings"
                        value={`$${stats.totalEarnings.toLocaleString()}`}
                        subValue="Lifetime commissions"
                        icon={DollarSign}
                        colorClass="bg-blue-500 text-blue-400"
                        delay={0.3}
                    />
                    <StatCard
                        title="Active Referrals"
                        value={stats.activeReferrals}
                        subValue={`${stats.totalReferrals} Total Signups`}
                        icon={Users}
                        colorClass="bg-indigo-500 text-indigo-400"
                        delay={0.4}
                    />
                    <StatCard
                        title="Withdrawn"
                        value={`$${stats.withdrawnAmount.toLocaleString()}`}
                        subValue={`$${stats.pendingEarnings.toLocaleString()} Pending`}
                        icon={ArrowUpRight}
                        colorClass="bg-purple-500 text-purple-400"
                        delay={0.5}
                    />
                </div>

                {/* Main Content Grid */}
                <div className="grid lg:grid-cols-3 gap-8">

                    {/* Left Col: Referral Tools */}
                    <div className="lg:col-span-1 space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-[#050923] border border-white/10 rounded-2xl p-6 backdrop-blur-xl"
                        >
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <Gift className="text-blue-400" size={20} />
                                Referral Tools
                            </h3>

                            {/* Code */}
                            <div className="space-y-4 mb-6">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Unique Code</label>
                                <div className="group relative bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between transition-colors hover:border-blue-500/50">
                                    <code className="font-mono text-xl font-bold text-blue-400 tracking-wide">{referralCode}</code>
                                    <button
                                        onClick={() => handleCopy(referralCode, setCodeCopied)}
                                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                                    >
                                        {codeCopied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Link */}
                            <div className="space-y-4">
                                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Share Link</label>
                                <div className="group bg-white/5 border border-white/10 rounded-xl p-1 pr-1 flex items-center transition-colors hover:border-blue-500/50">
                                    <div className="flex-1 px-4 py-3 text-sm text-gray-400 truncate font-mono">
                                        {`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralCode}`}
                                    </div>
                                    <button
                                        onClick={() => handleCopy(`${window.location.origin}/signup?ref=${referralCode}`, setLinkCopied)}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors text-white"
                                    >
                                        {linkCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Info */}
                            <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-sm text-blue-200/80 leading-relaxed">
                                Share your unique link with traders. You earn commissions when they purchase a challenge using your code.
                            </div>
                        </motion.div>

                        {/* Quick Tips or Account Manager Info could go here */}
                    </div>

                    {/* Right Col: Tables */}
                    <div className="lg:col-span-2">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="bg-[#050923] border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl min-h-[500px] flex flex-col"
                        >
                            {/* Tabs Header */}
                            <div className="flex items-center gap-2 border-b border-white/5 px-4 pt-2">
                                <TabButton
                                    active={activeTab === 'earnings'}
                                    label="Earnings History"
                                    onClick={() => setActiveTab('earnings')}
                                />
                                <TabButton
                                    active={activeTab === 'withdrawals'}
                                    label="Payouts History"
                                    onClick={() => setActiveTab('withdrawals')}
                                />
                            </div>

                            {/* Table Content */}
                            <div className="flex-1 overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-white/5 bg-white/5">
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                                            <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Description</th>
                                            <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                                            <th className="text-center px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {activeTab === 'earnings' ? (
                                            earnings.length > 0 ? (
                                                earnings.map((earning) => (
                                                    <tr key={earning.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                                                            {new Date(earning.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-200">
                                                            {earning.description}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-right font-medium text-emerald-400">
                                                            +${Number(earning.amount).toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400">
                                                                Paid
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-20 text-center text-gray-500">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <History className="opacity-20" size={40} />
                                                            <p>No earnings history yet.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        ) : (
                                            withdrawals.length > 0 ? (
                                                withdrawals.map((w) => (
                                                    <tr key={w.id} className="hover:bg-white/[0.02] transition-colors">
                                                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                                                            {new Date(w.created_at).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-gray-200 capitalize flex items-center gap-2">
                                                            {w.payout_method === 'crypto' ? <Wallet size={14} className="text-gray-500" /> : <Building2 size={14} className="text-gray-500" />}
                                                            {w.payout_method.replace('_', ' ')}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-right font-medium text-white">
                                                            ${w.amount.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 text-center">
                                                            <span className={cn(
                                                                "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize",
                                                                w.status === 'approved' || w.status === 'processed' ? "bg-emerald-500/10 text-emerald-400" :
                                                                    w.status === 'rejected' ? "bg-red-500/10 text-red-400" :
                                                                        "bg-yellow-500/10 text-yellow-500"
                                                            )}>
                                                                {w.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-20 text-center text-gray-500">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <CreditCard className="opacity-20" size={40} />
                                                            <p>No withdrawals yet.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Withdraw Modal */}
            <AnimatePresence>
                {showWithdrawModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-[#050923] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden"
                        >
                            {/* Modal Gradient Glow */}
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />

                            <div className="p-6 flex items-center justify-between">
                                <h3 className="text-lg font-bold text-white">Request Payout</h3>
                                <button
                                    onClick={() => setShowWithdrawModal(false)}
                                    className="text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleWithdraw} className="p-6 pt-2 space-y-5">
                                {/* Amount Input */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Amount</label>
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                            <DollarSign size={18} />
                                        </div>
                                        <input
                                            type="number"
                                            value={withdrawAmount}
                                            onChange={(e) => setWithdrawAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-mono text-lg placeholder:text-gray-600"
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500 px-1">
                                        <span>Min: $10.00</span>
                                        <span className="text-blue-400">Avail: ${stats.availableBalance.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Method */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Payout Method</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setWithdrawMethod('crypto')}
                                            className={cn(
                                                "p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2",
                                                withdrawMethod === 'crypto'
                                                    ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05]"
                                            )}
                                        >
                                            <Wallet size={20} />
                                            Crypto (USDT)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setWithdrawMethod('bank_transfer')}
                                            className={cn(
                                                "p-3 rounded-xl border text-sm font-medium transition-all flex flex-col items-center gap-2",
                                                withdrawMethod === 'bank_transfer'
                                                    ? "bg-blue-600/10 border-blue-500 text-blue-400"
                                                    : "bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05]"
                                            )}
                                        >
                                            <Building2 size={20} />
                                            Bank Transfer
                                        </button>
                                    </div>
                                </div>

                                {/* Details */}
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                                        {withdrawMethod === 'crypto' ? 'TRC20 Address' : 'Bank Details'}
                                    </label>
                                    <textarea
                                        value={withdrawDetails}
                                        onChange={(e) => setWithdrawDetails(e.target.value)}
                                        placeholder={withdrawMethod === 'crypto' ? 'Enter your USDT TRC20 wallet address' : 'Account Number, SWIFT, Name'}
                                        rows={3}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none text-sm placeholder:text-gray-600"
                                        required
                                    />
                                </div>

                                {/* Feedback */}
                                {(withdrawError || withdrawSuccess) && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className={cn(
                                            "p-3 rounded-lg text-sm text-center font-medium",
                                            withdrawError ? "bg-red-500/10 text-red-400 border border-red-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                        )}
                                    >
                                        {withdrawError || withdrawSuccess}
                                    </motion.div>
                                )}

                                <button
                                    type="submit"
                                    disabled={withdrawLoading || stats.availableBalance <= 0}
                                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {withdrawLoading ? (
                                        <>
                                            <Loader2 className="animate-spin" size={18} />
                                            Processing...
                                        </>
                                    ) : (
                                        "Confirm Withdrawal"
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
