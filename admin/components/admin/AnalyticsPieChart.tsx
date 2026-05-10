"use client";

import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useState, useEffect } from 'react';

interface PieChartDataPoint {
    name: string;
    value: number;
    color?: string;
}

interface AnalyticsPieChartProps {
    data: PieChartDataPoint[];
    title: string;
    subtitle: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1', '#14b8a6'];

export function AnalyticsPieChart({ data, title, subtitle }: AnalyticsPieChartProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sort data and assign colors if not provided
    const chartData = [...(data || [])].sort((a, b) => b.value - a.value).map((item, index) => ({
        ...item,
        color: item.color || COLORS[index % COLORS.length]
    }));

    return (
        <div className="bg-white rounded-2xl border border-gray-200/60 p-4 md:p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] w-full h-full min-h-[350px]">
            <div className="mb-4 md:mb-6">
                <h2 className="text-base md:text-lg font-bold tracking-tight text-gray-900">{title}</h2>
                <p className="text-xs md:text-sm font-medium text-gray-500 mt-1">{subtitle}</p>
            </div>

            <div className="h-[280px] md:h-[300px] w-full flex items-center justify-center">
                {!isMounted ? (
                    <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                ) : chartData.length === 0 ? (
                    <div className="text-center">
                        <p className="text-sm text-gray-400 font-medium italic">No data available</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height="100%" key={isMobile ? 'mobile' : 'desktop'}>
                        <RechartsPieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={isMobile ? 45 : 60}
                                outerRadius={isMobile ? 75 : 100}
                                paddingAngle={5}
                                dataKey="value"
                                strokeWidth={0}
                                animationDuration={1000}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#ffffff',
                                    borderRadius: '12px',
                                    border: '1px solid #f1f5f9',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                }}
                                itemStyle={{ fontWeight: '600', fontSize: '12px' }}
                            />
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconType="circle"
                                wrapperStyle={{
                                    paddingTop: isMobile ? '10px' : '20px',
                                    fontSize: isMobile ? '10px' : '12px',
                                    fontWeight: '500'
                                }}
                            />
                        </RechartsPieChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
