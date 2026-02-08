"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import { fetchFromBackend } from "@/lib/backend-api";

interface DayData {
    date: number;
    pnl: number;
    trades: number;
    isProfit: boolean;
    isToday: boolean;
}

interface TradeMonthlyCalendarProps {
    trades?: any[];
    isPublic?: boolean;
}

export default function TradeMonthlyCalendar({ trades: initialTrades, isPublic }: TradeMonthlyCalendarProps = {}) {
    const accountContext = isPublic ? null : useAccount();
    const selectedAccount = accountContext?.selectedAccount;
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarData, setCalendarData] = useState<DayData[]>([]);
    const [loading, setLoading] = useState(true);
    const [monthStats, setMonthStats] = useState({
        totalPnL: 0,
        totalTrades: 0,
        winningDays: 0,
        losingDays: 0,
    });

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    useEffect(() => {
        if (isPublic && initialTrades) {
            processTrades(initialTrades);
            return;
        }
        if (selectedAccount) {
            fetchTradeData();
        }
    }, [currentDate, selectedAccount, initialTrades, isPublic]);

    const processTrades = (tradeList: any[]) => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const days: DayData[] = [];
        const today = new Date();
        const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push({ date: 0, pnl: 0, trades: 0, isProfit: false, isToday: false });
        }

        let tradesByDay: { [key: number]: { pnl: number; count: number } } = {};

        tradeList.forEach((trade: any) => {
            const tradeDate = new Date(trade.close_time || trade.open_time);
            const day = tradeDate.getDate();
            if (tradeDate.getMonth() === month && tradeDate.getFullYear() === year) {
                if (!tradesByDay[day]) {
                    tradesByDay[day] = { pnl: 0, count: 0 };
                }
                const grossPnl = trade.profit_loss || 0;
                const commission = trade.commission || 0;
                const swap = trade.swap || 0;
                const netPnl = grossPnl + commission + swap;

                tradesByDay[day].pnl += netPnl;
                tradesByDay[day].count += 1;
            }
        });

        let totalPnL = 0;
        let totalTrades = 0;
        let winningDays = 0;
        let losingDays = 0;

        for (let day = 1; day <= daysInMonth; day++) {
            const dayData = tradesByDay[day] || { pnl: 0, count: 0 };
            const isToday = isCurrentMonth && today.getDate() === day;

            if (dayData.pnl > 0) winningDays++;
            if (dayData.pnl < 0) losingDays++;

            if (dayData.count > 0) {
                totalPnL += dayData.pnl;
                totalTrades += dayData.count;
            }

            days.push({
                date: day,
                pnl: dayData.pnl,
                trades: dayData.count,
                isProfit: dayData.pnl > 0,
                isToday,
            });
        }

        setMonthStats({ totalPnL, totalTrades, winningDays, losingDays });
        setCalendarData(days);
        setLoading(false);
    };

    const fetchTradeData = async () => {
        setLoading(true);
        try {
            // Generate calendar days for current month
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth();
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const daysInMonth = lastDay.getDate();
            const startingDayOfWeek = firstDay.getDay();

            const days: DayData[] = [];
            const today = new Date();
            const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

            // Add empty cells for days before month starts
            for (let i = 0; i < startingDayOfWeek; i++) {
                days.push({ date: 0, pnl: 0, trades: 0, isProfit: false, isToday: false });
            }

            // Fetch Data
            let tradesByDay: { [key: number]: { pnl: number; count: number } } = {};

            try {
                const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

                // Use backend API
                // Ensure accountId is present
                if (selectedAccount?.id) {
                    const result = await fetchFromBackend(`/api/dashboard/calendar?month=${monthStr}&accountId=${selectedAccount.id}`);
                    const tradeList = result.trades || [];

                    tradeList.forEach((trade: any) => {
                        const tradeDate = new Date(trade.close_time || trade.open_time);
                        const day = tradeDate.getDate();
                        // Only count if it belongs to this month (fetch should filter, but safety check)
                        if (tradeDate.getMonth() === month && tradeDate.getFullYear() === year) {
                            if (!tradesByDay[day]) {
                                tradesByDay[day] = { pnl: 0, count: 0 };
                            }
                            const grossPnl = trade.profit_loss || 0;
                            const commission = trade.commission || 0;
                            const swap = trade.swap || 0;
                            const netPnl = grossPnl + commission + swap;

                            tradesByDay[day].pnl += netPnl;
                            tradesByDay[day].count += 1;
                        }
                    });
                }
            } catch (error) {
                console.error("Failed to fetch calendar data", error);
                // Continue with empty data so grid still renders
            }

            // Calculate month stats and fill grid
            let totalPnL = 0;
            let totalTrades = 0;
            let winningDays = 0;
            let losingDays = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const dayData = tradesByDay[day] || { pnl: 0, count: 0 };
                const isToday = isCurrentMonth && today.getDate() === day;

                if (dayData.pnl > 0) winningDays++;
                if (dayData.pnl < 0) losingDays++;

                // Update stats only if there was activity? 
                // Or sum of PnL is enough.
                if (dayData.count > 0) {
                    totalPnL += dayData.pnl;
                    totalTrades += dayData.count;
                }

                days.push({
                    date: day,
                    pnl: dayData.pnl,
                    trades: dayData.count,
                    isProfit: dayData.pnl > 0,
                    isToday,
                });
            }

            setMonthStats({ totalPnL, totalTrades, winningDays, losingDays });
            setCalendarData(days);

        } catch (error) {
            console.error("Critical error in trade calendar", error);
        } finally {
            setLoading(false);
        }
    };


    const changeMonth = (direction: number) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    };

    const getDayColor = (day: DayData) => {
        if (day.date === 0) return "";
        if (day.isToday) return "border-blue-400 bg-blue-500/10";
        if (day.trades === 0) return "border-white/5 bg-black/20";
        if (day.isProfit) return "border-green-500/30 bg-green-500/10";
        return "border-red-500/30 bg-red-500/10";
    };

    if (loading) {
        return (
            <div className="bg-[#050923] border border-white/10 rounded-xl p-6 animate-pulse">
                <div className="h-6 bg-white/5 rounded w-1/3 mb-4"></div>
                <div className="h-64 bg-white/5 rounded"></div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-[#050923] border border-white/10 rounded-xl p-4 sm:p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-4 sm:mb-6">
                <div className="flex items-center gap-2">
                    <Calendar className="text-blue-400" size={18} />
                    <h3 className="font-bold text-white text-sm sm:text-base">Trade Calendar</h3>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="px-2 sm:px-3 py-1 bg-white/5 active:bg-white/10 rounded-lg text-xs sm:text-sm font-medium transition-all touch-manipulation"
                    >
                        ←
                    </button>
                    <span className="text-xs sm:text-sm font-bold text-white min-w-[100px] sm:min-w-[140px] text-center">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button
                        onClick={() => changeMonth(1)}
                        className="px-2 sm:px-3 py-1 bg-white/5 active:bg-white/10 rounded-lg text-xs sm:text-sm font-medium transition-all touch-manipulation"
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Month Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4 sm:mb-6">
                <div className="bg-black/20 rounded-lg p-2 sm:p-3 border border-white/5">
                    <p className="text-[9px] sm:text-[10px] text-gray-400 mb-0.5 sm:mb-1">Total P&L</p>
                    <p className={`text-sm sm:text-lg font-bold ${monthStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${monthStats.totalPnL.toFixed(2)}
                    </p>
                </div>
                <div className="bg-black/20 rounded-lg p-2 sm:p-3 border border-white/5">
                    <p className="text-[9px] sm:text-[10px] text-gray-400 mb-0.5 sm:mb-1">Trades</p>
                    <p className="text-sm sm:text-lg font-bold text-white">{monthStats.totalTrades}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2 sm:p-3 border border-white/5">
                    <p className="text-[9px] sm:text-[10px] text-gray-400 mb-0.5 sm:mb-1">Win Days</p>
                    <p className="text-sm sm:text-lg font-bold text-green-400">{monthStats.winningDays}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-2 sm:p-3 border border-white/5">
                    <p className="text-[9px] sm:text-[10px] text-gray-400 mb-0.5 sm:mb-1">Loss Days</p>
                    <p className="text-sm sm:text-lg font-bold text-red-400">{monthStats.losingDays}</p>
                </div>
            </div>

            {/* Calendar Grid - Scrollable on mobile */}
            <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
                <div className="min-w-[320px]">
                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                        {dayNames.map((day) => (
                            <div key={day} className="text-center text-[10px] sm:text-xs font-bold text-gray-500 py-1 sm:py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {calendarData.map((day, idx) => (
                            <div
                                key={idx}
                                className={`
                    aspect-square rounded-lg border transition-all relative
                    ${getDayColor(day)}
                    ${day.date !== 0 ? 'active:scale-105 cursor-pointer touch-manipulation' : ''}
                  `}
                            >
                                {day.date !== 0 && (
                                    <div className="p-1 sm:p-2 h-full flex flex-col justify-between">
                                        <span className="text-[10px] sm:text-xs font-bold text-white">{day.date}</span>
                                        {day.trades > 0 && (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[8px] sm:text-[10px] text-gray-400 hidden sm:block">{day.trades} trades</span>
                                                <div className="flex items-center gap-0.5">
                                                    {day.isProfit ? (
                                                        <TrendingUp size={8} className="text-green-400 sm:w-[10px] sm:h-[10px]" />
                                                    ) : day.pnl < 0 ? (
                                                        <TrendingDown size={8} className="text-red-400 sm:w-[10px] sm:h-[10px]" />
                                                    ) : (
                                                        <Minus size={8} className="text-gray-400 sm:w-[10px] sm:h-[10px]" />
                                                    )}
                                                    <span className={`text-[8px] sm:text-[10px] font-bold ${day.isProfit ? 'text-green-400' : day.pnl < 0 ? 'text-red-400' : 'text-gray-400'
                                                        }`}>
                                                        ${day.pnl.toFixed(0)}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs">
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded border border-green-500/30 bg-green-500/10"></div>
                    <span className="text-gray-400">Winning Day</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded border border-red-500/30 bg-red-500/10"></div>
                    <span className="text-gray-400">Losing Day</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded border border-blue-400 bg-blue-500/10"></div>
                    <span className="text-gray-400">Today</span>
                </div>
            </div>
        </motion.div>
    );
}
