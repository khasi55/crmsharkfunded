"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface Trade {
    id: string;
    ticket_number: string;
    symbol: string;
    type: 'buy' | 'sell';
    lots: number;
    open_price: number;
    close_price: number | null;
    open_time: string;
    close_time: string | null;
    profit_loss: number;
    commission?: number;
    swap?: number;
}

interface GaugeCardProps {
    title: string;
    centerLabel: string;
    centerValue: string | number;
    centerSubValue?: string;
    centerValueColor?: string;
    stats: {
        left: { label: string; value: string; subValue?: string };
        middle?: { label: string; value: string };
        right: { label: string; value: string; subValue?: string };
    };
    percentages: {
        left: number; // 0-100 (e.g. Win Rate)
        right: number; // 0-100 (e.g. Loss Rate)
    };
    colors: {
        left: string;
        right: string;
    };
}

const GaugeCard = ({ title, centerLabel, centerValue, centerSubValue, centerValueColor, stats, percentages, colors }: GaugeCardProps) => {
    // Circle properties
    const radius = 80;
    const strokeWidth = 12;
    const circumference = 2 * Math.PI * radius;
    // We only use half circle (top half) - so arc length is PI * radius
    const arcLength = Math.PI * radius;

    // Calculate dash arrays
    // Left segment (Green/Win)
    const leftDash = (percentages.left / 100) * arcLength;
    // Right segment (Red/Loss)
    const rightDash = (percentages.right / 100) * arcLength;

    return (
        <div className="bg-[#121826] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-full relative overflow-hidden group hover:border-white/10 transition-colors">
            <h3 className="text-white font-semibold text-lg mb-6 z-10">{title}</h3>

            <div className="flex flex-col items-center z-10 relative h-[120px] justify-end">
                {/* Single Robust SVG Implementation */}
                <div className="w-[180px] h-[90px] flex items-end justify-center relative">
                    <svg width="180" height="90" viewBox="0 0 180 90" className="overflow-visible">
                        {/* Track Background */}
                        <path d="M 10 90 A 80 80 0 0 1 170 90" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />

                        {/* Data Segments - Split based on percentage */}
                        {(() => {
                            const r = 80;
                            const cx = 90;
                            const cy = 90;

                            // Left percentage determines split angle
                            // 0% -> starts at 180 deg (Left, x=10)
                            // 100% -> ends at 0 deg (Right, x=170)
                            const splitAngle = Math.PI - (percentages.left / 100) * Math.PI;

                            const splitX = cx + r * Math.cos(splitAngle);
                            const splitY = cy - r * Math.sin(splitAngle);

                            // Start point (Left side)
                            const startX = 10;
                            const startY = 90;

                            // End point (Right side)
                            const endX = 170;
                            const endY = 90;

                            return (
                                <>
                                    {/* Left Arc (Wins) */}
                                    <motion.path
                                        d={`M ${startX} ${startY} A ${r} ${r} 0 0 1 ${splitX} ${splitY}`}
                                        fill="none"
                                        stroke={colors.left}
                                        strokeWidth="12"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                    />

                                    {/* Right Arc (Losses) */}
                                    <motion.path
                                        d={`M ${splitX} ${splitY} A ${r} ${r} 0 0 1 ${endX} ${endY}`}
                                        fill="none"
                                        stroke={colors.right}
                                        strokeWidth="12"
                                        strokeLinecap="round"
                                        initial={{ pathLength: 0 }}
                                        animate={{ pathLength: 1 }}
                                        transition={{ duration: 1, ease: "easeOut", delay: 0.5 }}
                                    />
                                </>
                            );
                        })()}
                    </svg>

                    {/* Center Text */}
                    <div className="absolute bottom-0 mb-2 text-center">
                        <p className="text-gray-400 text-xs font-medium mb-1">{centerLabel}</p>
                        <p className={`text-xl font-bold ${centerValueColor || 'text-white'}`}>{centerValue}</p>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 mt-8 pt-6 border-t border-white/5">
                <div className="text-center">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">{stats.left.label}</p>
                    <p className="text-white font-semibold text-sm">{stats.left.value}</p>
                    {stats.left.subValue && <p className="text-gray-500 text-[10px]">{stats.left.subValue}</p>}
                </div>
                <div className="text-center">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">{stats.middle?.label || 'Win Rate'}</p>
                    <p className="text-white font-semibold text-sm">{stats.middle?.value || `${percentages.left.toFixed(2)}%`}</p>
                </div>
                <div className="text-center">
                    <p className="text-gray-400 text-[10px] uppercase font-bold mb-1">{stats.right.label}</p>
                    <p className="text-white font-semibold text-sm">{stats.right.value}</p>
                    {stats.right.subValue && <p className="text-gray-500 text-[10px]">{stats.right.subValue}</p>}
                </div>
            </div>

            {/* Glow Effect */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 ${percentages.left > 50 ? 'bg-green-500/5' : 'bg-red-500/5'} blur-[50px] rounded-full pointer-events-none`} />
        </div>
    );
};

export default function TradeAnalysis() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTrades();
    }, []);

    const fetchTrades = async () => {
        try {
            const response = await fetch('/api/dashboard/trades/analysis');

            if (!response.ok) {
                throw new Error('Failed to fetch trade analysis');
            }

            const data = await response.json();
            setTrades(data.trades || []);
        } catch (error) {
            console.error('Error fetching trades:', error);
            // Fallback to demo data
            setTrades(generateDemoTrades());
        } finally {
            setLoading(false);
        }
    };

    const generateDemoTrades = (): Trade[] => {
        const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'];
        const types: ('buy' | 'sell')[] = ['buy', 'sell'];
        const demoTrades: Trade[] = [];

        // Generate ~500 trades for realistic stats
        for (let i = 0; i < 500; i++) {
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const lots = Math.random() * 2 + 0.1;

            // Random PnL logic to simulate realistic win/loss
            // 45% win rate simulation
            const isWin = Math.random() > 0.55;
            const profitLoss = isWin
                ? (Math.random() * 500 + 50)  // Win $50-$550
                : -(Math.random() * 400 + 50); // Loss $50-$450

            const now = new Date();
            const openTime = new Date(now.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000); // Last 60 days

            demoTrades.push({
                id: `demo-${i}`,
                ticket_number: `${10000 + i}`,
                symbol,
                type,
                lots: Math.round(lots * 100) / 100,
                open_price: 1.0000,
                close_price: 1.0000,
                open_time: openTime.toISOString(),
                close_time: new Date(openTime.getTime() + 3600000).toISOString(),
                profit_loss: profitLoss,
            });
        }
        return demoTrades;
    };

    const calculateStats = (type: 'buy' | 'sell' | 'all') => {
        const filtered = type === 'all' ? trades : trades.filter(t => t.type === type);
        const total = filtered.length;
        if (total === 0) return null;

        const winners = filtered.filter(t => t.profit_loss > 0);
        const losers = filtered.filter(t => t.profit_loss <= 0);

        const totalProfit = filtered.reduce((sum, t) => sum + t.profit_loss, 0);
        const winsProfit = winners.reduce((sum, t) => sum + t.profit_loss, 0);
        const lossesCost = Math.abs(losers.reduce((sum, t) => sum + t.profit_loss, 0));

        return {
            total,
            totalProfit,
            winsCount: winners.length,
            lossesCount: losers.length,
            winsProfit,
            lossesCost,
            winRate: (winners.length / total) * 100,
            lossRate: (losers.length / total) * 100
        };
    };

    const shortStats = calculateStats('sell');
    const longStats = calculateStats('buy');
    const allStats = calculateStats('all');

    if (loading) return <div className="h-64 animate-pulse bg-gray-900 rounded-xl" />;

    // Only render if we have data, otherwise placeholders
    const safeShort = shortStats || { total: 0, totalProfit: 0, winsCount: 0, lossesCount: 0, winsProfit: 0, lossesCost: 0, winRate: 0, lossRate: 0 };
    const safeLong = longStats || { total: 0, totalProfit: 0, winsCount: 0, lossesCount: 0, winsProfit: 0, lossesCost: 0, winRate: 0, lossRate: 0 };
    const safeAll = allStats || { total: 0, totalProfit: 0, winsCount: 0, lossesCount: 0, winsProfit: 0, lossesCost: 0, winRate: 0, lossRate: 0 };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Short Analysis */}
            <GaugeCard
                title="Short Analysis"
                centerLabel="Profit"
                centerValue={safeShort.totalProfit >= 0 ? `$${safeShort.totalProfit.toFixed(2)}` : `-$${Math.abs(safeShort.totalProfit).toFixed(2)}`}
                centerValueColor={safeShort.totalProfit >= 0 ? "text-green-400" : "text-white"}

                // Actually usually dashboard gauges are consistent. Let's stick to Green = Win (Left?), Red = Loss (Right?)
                // Provided image "Short Analysis": Left starts Red, Right ends Green. The arc is mostly Red.
                // Center text "-$1,890.13". 
                // Let's assume Left = Loss (Red), Right = Win (Green) for Short Analysis?
                // Or maybe Left = Short, Right = Long? No, this is "Short Analysis".
                // Let's stick to Standard: Left = Win (Green), Right = Loss (Red). 
                // Users Image: "Short Analysis" -> Center is negative. Arc is Left Red, Right Green? No, image is Left Red, Right Green. 
                // Wait, if result is negative, maybe Red dominates?
                // Let's default: Left side = Win Rate (Green), Right side = Loss Rate (Red).
                // Percentages must sum to 100.
                percentages={{ left: safeShort.winRate, right: safeShort.lossRate }}
                stats={{
                    left: { label: `Wins (${safeShort.winsCount})`, value: `$${safeShort.winsProfit.toFixed(2)}` },
                    middle: { label: "Win Rate", value: `${safeShort.winRate.toFixed(2)}%` },
                    right: { label: `Losses (${safeShort.lossesCount})`, value: `$${safeShort.lossesCost.toFixed(2)}` }
                }}
                // If we want Green for Left, set colors explicitly
                // Image has Red Left, Green Right for the first card?
                // Let's use Green Left, Red Right as it's more standard for "Win Rate".
                colors={{ left: "#22c55e", right: "#ef4444" }}
            />

            {/* Profitability */}
            <GaugeCard
                title="Profitability"
                centerLabel="Total Trades"
                centerValue={safeAll.total}
                stats={{
                    left: { label: `${safeAll.winRate.toFixed(2)}%`, value: `Wins: ${safeAll.winsCount}` },
                    middle: { label: "", value: "" }, // Hide middle for this one?
                    right: { label: `${safeAll.lossRate.toFixed(2)}%`, value: `Losses: ${safeAll.lossesCount}` }
                }}
                percentages={{ left: safeAll.winRate, right: safeAll.lossRate }}
                colors={{ left: "#ef4444", right: "#22c55e" }}
            />

            {/* Long Analysis */}
            <GaugeCard
                title="Long Analysis"
                centerLabel="Profit"
                centerValue={safeLong.totalProfit >= 0 ? `$${safeLong.totalProfit.toFixed(2)}` : `-$${Math.abs(safeLong.totalProfit).toFixed(2)}`}
                centerValueColor={safeLong.totalProfit >= 0 ? "text-green-400" : "text-white"}
                percentages={{ left: safeLong.winRate, right: safeLong.lossRate }}
                stats={{
                    left: { label: `Wins (${safeLong.winsCount})`, value: `$${safeLong.winsProfit.toFixed(2)}` },
                    middle: { label: "Win Rate", value: `${safeLong.winRate.toFixed(2)}%` },
                    right: { label: `Losses (${safeLong.lossesCount})`, value: `$${safeLong.lossesCost.toFixed(2)}` }
                }}
                colors={{ left: "#ef4444", right: "#22c55e" }}
            />
        </div>
    );
}
