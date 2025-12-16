"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, ArrowUp, ArrowDown, Medal, Filter, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

// Enhanced Mock Data with Account Sizes
const rankingData = [
    { rank: 1, name: "Sarah J.", dayChange: 2450, totalProfit: 45020, return: 45.02, country: "🇺🇸", accountSize: "100k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah" },
    { rank: 2, name: "Michael K.", dayChange: 1200, totalProfit: 38900, return: 38.90, country: "🇬🇧", accountSize: "50k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael" },
    { rank: 3, name: "Alex Trader", dayChange: -450, totalProfit: 32500, return: 32.50, country: "🇨🇦", isMe: true, accountSize: "25k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex" },
    { rank: 4, name: "Dimitri V.", dayChange: 3100, totalProfit: 29800, return: 29.80, country: "🇷🇺", accountSize: "100k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dimitri" },
    { rank: 5, name: "Emma W.", dayChange: 850, totalProfit: 27400, return: 27.40, country: "🇦🇺", accountSize: "10k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma" },
    { rank: 6, name: "Liu Wei", dayChange: 150, totalProfit: 25100, return: 25.10, country: "🇨🇳", accountSize: "5k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Liu" },
    { rank: 7, name: "Hans M.", dayChange: 420, totalProfit: 22300, return: 22.30, country: "🇩🇪", accountSize: "50k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Hans" },
    { rank: 8, name: "Yuki T.", dayChange: 550, totalProfit: 19800, return: 19.80, country: "🇯🇵", accountSize: "100k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Yuki" },
    { rank: 9, name: "Carlos R.", dayChange: -120, totalProfit: 18500, return: 18.50, country: "🇪🇸", accountSize: "25k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Carlos" },
    { rank: 10, name: "Fatima A.", dayChange: 980, totalProfit: 16200, return: 16.20, country: "🇦🇪", accountSize: "10k", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Fatima" },
];

const filters = ["All", "5k", "10k", "25k", "50k", "100k"];

export default function RankingPage() {
    const [activeFilter, setActiveFilter] = useState("All");

    // Filter Logic
    const filteredData = rankingData.filter(trader => {
        if (activeFilter === "All") return true;
        return trader.accountSize === activeFilter;
    }).sort((a, b) => b.totalProfit - a.totalProfit); // Re-sort based on profit

    // Re-assign ranks based on filtered list
    const displayedData = filteredData.map((trader, index) => ({
        ...trader,
        displayRank: index + 1
    }));

    const topThree = displayedData.slice(0, 3);
    const restOfList = displayedData.slice(3);

    return (
        <div className="space-y-8 p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white flex items-center gap-3 tracking-tight mb-2">
                        <Trophy className="text-[#00E5FF] drop-shadow-[0_0_15px_rgba(0,229,255,0.5)]" size={36} />
                        Global Leaderboard
                    </h1>
                    <p className="text-gray-400 font-medium">Top performers proving their edge in the market.</p>
                </div>

                {/* Filter Tabs */}
                <div className="flex bg-[#0a0f1c] p-1.5 rounded-xl border border-white/5 overflow-x-auto max-w-full no-scrollbar">
                    {filters.map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={cn(
                                "px-5 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                                activeFilter === filter
                                    ? "bg-[#00E5FF] text-black shadow-[0_0_20px_rgba(0,229,255,0.3)]"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Podium (Top 3) - Only show if enough data */}
            {displayedData.length >= 3 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 pb-4 relative items-end">
                    {/* 2nd Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                        className="order-2 md:order-1 relative group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0055FF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl" />
                        <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center relative z-10 bg-[#050810]/60">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#C0C0C0] rounded-full flex items-center justify-center font-black text-black shadow-[0_0_20px_rgba(192,192,192,0.4)] border-4 border-[#050810]">2</div>
                            <img src={topThree[1].avatar} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-[#C0C0C0]" alt={topThree[1].name} />
                            <h3 className="text-xl font-bold text-white mb-1">{topThree[1].name} {topThree[1].country}</h3>
                            <p className="text-[#0055FF] font-bold text-sm mb-4">{topThree[1].accountSize} Account</p>
                            <div className="p-3 bg-white/5 rounded-xl">
                                <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Total Profit</p>
                                <p className="text-2xl font-black text-white">${topThree[1].totalProfit.toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>

                    {/* 1st Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: -20, scale: 1 }} transition={{ delay: 0.1, type: "spring" }}
                        className="order-1 md:order-2 relative z-20"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-b from-[#FFD700] to-transparent opacity-20 blur-xl rounded-3xl" />
                        <div className="glass-panel p-8 rounded-3xl border border-[#FFD700]/30 text-center relative bg-[#050810]">
                            <Crown className="w-12 h-12 text-[#FFD700] absolute -top-8 left-1/2 -translate-x-1/2 drop-shadow-[0_0_15px_rgba(255,215,0,0.6)] animate-bounce" />
                            <div className="w-24 h-24 rounded-full mx-auto mb-6 p-[3px] bg-gradient-to-r from-[#FFD700] to-orange-500 shadow-[0_0_30px_rgba(255,215,0,0.3)]">
                                <img src={topThree[0].avatar} className="w-full h-full rounded-full border-4 border-[#050810]" alt={topThree[0].name} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-1">{topThree[0].name} {topThree[0].country}</h3>
                            <p className="text-[#FFD700] font-bold mb-6">{topThree[0].accountSize} Account</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="p-4 bg-gradient-to-br from-[#FFD700]/10 to-transparent rounded-2xl border border-[#FFD700]/20">
                                    <p className="text-[#FFD700] text-xs uppercase font-bold tracking-wider mb-1">Profit</p>
                                    <p className="text-2xl font-black text-white">${topThree[0].totalProfit.toLocaleString()}</p>
                                </div>
                                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Return</p>
                                    <p className="text-2xl font-black text-[#00E5FF]">{topThree[0].return}%</p>
                                </div>
                            </div>
                        </div>
                    </motion.div>

                    {/* 3rd Place */}
                    <motion.div
                        initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                        className="order-3 relative group"
                    >
                        <div className="glass-panel p-6 rounded-3xl border border-white/10 text-center relative z-10 bg-[#050810]/60">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#CD7F32] rounded-full flex items-center justify-center font-black text-black shadow-[0_0_20px_rgba(205,127,50,0.4)] border-4 border-[#050810]">3</div>
                            <img src={topThree[2].avatar} className="w-20 h-20 rounded-full mx-auto mb-4 border-2 border-[#CD7F32]" alt={topThree[2].name} />
                            <h3 className="text-xl font-bold text-white mb-1">{topThree[2].name} {topThree[2].country}</h3>
                            <p className="text-[#0055FF] font-bold text-sm mb-4">{topThree[2].accountSize} Account</p>
                            <div className="p-3 bg-white/5 rounded-xl">
                                <p className="text-gray-400 text-xs uppercase font-bold tracking-wider mb-1">Total Profit</p>
                                <p className="text-2xl font-black text-white">${topThree[2].totalProfit.toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* List View */}
            <div className="rounded-3xl border border-white/5 overflow-hidden bg-[#0a0f1c]/30 backdrop-blur-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white/5 text-gray-400 text-xs uppercase tracking-widest border-b border-white/5">
                                <th className="px-6 py-5 font-bold">Rank</th>
                                <th className="px-6 py-5 font-bold">Trader</th>
                                <th className="px-6 py-5 font-bold">Account</th>
                                <th className="px-6 py-5 font-bold text-right">Day Change</th>
                                <th className="px-6 py-5 font-bold text-right">Total Profit</th>
                                <th className="px-6 py-5 font-bold text-right">Return</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            <AnimatePresence mode="popLayout">
                                {restOfList.map((trader, idx) => (
                                    <motion.tr
                                        key={idx} // Using idx for simplicity in mock, ideally unique ID
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            "hover:bg-white/5 transition-colors group",
                                            trader.isMe ? "bg-[#00E5FF]/5 hover:bg-[#00E5FF]/10" : ""
                                        )}
                                    >
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-gray-500 group-hover:text-white transition-colors">#{trader.displayRank}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gray-800 p-[1px]">
                                                    <img src={trader.avatar} alt={trader.name} className="w-full h-full rounded-full" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={cn(
                                                        "font-bold text-sm",
                                                        trader.isMe ? "text-[#00E5FF]" : "text-white"
                                                    )}>
                                                        {trader.name} {trader.isMe && "(You)"}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{trader.country}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-[#0055FF]/10 text-[#00E5FF] font-bold text-xs border border-[#0055FF]/20">
                                                {trader.accountSize}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className={cn("inline-flex items-center gap-1 font-bold text-sm", trader.dayChange >= 0 ? "text-green-400" : "text-red-400")}>
                                                {trader.dayChange >= 0 ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
                                                ${Math.abs(trader.dayChange).toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-white tracking-wide">
                                            ${trader.totalProfit.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-gray-300 font-bold text-sm">
                                                {trader.return}%
                                            </span>
                                        </td>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
