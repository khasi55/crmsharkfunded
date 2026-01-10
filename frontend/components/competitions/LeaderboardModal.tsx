"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, TrendingUp, DollarSign, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaderboardEntry {
    user_id: string;
    username: string;
    score: number;
    rank: number;
    status: string;
}

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
    competitionId: string;
    competitionTitle: string;
    pollingIntervalSeconds?: number; // Optional, default 30s (can set 30-60)
}

export default function LeaderboardModal({
    isOpen,
    onClose,
    competitionId,
    competitionTitle,
    pollingIntervalSeconds = 30 // Default to 30 seconds
}: LeaderboardModalProps) {
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        if (isOpen && competitionId) {
            setLoading(true);
            fetchLeaderboard();
            const interval = setInterval(fetchLeaderboard, pollingIntervalSeconds * 1000);
            return () => clearInterval(interval);
        }
    }, [isOpen, competitionId, pollingIntervalSeconds]);

    const fetchLeaderboard = async () => {
        try {
            setIsRefreshing(true);
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/competitions/${competitionId}/leaderboard`);
            if (response.ok) {
                const data = await response.json();
                setLeaderboard(data);
                setLastUpdated(new Date());
            }
        } catch (error) {
            console.error("Failed to fetch leaderboard:", error);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                    />
                    <motion.div
                        initial={{ opacity: 0, y: 100, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 100, scale: 0.95 }}
                        className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:w-[600px] md:left-1/2 md:-translate-x-1/2 z-[70] bg-[#0f1220] border border-gray-800 rounded-2xl flex flex-col shadow-2xl overflow-hidden"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-gray-800 bg-[#151a30]/50">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-yellow-500" />
                                        Leaderboard
                                    </h2>
                                    <p className="text-xs text-gray-400 mt-1">{competitionTitle}</p>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                <RefreshCw className={cn("w-3 h-3", isRefreshing && "animate-spin text-blue-400")} />
                                <span>
                                    {lastUpdated
                                        ? `Updated ${lastUpdated.toLocaleTimeString()}`
                                        : 'Loading...'}
                                </span>
                                <span className="text-gray-600">•</span>
                                <span className="flex items-center gap-1">
                                    <span className={cn(
                                        "w-2 h-2 rounded-full",
                                        isRefreshing ? "bg-blue-400 animate-pulse" : "bg-green-400"
                                    )} />
                                    Live
                                </span>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            {loading && leaderboard.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">Loading rankings...</div>
                            ) : leaderboard.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">No participants yet. Be the first!</div>
                            ) : (
                                leaderboard.map((entry) => (
                                    <div
                                        key={entry.user_id}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border transition-all",
                                            entry.rank === 1 ? "bg-yellow-500/10 border-yellow-500/20" :
                                                entry.rank === 2 ? "bg-gray-400/10 border-gray-400/20" :
                                                    entry.rank === 3 ? "bg-orange-500/10 border-orange-500/20" :
                                                        "bg-[#151a30] border-gray-800 hover:border-gray-700"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-8 h-8 flex items-center justify-center rounded-lg font-bold text-sm",
                                                entry.rank === 1 ? "bg-yellow-500 text-black" :
                                                    entry.rank === 2 ? "bg-gray-400 text-black" :
                                                        entry.rank === 3 ? "bg-orange-500 text-black" :
                                                            "bg-gray-800 text-gray-400"
                                            )}>
                                                {entry.rank}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-white">{entry.username}</div>
                                                <div className="text-xs text-gray-500">Rank #{entry.rank}</div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={cn(
                                                "font-bold font-mono",
                                                entry.score >= 0 ? "text-green-400" : "text-red-400"
                                            )}>
                                                {entry.score > 0 ? '+' : ''}{entry.score.toFixed(2)}%
                                            </div>
                                            <div className="text-xs text-gray-500">Return</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-gray-800 bg-[#151a30]/30 text-center text-xs text-gray-500">
                            Updates automatically every {pollingIntervalSeconds} seconds
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
