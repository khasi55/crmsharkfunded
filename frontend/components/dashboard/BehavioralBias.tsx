"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { fetchFromBackend } from "@/lib/backend-api";
import { cn } from "@/lib/utils";

interface Trade {
    id: string;
    type: 'buy' | 'sell';
}

export default function BehavioralBias() {
    const { selectedAccount } = useAccount();
    const [stats, setStats] = useState({
        total: 0,
        bullish: 0,
        bearish: 0,
        bullishPercent: 50,
        bearishPercent: 50
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (selectedAccount) {
            fetchTrades();
        }
    }, [selectedAccount]);

    const fetchTrades = async () => {
        try {
            if (!selectedAccount) return;
            const data = await fetchFromBackend(`/api/dashboard/trades/analysis?accountId=${selectedAccount.id}`);
            const trades: Trade[] = data.trades || [];

            const total = trades.length;
            if (total === 0) {
                setStats({ total: 0, bullish: 0, bearish: 0, bullishPercent: 50, bearishPercent: 50 });
            } else {
                const bullish = trades.filter(t => String(t.type).toLowerCase().includes('buy') || String(t.type) === '0').length;
                const bearish = trades.filter(t => String(t.type).toLowerCase().includes('sell') || String(t.type) === '1').length;

                setStats({
                    total,
                    bullish,
                    bearish,
                    bullishPercent: (bullish / total) * 100,
                    bearishPercent: (bearish / total) * 100
                });
            }
        } catch (error) {
            console.error('Error fetching trades for bias:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-full bg-[#050923]/50 animate-pulse rounded-2xl" />;

    const bias = stats.bullishPercent >= stats.bearishPercent ? 'Bullish' : 'Bearish';
    const biasColor = bias === 'Bullish' ? 'text-green-500' : 'text-red-500';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#050923] border border-white/10 rounded-2xl p-6 flex flex-col justify-between h-full relative overflow-hidden"
        >
            {/* Header */}
            <div className="flex justify-between items-start z-10">
                <h3 className="text-lg font-bold text-white">Behavioral Bias</h3>
                <span className="text-xs font-bold text-gray-500 bg-white/5 px-2 py-1 rounded">Trades: {stats.total}</span>
            </div>

            {/* Content */}
            <div className="flex flex-col items-center justify-center gap-6 z-10 my-4">

                {/* Icons */}
                <div className="flex items-center gap-8 w-full justify-center">
                    <div className="flex flex-col items-center gap-2">
                        <div className={cn("p-3 rounded-xl bg-red-500/10 border border-red-500/20 transition-all", bias === 'Bearish' && "bg-red-500/20 border-red-500/50 shadow-lg shadow-red-500/20")}>
                            <TrendingDown className={cn("text-red-500", bias === 'Bearish' ? "w-6 h-6" : "w-5 h-5 opacity-50")} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bearish</span>
                    </div>

                    <div className="text-center">
                        <div className={cn("text-2xl font-black tracking-tight mb-0.5", biasColor)}>
                            {bias}
                        </div>
                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Market Bias</div>
                    </div>

                    <div className="flex flex-col items-center gap-2">
                        <div className={cn("p-3 rounded-xl bg-green-500/10 border border-green-500/20 transition-all", bias === 'Bullish' && "bg-green-500/20 border-green-500/50 shadow-lg shadow-green-500/20")}>
                            <TrendingUp className={cn("text-green-500", bias === 'Bullish' ? "w-6 h-6" : "w-5 h-5 opacity-50")} />
                        </div>
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bullish</span>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full space-y-2">
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden flex relative">
                        {/* Bearish Bar (Left, Red) */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.bearishPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-red-500 relative"
                        >
                            {/* Glow */}
                            <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/20 blur-[2px]"></div>
                        </motion.div>

                        {/* Separator */}
                        <div className="w-0.5 h-full bg-[#050923] z-10"></div>

                        {/* Bullish Bar (Right, Green) */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${stats.bullishPercent}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-green-500 relative"
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-2 bg-white/20 blur-[2px]"></div>
                        </motion.div>
                    </div>

                    <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-white">{Math.round(stats.bearishPercent)}% <span className="text-gray-500 ml-1">SELL TRADES</span> <span className="text-red-500 font-bold ml-1">●</span></span>
                        <span className="text-white"><span className="text-green-500 font-bold mr-1">●</span> <span className="text-gray-500 mr-1">BUY TRADES</span> {Math.round(stats.bullishPercent)}%</span>
                    </div>
                </div>
            </div>

            {/* Background Glow */}
            <div className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 blur-[80px] rounded-full pointer-events-none opacity-20", bias === 'Bullish' ? "bg-green-500" : "bg-red-500")}></div>
        </motion.div>
    );
}
