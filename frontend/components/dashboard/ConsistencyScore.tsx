"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Award } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { fetchFromBackend } from "@/lib/backend-api";

interface ConsistencyData {
    consistencyScore: number;
    isPayoutEligible: boolean;
    totalProfit: number;
    largestTrade: number;
    totalWinningTrades: number;
    threshold: number;
    accountType?: string;
    isInstantFunding?: boolean;
}

export default function ConsistencyScore() {
    const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
    const [data, setData] = useState<ConsistencyData | null>(null);
    const loading = dashboardLoading.global;

    useEffect(() => {
        if (dashboardData.consistency) {
            const c = dashboardData.consistency;
            setData({
                consistencyScore: c?.score || 0,
                isPayoutEligible: c?.eligible || false,
                totalProfit: dashboardData.stats?.avg_win || 0,
                largestTrade: dashboardData.stats?.largest_win || 0,
                totalWinningTrades: 0,
                threshold: 15,
                accountType: undefined,
                isInstantFunding: false,
            });
        }
    }, [dashboardData.consistency]);

    const fetchConsistencyData = async () => {
        // No longer needed independently
    };

    if (loading) {
        return (
            <div className="bg-[#050923] border border-gray-700 rounded-2xl p-6 animate-pulse">
                <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
                <div className="h-20 bg-gray-800 rounded"></div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#050923] border border-gray-700 rounded-2xl p-6"
        >
            {/* Header */}
            <div className="mb-6">
                <h3 className="flex items-center gap-2 font-bold text-white text-lg">
                    <Award size={20} className="text-blue-400" />
                    Consistency Score
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                    Largest Single Trade / Total Profit
                </p>
            </div>

            {/* Main Score Display - Simple */}
            <div className="relative overflow-hidden rounded-xl p-8 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700/50">
                <div className="relative z-10 text-center">
                    <div className="text-6xl font-black text-white">
                        {data.consistencyScore === -1 ? "Net Error" : data.consistencyScore === -2 ? `API Error: ${data.accountType || '?'}` : `${data.consistencyScore.toFixed(2)}%`}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
