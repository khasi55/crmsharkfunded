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

export default function TradeHistory() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

    useEffect(() => {
        fetchTrades();
    }, [filter]);

    const fetchTrades = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/dashboard/trades?filter=${filter}&limit=20`);

            if (!response.ok) {
                throw new Error('Failed to fetch trades');
            }

            const data = await response.json();
            setTrades(data.trades || []);
        } catch (error) {
            console.error('Error fetching trades:', error);
            // Fallback to demo data on error
            setTrades(generateDemoTrades());
        } finally {
            setLoading(false);
        }
    };

    const generateDemoTrades = (): Trade[] => {
        const symbols = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD'];
        const types: ('buy' | 'sell')[] = ['buy', 'sell'];
        const demoTrades: Trade[] = [];

        for (let i = 0; i < 15; i++) {
            const symbol = symbols[Math.floor(Math.random() * symbols.length)];
            const type = types[Math.floor(Math.random() * types.length)];
            const lots = Math.random() * 2 + 0.1;
            const openPrice = Math.random() * 100 + 1;
            const closePrice = openPrice + (Math.random() - 0.5) * 2;
            const profitLoss = (closePrice - openPrice) * lots * (type === 'buy' ? 100 : -100);

            const now = new Date();
            const openTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
            const closeTime = Math.random() > 0.3 ? new Date(openTime.getTime() + Math.random() * 24 * 60 * 60 * 1000) : null;

            demoTrades.push({
                id: `demo-${i}`,
                ticket_number: `${10000 + i}`,
                symbol,
                type,
                lots: Math.round(lots * 100) / 100,
                open_price: Math.round(openPrice * 100) / 100,
                close_price: closeTime ? Math.round(closePrice * 100) / 100 : null,
                open_time: openTime.toISOString(),
                close_time: closeTime?.toISOString() || null,
                profit_loss: closeTime ? Math.round(profitLoss) : 0,
                commission: -5,
                swap: Math.random() > 0.5 ? Math.random() * 10 : -Math.random() * 5,
            });
        }

        return demoTrades;
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
        totalPnL: trades.reduce((sum, t) => sum + (t.profit_loss || 0), 0),
    };

    if (loading) {
        return (
            <div className="bg-gray-900 border border-white/10 rounded-xl p-6 animate-pulse">
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
            className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <History className="text-blue-400" size={20} />
                        <h3 className="font-bold text-lg text-white">Trade History</h3>
                    </div>
                    <p className="text-sm text-gray-400">
                        {stats.totalTrades} total trades · {stats.openTrades} open · {stats.closedTrades} closed
                    </p>
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
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-black/20 border-b border-white/5">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Ticket</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Symbol</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Type</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Lots</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Open</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">Close</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Duration</th>
                            <th className="px-4 py-3 text-right text-xs font-bold text-gray-400 uppercase">P&L</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {trades.map((trade) => (
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
                      ${trade.type === 'buy' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}
                    `}
                                    >
                                        {trade.type}
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
                                        {trade.profit_loss > 0 ? (
                                            <TrendingUp size={14} className="text-green-400" />
                                        ) : trade.profit_loss < 0 ? (
                                            <TrendingDown size={14} className="text-red-400" />
                                        ) : null}
                                        <span
                                            className={`text-sm font-bold ${trade.profit_loss > 0 ? 'text-green-400' :
                                                trade.profit_loss < 0 ? 'text-red-400' :
                                                    'text-gray-400'
                                                }`}
                                        >
                                            {trade.profit_loss > 0 ? '+' : ''}${trade.profit_loss.toFixed(2)}
                                        </span>
                                    </div>
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
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Empty State */}
            {trades.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                    <History size={48} className="text-gray-600 mb-4" />
                    <h4 className="text-lg font-bold text-white mb-2">No Trades Yet</h4>
                    <p className="text-sm text-gray-400">Your trade history will appear here</p>
                </div>
            )}

            {/* Summary Footer */}
            {trades.length > 0 && (
                <div className="grid grid-cols-4 gap-px bg-white/5 border-t border-white/10">
                    <div className="bg-gray-900 p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">Total Trades</p>
                        <p className="text-sm font-bold text-white">{stats.totalTrades}</p>
                    </div>
                    <div className="bg-gray-900 p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">Open Positions</p>
                        <p className="text-sm font-bold text-blue-400">{stats.openTrades}</p>
                    </div>
                    <div className="bg-gray-900 p-4 text-center">
                        <p className="text-xs text-gray-400 mb-1">Closed Trades</p>
                        <p className="text-sm font-bold text-white">{stats.closedTrades}</p>
                    </div>
                    <div className="bg-gray-900 p-4 text-center">
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
