"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowUp, ArrowDown, Crown, Loader2, Medal, TrendingUp, DollarSign } from "lucide-react";
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
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-8 pt-12">

                {/* Header & Filter Bar */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-8 mb-16">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/20 text-white">
                                <Trophy size={28} className="fill-current" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tight text-slate-900">Leaderboard</h1>
                        </div>
                        <p className="text-slate-500 font-medium text-lg ml-1">
                            Celebrating the top performing traders in our ecosystem.
                        </p>
                    </div>

                    <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto max-w-full">
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={cn(
                                    "px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                                    activeFilter === filter
                                        ? "bg-slate-900 text-white shadow-md"
                                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                )}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-32">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                    </div>
                ) : (
                    <>
                        {/* Podium (Top 3) */}
                        {traders.length >= 1 && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end mb-16">
                                {/* Rank 2 */}
                                <div className="order-2 md:order-1">
                                    {topThree[1] && (
                                        <PodiumCard
                                            trader={topThree[1]}
                                            rank={2}
                                            accentColor="text-slate-400"
                                            ringColor="ring-slate-200"
                                            delay={0.1}
                                        />
                                    )}
                                </div>

                                {/* Rank 1 (Center, Largest) */}
                                <div className="order-1 md:order-2 -translate-y-4 md:-translate-y-8 z-10">
                                    {topThree[0] && (
                                        <PodiumCard
                                            trader={topThree[0]}
                                            rank={1}
                                            accentColor="text-yellow-500"
                                            ringColor="ring-yellow-100"
                                            isWinner
                                            delay={0}
                                        />
                                    )}
                                </div>

                                {/* Rank 3 */}
                                <div className="order-3">
                                    {topThree[2] && (
                                        <PodiumCard
                                            trader={topThree[2]}
                                            rank={3}
                                            accentColor="text-orange-700"
                                            ringColor="ring-orange-100"
                                            delay={0.2}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Ranking List */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden"
                        >
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-100">
                                            <th className="px-8 py-6 w-24 text-center">Rank</th>
                                            <th className="px-8 py-6">Trader</th>
                                            <th className="px-8 py-6">Account</th>
                                            <th className="px-8 py-6 text-right">Day Change</th>
                                            <th className="px-8 py-6 text-right">Total Profit</th>
                                            <th className="px-8 py-6 text-right">Return</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {traders.length > 3 ? (
                                            restOfList.map((trader, idx) => (
                                                <tr
                                                    key={trader.rank}
                                                    className={cn(
                                                        "group hover:bg-blue-50/30 transition-colors duration-200",
                                                        trader.isMe ? "bg-blue-50/40" : ""
                                                    )}
                                                >
                                                    <td className="px-8 py-6 text-center">
                                                        <span className={cn(
                                                            "font-bold text-lg",
                                                            trader.rank <= 10 ? "text-slate-900" : "text-slate-400"
                                                        )}>
                                                            #{trader.rank}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-slate-100 ring-2 ring-white shadow-sm overflow-hidden">
                                                                <img src={trader.avatar} alt={trader.name} className="w-full h-full object-cover" />
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                                                    {trader.name}
                                                                    {trader.isMe && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">YOU</span>}
                                                                </div>
                                                                <div className="text-xs text-slate-500 font-medium">{trader.country}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-6">
                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200">
                                                            {trader.accountSize}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className={cn(
                                                            "inline-flex items-center gap-1 font-bold text-sm",
                                                            trader.dayChange >= 0 ? "text-emerald-600" : "text-rose-500"
                                                        )}>
                                                            {trader.dayChange >= 0 ? <ArrowUp size={14} strokeWidth={3} /> : <ArrowDown size={14} strokeWidth={3} />}
                                                            ${Math.abs(trader.dayChange).toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className="font-bold text-slate-900 tabular-nums">
                                                            ${trader.totalProfit.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-6 text-right">
                                                        <span className={cn(
                                                            "inline-block font-black text-sm px-3 py-1 rounded-full",
                                                            trader.return > 0 ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                                                        )}>
                                                            {trader.return}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            !loading && (
                                                <tr>
                                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-400">
                                                        Only the top 3 legends have made it so far.
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </>
                )}
            </div>
        </div>
    );
}

// Sub-component for clean podium cards
function PodiumCard({ trader, rank, accentColor, ringColor, isWinner = false, delay }: { trader: Trader, rank: number, accentColor: string, ringColor: string, isWinner?: boolean, delay: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, type: "spring" }}
            className={cn(
                "relative bg-white rounded-[32px] p-8 text-center flex flex-col items-center border border-slate-100",
                isWinner ? "shadow-2xl shadow-yellow-500/10 min-h-[420px]" : "shadow-xl shadow-slate-200/50 min-h-[360px]"
            )}
        >
            {/* Rank Badge */}
            <div className={cn(
                "absolute -top-5 w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg border-4 border-white",
                rank === 1 ? "bg-yellow-400 text-yellow-900" :
                    rank === 2 ? "bg-slate-300 text-slate-800" :
                        "bg-orange-300 text-orange-900"
            )}>
                {rank}
            </div>

            {isWinner && <Crown size={40} className="text-yellow-400 absolute -top-16 drop-shadow-lg" fill="currentColor" />}

            {/* Avatar */}
            <div className={cn(
                "rounded-full p-1.5 mb-6 shadow-xl",
                isWinner ? "w-32 h-32 bg-gradient-to-br from-yellow-300 to-orange-400" : "w-24 h-24 bg-slate-100"
            )}>
                <div className="w-full h-full rounded-full overflow-hidden border-4 border-white bg-slate-50">
                    <img src={trader.avatar} alt={trader.name} className="w-full h-full object-cover" />
                </div>
            </div>

            {/* Info */}
            <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-1">
                {trader.name}
            </h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">
                {trader.accountSize} Account
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4 w-full mt-auto">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Profit</p>
                    <p className="text-lg font-black text-slate-900">${trader.totalProfit.toLocaleString()}</p>
                </div>
                <div className={cn("rounded-2xl p-4 border bg-opacity-10", isWinner ? "bg-yellow-50 border-yellow-100" : "bg-blue-50 border-blue-100")}>
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-1", isWinner ? "text-yellow-600" : "text-blue-600")}>Return</p>
                    <p className={cn("text-lg font-black", isWinner ? "text-yellow-600" : "text-blue-600")}>{trader.return}%</p>
                </div>
            </div>
        </motion.div>
    )
}
