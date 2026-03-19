"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Wifi, Server, Clock, AlertCircle, CheckCircle, XCircle, RefreshCw, Layers, Zap, ShieldCheck, Mail, CreditCard, Terminal } from "lucide-react";

interface ServiceHealth {
    status: string;
    [key: string]: any;
}

interface HealthData {
    overall: string;
    timestamp: string;
    services: {
        backend_api?: ServiceHealth;
        auth?: ServiceHealth;
        database?: ServiceHealth;
        redis?: ServiceHealth;
        websocket?: ServiceHealth;
        mt5_bridge?: ServiceHealth;
        email?: ServiceHealth;
        payment_gateway?: ServiceHealth;
        schedulers?: any;
    };
}

export default function SystemHealthPage() {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchHealth = async () => {
        setIsRefreshing(true);
        try {
            const response = await fetch(`/api/admin/health`);
            if (!response.ok) throw new Error('Health check failed');
            const data = await response.json();
            setHealthData(data);
        } catch (error) {
            console.error('Failed to fetch health data:', error);
        } finally {
            setLoading(false);
            setTimeout(() => setIsRefreshing(false), 500); // UI feedback
        }
    };

    useEffect(() => {
        fetchHealth();
        if (autoRefresh) {
            const interval = setInterval(fetchHealth, 10000); // 10s
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const getStatusTheme = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'healthy':
            case 'running':
            case 'scheduled':
            case 'connected': // For bridge relay
                return {
                    icon: <CheckCircle className="w-5 h-5 text-emerald-500" />,
                    bg: 'bg-emerald-500',
                    text: 'text-emerald-700',
                    border: 'border-emerald-200',
                    badgeBg: 'bg-emerald-50',
                    message: 'Operational'
                };
            case 'degraded':
                return {
                    icon: <AlertCircle className="w-5 h-5 text-amber-500" />,
                    bg: 'bg-amber-500',
                    text: 'text-amber-700',
                    border: 'border-amber-200',
                    badgeBg: 'bg-amber-50',
                    message: 'Degraded Performance'
                };
            default:
                return {
                    icon: <XCircle className="w-5 h-5 text-rose-500" />,
                    bg: 'bg-rose-500',
                    text: 'text-rose-700',
                    border: 'border-rose-200',
                    badgeBg: 'bg-rose-50',
                    message: 'Major Outage'
                };
        }
    };

    if (loading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center p-8">
                <Activity className="w-10 h-10 animate-pulse text-indigo-500 mb-6" />
                <h2 className="text-xl font-medium text-slate-800">Checking system status...</h2>
                <p className="text-slate-500 mt-2">Connecting to Sharkfunded infrastructure</p>
            </div>
        );
    }

    const overallTheme = getStatusTheme(healthData?.overall || 'unknown');

    return (
        <div className="min-h-screen bg-[#fafafa] p-6 lg:p-10 font-sans text-slate-900">
            <div className="max-w-4xl mx-auto space-y-10">

                {/* --- HEADER --- */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-200">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Status</h1>
                        <p className="text-sm font-medium text-slate-500 mt-1.5 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Sharkfunded Production Environment
                        </p>
                    </div>

                    <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm">
                        <label className="flex items-center gap-2.5 text-sm font-medium text-slate-600 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer"
                            />
                            Auto-refresh
                        </label>
                        <div className="w-px h-5 bg-slate-200"></div>
                        <button
                            onClick={fetchHealth}
                            disabled={isRefreshing}
                            className={`flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors ${isRefreshing ? 'text-indigo-600' : 'text-slate-500'}`}
                            title="Refresh Status"
                        >
                            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* --- HERO STATUS BANNER --- */}
                {healthData && (
                    <div className={`relative overflow-hidden p-8 rounded-2xl border ${overallTheme.border} ${overallTheme.badgeBg} shadow-sm transition-all duration-300`}>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                            <div>
                                <h2 className={`text-2xl sm:text-3xl font-bold tracking-tight ${overallTheme.text} mb-2`}>
                                    All Systems {overallTheme.message}
                                </h2>
                                <p className={`text-sm font-medium opacity-80 ${overallTheme.text}`}>
                                    Last verified at {new Date(healthData.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit' })}
                                </p>
                            </div>
                            <div className="shrink-0 bg-white/50 backdrop-blur-sm p-3 rounded-full shadow-sm">
                                {overallTheme.icon}
                            </div>
                        </div>
                        {/* Decorative background blur */}
                        <div className={`absolute -bottom-24 -right-24 w-64 h-64 rounded-full blur-3xl opacity-20 ${overallTheme.bg}`}></div>
                    </div>
                )}

                {/* --- SERVICES LIST --- */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

                    {/* Core Infrastructure */}
                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Layers className="w-3.5 h-3.5" />
                            Core Infrastructure
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {/* Backend API */}
                        {healthData?.services.backend_api && (
                            <ServiceRow
                                title="REST API (Backend)"
                                icon={<Terminal className="w-5 h-5 text-slate-400" />}
                                health={healthData.services.backend_api}
                                details={[
                                    { label: 'Latency', value: healthData.services.backend_api.latency }
                                ]}
                            />
                        )}
                        {/* Auth */}
                        {healthData?.services.auth && (
                            <ServiceRow
                                title="Authentication (Supabase Auth)"
                                icon={<ShieldCheck className="w-5 h-5 text-slate-400" />}
                                health={healthData.services.auth}
                                details={[
                                    { label: 'Latency', value: healthData.services.auth.latency }
                                ]}
                            />
                        )}
                        {/* Database */}
                        {healthData?.services.database && (
                            <ServiceRow
                                title="Primary Database"
                                icon={<Database className="w-5 h-5 text-slate-400" />}
                                health={healthData.services.database}
                                details={[
                                    { label: 'Latency', value: healthData.services.database.latency }
                                ]}
                            />
                        )}
                        {/* Redis */}
                        {healthData?.services.redis && (
                            <ServiceRow
                                title="Redis Cache & Queue"
                                icon={<Server className="w-5 h-5 text-slate-400" />}
                                health={healthData.services.redis}
                                details={[
                                    { label: 'Latency', value: healthData.services.redis.latency }
                                ]}
                            />
                        )}
                        {/* WebSocket */}
                        {healthData?.services.websocket && (
                            <ServiceRow
                                title="Real-time WebSocket API"
                                icon={<Wifi className="w-5 h-5 text-slate-400" />}
                                health={healthData.services.websocket}
                                details={[
                                    { label: 'Connections', value: healthData.services.websocket.connections },
                                    { label: 'Rooms', value: healthData.services.websocket.rooms }
                                ]}
                            />
                        )}
                    </div>

                    {/* External Connections */}
                    <div className="px-6 py-5 border-y border-slate-100 bg-slate-50/50 mt-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5" />
                            External Integrations
                        </h3>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {/* Email / SMTP */}
                        {healthData?.services.email && (
                            <ServiceRow
                                title="Email Delivery (SMTP)"
                                icon={<Mail className="w-5 h-5 text-slate-400" />}
                                health={healthData.services.email}
                                details={[
                                    { label: 'Latency', value: healthData.services.email.latency },
                                    { label: 'Provider', value: healthData.services.email.provider || 'N/A' }
                                ]}
                            />
                        )}
                        {/* Payment Gateway */}
                        {healthData?.services.payment_gateway && (
                            <ServiceRow
                                title="Payment Gateway"
                                icon={<CreditCard className="w-5 h-5 text-slate-400" />}
                                health={healthData.services.payment_gateway}
                                details={[
                                    { label: 'Latency', value: healthData.services.payment_gateway.latency },
                                    { label: 'Provider', value: healthData.services.payment_gateway.provider || 'N/A' }
                                ]}
                            />
                        )}
                        {/* MT5 Bridge Core */}
                        {healthData?.services.mt5_bridge && (
                            <ServiceRow
                                title="MT5 Bridge API"
                                icon={<Server className="w-5 h-5 text-slate-400" />}
                                health={healthData.services.mt5_bridge}
                                details={[
                                    { label: 'Latency', value: healthData.services.mt5_bridge.latency || 'N/A' },
                                    { label: 'HTTP Status', value: healthData.services.mt5_bridge.statusCode || 'N/A' }
                                ]}
                            />
                        )}
                        {/* MT5 WS Relay */}
                        {healthData?.services.websocket?.bridge_relay && (
                            <ServiceRow
                                title="MT5 Trade Stream (Relay)"
                                icon={<Wifi className="w-5 h-5 text-slate-400" />}
                                health={{ status: healthData.services.websocket.bridge_relay.status, error: healthData.services.websocket.bridge_relay.error }}
                                details={[]}
                            />
                        )}
                    </div>

                    {/* Schedulers */}
                    {healthData?.services.schedulers && Object.keys(healthData.services.schedulers).length > 0 && (
                        <>
                            <div className="px-6 py-5 border-y border-slate-100 bg-slate-50/50 mt-4">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    Background Workers
                                </h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {Object.entries(healthData.services.schedulers).map(([key, value]: [string, any]) => (
                                    <ServiceRow
                                        key={key}
                                        title={key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        icon={<Activity className="w-5 h-5 text-slate-400" />}
                                        health={value}
                                        details={[
                                            value.interval && { label: 'Interval', value: value.interval },
                                            value.schedule && { label: 'Cron', value: value.schedule }
                                        ].filter(Boolean)}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                </div>

                {/* Footer note */}
                <div className="text-center pb-10">
                    <p className="text-xs font-medium text-slate-400">
                        Status components automatically refresh every 10 seconds.
                    </p>
                </div>
            </div>
        </div>
    );
}


// Sub-component for a single service row
function ServiceRow({ title, icon, health, details }: { title: string, icon: React.ReactNode, health: any, details: any[] }) {

    const getStatusTheme = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'healthy':
            case 'running':
            case 'scheduled':
            case 'connected': // For bridge relay
                return {
                    icon: <CheckCircle className="w-4 h-4 text-emerald-500" />,
                    text: 'text-emerald-700',
                    bg: 'bg-emerald-50',
                    label: 'Operational'
                };
            case 'degraded':
                return {
                    icon: <AlertCircle className="w-4 h-4 text-amber-500" />,
                    text: 'text-amber-700',
                    bg: 'bg-amber-50',
                    label: 'Degraded'
                };
            default:
                return {
                    icon: <XCircle className="w-4 h-4 text-rose-500" />,
                    text: 'text-rose-700',
                    bg: 'bg-rose-50',
                    label: 'Outage'
                };
        }
    };

    const theme = getStatusTheme(health?.status);

    return (
        <div className="px-6 py-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {icon}
                </div>
                <div>
                    <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
                    {health?.error && (
                        <p className="text-xs font-medium text-rose-500 mt-1 line-clamp-1">{health.error}</p>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-6 self-start md:self-auto pl-14 md:pl-0">
                {/* Metrics */}
                {details.length > 0 && (
                    <div className="hidden sm:flex items-center gap-4 border-r border-slate-200 pr-6 mr-2">
                        {details.map((d, i) => (
                            <div key={i} className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{d.label}</span>
                                <span className="text-sm font-medium text-slate-700">{d.value}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Status Badge */}
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/0 font-semibold text-xs min-w-[120px] justify-center ${theme.bg} ${theme.text}`}>
                    {theme.icon}
                    {theme.label}
                </div>
            </div>
        </div>
    );
}
