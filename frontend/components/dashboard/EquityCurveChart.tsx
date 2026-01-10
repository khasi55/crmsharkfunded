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
                <div className="bg-[#050923] border border-white/20 rounded-lg p-3 shadow-xl backdrop-blur-md">
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
            <div className="bg-[#050923] border border-white/10 rounded-2xl p-6 h-[400px] animate-pulse">
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
            className="bg-[#050923] border border-white/10 rounded-2xl overflow-hidden relative"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/5 blur-[100px] rounded-full translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 sm:p-6 md:p-8 pb-2 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Activity size={16} className="text-blue-400 sm:w-[18px] sm:h-[18px]" />
                        <h3 className="font-bold text-base sm:text-lg text-white">Equity Curve</h3>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-xs sm:text-sm text-gray-500 font-medium mb-1">Current Balance</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">${stats.currentEquity.toLocaleString()}</p>
                            <div className={cn(
                                "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full border text-xs sm:text-sm font-bold whitespace-nowrap",
                                stats.totalProfit >= 0
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                            )}>
                                {stats.totalProfit >= 0 ? <TrendingUp size={12} className="sm:w-[14px] sm:h-[14px]" /> : <TrendingDown size={12} className="sm:w-[14px] sm:h-[14px]" />}
                                <span className="text-xs sm:text-sm">{stats.totalProfit >= 0 ? '+' : ''}${Math.abs(stats.totalProfit).toLocaleString()}</span>
                                <span className={cn(
                                    "text-[10px] sm:text-xs ml-0.5",
                                    stats.totalProfit >= 0 ? "text-green-400/80" : "text-red-400/80"
                                )}>
                                    ({stats.percentChange.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-500 font-bold uppercase tracking-wider">TOTAL P&L</p>
                    </div>
                </div>

                {/* Time Period Selector - Scrollable on mobile */}
                <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                    <div className="flex bg-[#13161C] p-1 rounded-lg border border-white/5 min-w-fit">
                        {(['1D', '1W', '1M', '3M', 'ALL'] as TimePeriod[]).map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={cn(
                                    "px-3 sm:px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap touch-manipulation",
                                    selectedPeriod === period
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/25"
                                        : "text-gray-500 active:text-white active:bg-white/5"
                                )}
                            >
                                {period}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 pt-2 sm:pt-4 relative z-10">
                <ResponsiveContainer width="100%" height={280} className="sm:!h-[320px]">
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#374151"
                            tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#374151"
                            tick={{ fill: '#6b7280', fontSize: 11, fontWeight: 500 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff20', strokeWidth: 1 }} />
                        <Area
                            type="monotone"
                            dataKey="equity"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            fill="url(#equityGradient)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
