"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award, TrendingUp, CheckCircle2, Target, DollarSign } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAccount } from "@/contexts/AccountContext";

interface ConsistencyData {
    latestTradePercentage: number;
    cumulativeProfit: number;
    totalWinningTrades: number;
    hasRecentViolation: boolean;
    consistencyScore: number;
    averageWinPercentage: number;
}

export default function ConsistencyScore() {
    const [data, setData] = useState<ConsistencyData | null>(null);
    const [loading, setLoading] = useState(true);
    const { selectedAccount } = useAccount();

    useEffect(() => {
        fetchConsistencyData();
    }, [selectedAccount]); // Refetch when selected account changes

    const fetchConsistencyData = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || !selectedAccount) {
                setData({
                    latestTradePercentage: 0,
                    cumulativeProfit: 0,
                    totalWinningTrades: 0,
                    hasRecentViolation: false,
                    consistencyScore: 100,
                    averageWinPercentage: 0,
                });
                setLoading(false);
                return;
            }

            // Filter by the selected account's challenge_id
            const { data: snapshot, error } = await supabase
                .from('trade_consistency_snapshot')
                .select('*')
                .eq('challenge_id', selectedAccount.challenge_id)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('Error fetching consistency data:', error);
                setData({
                    latestTradePercentage: 0,
                    cumulativeProfit: 0,
                    totalWinningTrades: 0,
                    hasRecentViolation: false,
                    consistencyScore: 100,
                    averageWinPercentage: 0,
                });
                setLoading(false);
                return;
            }

            if (!snapshot || snapshot.length === 0) {
                setData({
                    latestTradePercentage: 0,
                    cumulativeProfit: 0,
                    totalWinningTrades: 0,
                    hasRecentViolation: false,
                    consistencyScore: 100,
                    averageWinPercentage: 0,
                });
                setLoading(false);
                return;
            }

            const latest = snapshot[0];
            const violations = snapshot.filter(s => s.is_violation).length;
            const avgPercentage = snapshot.reduce((sum, s) => sum + s.trade_percentage, 0) / snapshot.length;
            const variance = snapshot.reduce((sum, s) => sum + Math.pow(s.trade_percentage - avgPercentage, 2), 0) / snapshot.length;
            const variancePenalty = Math.min(Math.sqrt(variance), 30);
            const consistencyScore = Math.max(0, 100 - (violations * 10) - variancePenalty);

            setData({
                latestTradePercentage: latest.trade_percentage,
                cumulativeProfit: latest.cumulative_profit,
                totalWinningTrades: latest.total_winning_trades,
                hasRecentViolation: latest.is_violation,
                consistencyScore: Math.round(consistencyScore),
                averageWinPercentage: Math.round(avgPercentage * 10) / 10,
            });
        } catch (error) {
            console.error('Error calculating consistency:', error);
            setData({
                latestTradePercentage: 0,
                cumulativeProfit: 0,
                totalWinningTrades: 0,
                hasRecentViolation: false,
                consistencyScore: 100,
                averageWinPercentage: 0,
            });
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-gray-800 rounded"></div>
            </div>
        );
    }

    if (!data) return null;

    const getScoreColor = (score: number) => {
        if (score >= 80) return "text-emerald-400";
        if (score >= 60) return "text-blue-400";
        if (score >= 40) return "text-yellow-400";
        return "text-red-400";
    };

    const getScoreGradient = (score: number) => {
        if (score >= 80) return "from-emerald-500/20 to-emerald-500/0";
        if (score >= 60) return "from-blue-500/20 to-blue-500/0";
        if (score >= 40) return "from-yellow-500/20 to-yellow-500/0";
        return "from-red-500/20 to-red-500/0";
    };

    const getScoreStatus = (score: number) => {
        if (score >= 80) return "Excellent";
        if (score >= 60) return "Good";
        if (score >= 40) return "Fair";
        return "Needs Improvement";
    };

    const getProgressColor = (score: number) => {
        if (score >= 80) return 'from-emerald-500 to-emerald-400';
        if (score >= 60) return 'from-blue-500 to-blue-400';
        if (score >= 40) return 'from-yellow-500 to-yellow-400';
        return 'from-red-500 to-red-400';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl overflow-hidden"
        >
            {/* Header */}
            <div className="p-6 border-b border-gray-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <Award className="text-blue-400" size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-white">Consistency Score</h3>
                            <p className="text-xs text-gray-400">Lifetime profit distribution</p>
                        </div>
                    </div>
                    {data.hasRecentViolation && (
                        <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <span className="text-xs text-red-400 font-medium">Violation</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Score Display */}
            <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-baseline gap-2">
                        <span className={`text-5xl font-bold ${getScoreColor(data.consistencyScore)}`}>
                            {data.consistencyScore}
                        </span>
                        <span className="text-gray-400 text-xl font-medium">/100</span>
                    </div>
                    <div className={`px-4 py-2 rounded-lg bg-gradient-to-r ${getScoreGradient(data.consistencyScore)} border border-gray-700`}>
                        <span className={`text-sm font-bold ${getScoreColor(data.consistencyScore)}`}>
                            {getScoreStatus(data.consistencyScore)}
                        </span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden mb-6">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${data.consistencyScore}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full bg-gradient-to-r ${getProgressColor(data.consistencyScore)}`}
                    />
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Target size={16} className="text-blue-400" />
                            <p className="text-xs text-gray-400 font-medium">Avg Trade Size</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{data.averageWinPercentage}%</p>
                        <p className="text-[10px] text-gray-500 mt-1">of total profit</p>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={16} className="text-green-400" />
                            <p className="text-xs text-gray-400 font-medium">Latest Trade</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{data.latestTradePercentage.toFixed(1)}%</p>
                        <p className="text-[10px] text-gray-500 mt-1">of cumulative</p>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <TrendingUp size={16} className="text-emerald-400" />
                            <p className="text-xs text-gray-400 font-medium">Winning Trades</p>
                        </div>
                        <p className="text-2xl font-bold text-white">{data.totalWinningTrades}</p>
                        <p className="text-[10px] text-gray-500 mt-1">total wins</p>
                    </div>

                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                            <DollarSign size={16} className="text-blue-400" />
                            <p className="text-xs text-gray-400 font-medium">Total Profit</p>
                        </div>
                        <p className="text-2xl font-bold text-white">${data.cumulativeProfit.toFixed(0)}</p>
                        <p className="text-[10px] text-gray-500 mt-1">cumulative</p>
                    </div>
                </div>
            </div>

            {/* Info Footer */}
            <div className="px-6 pb-6">
                <div className="p-4 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                    <p className="text-xs text-gray-400 leading-relaxed">
                        Consistency score measures how evenly profits are distributed. Higher scores indicate balanced trading without relying on single large wins.
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
