"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowUp, ArrowDown, Crown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Trader {
    rank: number;
    name: string;
    dayChange: number;
    totalProfit: number;
    return: number;
    country: string;
    accountSize: string;
    avatar: string;
    isMe?: boolean;
}

const filters = ["All", "5k", "10k", "25k", "50k", "100k"];

export default function RankingPage() {
    const [activeFilter, setActiveFilter] = useState("All");
    const [traders, setTraders] = useState<Trader[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchRanking();
    }, [activeFilter]);

    const fetchRanking = async () => {
        try {
            setLoading(true);
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
            const res = await fetch(`${backendUrl}/api/ranking?accountSize=${activeFilter}`);
            if (res.ok) {
                const data = await res.json();
                setTraders(data);
            }
        } catch (error) {
            console.error("Failed to fetch ranking:", error);
        } finally {
            setLoading(false);
        }
    };

    const topThree = traders.slice(0, 3);
    const restOfList = traders.slice(3);

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-black flex items-center gap-3 tracking-tight mb-2">
                        <Trophy className="text-blue-600 drop-shadow-[0_0_15px_rgba(37,99,235,0.2)]" size={36} />
                        Global Leaderboard
                    </h1>
                    <p className="text-slate-500 font-medium">Top performers proving their edge in the market.</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 overflow-x-auto max-w-full no-scrollbar">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={cn(
                                "px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                activeFilter === filter
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                </div>
            ) : (
                <>
                    {/* Podium (Top 3) */}
                    {traders.length >= 1 && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 pb-4 relative items-end">
                            {/* 2nd Place */}
                            <div className="order-2 md:order-1 flex flex-col items-center">
                                {topThree[1] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
                                        className="w-full relative group"
                                    >
                                        <div className="bg-[#050923] p-8 rounded-[40px] border border-white/10 text-center relative z-10 shadow-xl overflow-hidden min-h-[320px] flex flex-col justify-center translate-y-4">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-slate-400 rounded-full flex items-center justify-center font-black text-slate-900 border-4 border-[#050923] shadow-lg z-20">2</div>

                                            <div className="w-20 h-20 rounded-full mx-auto mb-6 p-1 bg-slate-400/20 shadow-xl relative">
                                                <div className="w-full h-full rounded-full border-2 border-[#050923] overflow-hidden bg-slate-800">
                                                    <img src={topThree[1].avatar} className="w-full h-full object-cover" alt={topThree[1].name} />
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-white mb-1 leading-tight">{topThree[1].name} <span className="text-lg">🌍</span></h3>
                                            <p className="text-blue-400/80 font-bold text-[10px] mb-8 uppercase tracking-widest">{topThree[1].accountSize} Account</p>

                                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                                    <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mb-1">Profit</p>
                                                    <p className="text-lg font-black text-white">${topThree[1].totalProfit.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/10">
                                                    <p className="text-blue-400/50 text-[9px] uppercase font-bold tracking-widest mb-1">Return</p>
                                                    <p className="text-lg font-black text-blue-400">{topThree[1].return}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* 1st Place */}
                            <div className="order-1 md:order-2 flex flex-col items-center">
                                {topThree[0] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                                        className="w-full relative z-20"
                                    >
                                        <div className="bg-[#050923] p-10 rounded-[40px] border border-yellow-500/20 text-center relative shadow-2xl overflow-hidden min-h-[400px] flex flex-col justify-center">
                                            <div className="absolute top-4 right-0 left-0 flex justify-center">
                                                <div className="w-24 h-8 bg-yellow-500/5 rounded-full blur-2xl" />
                                            </div>
                                            <Crown className="w-10 h-10 text-yellow-500 absolute -top-5 left-1/2 -translate-x-1/2 drop-shadow-[0_0_20px_rgba(234,179,8,0.5)] z-30" />

                                            <div className="w-28 h-28 rounded-full mx-auto mb-6 p-1 bg-gradient-to-br from-yellow-400 via-orange-500 to-yellow-600 shadow-2xl relative">
                                                <div className="w-full h-full rounded-full border-4 border-[#050923] overflow-hidden bg-slate-900">
                                                    <img src={topThree[0].avatar} className="w-full h-full object-cover" alt={topThree[0].name} />
                                                </div>
                                            </div>

                                            <h3 className="text-2xl font-black text-white mb-2 leading-tight tracking-tight">{topThree[0].name} <span className="text-2xl ml-1">🌍</span></h3>
                                            <p className="text-yellow-500/90 font-bold mb-10 uppercase tracking-[0.2em] text-[11px]">{topThree[0].accountSize} Account</p>

                                            <div className="grid grid-cols-2 gap-4 mt-auto">
                                                <div className="bg-white/5 rounded-[24px] p-5 border border-yellow-500/20 shadow-inner">
                                                    <p className="text-yellow-500/70 text-[10px] uppercase font-bold tracking-widest mb-1.5">Profit</p>
                                                    <p className="text-xl font-black text-white">${topThree[0].totalProfit.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-white/5 rounded-[24px] p-5 border border-blue-500/20 shadow-inner">
                                                    <p className="text-blue-400/70 text-[10px] uppercase font-bold tracking-widest mb-1.5">Return</p>
                                                    <p className="text-xl font-black text-blue-400">{topThree[0].return}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>

                            {/* 3rd Place */}
                            <div className="order-3 flex flex-col items-center">
                                {topThree[2] && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }}
                                        className="w-full relative group"
                                    >
                                        <div className="bg-[#050923] p-8 rounded-[40px] border border-white/10 text-center relative z-10 shadow-xl overflow-hidden min-h-[320px] flex flex-col justify-center translate-y-4">
                                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-[#b45309] rounded-full flex items-center justify-center font-black text-white border-4 border-[#050923] shadow-lg z-20">3</div>

                                            <div className="w-20 h-20 rounded-full mx-auto mb-6 p-1 bg-orange-500/20 shadow-xl relative">
                                                <div className="w-full h-full rounded-full border-2 border-[#050923] overflow-hidden bg-slate-800">
                                                    <img src={topThree[2].avatar} className="w-full h-full object-cover" alt={topThree[2].name} />
                                                </div>
                                            </div>

                                            <h3 className="text-xl font-bold text-white mb-1 leading-tight">{topThree[2].name} <span className="text-lg">🌍</span></h3>
                                            <p className="text-blue-400/80 font-bold text-[10px] mb-8 uppercase tracking-widest">{topThree[2].accountSize} Account</p>

                                            <div className="grid grid-cols-2 gap-3 mt-auto">
                                                <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                                                    <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest mb-1">Profit</p>
                                                    <p className="text-lg font-black text-white">${topThree[2].totalProfit.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-blue-500/10 rounded-2xl p-4 border border-blue-500/10">
                                                    <p className="text-blue-400/50 text-[9px] uppercase font-bold tracking-widest mb-1">Return</p>
                                                    <p className="text-lg font-black text-blue-400">{topThree[2].return}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* List View */}
                    <div className="bg-[#050923] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl mt-8">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white/5 text-gray-400 text-[10px] uppercase tracking-widest font-black border-b border-white/5">
                                        <th className="px-8 py-5">Rank</th>
                                        <th className="px-8 py-5">Trader</th>
                                        <th className="px-8 py-5">Account</th>
                                        <th className="px-8 py-5 text-right">Day Change</th>
                                        <th className="px-8 py-5 text-right">Total Profit</th>
                                        <th className="px-8 py-5 text-right">Return</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    <AnimatePresence mode="popLayout">
                                        {traders.length > 3 ? (
                                            restOfList.map((trader, idx) => (
                                                <motion.tr
                                                    key={trader.rank}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: idx * 0.05 }}
                                                    className={cn(
                                                        "hover:bg-blue-50/50 transition-colors group",
                                                        trader.isMe ? "bg-blue-50" : ""
                                                    )}
                                                >
                                                    <td className="px-8 py-5">
                                                        <span className="font-bold text-slate-400 group-hover:text-blue-600 transition-colors">#{trader.rank}</span>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
                                                                <img src={trader.avatar} alt={trader.name} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white text-sm">
                                                                    {trader.name} {trader.isMe && "(You)"}
                                                                </span>
                                                                <span className="text-xs text-gray-400 font-medium">{trader.country}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 font-bold text-[10px] border border-blue-200/50">
                                                            {trader.accountSize}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 font-bold text-sm",
                                                            trader.dayChange >= 0 ? "text-green-500" : "text-red-500"
                                                        )}>
                                                            {trader.dayChange >= 0 ? <ArrowUp size={12} className="stroke-[3]" /> : <ArrowDown size={12} className="stroke-[3]" />}
                                                            ${Math.abs(trader.dayChange).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-right font-black text-white tracking-tight text-sm">
                                                        ${trader.totalProfit.toLocaleString()}
                                                    </td>
                                                    <td className="px-8 py-5 text-right">
                                                        <span className="text-white font-bold text-sm bg-white/5 px-3 py-1 rounded-full border border-white/10">
                                                            {trader.return}%
                                                        </span>
                                                    </td>
                                                </motion.tr>
                                            ))
                                        ) : (
                                            !loading && (
                                                <tr>
                                                    <td colSpan={6} className="px-8 py-12 text-center text-slate-400 font-medium">
                                                        Only top performers are shown here.
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </AnimatePresence>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
