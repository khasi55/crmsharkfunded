"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity } from "lucide-react";

interface BalanceHistoryChartProps {
    data?: { date: string; value: number }[];
}

export default function BalanceHistoryChart({ data }: BalanceHistoryChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="lg:col-span-4 bg-[#050923] border border-white/5 rounded-2xl p-6 relative overflow-hidden group min-h-[350px] flex flex-col">
                <h3 className="text-white font-medium text-lg mb-4 relative z-10 flex items-center justify-between">
                    Balance History
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider bg-white/5 px-2 py-0.5 rounded">All Time</span>
                </h3>
                <div className="flex-1 flex items-center justify-center text-gray-500 text-sm relative z-10 border border-dashed border-white/10 rounded-xl bg-[#0a0f1c]/50">
                    <div className="text-center">
                        <Activity className="w-8 h-8 text-gray-600 mb-2 mx-auto" />
                        <p className="text-gray-400 font-medium">No Data Available</p>
                    </div>
                </div>
            </div>
        );
    }

    const startBalance = data[0].value;
    const currentBalance = data[data.length - 1].value;
    const isProfit = currentBalance >= startBalance;

    return (
        <div className="lg:col-span-4 bg-[#050923] border border-white/5 rounded-2xl p-6 relative overflow-hidden group min-h-[350px] flex flex-col">
            <h3 className="text-white font-medium text-lg mb-4 relative z-10 flex items-center justify-between">
                Balance History
                <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider bg-white/5 px-2 py-0.5 rounded">All Time</span>
            </h3>

            <div className="flex-1 w-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={isProfit ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={isProfit ? "#22c55e" : "#ef4444"} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            hide
                        />
                        <YAxis
                            hide
                            domain={['auto', 'auto']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0a0f1c',
                                borderColor: 'rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                fontSize: '12px'
                            }}
                            itemStyle={{ color: '#fff' }}
                            formatter={(value: number) => [`$${value.toLocaleString()}`, 'Balance']}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke={isProfit ? "#22c55e" : "#ef4444"}
                            fillOpacity={1}
                            fill="url(#colorBalance)"
                            strokeWidth={2}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-between mt-4 px-2">
                <div>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Start</p>
                    <p className="text-sm font-bold text-gray-300">${startBalance.toLocaleString()}</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Current</p>
                    <p className={`text-sm font-bold ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
                        ${currentBalance.toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
