"use client";

import { motion } from "framer-motion";

interface BehavioralBiasProps {
    totalTrades?: number;
    buyCount?: number;
    sellCount?: number;
}

export default function BehavioralBias({ totalTrades = 0, buyCount = 0, sellCount = 0 }: BehavioralBiasProps) {
    const buyPercentage = totalTrades > 0 ? Math.round((buyCount / totalTrades) * 100) : 65;
    const sellPercentage = 100 - buyPercentage;

    return (
        <div className="bg-[#06000a] border-[0.5px] border-[#e5e5e580] rounded-3xl p-6 relative overflow-hidden flex flex-col h-full min-h-[360px] group">
            {/* Header */}
            <div className="flex items-center justify-between mb-auto relative z-20 w-full">
                <h3 className="text-[#e5e5e5] text-[18px] font-semibold tracking-[-0.5px]">
                    Behavioral Bias
                </h3>
                <div className="bg-[#1a1a1a] px-[10px] py-[4px] rounded-[5px] border border-white/5">
                    <span className="text-[#808080] text-[11px] font-semibold tracking-[-0.2px]">Trades: {totalTrades}</span>
                </div>
            </div>

            <div className="flex flex-col gap-[12px] relative z-20">
                {/* Buy Card */}
                <div className="bg-gradient-to-br from-[#052b21] to-[#06000a] border border-[#04d97c30] rounded-[16px] p-[20px] flex justify-between items-start">
                    <div className="flex flex-col gap-1">
                        <span className="text-[#e5e5e5] text-[18px] font-medium">Buy</span>
                        <span className="text-[#808080] text-[14px]">Buy Trades</span>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <span className="text-[#04d97c] text-[28px] font-bold leading-none">{buyPercentage}%</span>
                        <span className="text-[#808080] text-[14px]">Buy Trades</span>
                    </div>
                </div>

                {/* Custom Slider / Progress */}
                <div className="relative w-full h-[12px] flex items-center">
                    <div className="absolute inset-0 bg-white/5 rounded-full" />
                    <div className="absolute inset-0 flex rounded-full overflow-hidden">
                        <div className="h-full bg-[#ff5666]" style={{ width: `${sellPercentage}%` }} />
                        <div className="h-full bg-[#04d97c]" style={{ width: `${buyPercentage}%` }} />
                    </div>
                    {/* White Slider Thumb - Acts as the divider */}
                    <motion.div 
                        initial={{ left: `${sellPercentage}%` }}
                        animate={{ left: `${sellPercentage}%` }}
                        className="absolute w-[18px] h-[18px] bg-white rounded-full shadow-[0_0_15px_white] -translate-x-1/2 z-30 flex items-center justify-center"
                    >
                         <div className="w-[8px] h-[8px] bg-gray-200 rounded-full" />
                    </motion.div>
                </div>

                {/* Sell Card */}
                <div className="bg-gradient-to-br from-[#2d0a0e] to-[#06000a] border border-[#ff566630] rounded-[16px] p-[20px] flex justify-between items-start">
                    <div className="flex flex-col gap-1 text-left">
                        <span className="text-[#ff5666] text-[28px] font-bold leading-none">{sellPercentage}%</span>
                        <span className="text-[#808080] text-[14px]">Sell Trades</span>
                    </div>
                    <div className="flex flex-col items-end gap-1 text-right">
                        <span className="text-[#e5e5e5] text-[18px] font-medium">Sell</span>
                        <span className="text-[#808080] text-[14px]">Sell Trades</span>
                    </div>
                </div>
            </div>

            {/* Background Glows */}
            <div className="absolute top-[-50px] left-[-50px] w-[200px] h-[200px] bg-[#04d97c08] rounded-full blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-50px] right-[-50px] w-[200px] h-[200px] bg-[#ff566608] rounded-full blur-[80px] pointer-events-none" />
        </div>
    );
}
