"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";

interface BehavioralBiasProps {
    totalTrades?: number;
    buyCount?: number;
    sellCount?: number;
}

export default function BehavioralBias({ totalTrades = 0, buyCount = 0, sellCount = 0 }: BehavioralBiasProps) {
    const buyPercentage = totalTrades > 0 ? Math.round((buyCount / totalTrades) * 100) : 0;
    const sellPercentage = totalTrades > 0 ? 100 - buyPercentage : 0;

    // Determine bias text
    let biasText = "Neutral";
    if (buyPercentage > 60) biasText = "Bullish";
    if (sellPercentage > 60) biasText = "Bearish";

    return (
        <div className="flex flex-col h-full justify-between pb-2 bg-[#050923] rounded-2xl border border-white/5 p-6 relative overflow-hidden group">
            <h3 className="text-white font-medium text-lg relative z-10 flex justify-between items-center mb-6">
                Behavioral Bias
                <span className="text-xs font-medium text-gray-500 bg-white/5 py-1 px-3 rounded-full border border-white/5">Trades: {totalTrades}</span>
            </h3>

            {/* Main Visual */}
            <div className="flex items-center justify-between px-4 mt-2 mb-8 relative">

                {/* Connection Line */}
                <div className="absolute left-[3rem] right-[3rem] top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-red-500/20 via-gray-700 to-green-500/20" />

                {/* Bear/Sell Side */}
                <div className="flex flex-col items-center gap-3 relative z-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-14 h-14 rounded-2xl bg-[#0a0f1c] flex items-center justify-center border border-red-500/20 shadow-[0_4px_20px_-4px_rgba(239,68,68,0.3)] hover:shadow-[0_4px_25px_-2px_rgba(239,68,68,0.5)] transition-shadow duration-500"
                    >
                        <TrendingDown className="w-6 h-6 text-red-500" strokeWidth={2.5} />
                    </motion.div>
                    <span className="text-xs font-semibold text-gray-400">BEARISH</span>
                </div>

                {/* Center Bias Text */}
                <div className="flex flex-col items-center bg-[#0a0f1c] border border-white/5 px-6 py-3 rounded-2xl relative z-20 shadow-xl">
                    <span className={`text-xl font-bold tracking-tight ${biasText === 'Bullish' ? 'text-green-400' : biasText === 'Bearish' ? 'text-red-400' : 'text-gray-200'}`}>
                        {biasText}
                    </span>
                    <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold mt-1">Market Bias</span>
                </div>

                {/* Bull/Buy Side */}
                <div className="flex flex-col items-center gap-3 relative z-10">
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="w-14 h-14 rounded-2xl bg-[#0a0f1c] flex items-center justify-center border border-green-500/20 shadow-[0_4px_20px_-4px_rgba(34,197,94,0.3)] hover:shadow-[0_4px_25px_-2px_rgba(34,197,94,0.5)] transition-shadow duration-500"
                    >
                        <TrendingUp className="w-6 h-6 text-green-500" strokeWidth={2.5} />
                    </motion.div>
                    <span className="text-xs font-semibold text-gray-400">BULLISH</span>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-4 mt-auto">
                <div className="h-3 w-full bg-[#0a0f1c] rounded-full overflow-hidden flex relative ring-1 ring-white/5 p-0.5">
                    <div className="w-full h-full rounded-full overflow-hidden flex relative">
                        {/* Sell Bar */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${sellPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-gradient-to-r from-red-600 to-red-500 relative"
                        />

                        {/* Buy Bar */}
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${buyPercentage}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            className="h-full bg-gradient-to-l from-green-600 to-green-500 relative ml-auto"
                        />
                    </div>

                    {/* Divider */}
                    <div className="absolute top-0 bottom-0 left-[50%] w-[1px] bg-white/10 z-20" />
                </div>

                <div className="flex justify-between px-1">
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-200">{sellPercentage}%</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="w-2 h-2 rounded-full bg-red-500" />
                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Sell Trades</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-sm font-bold text-gray-200">{buyPercentage}%</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wide">Buy Trades</span>
                            <div className="w-2 h-2 rounded-full bg-green-500" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
