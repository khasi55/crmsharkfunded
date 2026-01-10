"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { getEquityCurveData } from "@/app/actions/dashboard";

interface EquityPoint {
    date: string;
    equity: number;
    profit: number;
    displayDate: string;
}

type TimePeriod = '1D' | '1W' | '1M' | '3M' | 'ALL';

import { useAccount } from "@/contexts/AccountContext";

export default function EquityCurveChart() {
    const { selectedAccount } = useAccount();
    const [data, setData] = useState<EquityPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
    const [stats, setStats] = useState({
        currentEquity: selectedAccount?.initial_balance || 100000,
        totalProfit: 0,
        percentChange: 0,
        highestEquity: selectedAccount?.initial_balance || 100000,
    });

    useEffect(() => {
        fetchEquityData();
    }, [selectedPeriod, selectedAccount]);

    const fetchEquityData = async () => {
        try {
            if (!selectedAccount) {
                setLoading(false);
                return;
            }

            const startingBalance = selectedAccount.initial_balance || 100000;
            const data = await getEquityCurveData(selectedAccount.id, startingBalance, selectedPeriod);

            if (data && data.length > 0) {
                // Process server data
                // Calculate stats from the returned curve
                const latest = data[data.length - 1];
                const highest = Math.max(...data.map((d: any) => d.equity));
                const percentChange = ((latest.equity - startingBalance) / startingBalance) * 100;

                setStats({
                    currentEquity: latest.equity,
                    totalProfit: latest.profit,
                    percentChange,
                    highestEquity: highest
                });
                setData(data);
                setLoading(false);
                return;
            }

            // Fallback: If no server data (new account), show flat line
            const now = new Date();
            setData([{
                date: now.toISOString(),
                equity: startingBalance,
                profit: 0,
                displayDate: formatDate(now, selectedPeriod)
            }]);
            setStats({
                currentEquity: startingBalance,
                totalProfit: 0,
                percentChange: 0,
                highestEquity: startingBalance
            });

        } catch (error) {
            console.error('Error fetching equity data:', error);
            setData([]);
        } finally {
            setLoading(false);
        }
    };



    const formatDate = (date: Date, period: TimePeriod): string => {
        if (period === '1D') {
            return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        } else if (period === '1W') {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-gray-900 border border-white/20 rounded-lg p-3 shadow-xl">
                    <p className="text-xs text-gray-400 mb-1">{data.displayDate}</p>
                    <p className="text-lg font-bold text-white">${data.equity.toLocaleString()}</p>
                    <p className={`text-xs font-medium ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.profit >= 0 ? '+' : ''}${data.profit.toLocaleString()}
                    </p>
                </div>
            );
        }
        return null;
    };

    if (loading) {
        return (
            <div className="bg-gray-900 border border-white/10 rounded-xl p-6 h-[400px] animate-pulse">
                <div className="h-6 bg-white/5 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-white/5 rounded"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 }}
            className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden"
        >
            {/* Header */}
            <div className="flex justify-between items-center p-6 pb-4">
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Activity size={20} className="text-blue-400" />
                        <h3 className="font-bold text-lg text-white">Equity Curve</h3>
                    </div>
                    <div className="flex items-baseline gap-4">
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Current Balance</p>
                            <p className="text-2xl font-bold text-white">${stats.currentEquity.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 mb-1">Total P&L</p>
                            <div className="flex items-center gap-1">
                                {stats.totalProfit >= 0 ? (
                                    <TrendingUp size={16} className="text-green-400" />
                                ) : (
                                    <TrendingDown size={16} className="text-red-400" />
                                )}
                                <p className={`text-lg font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {stats.totalProfit >= 0 ? '+' : ''}${Math.abs(stats.totalProfit).toLocaleString()}
                                </p>
                                <span className={`text-sm ${stats.percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ({stats.percentChange >= 0 ? '+' : ''}{stats.percentChange.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Time Period Selector */}
                <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                    {(['1D', '1W', '1M', '3M', 'ALL'] as TimePeriod[]).map((period) => (
                        <button
                            key={period}
                            onClick={() => setSelectedPeriod(period)}
                            className={cn(
                                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                                selectedPeriod === period
                                    ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                                    : "text-gray-400 hover:text-gray-300 hover:bg-white/5"
                            )}
                        >
                            {period}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart */}
            <div className="px-6 pb-6">
                <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                            tickLine={{ stroke: '#374151' }}
                        />
                        <YAxis
                            stroke="#6b7280"
                            tick={{ fill: '#9ca3af', fontSize: 11 }}
                            tickLine={{ stroke: '#374151' }}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="equity"
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#equityGradient)"
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-3 gap-px bg-white/5 border-t border-white/10">
                <div className="bg-gray-900 p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Peak Balance</p>
                    <p className="text-sm font-bold text-white">${stats.highestEquity.toLocaleString()}</p>
                </div>
                <div className="bg-gray-900 p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Total Trades</p>
                    <p className="text-sm font-bold text-white">{data.length - 1}</p>
                </div>
                <div className="bg-gray-900 p-4 text-center">
                    <p className="text-xs text-gray-400 mb-1">Avg per Trade</p>
                    <p className={`text-sm font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${data.length > 1 ? Math.abs(Math.round(stats.totalProfit / (data.length - 1))).toLocaleString() : 0}
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
