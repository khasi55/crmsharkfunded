"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Clock, Trophy, Users, Shield, TrendingUp, Info } from "lucide-react";
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
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-screen space-y-6 sm:space-y-8">
            {/* Header / Nav code remains same */}
            <div className="flex items-center gap-3 sm:gap-4 text-slate-500 mb-3 sm:mb-4">
                <Link href="/competitions" className="active:text-slate-900 transition-colors flex items-center gap-2 text-sm sm:text-base">
                    <ArrowLeft size={18} className="sm:w-5 sm:h-5" /> Back to Competitions
                </Link>
            </div>

            {/* Title Section */}
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
                <div className="flex flex-col gap-4 sm:gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                            <span className={cn(
                                "w-2.5 h-2.5 rounded-full",
                                competition.status === 'active' ? 'bg-green-500' : 'bg-slate-400'
                            )}></span>
                            <span className="font-semibold text-slate-500 uppercase tracking-wide">
                                {competition.status}
                            </span>
                            <span className="text-slate-300">|</span>
                            <div className="flex items-center gap-1">
                                <Shield size={12} className="sm:w-[14px] sm:h-[14px]" /> {competition.platform || 'MetaTrader 5'}
                            </div>
                            {/* Fee Badge */}
                            <span className="text-slate-300 hidden sm:inline">|</span>
                            <span className={cn(
                                "text-xs sm:text-sm font-bold uppercase tracking-wide px-2 py-0.5 rounded",
                                isFree ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                            )}>
                                {isFree ? "Free Entry" : `Entry: $${competition.entry_fee}`}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900">{competition.title}</h1>
                        <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-500 font-medium pt-2">
                            <div className="flex items-center gap-2 bg-slate-100 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg">
                                <Clock size={14} className="text-slate-400 sm:w-4 sm:h-4" />
                                Ends {new Date(competition.end_date).toLocaleDateString()}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                        <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 font-semibold text-slate-600 active:text-slate-900 transition-colors text-sm sm:text-base border border-slate-200 rounded-xl">
                            More Info
                        </button>
                        <button className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 font-semibold text-slate-600 active:text-slate-900 transition-colors text-sm sm:text-base border border-slate-200 rounded-xl">
                            Show Prizepool
                        </button>
                        <button
                            onClick={handleJoin}
                            disabled={joining || competition.joined}
                            className={cn(
                                "w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 touch-manipulation text-sm sm:text-base",
                                competition.joined
                                    ? "bg-green-600 cursor-default opacity-90"
                                    : "bg-blue-600 active:bg-blue-700 shadow-blue-600/20"
                            )}
                        >
                            {joining ? 'Joining...' : competition.joined ? 'Joined' : (isFree ? 'Join for Free' : `Join for $${competition.entry_fee}`)}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                {/* Main Content (Leaderboard) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Podium code remains same - omitted for brevity in search replacement if possible, but safe to include context */}
                    {topThree.length > 0 && (
                        <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 pt-12 sm:pt-16 border border-slate-200 shadow-sm flex justify-center items-end gap-2 sm:gap-4 md:gap-8 h-[380px] sm:h-[420px] relative overflow-visible">
                            {/* ... Podium Inner ... just placeholder logic to ensure context matching ... */}
                            {/* Rank 2 */}
                            {topThree[1] && (
                                <div className="flex flex-col items-center w-1/3 z-10 cursor-pointer active:scale-105 transition-transform" onClick={() => fetchUserTrades((topThree[1] as any).challenge_id, topThree[1].username)}>
                                    <div className="mb-2 sm:mb-4 text-center">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-slate-200 mb-1 sm:mb-2 mx-auto border-2 sm:border-4 border-white shadow-sm flex items-center justify-center text-base sm:text-xl font-bold text-slate-500">
                                            {topThree[1].username.charAt(0)}
                                        </div>
                                        <div className="font-bold text-slate-800 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{topThree[1].username}</div>
                                        <div className="text-green-600 font-bold text-xs sm:text-sm">{topThree[1].score.toFixed(2)}%</div>
                                    </div>
                                    <div className="w-full h-24 sm:h-32 bg-gradient-to-t from-slate-200 to-slate-100 rounded-t-xl flex items-start justify-center pt-2 sm:pt-4 relative shadow-inner">
                                        <div className="text-2xl sm:text-4xl font-black text-slate-400 opacity-50">2</div>
                                    </div>
                                </div>
                            )}

                            {/* Rank 1 */}
                            {topThree[0] && (
                                <div className="flex flex-col items-center w-1/3 z-20 -mb-2 sm:-mb-4 cursor-pointer active:scale-105 transition-transform" onClick={() => fetchUserTrades((topThree[0] as any).challenge_id, topThree[0].username)}>
                                    <div className="mb-2 sm:mb-4 text-center transform scale-105 sm:scale-110">
                                        <div className="relative">
                                            <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 absolute -top-8 sm:-top-10 left-1/2 -translate-x-1/2 drop-shadow-sm" fill="currentColor" />
                                            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-full bg-yellow-100 mb-1 sm:mb-2 mx-auto border-2 sm:border-4 border-white shadow-md flex items-center justify-center text-lg sm:text-2xl font-bold text-yellow-700">
                                                {topThree[0].username.charAt(0)}
                                            </div>
                                        </div>
                                        <div className="font-bold text-slate-900 text-sm sm:text-base truncate max-w-[100px] sm:max-w-[140px]">{topThree[0].username}</div>
                                        <div className="text-green-600 font-bold text-sm sm:text-base">{topThree[0].score.toFixed(2)}%</div>
                                    </div>
                                    <div className="w-full h-32 sm:h-44 bg-gradient-to-t from-yellow-100 to-yellow-50 rounded-t-xl flex items-start justify-center pt-2 sm:pt-4 relative shadow-sm border-t border-yellow-200">
                                        <div className="text-3xl sm:text-5xl font-black text-yellow-500 opacity-50">1</div>
                                    </div>
                                </div>
                            )}

                            {/* Rank 3 */}
                            {topThree[2] && (
                                <div className="flex flex-col items-center w-1/3 z-10 cursor-pointer active:scale-105 transition-transform" onClick={() => fetchUserTrades((topThree[2] as any).challenge_id, topThree[2].username)}>
                                    <div className="mb-2 sm:mb-4 text-center">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-orange-100 mb-1 sm:mb-2 mx-auto border-2 sm:border-4 border-white shadow-sm flex items-center justify-center text-base sm:text-xl font-bold text-orange-700">
                                            {topThree[2].username.charAt(0)}
                                        </div>
                                        <div className="font-bold text-slate-800 text-xs sm:text-sm truncate max-w-[80px] sm:max-w-[120px]">{topThree[2].username}</div>
                                        <div className="text-green-600 font-bold text-xs sm:text-sm">{topThree[2].score.toFixed(2)}%</div>
                                    </div>
                                    <div className="w-full h-16 sm:h-24 bg-gradient-to-t from-orange-100 to-orange-50 rounded-t-xl flex items-start justify-center pt-2 sm:pt-4 relative shadow-inner">
                                        <div className="text-2xl sm:text-4xl font-black text-orange-400 opacity-50">3</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Table */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 font-semibold text-slate-500">Rank</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500">Name</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 hidden md:table-cell">Country</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-right">Trades</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-right">Profit</th>
                                    <th className="px-6 py-4 font-semibold text-slate-500 text-right">Gain</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                {leaderboard.map((p: any) => (
                                    <tr
                                        key={p.id}
                                        className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => fetchUserTrades(p.challenge_id, p.username)}
                                    >
                                        <td className="px-6 py-4 font-bold text-slate-900">#{p.rank}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {p.username.charAt(0)}
                                                </div>
                                                <span className="font-semibold">{p.username}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className="text-lg">🌍</span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono">{p.trades_count}</td>
                                        <td className={cn("px-6 py-4 text-right font-mono font-medium", (p.profit || 0) >= 0 ? "text-green-600" : "text-red-600")}>
                                            ${(p.profit || 0).toLocaleString()}
                                        </td>
                                        <td className={cn("px-6 py-4 text-right font-bold", p.score >= 0 ? "text-green-600" : "text-red-600")}>
                                            {p.score.toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                                {leaderboard.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                            No participants yet.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* User Stats Card if Joined */}
                    {competition.joined && (
                        <div className="bg-blue-600 text-white rounded-3xl p-6 shadow-lg shadow-blue-600/20 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-10">
                                <Trophy size={120} />
                            </div>
                            <h3 className="text-lg font-bold mb-1">Your Stats</h3>
                            <p className="text-blue-100 text-sm mb-6">Current performance in this competition</p>

                            <div className="space-y-4 relative z-10">
                                <div className="bg-blue-700/50 rounded-xl p-4 flex justify-between items-center">
                                    <span className="text-blue-200 text-sm font-medium">Rank</span>
                                    <span className="text-2xl font-bold">#{currentUserStats?.rank || '-'}</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-700/50 rounded-xl p-4">
                                        <div className="text-blue-200 text-xs uppercase mb-1">Return</div>
                                        <div className="text-xl font-bold">{currentUserStats ? `${currentUserStats.score.toFixed(2)}%` : '-'}</div>
                                    </div>
                                    <div className="bg-blue-700/50 rounded-xl p-4">
                                        <div className="text-blue-200 text-xs uppercase mb-1">Trades</div>
                                        <div className="text-xl font-bold">{currentUserStats?.trades_count || 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Rules / Info */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                        <h3 className="font-bold text-slate-900 flex items-center gap-2">
                            <Info size={18} className="text-slate-400" />
                            Trading Rules
                        </h3>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 text-sm text-slate-600">
                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Shield size={12} className="text-slate-500" />
                                </div>
                                <div>
                                    <span className="font-medium text-slate-900 block">5% Max Daily Loss</span>
                                    Calculating based on equity at start of day.
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-sm text-slate-600">
                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Shield size={12} className="text-slate-500" />
                                </div>
                                <div>
                                    <span className="font-medium text-slate-900 block">10% Max Overall Loss</span>
                                    Trailing drawdown from highest equity point.
                                </div>
                            </div>
                            <div className="flex items-start gap-3 text-sm text-slate-600">
                                <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <Shield size={12} className="text-slate-500" />
                                </div>
                                <div>
                                    <span className="font-medium text-slate-900 block">EA Execution Prohibited</span>
                                    Manual trading only.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trades Modal */}
            {showTradesModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-4xl p-6 space-y-6 relative h-[80vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-2xl font-bold text-slate-900">Trade History</h2>
                                <p className="text-slate-500 text-sm">Viewing trades for <span className="font-semibold text-slate-900">{selectedUserName}</span></p>
                            </div>
                            <button
                                onClick={() => setShowTradesModal(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors font-bold"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100 text-slate-500 border-b border-slate-200 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Symbol</th>
                                        <th className="px-4 py-3 font-semibold">Type</th>
                                        <th className="px-4 py-3 font-semibold text-right">Lots</th>
                                        <th className="px-4 py-3 font-semibold text-right">Open Price</th>
                                        <th className="px-4 py-3 font-semibold text-right">Close Price</th>
                                        <th className="px-4 py-3 font-semibold text-right">Profit</th>
                                        <th className="px-4 py-3 font-semibold text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                                    {tradesLoading ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">Loading trades...</td></tr>
                                    ) : selectedUserTrades.length === 0 ? (
                                        <tr><td colSpan={7} className="p-8 text-center text-slate-500">No trades found for this user.</td></tr>
                                    ) : (
                                        selectedUserTrades.map((t) => (
                                            <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-bold text-slate-900">{t.symbol}</td>
                                                <td className={cn("px-4 py-3 uppercase text-xs font-bold", t.type === 'buy' ? 'text-green-600' : 'text-red-600')}>
                                                    {t.type}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono">{t.lots}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-500">{t.open_price}</td>
                                                <td className="px-4 py-3 text-right font-mono text-slate-500">{t.close_price}</td>
                                                <td className={cn("px-4 py-3 text-right font-bold font-mono", t.profit_loss >= 0 ? "text-green-600" : "text-red-600")}>
                                                    ${t.profit_loss?.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-400 text-xs">
                                                    {new Date(t.close_time || t.open_time).toLocaleString()}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
