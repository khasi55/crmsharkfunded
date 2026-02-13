"use client";



import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { History, TrendingUp, TrendingDown, Clock, Award } from "lucide-react";

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
    comment?: string;
}

import { useAccount } from "@/contexts/AccountContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { fetchFromBackend } from "@/lib/backend-api";
import { useSocket } from "@/contexts/SocketContext";
import { useChallengeSubscription } from "@/hooks/useChallengeSocket";

interface TradeHistoryProps {
    trades?: Trade[];
    isPublic?: boolean;
}

export default function TradeHistory({ trades: initialTrades, isPublic }: TradeHistoryProps = {}) {
    const accountContext = isPublic ? null : useAccount();
    const selectedAccount = accountContext?.selectedAccount;
    const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('closed');
    const [currentPage, setCurrentPage] = useState(1);
    const tradesPerPage = 20;

    const [stats, setStats] = useState({
        totalTrades: 0,
        openTrades: 0,
        closedTrades: 0,
        totalPnL: 0
    });
    const [totalPages, setTotalPages] = useState(1);

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, selectedAccount]);

    // WebSocket Subscription for Real-time Updates
    const { socket } = useSocket();

    // Ensure we are subscribed to this challenge's room
    useChallengeSubscription(selectedAccount?.id);

    // Sync with Props or Context
    useEffect(() => {
        const sourceData = initialTrades || dashboardData.trades;

        if (sourceData) {
            // Apply Filters Locally
            let filteredTrades = [...sourceData];
            if (filter === 'open') {
                filteredTrades = filteredTrades.filter(t => !t.close_time);
            } else if (filter === 'closed') {
                filteredTrades = filteredTrades.filter(t => !!t.close_time);
            }

            // Calculate Stats Locally
            const openCount = sourceData.filter((t: Trade) => !t.close_time).length;
            const closedCount = sourceData.filter((t: Trade) => !!t.close_time).length;
            const totalPnL = sourceData.reduce((acc: number, t: Trade) => acc + (Number(t.profit_loss) || 0) + (Number(t.commission || 0) * 2) + (Number(t.swap) || 0), 0);

            setStats({
                totalTrades: sourceData.length,
                openTrades: openCount,
                closedTrades: closedCount,
                totalPnL: totalPnL
            });

            // Local Pagination
            setTotalPages(Math.ceil(filteredTrades.length / tradesPerPage));
            const start = (currentPage - 1) * tradesPerPage;
            setTrades(filteredTrades.slice(start, start + tradesPerPage));

            setLoading(false);
            return;
        }

        if (dashboardLoading.global) {
            setLoading(true);
            return;
        }

        if (!selectedAccount) return;

        // Fallback: If no bulk data, fetch independently (e.g. for deep pagination if we ever restrict bulk)
        fetchTrades();

    }, [filter, selectedAccount, initialTrades, dashboardData.trades, dashboardLoading.global, currentPage]);

    // Socket Listeners for Real-time refreshing
    useEffect(() => {
        if (!socket || !selectedAccount) return;

        const handleTradeUpdate = (data: any) => {
            if (data.login === selectedAccount.login || data.challenge_id === selectedAccount.id) {
                // If we are using bulk data, we might want to refresh bulk. 
                // For now, let's keep it simple and just fetch trades if we don't have bulk? 
                // Or let fetchTrades handle it.
                fetchTrades(true);
            }
        };

        socket.on('trade_update', handleTradeUpdate);
        return () => {
            socket.off('trade_update', handleTradeUpdate);
        };
    }, [selectedAccount, socket]);

    const fetchTrades = async (isSilent = false) => {
        try {
            if (!selectedAccount) return;
            if (!isSilent) setLoading(true);

            const data = await fetchFromBackend(`/api/dashboard/trades?filter=${filter}&page=${currentPage}&limit=${tradesPerPage}&accountId=${selectedAccount.id}`);

            if (data.trades) {
                setTrades(data.trades);
                if (data.stats) setStats(data.stats);
                if (data.pagination) setTotalPages(data.pagination.totalPages);
            }
        } catch (error) {
            console.error('Error fetching trades:', error);
            setTrades([]);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const normalizeType = (type: any): string => {
        const typeStr = String(type).toLowerCase();
        if (typeStr === '0' || typeStr === 'buy') return 'Buy';
        if (typeStr === '1' || typeStr === 'sell') return 'Sell';
        return String(type);
    };

    const formatDuration = (openTime: string, closeTime: string | null) => {
        if (!closeTime) return 'Open';
        const duration = new Date(closeTime).getTime() - new Date(openTime).getTime();
        const hours = Math.floor(duration / (1000 * 60 * 60));
        const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    };

    if (loading) {
        return (
            <div className="bg-[#050923] border border-white/10 rounded-2xl p-6 animate-pulse shadow-2xl">
                <div className="h-6 bg-white/5 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-white/5 rounded"></div>
            </div>
        );
    }

    const indexOfFirstTradeOnPage = (currentPage - 1) * tradesPerPage;
    const indexOfLastTradeOnPage = indexOfFirstTradeOnPage + trades.length; // Use trades.length as it's already the paginated slice

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#050923] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-blue-900/10"
        >
            {/* ... (Header and Table unchanged) ... */}

            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-wrap gap-4 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <History className="text-blue-400" size={20} />
                        <h3 className="font-bold text-lg text-white font-sans uppercase tracking-wider">Trade History</h3>
                    </div>
                </div>
                {/* Filter Buttons */}
                <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                    {(['all', 'open', 'closed'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`
                px-4 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all
                ${filter === f
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                                    : 'text-gray-500 hover:text-gray-300'
                                }
              `}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Trade Table */}
            <div className="overflow-x-auto min-h-[400px]">
                <table className="w-full">
                    {/* ... (Table Header) ... */}
                    <thead className="bg-[#051139]/50 border-b border-white/5">
                        <tr>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ticket</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Symbol</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Type</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Lots</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Open</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Close</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Duration</th>
                            <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Net P&L</th>
                            <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {trades.map((trade) => { // CHANGED: Map directly over trades (which are already paginated by backend)
                            const netProfit = (trade.profit_loss || 0) + (trade.commission || 0) + (trade.swap || 0);
                            return (
                                <tr
                                    key={trade.id}
                                    className="hover:bg-white/5 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-mono text-gray-400 font-medium">#{trade.ticket_number || 'N/A'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-black text-white tracking-tight">{trade.symbol || 'N/A'}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span
                                            className={`
                      inline-flex items-center px-2 py-1 rounded-md text-xs font-bold uppercase
                      ${String(trade.type) === '0' || String(trade.type).toLowerCase() === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}
                    `}
                                        >
                                            {normalizeType(trade.type)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono">
                                        <span className="text-sm text-gray-300">{((trade.lots ?? 0) / 100).toFixed(2)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="text-sm text-white font-bold">{(trade.open_price ?? 0).toFixed(5)}</div>
                                        <div className="text-[10px] text-gray-500 font-bold">{trade.open_time && formatDate(trade.open_time)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {trade.close_price ? (
                                            <>
                                                <div className="text-sm text-white font-bold">{(trade.close_price ?? 0).toFixed(5)}</div>
                                                <div className="text-[10px] text-gray-500 font-bold">{trade.close_time && formatDate(trade.close_time)}</div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-700 tracking-widest">---</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-1 text-xs text-gray-400">
                                            <Clock size={12} />
                                            {formatDuration(trade.open_time, trade.close_time)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {netProfit > 0 ? (
                                                <TrendingUp size={14} className="text-green-400" />
                                            ) : netProfit < 0 ? (
                                                <TrendingDown size={14} className="text-red-400" />
                                            ) : null}
                                            <span
                                                className={`text-sm font-bold ${netProfit > 0 ? 'text-green-400' :
                                                    netProfit < 0 ? 'text-red-400' :
                                                        'text-gray-400'
                                                    }`}
                                            >
                                                {netProfit > 0 ? '+' : ''}${netProfit.toFixed(2)}
                                            </span>
                                        </div>
                                        {(trade.commission !== 0 || trade.swap !== 0) && (
                                            <div className="text-[10px] text-gray-500">
                                                {trade.commission ? `Comm: ${trade.commission} ` : ''}
                                                {trade.swap ? `Swap: ${trade.swap}` : ''}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {trade.close_time ? (
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-500/10 text-gray-400 text-xs font-medium">
                                                Closed
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium animate-pulse">
                                                Open
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {stats.totalTrades > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/20">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">
                        Showing <span className="text-white">{((currentPage - 1) * tradesPerPage) + 1}</span> to <span className="text-white">{Math.min(currentPage * tradesPerPage, stats.totalTrades)}</span> of <span className="text-white">{stats.totalTrades}</span> trades
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-1.5 rounded-md bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-white/10 hover:text-white"
                        >
                            Prev
                        </button>
                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-4 py-1.5 rounded-md bg-white/5 border border-white/10 text-gray-400 text-[10px] font-black tracking-widest uppercase disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:bg-white/10 hover:text-white"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}


            {/* Empty State */}
            {stats.totalTrades === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                    <History size={48} className="text-slate-200 mb-4" />
                    <h4 className="text-lg font-bold text-slate-400 mb-2 font-sans">No Trades Yet</h4>
                </div>
            )}

            {/* Summary Footer */}
            {stats.totalTrades > 0 && (
                <div className="grid grid-cols-4 gap-px bg-white/5 border-t border-white/5">
                    <div className="bg-[#051139]/30 p-4 text-center">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total Trades</p>
                        <p className="text-sm font-bold text-white tracking-widest">{stats.totalTrades}</p>
                    </div>
                    <div className="bg-[#051139]/30 p-4 text-center border-l border-white/5">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Open Positions</p>
                        <p className="text-sm font-bold text-blue-400 tracking-widest">{stats.openTrades}</p>
                    </div>
                    <div className="bg-[#051139]/30 p-4 text-center border-l border-white/5">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Closed Trades</p>
                        <p className="text-sm font-bold text-white tracking-widest">{stats.closedTrades}</p>
                    </div>
                    <div className="bg-[#051139]/30 p-4 text-center border-l border-white/5">
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1">Total P&L</p>
                        <p className={`text-sm font-bold tracking-widest ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
