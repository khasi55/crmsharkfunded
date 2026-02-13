"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { cn } from "@/lib/utils";
import { getEquityCurveData } from "@/app/actions/dashboard";
import { useAccount } from "@/contexts/AccountContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";

interface EquityPoint {
    date: string;
    equity: number;
    profit: number;
    displayDate: string;
}

type TimePeriod = '1D' | '1W' | '1M' | '3M' | 'ALL';

interface EquityCurveChartProps {
    account?: any;
    trades?: any[];
    initialBalance?: number;
    initialData?: EquityPoint[];
    isPublic?: boolean;
}

export default function EquityCurveChart({ account, trades: initialTrades, initialBalance, initialData, isPublic }: EquityCurveChartProps = {}) {
    const accountContext = isPublic ? null : useAccount();
    const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
    const selectedAccount = account || accountContext?.selectedAccount;
    const [data, setData] = useState<EquityPoint[]>(initialData || []);
    const [loading, setLoading] = useState(true);
    const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('1M');
    const [stats, setStats] = useState({
        currentEquity: initialData?.[initialData.length - 1]?.equity || selectedAccount?.initial_balance || 100000,
        totalProfit: initialData?.[initialData.length - 1]?.profit || 0,
        percentChange: 0,
        highestEquity: initialData ? Math.max(...initialData.map(d => d.equity)) : (selectedAccount?.initial_balance || 100000),
    });

    useEffect(() => {
        if (isPublic && initialData) {
            setLoading(false);
            return;
        }

        const sourceTrades = initialTrades || dashboardData.trades;
        if (sourceTrades && selectedAccount) {
            calculateChart(sourceTrades, selectedAccount);
            setLoading(false);
        } else if (dashboardLoading.global) {
            setLoading(true);
        }
    }, [selectedPeriod, selectedAccount, dashboardData.trades, dashboardLoading.global, initialData, isPublic]);

    const calculateChart = (allTrades: any[], account: any) => {
        const initialBalance = account.initial_balance || 100000;
        const now = new Date();
        const startDate = new Date();

        switch (selectedPeriod) {
            case '1D': startDate.setDate(now.getDate() - 1); break;
            case '1W': startDate.setDate(now.getDate() - 7); break;
            case '1M': startDate.setDate(now.getDate() - 30); break;
            case '3M': startDate.setDate(now.getDate() - 90); break;
            case 'ALL': startDate.setFullYear(2000); break;
            default: startDate.setDate(now.getDate() - 30);
        }

        // 1. Separate Prior Trades from Current Period Trades (Only closed trades)
        const closedTrades = allTrades
            .filter(t => !!t.close_time)
            .sort((a, b) => new Date(a.close_time).getTime() - new Date(b.close_time).getTime());

        const priorTrades = selectedPeriod === 'ALL' ? [] : closedTrades.filter(t => new Date(t.close_time) < startDate);
        const periodTrades = selectedPeriod === 'ALL' ? closedTrades : closedTrades.filter(t => new Date(t.close_time) >= startDate);

        let runningProfit = priorTrades.reduce((sum, t) => sum + (Number(t.profit_loss) || 0) + (Number(t.commission || 0) * 2) + (Number(t.swap) || 0), 0);
        let runningEquity = initialBalance + runningProfit;

        // 2. Build Curve
        const equityCurve: EquityPoint[] = [];

        // Start point
        equityCurve.push({
            date: startDate.toISOString(),
            equity: runningEquity,
            profit: runningProfit,
            displayDate: formatDate(startDate, selectedPeriod)
        });

        periodTrades.forEach(t => {
            const netPnl = (Number(t.profit_loss) || 0) + (Number(t.commission || 0) * 2) + (Number(t.swap) || 0);
            runningEquity += netPnl;
            runningProfit += netPnl;

            const d = new Date(t.close_time);
            equityCurve.push({
                date: t.close_time,
                equity: runningEquity,
                profit: runningProfit,
                displayDate: formatDate(d, selectedPeriod)
            });
        });

        // 3. Handle Breach/Latest State
        if (account.status === 'breached' || account.status === 'failed' || (periodTrades.length === 0 && priorTrades.length === 0)) {
            const currentEquity = Number(account.equity || account.current_equity || runningEquity);
            const currentProfit = currentEquity - initialBalance;

            // If the latest point isn't already close to current equity, append the final status
            const lastPoint = equityCurve[equityCurve.length - 1];
            if (!lastPoint || Math.abs(lastPoint.equity - currentEquity) > 1) {
                equityCurve.push({
                    date: now.toISOString(),
                    equity: currentEquity,
                    profit: currentProfit,
                    displayDate: formatDate(now, selectedPeriod)
                });
            }
        }

        setData(equityCurve);

        const latest = equityCurve[equityCurve.length - 1];
        setStats({
            currentEquity: latest?.equity || initialBalance,
            totalProfit: latest?.profit || 0,
            percentChange: (((latest?.equity || initialBalance) - initialBalance) / initialBalance) * 100,
            highestEquity: Math.max(...equityCurve.map(d => d.equity), initialBalance)
        });
    };

    const fetchEquityData = async () => {
        // Obsolete: replaced by calculateChart
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
                <div className="bg-[#050923]/90 border border-white/10 rounded-lg p-3 shadow-2xl backdrop-blur-xl">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">{data.displayDate}</p>
                    <p className="text-xl font-bold text-white tracking-tight">${data.equity.toLocaleString()}</p>
                    <p className={`text-xs font-bold ${data.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
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

    // Derived stats for display consistency
    const initialBal = selectedAccount?.initial_balance || 100000;
    const currentEquityVal = (selectedAccount?.equity && selectedAccount.equity > 0) ? selectedAccount.equity : stats.currentEquity;
    const currentPnL = currentEquityVal - initialBal;
    const currentPercent = (currentPnL / initialBal) * 100;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-[#050923] border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl shadow-blue-900/20"
        >
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 p-4 sm:p-6 md:p-8 pb-2 relative z-10">
                <div>
                    <div className="flex items-center gap-2 mb-3 sm:mb-4">
                        <Activity size={16} className="text-blue-400 sm:w-[18px] sm:h-[18px]" />
                        <h3 className="font-bold text-base sm:text-lg text-white font-sans uppercase tracking-wider">Equity Curve</h3>
                    </div>
                    <div className="flex flex-col">
                        <p className="text-xs sm:text-sm text-gray-500 font-bold uppercase tracking-widest mb-1 font-sans">Current Equity</p>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                            <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tighter font-sans">
                                ${currentEquityVal.toLocaleString()}
                            </p>
                            <div className={cn(
                                "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md border text-xs sm:text-sm font-bold whitespace-nowrap",
                                currentPnL >= 0
                                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                                    : "bg-red-500/10 text-red-400 border-red-500/20"
                            )}>
                                {currentPnL >= 0 ? <TrendingUp size={12} className="sm:w-[14px] sm:h-[14px]" /> : <TrendingDown size={12} className="sm:w-[14px] sm:h-[14px]" />}
                                <span className="">{currentPnL >= 0 ? '+' : ''}${Math.abs(currentPnL).toLocaleString()}</span>
                                <span className={cn(
                                    "text-[10px] ml-1 opacity-70",
                                    currentPnL >= 0 ? "text-green-400" : "text-red-400"
                                )}>
                                    ({currentPercent.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-600 font-bold uppercase tracking-widest font-sans">TOTAL PERFORMANCE DATA</p>
                    </div>
                </div>

                {/* Time Period Selector - Scrollable on mobile */}
                <div className="overflow-x-auto -mx-2 sm:mx-0 px-2 sm:px-0">
                    <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 min-w-fit">
                        {(['1D', '1W', '1M', '3M', 'ALL'] as TimePeriod[]).map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={cn(
                                    "px-3 sm:px-4 py-1.5 rounded-md text-[10px] font-black tracking-widest uppercase transition-all whitespace-nowrap touch-manipulation font-sans",
                                    selectedPeriod === period
                                        ? "bg-blue-600 text-white shadow-lg shadow-blue-500/40"
                                        : "text-gray-500 hover:text-gray-300"
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
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis
                            dataKey="displayDate"
                            stroke="#374151"
                            tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            domain={['auto', 'auto']}
                            stroke="#374151"
                            tick={{ fill: '#4b5563', fontSize: 10, fontWeight: 700 }}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`}
                            dx={-10}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#ffffff10', strokeWidth: 1 }} />
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
