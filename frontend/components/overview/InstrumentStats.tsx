"use client";

import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

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
    const defaultInstruments: InstrumentData[] = [
        { symbol: "XAUUSD", wins: 12, losses: 4, total: 16 },
        { symbol: "US30", wins: 8, losses: 5, total: 13 },
        { symbol: "GBPUSD", wins: 6, losses: 2, total: 8 },
    ];

    const displayInstruments = instruments.length > 0 ? instruments : defaultInstruments;
    const totalTrades = displayInstruments.reduce((acc, item) => acc + item.total, 0);

    return (
        <div className="bg-[#06000a] border-[0.5px] border-[#e5e5e580] rounded-[32px] p-8 flex flex-col h-[656px] relative overflow-hidden group">
            {/* Header */}
            <div className="flex items-center justify-between mb-10 relative z-10 w-full">
                <h3 className="text-[#e5e5e5] text-[24px] font-semibold tracking-[-0.72px]">
                    Most Traded Instruments
                </h3>
                <div className="bg-[#1a1a1a] px-[12px] py-[6px] rounded-[5px] border border-white/5">
                    <span className="text-[#808080] text-[12px] font-semibold tracking-[-0.42px]">
                        Trades: {totalTrades}
                    </span>
                </div>
            </div>

            <div className="flex flex-col gap-[36px] relative z-10">
                {displayInstruments.map((item, i) => {
                    const winPct = (item.wins / item.total) * 100;

                    return (
                        <div key={item.symbol} className="flex flex-col gap-[10px]">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-[12px]">
                                    <BarChart3 className="w-[16px] h-[16px] text-[#e5e5e5] opacity-80" />
                                    <span className="text-[#e5e5e5] text-[15px] font-semibold tracking-tight bg-[#1a1a1a] px-3 py-1 rounded-md border border-white/5 uppercase">
                                        {item.symbol}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-green-400 text-[13px] font-bold">W: {item.wins}</span>
                                    <span className="text-red-400 text-[13px] font-bold">L: {item.losses}</span>
                                </div>
                            </div>

                            {/* High-Fidelity Multi-Segment Bar */}
                            <div className="relative w-full h-[10px] bg-[#1a1a1a] rounded-full overflow-hidden flex ring-1 ring-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${winPct}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 }}
                                    className="h-full bg-gradient-to-r from-green-600 to-green-500 relative shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                                >
                                    <div className="absolute inset-0 bg-white/5 blur-[1px]" />
                                </motion.div>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${100 - winPct}%` }}
                                    transition={{ duration: 1, delay: i * 0.1 + 0.2 }}
                                    className="h-full bg-gradient-to-r from-red-600 to-red-500 relative ml-[1px] shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                >
                                    <div className="absolute inset-0 bg-white/5 blur-[1px]" />
                                </motion.div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Background decorative glows matching overview theme */}
            <div className="absolute -bottom-20 -right-20 w-[300px] h-[300px] bg-green-500/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />
        </div>
    );
}
