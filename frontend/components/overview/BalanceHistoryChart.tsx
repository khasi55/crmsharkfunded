"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Activity } from "lucide-react";

interface BalanceHistoryChartProps {
    data?: { date: string; value: number }[];
}

export default function BalanceHistoryChart({ data }: BalanceHistoryChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-full bg-[#06000a] border-[0.5px] border-[#e5e5e580] rounded-[32px] p-[32px] relative overflow-hidden flex flex-col min-h-[500px] lg:min-h-[630px]">
                <div className="flex items-center justify-between mb-8">
                    <h3 className="text-[#e5e5e5] text-[32px] font-semibold tracking-[-1.6px]">
                        Balance History
                    </h3>
                </div>
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm border-2 border-dashed border-white/10 rounded-xl bg-white/5">
                    <p className="text-gray-400 font-medium">No Data Available</p>
                </div>
            </div>
        );
    }

    const currentBalance = data[data.length - 1].value;

    const chartData = data.map(item => {
        const date = new Date(item.date);
        const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
        return {
            ...item,
            displayDate: isNaN(date.getTime()) ? item.date : dayNames[date.getDay()]
        };
    });

    return (
        <div className="h-full bg-[#06000a] border-[0.5px] border-[#e5e5e580] rounded-[32px] p-[32px] relative overflow-hidden flex flex-col gap-[32px] min-h-[500px] lg:min-h-[630px] group">
            {/* Header */}
            <div className="flex items-center justify-between relative z-10 w-full">
                <h3 className="text-[#e5e5e5] text-[32px] font-semibold tracking-[-1.6px]">
                    Balance History
                </h3>
                <div className="bg-[#20143d] px-[32px] py-[16px] rounded-[5px] cursor-pointer hover:bg-[#2a1b52] transition-colors">
                    <span className="text-[#757a90] text-[14px] font-semibold tracking-wider uppercase">ALL TIME</span>
                </div>
            </div>

            {/* Chart Container Area */}
            <div className="flex-1 flex flex-col w-full relative">
                {/* Plotting area with dashed border matching Figma Frame 44:21 */}
                <div className="flex-1 w-full bg-[rgba(8,6,16,0.2)] border-[1.734px] border-[#80808080] border-dashed rounded-[17.342px] relative overflow-hidden mb-[20px]">
                    {/* Current Balance inside the chart area */}
                    <div className="absolute right-[32px] top-[32px] z-20">
                        <p className="text-[#e5e5e5] text-[28px] font-semibold tracking-[-1.4px]">
                            ${new Intl.NumberFormat('en-US').format(currentBalance)}
                        </p>
                    </div>

                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chartData} margin={{ top: 60, right: 30, left: 20, bottom: 20 }}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <filter id="glow-purple" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="6" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                                <filter id="white-glow" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="4" result="blur" />
                                    <feMerge>
                                        <feMergeNode in="blur" />
                                        <feMergeNode in="SourceGraphic" />
                                    </feMerge>
                                </filter>
                            </defs>
                            
                            <CartesianGrid 
                                vertical={false} 
                                stroke="#808080" 
                                strokeDasharray="3 3" 
                                opacity={0.15} 
                            />

                            <XAxis hide />
                            
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#808080', fontSize: 13, fontWeight: 300 }}
                                dx={-5}
                                domain={['dataMin - 5000', 'dataMax + 5000']}
                                tickFormatter={(value) => new Intl.NumberFormat('en-US').format(value)}
                            />

                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#06000a',
                                    borderColor: 'rgba(229,229,229,0.2)',
                                    borderRadius: '12px',
                                    fontSize: '14px',
                                    color: '#e5e5e5'
                                }}
                                itemStyle={{ color: '#8b5cf6' }}
                                formatter={(value: number) => [`$${new Intl.NumberFormat('en-US').format(value)}`, 'Balance']}
                                labelStyle={{ color: '#808080', marginBottom: '4px' }}
                            />

                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#8b5cf6"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                                animationDuration={1500}
                                filter="url(#glow-purple)"
                                /* Custom Dot for the active point (white dot) */
                                activeDot={{ r: 6, fill: "#fff", stroke: "#8b5cf6", strokeWidth: 2, filter: "url(#white-glow)" }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* X-Axis Labels Row (outside the dashed frame) */}
                <div className="flex justify-between w-full px-2">
                    {['MON', 'TUE', 'WED', 'THU', 'FRI'].map(day => (
                        <span key={day} className="text-[#808080] text-[13px] font-medium uppercase opacity-80 w-8 text-center">
                            {day}
                        </span>
                    ))}
                </div>
            </div>
            
            {/* Background decorative glows matching Figma Ellipse IDs */}
            <div className="absolute top-[40px] left-[156px] w-[511px] h-[511px] bg-[#8b5cf615] rounded-full blur-[120px] pointer-events-none mix-blend-plus-lighter z-0" />
            <div className="absolute top-[551px] left-[493px] w-[210px] h-[210px] bg-[#8b5cf608] rounded-full blur-[100px] pointer-events-none mix-blend-plus-lighter z-0" />
        </div>
    );
}
