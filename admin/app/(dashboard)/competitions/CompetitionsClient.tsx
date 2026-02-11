"use client";

import { useState, useEffect } from "react";
import { Plus, Trophy, Calendar, DollarSign, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFromBackend } from "@/lib/backend-api";

interface Competition {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    entry_fee: number;
    prize_pool: number;
    max_participants: number | null;
    status: string;
    platform?: string;
    image_url?: string;
}

export default function CompetitionsClient() {
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showParticipantsModal, setShowParticipantsModal] = useState<string | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [participantsLoading, setParticipantsLoading] = useState(false);
    const [showTradesModal, setShowTradesModal] = useState(false);
    const [selectedUserTrades, setSelectedUserTrades] = useState<any[]>([]);
    const [tradesLoading, setTradesLoading] = useState(false);
    const [selectedUserName, setSelectedUserName] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start_date: "",
        end_date: "",
        entry_fee: 0,
        prize_pool: 0,
        max_participants: 0,
        initial_balance: 100000,
        platform: "metatrader5",
        image_url: ""
    });

    // Assign Account State
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [assignCompetitionId, setAssignCompetitionId] = useState("");
    const [assignLogin, setAssignLogin] = useState("");
    const [assignLoading, setAssignLoading] = useState(false);


    useEffect(() => {
        fetchCompetitions();
    }, []);

    const fetchCompetitions = async () => {
        try {
            const data = await fetchFromBackend('/api/competitions/admin');
            setCompetitions(data);
        } catch (error) {
            console.error("Failed to fetch competitions:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchParticipants = async (competitionId: string) => {
        setParticipantsLoading(true);
        setShowParticipantsModal(competitionId);
        try {
            const response = await fetch(`/api/competitions/${competitionId}/leaderboard`);
            if (response.ok) {
                const data = await response.json();
                setParticipants(data);
            }
        } catch (error) {
            console.error("Failed to fetch participants:", error);
        } finally {
            setParticipantsLoading(false);
        }
    };

    const fetchUserTrades = async (challengeId: string, username: string) => {
        console.log("Fetching trades for:", username, challengeId);
        if (!challengeId) {
            alert(`No challenge ID found for user ${username}. They may not have an active MT5 account linked.`);
            return;
        }
        setTradesLoading(true);
        setSelectedUserName(username);
        setShowTradesModal(true);
        try {
            const response = await fetch(`/api/competitions/admin/trades/${challengeId}`);
            if (response.ok) {
                const data = await response.json();
                setSelectedUserTrades(data);
            }
        } catch (error) {
            console.error("Failed to fetch user trades:", error);
            alert("Failed to fetch trade data");
        } finally {
            setTradesLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("🚀 Creating competition with data:", formData);
        try {
            const data = await fetchFromBackend('/api/competitions', {
                method: "POST",
                body: JSON.stringify(formData)
            });
            console.log("✅ Competition created:", data);

            alert("Competition created successfully!");
            setShowCreateModal(false);
            fetchCompetitions();
            // Reset form
            setFormData({
                title: "",
                description: "",
                start_date: "",
                end_date: "",
                entry_fee: 0,
                prize_pool: 0,
                max_participants: 0,
                initial_balance: 100000,
                platform: "matchtrader",
                image_url: ""
            });
        } catch (error: any) {
            console.error("❌ Competition creation error:", error);
            alert(`Failed to create competition: ${error.message || 'Unknown error'}. Check console for details.`);
        }
    };

    const handleAssignAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignCompetitionId || !assignLogin) return;

        setAssignLoading(true);
        try {
            const result = await fetchFromBackend('/api/competitions/admin/assign-account', {
                method: 'POST',
                body: JSON.stringify({
                    competitionId: assignCompetitionId,
                    login: Number(assignLogin)
                })
            });
            console.log("✅ Account assigned:", result);
            alert(`Account ${assignLogin} successfully assigned to competition!`);
            setShowAssignModal(false);
            setAssignLogin("");
        } catch (error: any) {
            console.error("❌ Assign error:", error);
            alert(`Failed to assign account: ${error.message || 'Unknown error'}`);
        } finally {
            setAssignLoading(false);
        }
    };

    const openAssignModal = (compId: string) => {
        setAssignCompetitionId(compId);
        setShowAssignModal(true);
    };


    if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

    return (
        <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold text-white">Competitions Management</h1>
                    <p className="text-gray-400 text-sm">Create and manage trading competitions</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors text-sm font-medium"
                >
                    <Plus size={16} />
                    Create Competition
                </button>
            </div>

            {/* Competitions List */}
            <div className="bg-[#111629] border border-gray-800/50 rounded-xl overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-900/50 text-gray-400 border-b border-gray-800/50">
                        <tr>
                            <th className="px-6 py-4 font-medium">Competition</th>
                            <th className="px-6 py-4 font-medium">Platform</th>
                            <th className="px-6 py-4 font-medium">Dates</th>
                            <th className="px-6 py-4 font-medium">Pool / Fee</th>
                            <th className="px-6 py-4 font-medium">Status</th>
                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/50 text-gray-300">
                        {competitions.map((comp) => (
                            <tr key={comp.id} className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-500/10 rounded-lg">
                                            <Trophy className="w-4 h-4 text-blue-400" />
                                        </div>
                                        <div>
                                            <div className="font-medium text-white">{comp.title}</div>
                                            <div className="text-xs text-gray-500 truncate max-w-[200px]">{comp.description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded text-xs border border-gray-700 uppercase">
                                        {comp.platform || 'matchtrader'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1 text-xs">
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <span className="text-gray-500">Start:</span>
                                            {new Date(comp.start_date).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-400">
                                            <span className="text-gray-500">End:</span>
                                            {new Date(comp.end_date).toLocaleDateString()}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="space-y-1 text-xs">
                                        <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 w-fit px-2 py-0.5 rounded">
                                            Pool: ${comp.prize_pool.toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-400 px-2">
                                            Fee: {comp.entry_fee > 0 ? `$${comp.entry_fee}` : 'Free'}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={cn(
                                        "px-2 py-1 text-xs font-medium rounded-full border",
                                        comp.status === 'active'
                                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                                            : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                    )}>
                                        {comp.status.toUpperCase()}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => fetchParticipants(comp.id)}
                                        className="text-blue-400 hover:text-blue-300 transition-colors text-xs flex items-center gap-1 ml-auto"
                                    >
                                        <Users size={14} /> Participants
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {competitions.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                    No competitions found
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-[#111629] border border-gray-800 rounded-2xl w-full max-w-lg p-6 space-y-6 relative animate-in fade-in zoom-in-95 duration-200 my-8">
                        <h2 className="text-xl font-bold text-white">Create New Competition</h2>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Title</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    placeholder="e.g. January 2026 Championship"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Platform</label>
                                    <select
                                        value={formData.platform}
                                        onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    >
                                        <option value="metatrader5">MetaTrader 5</option>
                                        <option value="matchtrader">MatchTrader</option>
                                        <option value="fundingpips">FundingPips</option>

                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Image URL</label>
                                    <input
                                        type="text"
                                        value={formData.image_url}
                                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors h-24 resize-none"
                                    placeholder="Competition details..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Start Date</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">End Date</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Prize Pool ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.prize_pool}
                                        onChange={(e) => setFormData({ ...formData, prize_pool: Number(e.target.value) })}
                                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Entry Fee ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.entry_fee}
                                        onChange={(e) => setFormData({ ...formData, entry_fee: Number(e.target.value) })}
                                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Max Participants (0 for unlimited)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.max_participants}
                                        onChange={(e) => setFormData({ ...formData, max_participants: Number(e.target.value) })}
                                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-400">Account Size ($)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.initial_balance}
                                        onChange={(e) => setFormData({ ...formData, initial_balance: Number(e.target.value) })}
                                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50 transition-colors"
                                        placeholder="100000"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                >
                                    Create Competition
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Participants Modal */}
            {showParticipantsModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[#111629] border border-gray-800 rounded-2xl w-full max-w-2xl p-6 space-y-6 relative h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Participants</h2>
                            <button
                                onClick={() => setShowParticipantsModal(null)}
                                className="text-gray-400 hover:text-white"
                            >
                                x
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto border border-gray-800 rounded-xl">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-900/50 text-gray-400 border-b border-gray-800 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Rank</th>
                                        <th className="px-4 py-3">User</th>
                                        <th className="px-4 py-3 text-right">Trades</th>
                                        <th className="px-4 py-3 text-right">Win %</th>
                                        <th className="px-4 py-3 text-right">Profit</th>
                                        <th className="px-4 py-3 text-right">Score</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50 text-gray-300">
                                    {participantsLoading ? (
                                        <tr><td colSpan={7} className="p-4 text-center">Loading...</td></tr>
                                    ) : participants.length === 0 ? (
                                        <tr><td colSpan={7} className="p-4 text-center">No participants yet</td></tr>
                                    ) : (
                                        participants.map((p) => (
                                            <tr
                                                key={p.id}
                                                onClick={() => fetchUserTrades(p.challenge_id, p.username)}
                                                className="hover:bg-white/[0.05] transition-colors cursor-pointer"
                                            >
                                                <td className="px-4 py-3">#{p.rank}</td>
                                                <td className="px-4 py-3 font-medium text-white">{p.username}</td>
                                                <td className="px-4 py-3 text-right">{p.trades_count || 0}</td>
                                                <td className="px-4 py-3 text-right">{(p.win_ratio || 0).toFixed(1)}%</td>
                                                <td className={cn("px-4 py-3 text-right font-medium", (p.profit || 0) >= 0 ? "text-green-400" : "text-red-400")}>
                                                    ${(p.profit || 0).toLocaleString()}
                                                </td>
                                                <td className={cn("px-4 py-3 text-right", p.score >= 0 ? "text-green-400" : "text-red-400")}>
                                                    {p.score.toFixed(2)}%
                                                </td>
                                                <td className="px-4 py-3">{p.status}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Account Modal */}
            {showAssignModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-[#111629] border border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-6 relative">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Assign Account</h2>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-white">x</button>
                        </div>
                        <p className="text-sm text-gray-400">
                            Enter the Login ID of the MT5 account you want to link to this competition.
                        </p>
                        <form onSubmit={handleAssignAccount} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">MT5 Login ID</label>
                                <input
                                    type="number"
                                    required
                                    value={assignLogin}
                                    onChange={(e) => setAssignLogin(e.target.value)}
                                    className="w-full bg-gray-900/50 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
                                    placeholder="e.g. 10001"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowAssignModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={assignLoading}
                                    className="px-4 py-2 text-sm bg-orange-600 hover:bg-orange-500 text-white rounded-lg transition-colors flex items-center gap-2"
                                >
                                    {assignLoading ? 'Assigning...' : 'Assign Account'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* User Trades Modal */}
            {showTradesModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-[#111629] border border-gray-800 rounded-2xl w-full max-w-4xl p-6 space-y-6 relative h-[80vh] flex flex-col">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">Trades - {selectedUserName}</h2>
                            <button
                                onClick={() => setShowTradesModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                x
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto border border-gray-800 rounded-xl">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-900/50 text-gray-400 border-b border-gray-800 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3">Ticket</th>
                                        <th className="px-4 py-3">Symbol</th>
                                        <th className="px-4 py-3">Type</th>
                                        <th className="px-4 py-3 text-right">Lots</th>
                                        <th className="px-4 py-3 text-right">Open Price</th>
                                        <th className="px-4 py-3 text-right">Close Price</th>
                                        <th className="px-4 py-3 text-right">Profit</th>
                                        <th className="px-4 py-3 text-right">Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50 text-gray-300">
                                    {tradesLoading ? (
                                        <tr><td colSpan={8} className="p-4 text-center">Loading trades...</td></tr>
                                    ) : selectedUserTrades.length === 0 ? (
                                        <tr><td colSpan={8} className="p-4 text-center">No trades found for this user.</td></tr>
                                    ) : (
                                        selectedUserTrades.map((t) => (
                                            <tr key={t.id} className="hover:bg-white/[0.02]">
                                                <td className="px-4 py-3 font-mono text-gray-400">{t.ticket}</td>
                                                <td className="px-4 py-3 font-medium text-white">{t.symbol}</td>
                                                <td className={cn("px-4 py-3 uppercase text-xs font-bold", t.type === 'buy' ? 'text-green-400' : 'text-red-400')}>
                                                    {t.type}
                                                </td>
                                                <td className="px-4 py-3 text-right">{t.lots}</td>
                                                <td className="px-4 py-3 text-right">{t.open_price}</td>
                                                <td className="px-4 py-3 text-right">{t.close_price}</td>
                                                <td className={cn("px-4 py-3 text-right font-medium", t.profit_loss >= 0 ? "text-green-400" : "text-red-400")}>
                                                    ${t.profit_loss?.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-gray-500 text-xs">
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
