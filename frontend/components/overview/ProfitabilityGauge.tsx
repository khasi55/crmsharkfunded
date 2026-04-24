"use client";

import { motion } from "framer-motion";

interface ProfitabilityGaugeProps {
    winRate?: number;
    tradesTaken?: number;
    wonPct?: number;
    lostPct?: number;
    wonCount?: number;
    lostCount?: number;
    avgHolding?: string;
}

export default function ProfitabilityGauge({
    winRate = 0,
    tradesTaken = 0,
    wonPct = 0,
    lostPct = 0,
    wonCount = 0,
    lostCount = 0,
    avgHolding = "0m"
}: ProfitabilityGaugeProps) {
    // Default to demo data if zeros
    const displayTrades = tradesTaken;
    const displayWonPct = wonPct ? Number(wonPct.toFixed(1)) : 0;
    const displayLostPct = lostPct ? Number(lostPct.toFixed(1)) : 0;
    const displayWonCount = wonCount;
    const displayLostCount = lostCount;
    // Fix: winRate might be "100.0", convert properly
    const displayWinRate = winRate !== undefined ? Number(winRate).toFixed(1) : "0.0";
    const avgHoldingPeriod = avgHolding || "0m";

    const colors = { left: "#ef4444", right: "#22c55e" };

    return (
        <div className="bg-[#050923] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-full relative overflow-hidden group hover:border-white/10 transition-colors">
            <div className="flex justify-between items-start relative z-10 mb-4 px-2">
                <h3 className="text-white font-medium text-lg">Profitability</h3>
                <div className="text-right flex flex-col items-end">
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider bg-white/5 px-2 py-0.5 rounded-md mb-0.5">Avg Holding</span>
                    <span className="text-white font-bold text-sm">{avgHoldingPeriod}</span>
                </div>
            </div>

            <div className="flex items-start justify-between mt-4 px-4 pb-4">
                {/* Left Stats */}
                <div className="text-left flex flex-col gap-1 pt-6">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Won</p>
                    <div className="flex items-baseline gap-1">
                        <p className="text-2xl font-bold text-green-400">{displayWonPct}%</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        <p className="text-gray-400 text-xs font-medium">{displayWonCount} Trades</p>
                    </div>
                </div>

                {/* Gauge */}
                <div className="relative w-[200px] h-[110px] flex items-center justify-center">
                    <svg width="200" height="100" viewBox="0 0 200 100" className="overflow-visible">
                        {/* Glow Filter */}
                        <defs>
                            <filter id="glow-green" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* Track Background */}
                        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" opacity="0.5" />

                        {/* Data Segments with Overlay Logic */}
                        {(() => {
                            const r = 80;
                            const cx = 100;
                            const cy = 90;

                            // Calculate angles (in radians)
                            // Start = PI (Left), End = 0 (Right)
                            const startAngle = Math.PI;
                            const endAngle = 0;

                            // Calculate Split Angle based on Win %
                            const pct = Math.min(Math.max(displayWonPct / 100, 0), 1);
                            const splitAngle = Math.PI * (1 - pct);

                            // Helper to get coordinates
                            const getCoords = (angle: number) => {
                                const clamped = Math.max(0, Math.min(Math.PI, angle));
                                return {
                                    x: cx + r * Math.cos(clamped),
                                    y: cy - r * Math.sin(clamped)
                                };
                            };

                            const startCoords = getCoords(startAngle); // PI
                            const splitCoords = getCoords(splitAngle);
                            const endCoords = getCoords(endAngle); // 0

                            // Only render arcs if we have trades
                            if (tradesTaken === 0) return null;

                            return (
                                <>
                                    {/* Red Arc (Losses - Right Side) - Background Layer */}
                                    {/* Drawn first so Green can overlap it */}
                                    {pct < 0.999 && (
                                        <motion.path
                                            d={`M ${splitCoords.x} ${splitCoords.y} A ${r} ${r} 0 0 1 ${endCoords.x} ${endCoords.y}`}
                                            fill="none"
                                            stroke={colors.left} // Red
                                            strokeWidth="8"
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                                            opacity="0.8"
                                        />
                                    )}

                                    {/* Green Arc (Wins - Left Side) - Foreground Layer */}
                                    {/* Drawn second to sit on top. Larger stroke width hides Red's start cap */}
                                    {pct > 0.001 && (
                                        <motion.path
                                            d={`M ${startCoords.x} ${startCoords.y} A ${r} ${r} 0 0 1 ${splitCoords.x} ${splitCoords.y}`}
                                            fill="none"
                                            stroke={colors.right} // Green
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            initial={{ pathLength: 0 }}
                                            animate={{ pathLength: 1 }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            filter="url(#glow-green)"
                                        />
                                    )}
                                </>
                            );
                        })()}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pt-4">
                        <p className="text-gray-500 text-[9px] font-bold uppercase tracking-widest mb-1">Win Rate</p>
                        <p className="text-3xl font-black text-white tracking-tight">{displayWinRate}%</p>
                        <p className="text-[#64748b] text-[10px] font-medium mt-1 bg-[#1e293b] px-2 py-0.5 rounded-full">{displayTrades} Trades</p>
                    </div>
                </div>

                {/* Right Stats */}
                <div className="text-right flex flex-col gap-1 pt-6">
                    <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Lost</p>
                    <div className="flex items-baseline justify-end gap-1">
                        <p className="text-2xl font-bold text-red-400">{displayLostPct}%</p>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                        <p className="text-gray-400 text-xs font-medium">{displayLostCount} Trades</p>
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    </div>
                </div>
            </div>
        </div>
    );
}
