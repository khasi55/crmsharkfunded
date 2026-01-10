"use client";

import { motion } from "framer-motion";

interface DayData {
    label: string;
    value: number;
    color?: string; // Optional, can be calculated
}

interface DayPerformanceChartProps {
    data?: DayData[];
}

export default function DayPerformanceChart({ data }: DayPerformanceChartProps) {
    const defaultData = [
        { label: "Mon", value: 0 },
        { label: "Tue", value: 0 },
        { label: "Wed", value: 0 },
        { label: "Thu", value: 0 },
        { label: "Fri", value: 0 },
    ];

    const days = data || defaultData;


    const maxValue = Math.max(...days.map(d => Math.abs(d.value)));
    const bestDay = days.reduce((a, b) => a.value > b.value ? a : b);

    return (
        <div className="flex flex-col h-full justify-between pb-2 bg-[#050923] rounded-2xl border border-white/5 p-6 relative overflow-hidden group">
            <h3 className="text-white font-medium text-lg relative z-10 flex justify-between items-center mb-6">
                Daily Performance
                <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-semibold text-gray-500">Best Day</span>
                    <span className="text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md">{bestDay.label}</span>
                </div>
            </h3>

            <div className="flex-1 flex items-end justify-between gap-4 mt-2 px-2 relative">
                {/* Background Grid */}
                <div className="absolute inset-0 z-0 flex flex-col justify-between pointer-events-none opacity-20">
                    <div className="w-full h-px bg-dashed border-t border-gray-600"></div>
                    <div className="w-full h-px bg-dashed border-t border-gray-600"></div>
                    <div className="w-full h-px bg-dashed border-t border-gray-600"></div>
                </div>

                {days.map((day, i) => {
                    const height = (Math.abs(day.value) / maxValue) * 100;
                    const isPositive = day.value >= 0;

                    return (
                        <div key={day.label} className="flex flex-col items-center gap-3 flex-1 group z-10">
                            <div className="w-full h-[150px] flex items-end justify-center rounded-2xl bg-[#0a0f1c] border border-white/5 overflow-hidden relative shadow-inner">
                                {/* Bar */}
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${height}%` }}
                                    transition={{ duration: 0.8, delay: i * 0.1, type: "spring", stiffness: 100 }}
                                    className={`w-1/2 rounded-t-lg relative group-hover:w-3/4 transition-all duration-300 ${isPositive ? 'bg-gradient-to-t from-green-600 to-green-400' : 'bg-gradient-to-t from-red-600 to-red-400'}`}
                                >
                                    {/* Top Glow */}
                                    <div className={`absolute top-0 left-0 right-0 h-[2px] ${isPositive ? 'bg-green-300 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-300 shadow-[0_0_10px_rgba(239,68,68,0.8)]'}`} />
                                </motion.div>
                            </div>

                            {/* Labels */}
                            <div className="text-center">
                                <p className={`text-[10px] font-bold ${isPositive ? 'text-green-400' : 'text-red-400'} mb-0.5`}>
                                    {isPositive ? '+' : ''}${Math.abs(day.value) >= 1000 ? `${(Math.abs(day.value) / 1000).toFixed(1)}k` : Math.abs(day.value)}
                                </p>
                                <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold group-hover:text-white transition-colors">{day.label}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
