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
        { label: "MON", value: 50 },
        { label: "TUE", value: -70 },
        { label: "WED", value: 110 },
        { label: "THU", value: 150 },
        { label: "FRI", value: -90 },
    ];

    const days = (data || defaultData).map(d => ({
        ...d,
        value: Math.round(d.value) // Ensure integers to prevent overlap
    }));

    const maxValue = Math.max(...days.map(d => Math.abs(d.value)), 1);
    const bestDay = days.reduce((a, b) => a.value > b.value ? a : b);

    return (
        <div className="bg-[#06000a] border-[0.5px] border-[#e5e5e580] rounded-3xl p-6 relative overflow-hidden flex flex-col h-full min-h-[300px] group">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 relative z-10">
                <h3 className="text-[#e5e5e5] text-[18px] font-semibold tracking-[-0.6px]">
                    Daily Performance
                </h3>
                <div className="flex items-center gap-[8px]">
                    <span className="text-[#666] text-[11px] font-semibold uppercase whitespace-nowrap">BEST DAY</span>
                    <div className="bg-[#091c2b] border-[0.5px] border-[#04d97c80] px-[10px] py-[4px] rounded-[5px]">
                        <span className="text-[#04d97c] text-[11px] font-bold">{bestDay.label}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col relative z-10 w-full min-h-0">
                {/* Chart Area */}
                <div className="flex-[0.6] flex items-end justify-around relative mb-6 w-full px-2 mt-4">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-x-0 bottom-0 top-0 flex flex-col justify-between pointer-events-none opacity-20 h-full">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="w-full h-px border-t border-dashed border-[#808080]" />
                        ))}
                    </div>

                    {days.map((day, i) => {
                        const heightPercentage = (Math.abs(day.value) / maxValue) * 100;
                        const isPositive = day.value >= 0;

                        return (
                            <div key={day.label} className="relative flex flex-col items-center w-[16%] h-full justify-end group">
                                <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(heightPercentage, 4)}%` }}
                                    transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                                    className="w-full rounded-t-[8px] relative z-10"
                                    style={{
                                        background: isPositive 
                                            ? "linear-gradient(180deg, #05d97c 0%, #03a65e 100%)" 
                                            : "linear-gradient(180deg, #ff5666 0%, #c43a48 100%)",
                                        boxShadow: isPositive 
                                            ? "0 4px 15px rgba(5, 217, 124, 0.2)" 
                                            : "0 4px 15px rgba(255, 86, 102, 0.2)"
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Values and Labels Row */}
                <div className="flex justify-around items-center w-full px-2">
                    {days.map((day) => {
                        const isPositive = day.value >= 0;
                        return (
                            <div key={day.label} className="flex flex-col items-center gap-2 w-[16%]">
                                <span 
                                    className="text-[13px] lg:text-[16px] font-bold tracking-tight text-center"
                                    style={{ color: isPositive ? '#04d97c' : '#ff5666' }}
                                >
                                    {isPositive ? '+' : ''}{day.value}
                                </span>
                                <span className="text-[#808080] text-[10px] lg:text-[13px] font-medium uppercase tracking-wider">
                                    {day.label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Background Glows (Approximate) */}
            <div className="absolute top-[152px] left-[357px] w-[511px] h-[511px] bg-[#04d97c0a] rounded-full blur-[100px] pointer-events-none" />
        </div>
    );
}
