"use client";

import { motion } from "framer-motion";

interface InstrumentData {
    symbol: string;
    wins: number;
    losses: number;
    total: number;
}

interface InstrumentStatsProps {
    instruments?: InstrumentData[];
}

export default function InstrumentStats({ instruments = [] }: InstrumentStatsProps) {
    return (
        <div className="flex flex-col h-full bg-[#121826]/30 rounded-2xl border border-white/5 p-2">
            <h3 className="text-white font-medium text-lg relative z-10 mb-6 px-2 flex justify-between items-center">
                Most Traded Instruments
                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-0.5 rounded uppercase font-bold tracking-wider">Top 3</span>
            </h3>

            <div className="flex flex-col gap-5 px-2">
                {instruments.map((item, i) => {
                    const total = item.wins + item.losses;
                    const winPct = (item.wins / total) * 100;
                    const lossPct = 100 - winPct;

                    return (
                        <div key={item.symbol} className="flex flex-col gap-2.5">
                            <div className="flex justify-between items-end">
                                <span className="text-xs font-bold text-gray-200 tracking-wide bg-[#0a0f1c] px-2 py-0.5 rounded border border-white/5">{item.symbol}</span>
                                <div className="flex items-center gap-2 text-[10px] font-medium">
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                        <span className="text-gray-400">{item.wins}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        <span className="text-gray-400">{item.losses}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2.5 w-full bg-[#0a0f1c] rounded-full overflow-hidden flex relative ring-1 ring-white/5 p-[1px]">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${winPct}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                    className="h-full bg-gradient-to-r from-green-600 to-green-500 relative rounded-l-full"
                                />
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${lossPct}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 + 0.2 }}
                                    className="h-full bg-gradient-to-l from-red-600 to-red-500 relative rounded-r-full ml-[1px]"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
