"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, DollarSign, TrendingUp, Copy, Check, ExternalLink, Gift, Target, Award, BarChart3 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

interface AffiliateStat {
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
    conversionRate: number;
}

interface Earning {
    id: string;
    amount: number;
    description: string;
    created_at: string;
    referred_user_name?: string;
}

export default function AffiliatePage() {
    const [stats, setStats] = useState<AffiliateStat>({
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarnings: 0,
        pendingEarnings: 0,
        conversionRate: 0,
    });
    const [earnings, setEarnings] = useState<Earning[]>([]);
    const [referralCode, setReferralCode] = useState("");
    const [copied, setCopied] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAffiliateData();
    }, []);

    const fetchAffiliateData = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Fetch user profile with referral code
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('referral_code, total_commission, total_referrals')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    setReferralCode(profile.referral_code || '');

                    // Fetch earnings
                    const { data: earningsData } = await supabase
                        .from('affiliate_earnings')
                        .select('*')
                        .eq('referrer_id', user.id)
                        .order('created_at', { ascending: false })
                        .limit(10);

                    // Calculate stats
                    const totalEarnings = profile.total_commission || 0;
                    const totalReferrals = profile.total_referrals || 0;
                    const activeReferrals = earningsData?.length || 0;

                    setStats({
                        totalReferrals,
                        activeReferrals,
                        totalEarnings,
                        pendingEarnings: 0,
                        conversionRate: totalReferrals > 0 ? (activeReferrals / totalReferrals) * 100 : 0,
                    });

                    setEarnings(earningsData || []);
                }
            } else {
                // Demo data
                setReferralCode("DEMO123");
                setStats({
                    totalReferrals: 24,
                    activeReferrals: 18,
                    totalEarnings: 4580,
                    pendingEarnings: 320,
                    conversionRate: 75,
                });
                setEarnings([
                    { id: '1', amount: 150, description: 'Phase 1 Challenge Purchase', created_at: new Date().toISOString() },
                    { id: '2', amount: 200, description: 'Phase 2 Challenge Purchase', created_at: new Date().toISOString() },
                ]);
            }
        } catch (error) {
            console.error('Error fetching affiliate data:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyReferralLink = () => {
        const link = `${window.location.origin}/signup?ref=${referralCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyReferralCode = () => {
        navigator.clipboard.writeText(referralCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0E1A] text-white p-8">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-4xl font-bold text-white mb-2">Affiliate Program</h1>
                    <p className="text-gray-400">Earn commissions by referring traders to our platform</p>
                </motion.div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Users className="text-blue-400" size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-400">Total</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats.totalReferrals}</h3>
                        <p className="text-sm text-gray-400">Total Referrals</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-green-500/10 rounded-xl">
                                <Target className="text-green-400" size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-400">Active</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats.activeReferrals}</h3>
                        <p className="text-sm text-gray-400">Active Users</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl">
                                <DollarSign className="text-emerald-400" size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-400">Earned</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">${stats.totalEarnings.toLocaleString()}</h3>
                        <p className="text-sm text-gray-400">Total Earnings</p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700"
                    >
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-purple-500/10 rounded-xl">
                                <BarChart3 className="text-purple-400" size={24} />
                            </div>
                            <span className="text-xs font-medium text-gray-400">Rate</span>
                        </div>
                        <h3 className="text-3xl font-bold text-white mb-1">{stats.conversionRate.toFixed(1)}%</h3>
                        <p className="text-sm text-gray-400">Conversion Rate</p>
                    </motion.div>
                </div>

                {/* Referral Link Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-8 border border-gray-700 mb-8"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Gift className="text-blue-400" size={20} />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Your Referral Link</h2>
                    </div>

                    <div className="space-y-4">
                        {/* Referral Code */}
                        <div>
                            <label className="text-sm font-medium text-gray-400 mb-2 block">Referral Code</label>
                            <div className="flex gap-3">
                                <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 font-mono text-white">
                                    {referralCode}
                                </div>
                                <button
                                    onClick={copyReferralCode}
                                    className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-medium transition-all flex items-center gap-2"
                                >
                                    {copied ? <Check size={18} /> : <Copy size={18} />}
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>

                        {/* Referral URL */}
                        <div>
                            <label className="text-sm font-medium text-gray-400 mb-2 block">Referral Link</label>
                            <div className="flex gap-3">
                                <div className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-300 overflow-x-auto">
                                    {`${typeof window !== 'undefined' ? window.location.origin : ''}/signup?ref=${referralCode}`}
                                </div>
                                <button
                                    onClick={copyReferralLink}
                                    className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-medium transition-all flex items-center gap-2"
                                >
                                    {copied ? <Check size={18} /> : <ExternalLink size={18} />}
                                    {copied ? 'Copied!' : 'Share'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Commission Info */}
                    <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                        <p className="text-sm text-gray-300">
                            <span className="font-semibold text-blue-400">Earn 15% commission</span> on every challenge purchase made by your referrals.
                            Commission is paid instantly to your account balance.
                        </p>
                    </div>
                </motion.div>

                {/* Earnings History */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl border border-gray-700 overflow-hidden"
                >
                    <div className="p-6 border-b border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <Award className="text-emerald-400" size={20} />
                            </div>
                            <h2 className="text-2xl font-bold text-white">Recent Earnings</h2>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-900/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {earnings.length > 0 ? (
                                    earnings.map((earning) => (
                                        <tr key={earning.id} className="hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {new Date(earning.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-white">
                                                {earning.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-semibold text-emerald-400">
                                                +${earning.amount.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-12 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="p-4 bg-gray-800 rounded-full">
                                                    <DollarSign size={32} className="text-gray-600" />
                                                </div>
                                                <p className="text-gray-400">No earnings yet</p>
                                                <p className="text-sm text-gray-500">Start sharing your referral link to earn commissions</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>

                {/* How It Works */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6"
                >
                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
                        <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                            <span className="text-2xl font-bold text-blue-400">1</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Share Your Link</h3>
                        <p className="text-gray-400 text-sm">Share your unique referral link with traders who might be interested in our challenges.</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
                        <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center mb-4">
                            <span className="text-2xl font-bold text-green-400">2</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">They Sign Up</h3>
                        <p className="text-gray-400 text-sm">When someone signs up using your link and purchases a challenge, you earn a commission.</p>
                    </div>

                    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                            <span className="text-2xl font-bold text-emerald-400">3</span>
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">Earn Commission</h3>
                        <p className="text-gray-400 text-sm">Receive 15% commission instantly for every challenge purchase made by your referrals.</p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
