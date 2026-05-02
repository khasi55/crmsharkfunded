"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, ComposedChart, Line } from 'recharts';

import { useState, useEffect } from 'react';

interface FinancialDataPoint {
    date: string;
    rawDate: string;
    revenue: number;
    payouts: number;
    net: number;
    cumulativeEquity: number;
    newUsers: number;
    breachedAccounts?: number;
    cumulativeUsers: number;
}

interface FinancialChartProps {
    data: FinancialDataPoint[];
}

export function FinancialChart({ data }: FinancialChartProps) {
    const [view, setView] = useState<'cumulative' | 'daily' | 'breached'>('daily');
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

    return (
        <div className="bg-white rounded-2xl border border-gray-200/60 p-7 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] w-full block">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h2 className="text-lg font-bold tracking-tight text-gray-900">Platform Growth & Daily Volume</h2>
                    <p className="text-sm font-medium text-gray-500 mt-1">Client growth and daily cashflow</p>
                </div>
                <div className="flex bg-gray-50/80 rounded-xl p-1 shrink-0 self-start sm:self-auto border border-gray-100">
                    <button
                        onClick={() => setView('cumulative')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${view === 'cumulative'
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                    >
                        Client Curve
                    </button>
                    <button
                        onClick={() => setView('daily')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${view === 'daily'
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                    >
                        Daily Volume
                    </button>
                    <button
                        onClick={() => setView('breached')}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${view === 'breached'
                            ? 'bg-white text-gray-900 shadow-sm border border-gray-200/60'
                            : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                            }`}
                    >
                        Breached Curve
                    </button>
                </div>
            </div>

            <div className="h-[380px] w-full">
                {isMounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                    {view === 'cumulative' ? (
                        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                fontSize={12}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={12}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                tickMargin={12}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                                itemStyle={{ color: '#0f172a', fontWeight: '700', fontSize: '14px' }}
                                formatter={(value: any, name: string) => [value, name]}
                                labelStyle={{ color: '#64748b', marginBottom: '8px', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            />
                            <Bar dataKey="newUsers" name="New Clients" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                    ) : view === 'daily' ? (
                        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                fontSize={12}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={12}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `$${value / 1000}k`}
                                tickMargin={12}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                                itemStyle={{ color: '#0f172a', fontWeight: '600', fontSize: '13px' }}
                                formatter={(value: any) => formatCurrency(value)}
                                labelStyle={{ color: '#64748b', marginBottom: '8px', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px', fontWeight: '500', color: '#64748b' }} />
                            <Bar dataKey="revenue" name="Payments In" fill="#10b981" radius={[6, 6, 0, 0]} barSize={16} />
                            <Bar dataKey="payouts" name="Payouts Out" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={16} />
                            <Line type="monotone" dataKey="net" name="Net Daily" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{ r: 6, strokeWidth: 0 }} />
                        </ComposedChart>
                    ) : (
                        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorBreached" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="date"
                                stroke="#94a3b8"
                                fontSize={12}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={false}
                                tickMargin={12}
                            />
                            <YAxis
                                stroke="#94a3b8"
                                fontSize={12}
                                fontWeight={500}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={(value) => `${value}`}
                                tickMargin={12}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc' }}
                                contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '12px 16px' }}
                                itemStyle={{ color: '#0f172a', fontWeight: '700', fontSize: '14px' }}
                                formatter={(value: any, name: string) => [value, name]}
                                labelStyle={{ color: '#64748b', marginBottom: '8px', fontWeight: '600', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            />
                            <Area type="monotone" dataKey="breachedAccounts" name="Breached Accounts" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorBreached)" activeDot={{ r: 6, strokeWidth: 0 }} />
                        </AreaChart>
                    )}
                    </ResponsiveContainer>
                ) : (
                    <div className="w-full h-full bg-gray-50/50 animate-pulse rounded-xl" />
                )}
            </div>
        </div>
    );
}
