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
import { fetchFromBackend } from "@/lib/backend-api";
import { useSocket } from "@/contexts/SocketContext";
import { useChallengeSubscription } from "@/hooks/useChallengeSocket";

export default function TradeHistory() {
    const { selectedAccount } = useAccount();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('closed');
    const [currentPage, setCurrentPage] = useState(1);
    const tradesPerPage = 20;

    // Reset to page 1 when filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, selectedAccount]);

    // Pagination Logic
    const indexOfLastTrade = currentPage * tradesPerPage;
    const indexOfFirstTrade = indexOfLastTrade - tradesPerPage;
    const currentTrades = trades.slice(indexOfFirstTrade, indexOfLastTrade);
    const totalPages = Math.ceil(trades.length / tradesPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    // WebSocket Subscription for Real-time Updates
    const { socket } = useSocket();

    // Ensure we are subscribed to this challenge's room
    useChallengeSubscription(selectedAccount?.id);

    // Initial Fetch & Socket Listeners
    useEffect(() => {
        if (!selectedAccount) return;

        // Initial fetch
        fetchTrades();

        if (!socket) return;

        // Listen for real-time updates
        const handleTradeUpdate = (data: any) => {
            console.log("⚡ New trade received via socket:", data);
            // Verify trade belongs to this account
            if (data.login === selectedAccount.login || data.challenge_id === selectedAccount.id) {
                fetchTrades(true); // Silent refresh
            }
        };

        socket.on('trade_update', handleTradeUpdate);

        return () => {
            socket.off('trade_update', handleTradeUpdate);
        };
    }, [filter, selectedAccount, socket]);

    const fetchTrades = async (isSilent = false) => {
        try {
            if (!selectedAccount) return;
            if (!isSilent) setLoading(true);


            // fetchFromBackend handles auth headers automatically
            const data = await fetchFromBackend(`/api/dashboard/trades?filter=${filter}&limit=500&accountId=${selectedAccount.id}`);



            setTrades(data.trades || []);
        } catch (error) {
            console.error('Error fetching trades:', error);
            // Fallback to demo data on error
            setTrades([]);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };



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

    const stats = {
        totalTrades: trades.length,
        openTrades: trades.filter(t => !t.close_time).length,
        closedTrades: trades.filter(t => t.close_time).length,
        // Match User Expectation: Sum of Closed Trades (Net PnL)
        totalPnL: trades.filter(t => t.close_time).reduce((sum, t) => sum + (t.profit_loss || 0) + (t.commission || 0) + (t.swap || 0), 0),
    };

    if (loading) {
        return (
            <div className="bg-[#050923] border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-white/5 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-white/5 rounded"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#050923] border border-white/10 rounded-xl overflow-hidden"
        >
            {/* ... (Header and Table unchanged) ... */}

            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <History className="text-blue-400" size={20} />
                        <h3 className="font-bold text-lg text-white">Trade History</h3>
                    </div>
                </div>
                {/* Filter Buttons */}
                <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                    {(['all', 'open', 'closed'] as const).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`
                px-4 py-1.5 rounded-md text-xs font-bold transition-all capitalize
                ${filter === f
                                    ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                    : 'text-gray-400 hover:text-gray-300 hover:bg-white/5'
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
                    <thead className="bg-black/20 border-b border-white/5">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Ticket</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Symbol</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Lots</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Open</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Close</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Duration</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Net P&L</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {currentTrades.map((trade) => {
                            const netProfit = (trade.profit_loss || 0) + (trade.commission || 0) + (trade.swap || 0);
                            return (
                                <tr
                                    key={trade.id}
                                    className="hover:bg-white/5 transition-colors"
                                >
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-mono text-white">#{trade.ticket_number}</span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-sm font-bold text-white">{trade.symbol}</span>
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
                                    <td className="px-4 py-3 text-right">
                                        <span className="text-sm text-white">{trade.lots.toFixed(2)}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="text-sm text-white">{trade.open_price.toFixed(5)}</div>
                                        <div className="text-[10px] text-gray-500">{formatDate(trade.open_time)}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        {trade.close_price ? (
                                            <>
                                                <div className="text-sm text-white">{trade.close_price.toFixed(5)}</div>
                                                <div className="text-[10px] text-gray-500">{trade.close_time && formatDate(trade.close_time)}</div>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-500">—</span>
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
            {trades.length > 0 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 bg-black/10">
                    <div className="text-xs text-gray-400">
                        Showing <span className="font-medium text-white">{indexOfFirstTrade + 1}</span> to <span className="font-medium text-white">{Math.min(indexOfLastTrade, trades.length)}</span> of <span className="font-medium text-white">{trades.length}</span> trades
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => paginate(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>

                        <button
                            onClick={() => paginate(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}


            {/* Empty State */}
            {trades.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                    <History size={48} className="text-gray-600 mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">No Trades Yet</h4>
                </div>
            )}

            {/* Summary Footer */}
            {trades.length > 0 && (
                <div className="grid grid-cols-4 gap-px bg-white/5 border-t border-white/10">
                    <div className="bg-[#050923] p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">Total Trades</p>
                        <p className="text-sm font-bold text-white">{stats.totalTrades}</p>
                    </div>
                    <div className="bg-[#050923] p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">Open Positions</p>
                        <p className="text-sm font-bold text-blue-400">{stats.openTrades}</p>
                    </div>
                    <div className="bg-[#050923] p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">Closed Trades</p>
                        <p className="text-sm font-bold text-white">{stats.closedTrades}</p>
                    </div>
                    <div className="bg-[#050923] p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">Total P&L</p>
                        <p className={`text-sm font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
                        </p>
                    </div>
                </div>
            )}
        </motion.div>
    );
}
