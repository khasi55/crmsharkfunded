"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface DayData {
    date: number;
    pnl: number;
    trades: number;
    isProfit: boolean;
    isToday: boolean;
}

export default function TradeMonthlyCalendar() {
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
        fetchTradeData();
    }, [currentDate]);

    const fetchTradeData = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

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

            // If user is logged in, fetch real trade data
            if (user) {
                const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
                const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

                const { data: trades } = await supabase
                    .from('trades')
                    .select('open_time, profit_loss, close_time')
                    .eq('user_id', user.id)
                    .gte('open_time', startDate)
                    .lte('open_time', endDate + 'T23:59:59');

                // Aggregate trades by day
                const tradesByDay: { [key: number]: { pnl: number; count: number } } = {};
                trades?.forEach((trade) => {
                    const tradeDate = new Date(trade.open_time);
                    const day = tradeDate.getDate();
                    if (!tradesByDay[day]) {
                        tradesByDay[day] = { pnl: 0, count: 0 };
                    }
                    tradesByDay[day].pnl += trade.profit_loss || 0;
                    tradesByDay[day].count += 1;
                });

                // Calculate month stats
                let totalPnL = 0;
                let totalTrades = 0;
                let winningDays = 0;
                let losingDays = 0;

                // Add days with data
                for (let day = 1; day <= daysInMonth; day++) {
                    const dayData = tradesByDay[day] || { pnl: 0, count: 0 };
                    const isToday = isCurrentMonth && today.getDate() === day;

                    if (dayData.pnl > 0) winningDays++;
                    if (dayData.pnl < 0) losingDays++;
                    totalPnL += dayData.pnl;
                    totalTrades += dayData.count;

                    days.push({
                        date: day,
                        pnl: dayData.pnl,
                        trades: dayData.count,
                        isProfit: dayData.pnl > 0,
                        isToday,
                    });
                }

                setMonthStats({ totalPnL, totalTrades, winningDays, losingDays });
            } else {
                // Demo data for non-logged in users
                for (let day = 1; day <= daysInMonth; day++) {
                    const isToday = isCurrentMonth && today.getDate() === day;
                    const randomPnL = Math.random() > 0.5 ? Math.random() * 500 : -Math.random() * 300;
                    const randomTrades = Math.floor(Math.random() * 5);

                    days.push({
                        date: day,
                        pnl: day < today.getDate() ? randomPnL : 0,
                        trades: day < today.getDate() ? randomTrades : 0,
                        isProfit: randomPnL > 0,
                        isToday,
                    });
                }
                setMonthStats({ totalPnL: 2340, totalTrades: 45, winningDays: 12, losingDays: 8 });
            }

            setCalendarData(days);
        } catch (error) {
            console.error('Error fetching trade data:', error);
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
            <div className="bg-gray-900 border border-white/10 rounded-xl p-6 animate-pulse">
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
            className="bg-gray-900 border border-white/10 rounded-xl p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Calendar className="text-blue-400" size={20} />
                    <h3 className="font-bold text-white">Trade Calendar</h3>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-all"
                    >
                        ←
                    </button>
                    <span className="text-sm font-bold text-white min-w-[140px] text-center">
                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                    </span>
                    <button
                        onClick={() => changeMonth(1)}
                        className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-all"
                    >
                        →
                    </button>
                </div>
            </div>

            {/* Month Stats */}
            <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-gray-400 mb-1">Total P&L</p>
                    <p className={`text-lg font-bold ${monthStats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${Math.abs(monthStats.totalPnL).toFixed(0)}
                    </p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-gray-400 mb-1">Trades</p>
                    <p className="text-lg font-bold text-white">{monthStats.totalTrades}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-gray-400 mb-1">Win Days</p>
                    <p className="text-lg font-bold text-green-400">{monthStats.winningDays}</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3 border border-white/5">
                    <p className="text-[10px] text-gray-400 mb-1">Loss Days</p>
                    <p className="text-lg font-bold text-red-400">{monthStats.losingDays}</p>
                </div>
            </div>

            {/* Calendar Grid */}
            <div>
                {/* Day Names */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                    {dayNames.map((day) => (
                        <div key={day} className="text-center text-xs font-bold text-gray-500 py-2">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-2">
                    {calendarData.map((day, idx) => (
                        <div
                            key={idx}
                            className={`
                aspect-square rounded-lg border transition-all relative
                ${getDayColor(day)}
                ${day.date !== 0 ? 'hover:scale-105 cursor-pointer' : ''}
              `}
                        >
                            {day.date !== 0 && (
                                <div className="p-2 h-full flex flex-col justify-between">
                                    <span className="text-xs font-bold text-white">{day.date}</span>
                                    {day.trades > 0 && (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] text-gray-400">{day.trades} trades</span>
                                            <div className="flex items-center gap-0.5">
                                                {day.isProfit ? (
                                                    <TrendingUp size={10} className="text-green-400" />
                                                ) : day.pnl < 0 ? (
                                                    <TrendingDown size={10} className="text-red-400" />
                                                ) : (
                                                    <Minus size={10} className="text-gray-400" />
                                                )}
                                                <span className={`text-[10px] font-bold ${day.isProfit ? 'text-green-400' : day.pnl < 0 ? 'text-red-400' : 'text-gray-400'
                                                    }`}>
                                                    ${Math.abs(day.pnl).toFixed(0)}
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

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-green-500/30 bg-green-500/10"></div>
                    <span className="text-gray-400">Winning Day</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-red-500/30 bg-red-500/10"></div>
                    <span className="text-gray-400">Losing Day</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded border border-blue-400 bg-blue-500/10"></div>
                    <span className="text-gray-400">Today</span>
                </div>
            </div>
        </motion.div>
    );
}
