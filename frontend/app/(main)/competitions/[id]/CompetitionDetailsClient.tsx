"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Trophy, Users, Shield, TrendingUp, Info, Crown, Award, Target, Zap, Star, Calendar, DollarSign, Medal } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import PageLoader from "@/components/ui/PageLoader";
import { fetchFromBackend } from "@/lib/backend-api";
import { useSocket } from "@/contexts/SocketContext";

interface Competition {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    entry_fee: number;
    prize_pool: number;
    status: string;
    max_participants: number | null;
    participant_count: number;
    joined: boolean;
    platform?: string;
    image_url?: string;
}

interface Participant {
    id: string; // Changed from user_id to match API
    username: string;
    rank: number;
    score: number;
    avatar_url?: string;
    status: string;
    trades_count?: number;
    win_ratio?: number;
    profit?: number;
}

export default function CompetitionDetailsClient({ competitionId }: { competitionId: string }) {
    const [competition, setCompetition] = useState<Competition | null>(null);
    const [leaderboard, setLeaderboard] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);

    const [showTradesModal, setShowTradesModal] = useState(false);
    const [selectedUserTrades, setSelectedUserTrades] = useState<any[]>([]);
    const [tradesLoading, setTradesLoading] = useState(false);
    const [selectedUserName, setSelectedUserName] = useState("");

    const [userId, setUserId] = useState<string | null>(null);
    const { socket } = useSocket();

    useEffect(() => {
        fetchData();
    }, [competitionId]);

    // WebSocket Effect
    useEffect(() => {
        if (!socket) return;

        // Subscribe
        socket.emit('subscribe_competition', competitionId);
        console.log(`📡 Subscribed to competition: ${competitionId}`);

        const handleLeaderboardUpdate = (data: any[]) => {
            console.log(`🏆 WebSocket Leaderboard Update: ${data.length} participants`);
            const enriched = data.map((p: any) => ({
                ...p,
                trades_count: p.trades_count || 0,
                win_ratio: p.win_ratio || 0,
                profit: p.profit || 0
            }));
            setLeaderboard(enriched);
        };

        socket.on('leaderboard_update', handleLeaderboardUpdate);

        return () => {
            socket.off('leaderboard_update');
            socket.emit('unsubscribe_competition', competitionId);
            console.log(`📴 Unsubscribed from competition: ${competitionId}`);
        };
    }, [socket, competitionId]);

    const fetchData = async () => {
        try {
            const { createClient } = await import("@/utils/supabase/client");
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserId(user.id);

            // Fetch Competition Details
            let endpoint = '/api/competitions';
            if (user) {
                endpoint += `?userId=${user.id}`;
            }

            const comps = await fetchFromBackend(endpoint);
            const found = comps.find((c: Competition) => c.id === competitionId);
            if (found) setCompetition(found);

            // Fetch Leaderboard
            const data = await fetchFromBackend(`/api/competitions/${competitionId}/leaderboard`);
            // Mock extra stats for design match if missing
            const enriched = data.map((p: any) => ({
                ...p,
                trades_count: p.trades_count || 0,
                win_ratio: p.win_ratio || 0,
                profit: p.profit || 0
            }));
            setLeaderboard(enriched);

        } catch (error) {
            console.error("Error fetching competition details:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUserTrades = async (challengeId: string, username: string) => {
        if (!challengeId) {
            alert("No trading data available for this user yet.");
            return;
        }
        setTradesLoading(true);
        setSelectedUserName(username);
        setShowTradesModal(true);
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/competitions/trades/${challengeId}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedUserTrades(data);
            } else {
                setSelectedUserTrades([]);
            }
        } catch (error) {
            console.error("Failed to fetch user trades:", error);
            alert("Failed to fetch trade data");
        } finally {
            setTradesLoading(false);
        }
    };

    const handleJoin = async () => {
        if (!competition || !userId) return;
        setJoining(true);
        try {
            // Check if FREE or PAID
            if (competition.entry_fee && competition.entry_fee > 0) {
                // PAID FLOW
                const response = await fetch('/api/payment/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'competition',
                        competitionId
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.paymentUrl) {
                        window.location.href = data.paymentUrl;
                    } else {
                        alert("Order created but no payment URL received");
                        setJoining(false);
                    }
                } else {
                    const err = await response.json();
                    alert(`Failed to initiate join: ${err.error}`);
                    setJoining(false);
                }
            } else {
                // FREE FLOW
                const { createClient } = await import("@/utils/supabase/client");
                const supabase = createClient();
                const { data: { session } } = await supabase.auth.getSession();

                if (!session?.access_token) {
                    alert("Please login to join");
                    setJoining(false);
                    return;
                }

                const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/api/competitions/${competitionId}/join`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: JSON.stringify({
                        user_id: userId
                    })
                });

                if (response.ok) {
                    // Success! Reload or update state
                    alert("Successfully joined the competition!");
                    window.location.reload(); // Simple reload to refresh state
                } else {
                    const err = await response.json();
                    alert(`Failed to join: ${err.error}`);
                    setJoining(false);
                }
            }
        } catch (error) {
            console.error("Error joining:", error);
            alert("Error joining competition");
            setJoining(false);
        }
    };

    if (loading) return <PageLoader isLoading={loading} />;
    if (!competition) return <div className="p-12 text-center text-slate-500">Competition not found</div>;

    const topThree = leaderboard.slice(0, 3);
    const currentUserStats = userId ? leaderboard.find(p => p.id === userId) : null;
    const isFree = !competition.entry_fee || competition.entry_fee === 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
                {/* Back Navigation */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <Link
                        href="/competitions"
                        className="group flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-all duration-200"
                    >
                        <div className="w-8 h-8 rounded-lg bg-white group-hover:bg-slate-100 border border-slate-200 flex items-center justify-center transition-all">
                            <ArrowLeft size={16} />
                        </div>
                        <span className="font-medium text-sm">Back to Competitions</span>
                    </Link>
                </motion.div>

                {/* Hero Section - Redesigned */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="relative overflow-hidden bg-gradient-to-br from-white via-blue-50/50 to-purple-50/50 rounded-3xl border border-white shadow-xl shadow-slate-200/50"
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-72 h-72 bg-gradient-to-tr from-emerald-400/10 to-blue-400/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                    <div className="relative z-10 p-6 sm:p-8 lg:p-10">
                        {/* Status & Platform */}
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                            <div className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-sm",
                                competition.status === 'active'
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-slate-400 text-white'
                            )}>
                                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                {competition.status}
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-slate-200 text-slate-700 font-medium text-xs shadow-sm">
                                <Shield size={14} className="text-blue-500" />
                                {competition.platform || 'MetaTrader 5'}
                            </div>

                            <div className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full font-bold text-xs uppercase tracking-wider shadow-sm",
                                isFree
                                    ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
                                    : "bg-gradient-to-r from-blue-500 to-purple-500 text-white"
                            )}>
                                <DollarSign size={14} />
                                {isFree ? "Free Entry" : `$${competition.entry_fee}`}
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-blue-900 to-purple-900 mb-4">
                            {competition.title}
                        </h1>

                        {/* Competition Info */}
                        <div className="flex flex-wrap items-center gap-4 mb-8">
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur border border-slate-200 shadow-sm">
                                <Calendar size={16} className="text-purple-500" />
                                <span className="text-sm font-medium text-slate-700">
                                    Ends {new Date(competition.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/80 backdrop-blur border border-slate-200 shadow-sm">
                                <Users size={16} className="text-blue-500" />
                                <span className="text-sm font-medium text-slate-700">
                                    {competition.participant_count} participants
                                </span>
                            </div>

                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30">
                                <Trophy size={16} />
                                <span className="text-sm font-bold">
                                    ${competition.prize_pool.toLocaleString()} Prize Pool
                                </span>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <button className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-all hover:shadow-md">
                                <Info size={16} className="group-hover:text-blue-500 transition-colors" />
                                Competition Rules
                            </button>

                            <button className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-sm transition-all hover:shadow-md">
                                <Award size={16} className="group-hover:text-purple-500 transition-colors" />
                                Prize Breakdown
                            </button>

                            <button
                                onClick={handleJoin}
                                disabled={joining || competition.joined}
                                className={cn(
                                    "flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-75 disabled:cursor-not-allowed",
                                    competition.joined
                                        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-emerald-500/30"
                                        : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-blue-500/30 hover:shadow-xl hover:scale-105"
                                )}
                            >
                                {competition.joined ? (
                                    <>
                                        <Trophy size={16} />
                                        Joined
                                    </>
                                ) : (
                                    <>
                                        <Zap size={16} />
                                        {joining ? 'Joining...' : (isFree ? 'Join for Free' : `Join for $${competition.entry_fee}`)}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Leaderboard Column */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Podium Section - Redesigned */}
                        {topThree.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="relative"
                            >
                                <div className="absolute inset-0 bg-gradient-to-b from-amber-100/50 via-transparent to-transparent rounded-3xl" />

                                <div className="relative grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 items-end p-6 md:p-8">
                                    {/* Rank 1 - Winner (Center on Desktop, First on Mobile) */}
                                    <div className="order-1 md:order-2">
                                        {topThree[0] && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.3 }}
                                                className="md:-translate-y-8"
                                            >
                                                <PodiumCard participant={topThree[0]} rank={1} isWinner onClick={() => fetchUserTrades((topThree[0] as any).challenge_id, topThree[0].username)} />
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Rank 2 (Left on Desktop, Second on Mobile) */}
                                    <div className="order-2 md:order-1">
                                        {topThree[1] && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.4 }}
                                            >
                                                <PodiumCard participant={topThree[1]} rank={2} onClick={() => fetchUserTrades((topThree[1] as any).challenge_id, topThree[1].username)} />
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Rank 3 (Right on Desktop, Third on Mobile) */}
                                    <div className="order-3">
                                        {topThree[2] && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: 0.5 }}
                                            >
                                                <PodiumCard participant={topThree[2]} rank={3} onClick={() => fetchUserTrades((topThree[2] as any).challenge_id, topThree[2].username)} />
                                            </motion.div>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Leaderboard Table - Redesigned */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Trophy size={20} className="text-amber-500" />
                                    Full Leaderboard
                                </h2>
                                <p className="text-sm text-slate-500 mt-1">Live rankings updated in real-time</p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Rank</th>
                                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Trader</th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Target size={12} />
                                                    Trades
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <div className="flex items-center justify-end gap-1">
                                                    <DollarSign size={12} />
                                                    Profit
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                <div className="flex items-center justify-end gap-1">
                                                    <TrendingUp size={12} />
                                                    Gain
                                                </div>
                                            </th>
                                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {leaderboard.slice(0, 10).map((p: any, idx: number) => (
                                            <tr
                                                key={p.id}
                                                className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 transition-all duration-200 cursor-pointer"
                                                onClick={() => fetchUserTrades(p.challenge_id, p.username)}
                                            >
                                                <td className="px-6 py-5">
                                                    <div className={cn(
                                                        "inline-flex items-center justify-center w-10 h-10 rounded-xl font-black text-sm",
                                                        p.rank === 1 ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/30" :
                                                            p.rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400 text-white shadow-lg shadow-slate-400/30" :
                                                                p.rank === 3 ? "bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/30" :
                                                                    "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                                                    )}>
                                                        {p.rank === 1 ? <Crown size={16} /> : p.rank}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm shadow-md border-2",
                                                            p.rank <= 3
                                                                ? "bg-gradient-to-br from-blue-400 to-purple-500 text-white border-white"
                                                                : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-700 border-white"
                                                        )}>
                                                            {p.username.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-bold text-slate-900 truncate">{p.username}</div>
                                                            {p.rank <= 3 && (
                                                                <div className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                                                    <Star size={10} fill="currentColor" />
                                                                    Top Performer
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-slate-100 text-slate-700 font-mono font-semibold text-sm">
                                                        {p.trades_count}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-3 py-1 rounded-lg font-mono font-bold text-sm max-w-full truncate",
                                                        (p.profit || 0) >= 0
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-rose-50 text-rose-700"
                                                    )}>
                                                        ${(p.profit || 0).toLocaleString()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className={cn(
                                                        "inline-flex items-center gap-1 px-4 py-2 rounded-full font-black text-sm shadow-sm",
                                                        p.score >= 0
                                                            ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white"
                                                            : "bg-gradient-to-r from-rose-500 to-red-500 text-white"
                                                    )}>
                                                        {p.score >= 0 ? '+' : ''}{p.score.toFixed(2)}%
                                                    </span>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            fetchUserTrades(p.challenge_id, p.username);
                                                        }}
                                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-all hover:shadow-md group-hover:bg-slate-200"
                                                    >
                                                        <TrendingUp size={12} />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        {leaderboard.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-20 text-center">
                                                    <div className="flex flex-col items-center gap-3 text-slate-400">
                                                        <Trophy size={48} className="opacity-30" />
                                                        <p className="font-medium">No participants yet</p>
                                                        <p className="text-sm">Be the first to join this competition!</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </motion.div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* User Stats Card */}
                        {competition.joined && currentUserStats && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                                className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-3xl p-6 shadow-2xl shadow-blue-500/30"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl" />
                                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl" />

                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                                            <Trophy size={20} className="text-amber-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg">Your Stats</h3>
                                            <p className="text-blue-200 text-xs">Live Performance</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-blue-200 text-sm font-medium">Current Rank</span>
                                                <Medal size={16} className="text-amber-300" />
                                            </div>
                                            <div className="text-4xl font-black text-white truncate">#{currentUserStats.rank}</div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
                                                <div className="text-blue-200 text-xs uppercase tracking-wide mb-1">Return</div>
                                                <div className={cn(
                                                    "text-2xl font-black",
                                                    currentUserStats.score >= 0 ? "text-emerald-300" : "text-rose-300"
                                                )}>
                                                    {currentUserStats.score >= 0 ? '+' : ''}{currentUserStats.score.toFixed(2)}%
                                                </div>
                                            </div>
                                            <div className="bg-white/10 backdrop-blur rounded-2xl p-4 border border-white/20">
                                                <div className="text-blue-200 text-xs uppercase tracking-wide mb-1">Trades</div>
                                                <div className="text-2xl font-black text-white">{currentUserStats.trades_count || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Trading Rules */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                            className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                                    <Shield size={18} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900">Trading Rules</h3>
                                    <p className="text-xs text-slate-500">Competition guidelines</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-100">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-red-600 font-black text-sm">4%</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900 text-sm mb-0.5">Max Daily Loss</div>
                                        <div className="text-xs text-slate-600">Based on start of day equity</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-100">
                                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-orange-600 font-black text-sm">11%</span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900 text-sm mb-0.5">Max Overall Loss</div>
                                        <div className="text-xs text-slate-600">Total drawdown limit</div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100">
                                    <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                        <Shield size={14} className="text-blue-600" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-bold text-slate-900 text-sm mb-0.5">Manual Trading Only</div>
                                        <div className="text-xs text-slate-600">EA execution prohibited</div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Quick Info */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 }}
                            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-200 shadow-lg p-6"
                        >
                            <div className="flex items-center gap-2 mb-4">
                                <Info size={18} className="text-amber-600" />
                                <h3 className="font-bold text-slate-900">Pro Tip</h3>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                Focus on consistent gains rather than risky trades. Top performers maintain steady growth throughout the competition.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Trades Modal - Enhanced */}
            {showTradesModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden"
                    >
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                                        <TrendingUp size={24} className="text-blue-500" />
                                        Trade History
                                    </h2>
                                    <p className="text-slate-500 text-sm mt-1">
                                        Viewing trades for <span className="font-bold text-slate-900">{selectedUserName}</span>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowTradesModal(false)}
                                    className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-all font-bold text-lg"
                                >
                                    ×
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="max-h-[60vh] overflow-y-auto">
                            <table className="w-full">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Symbol</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Lots</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Open</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Close</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Profit</th>
                                        <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {tradesLoading ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                                                    <p className="text-slate-500 font-medium">Loading trades...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : selectedUserTrades.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-12 text-center">
                                                <div className="flex flex-col items-center gap-3 text-slate-400">
                                                    <TrendingUp size={48} className="opacity-30" />
                                                    <p className="font-medium">No trades found</p>
                                                    <p className="text-sm">This trader hasn't executed any trades yet</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        selectedUserTrades.map((t: any) => (
                                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg text-sm">
                                                        {t.symbol}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "inline-block px-3 py-1 rounded-full text-xs font-bold uppercase",
                                                        t.type === 'buy'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-rose-100 text-rose-700'
                                                    )}>
                                                        {t.type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-700">{t.lots}</td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-500 text-sm">{t.open_price}</td>
                                                <td className="px-6 py-4 text-right font-mono text-slate-500 text-sm">{t.close_price}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className={cn(
                                                        "inline-block px-3 py-1 rounded-lg font-mono font-bold text-sm",
                                                        t.profit_loss >= 0
                                                            ? "bg-emerald-50 text-emerald-700"
                                                            : "bg-rose-50 text-rose-700"
                                                    )}>
                                                        ${t.profit_loss?.toFixed(2)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right text-slate-400 text-xs">
                                                    {new Date(t.close_time || t.open_time).toLocaleString('en-US', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
}

// Redesigned Podium Card Component
function PodiumCard({ participant, rank, isWinner = false, onClick }: {
    participant: Participant,
    rank: number,
    isWinner?: boolean,
    onClick: () => void
}) {
    const getRankConfig = (rank: number) => {
        switch (rank) {
            case 1:
                return {
                    bg: "bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500",
                    border: "border-amber-300",
                    shadow: "shadow-2xl shadow-amber-500/40",
                    badge: "bg-gradient-to-r from-amber-500 to-yellow-500",
                    text: "text-amber-900"
                };
            case 2:
                return {
                    bg: "bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400",
                    border: "border-slate-300",
                    shadow: "shadow-xl shadow-slate-400/30",
                    badge: "bg-gradient-to-r from-slate-400 to-slate-500",
                    text: "text-slate-800"
                };
            case 3:
                return {
                    bg: "bg-gradient-to-br from-orange-400 via-amber-400 to-orange-500",
                    border: "border-orange-300",
                    shadow: "shadow-xl shadow-orange-500/30",
                    badge: "bg-gradient-to-r from-orange-500 to-amber-500",
                    text: "text-orange-900"
                };
            default:
                return {
                    bg: "bg-white",
                    border: "border-slate-200",
                    shadow: "shadow-lg",
                    badge: "bg-slate-500",
                    text: "text-slate-700"
                };
        }
    };

    const config = getRankConfig(rank);

    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={cn(
                "relative bg-white rounded-3xl p-6 cursor-pointer transition-all border-2 overflow-hidden",
                config.border,
                config.shadow,
                "hover:shadow-2xl"
            )}
        >
            {/* Rank Badge */}
            <div className={cn(
                "absolute -top-4 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center font-black text-lg text-white shadow-lg border-4 border-white z-10",
                config.badge
            )}>
                {rank}
            </div>

            {/* Crown for Winner */}
            {isWinner && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                    <Crown size={32} className="text-amber-400 drop-shadow-lg animate-pulse" fill="currentColor" />
                </div>
            )}

            <div className="flex flex-col items-center pt-6 w-full">
                {/* Avatar */}
                <div className={cn(
                    "relative mb-4",
                    isWinner ? "w-24 h-24" : "w-20 h-20"
                )}>
                    <div className={cn(
                        "w-full h-full rounded-full p-1",
                        config.bg
                    )}>
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center border-4 border-white shadow-inner">
                            <span className={cn(
                                "font-black",
                                isWinner ? "text-3xl" : "text-2xl",
                                config.text
                            )}>
                                {participant.username.charAt(0).toUpperCase()}
                            </span>
                        </div>
                    </div>

                    {/* Rank Medal */}
                    <div className={cn(
                        "absolute -bottom-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white",
                        config.badge
                    )}>
                        {rank === 1 ? <Crown size={14} className="text-white" fill="currentColor" /> :
                            rank === 2 ? <Medal size={14} className="text-white" /> :
                                <Award size={14} className="text-white" />}
                    </div>
                </div>

                {/* Username */}
                <h3 className={cn(
                    "font-black text-slate-900 mb-1 text-center truncate w-full px-2",
                    isWinner ? "text-xl" : "text-lg"
                )}>
                    {participant.username}
                </h3>

                {/* Gain Percentage */}
                <div className={cn(
                    "inline-flex items-center gap-1 px-4 py-1.5 rounded-full font-bold text-sm mb-6",
                    participant.score >= 0
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-lg shadow-emerald-500/30"
                        : "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-lg shadow-rose-500/30"
                )}>
                    <TrendingUp size={14} />
                    {participant.score >= 0 ? '+' : ''}{participant.score.toFixed(2)}%
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-3 border border-slate-200">
                        <div className="flex items-center justify-center gap-1 text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">
                            <Target size={10} />
                            Trades
                        </div>
                        <div className="text-lg font-black text-slate-900 text-center">{participant.trades_count || 0}</div>
                    </div>
                    <div className={cn(
                        "rounded-2xl p-3 border",
                        isWinner
                            ? "bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200"
                            : "bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200"
                    )}>
                        <div className={cn(
                            "flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-wider mb-1",
                            isWinner ? "text-amber-600" : "text-blue-600"
                        )}>
                            <DollarSign size={10} />
                            Profit
                        </div>
                        <div className={cn(
                            "text-base font-black text-center truncate w-full px-1",
                            isWinner ? "text-amber-700" : "text-blue-700"
                        )}>
                            ${(participant.profit || 0).toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
