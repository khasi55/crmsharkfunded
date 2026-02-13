"use client";

import { useEffect, useState } from "react";
import { Activity, Database, Wifi, Server, Clock, AlertCircle, CheckCircle, XCircle } from "lucide-react";

interface ServiceHealth {
    status: string;
    [key: string]: any;
}

interface HealthData {
    overall: string;
    timestamp: string;
    services: {
        websocket?: ServiceHealth;
        database?: ServiceHealth;
        redis?: ServiceHealth;
        mt5_bridge?: ServiceHealth;
        schedulers?: any;
    };
}

export default function SystemHealthPage() {
    const [healthData, setHealthData] = useState<HealthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);

    const fetchHealth = async () => {
        try {
            const response = await fetch(`/api/admin/health`);

            if (!response.ok) throw new Error('Health check failed');

            const data = await response.json();
            setHealthData(data);
        } catch (error) {
            console.error('Failed to fetch health data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealth();

        if (autoRefresh) {
            const interval = setInterval(fetchHealth, 10000); // Refresh every 10 seconds
            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'running':
            case 'scheduled':
                return <CheckCircle className="w-5 h-5 text-green-500" />;
            case 'degraded':
                return <AlertCircle className="w-5 h-5 text-yellow-500" />;
            default:
                return <XCircle className="w-5 h-5 text-red-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'healthy':
            case 'running':
            case 'scheduled':
                return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'degraded':
                return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
            default:
                return 'bg-red-500/10 text-red-500 border-red-500/20';
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="text-center">
                    <Activity className="w-12 h-12 animate-pulse text-blue-500 mx-auto mb-4" />
                    <p className="text-gray-600">Loading system health...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
                    <p className="text-gray-600 mt-1">Real-time monitoring of all system services</p>
                </div>

                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={(e) => setAutoRefresh(e.target.checked)}
                            className="rounded"
                        />
                        Auto-refresh (10s)
                    </label>

                    <button
                        onClick={fetchHealth}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Refresh Now
                    </button>
                </div>
            </div>

            {/* Overall Status */}
            {healthData && (
                <div className={`p-6 rounded-xl border-2 ${getStatusColor(healthData.overall)}`}>
                    <div className="flex items-center gap-3">
                        {getStatusIcon(healthData.overall)}
                        <div>
                            <h2 className="text-xl font-semibold capitalize">{healthData.overall}</h2>
                            <p className="text-sm opacity-75">
                                Last checked: {new Date(healthData.timestamp).toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Service Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* WebSocket */}
                {healthData?.services.websocket && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Wifi className="w-6 h-6 text-blue-600" />
                                <h3 className="text-lg font-semibold">WebSocket</h3>
                            </div>
                            {getStatusIcon(healthData.services.websocket.status)}
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between border-b border-gray-100 pb-2 mb-2">
                                <span className="text-gray-600">Total Connections:</span>
                                <span className="font-semibold">{healthData.services.websocket.connections}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Authenticated:</span>
                                <span className="font-semibold">{healthData.services.websocket.authenticated}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Active Rooms:</span>
                                <span className="font-semibold">{healthData.services.websocket.rooms}</span>
                            </div>

                            {/* Bridge Relay Status */}
                            {healthData.services.websocket.bridge_relay && (
                                <div className="mt-4 pt-4 border-t border-gray-100">
                                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bridge Relay (MT5)</h4>
                                    <div className="flex justify-between items-center">
                                        <span className="text-gray-600">Status:</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${healthData.services.websocket.bridge_relay.status === 'connected'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-red-100 text-red-700'
                                                }`}>
                                                {healthData.services.websocket.bridge_relay.status}
                                            </span>
                                        </div>
                                    </div>
                                    {healthData.services.websocket.bridge_relay.error && (
                                        <p className="text-[10px] text-red-500 mt-1 italic">
                                            Error: {healthData.services.websocket.bridge_relay.error}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Database */}
                {healthData?.services.database && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Database className="w-6 h-6 text-purple-600" />
                                <h3 className="text-lg font-semibold">Database</h3>
                            </div>
                            {getStatusIcon(healthData.services.database.status)}
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Latency:</span>
                                <span className="font-semibold">{healthData.services.database.latency}</span>
                            </div>
                            {healthData.services.database.error && (
                                <div className="text-red-500 text-xs mt-2">
                                    Error: {healthData.services.database.error}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Redis */}
                {healthData?.services.redis && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Server className="w-6 h-6 text-red-600" />
                                <h3 className="text-lg font-semibold">Redis</h3>
                            </div>
                            {getStatusIcon(healthData.services.redis.status)}
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Latency:</span>
                                <span className="font-semibold">{healthData.services.redis.latency}</span>
                            </div>
                            {healthData.services.redis.error && (
                                <div className="text-red-500 text-xs mt-2">
                                    Error: {healthData.services.redis.error}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* MT5 Bridge */}
                {healthData?.services.mt5_bridge && (
                    <div className="bg-white rounded-xl border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <Server className="w-6 h-6 text-green-600" />
                                <h3 className="text-lg font-semibold">MT5 Bridge</h3>
                            </div>
                            {getStatusIcon(healthData.services.mt5_bridge.status)}
                        </div>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Latency:</span>
                                <span className="font-semibold">{healthData.services.mt5_bridge.latency || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status Code:</span>
                                <span className="font-semibold">{healthData.services.mt5_bridge.statusCode || 'N/A'}</span>
                            </div>
                            <div className="text-xs text-gray-500 mt-2 truncate">
                                {healthData.services.mt5_bridge.url}
                            </div>
                            {healthData.services.mt5_bridge.error && (
                                <div className="text-red-500 text-xs mt-2">
                                    Error: {healthData.services.mt5_bridge.error}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Schedulers */}
            {healthData?.services.schedulers && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Clock className="w-6 h-6 text-orange-600" />
                        <h3 className="text-lg font-semibold">Schedulers</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {Object.entries(healthData.services.schedulers).map(([key, value]: [string, any]) => (
                            <div key={key} className="border border-gray-200 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium capitalize">
                                        {key.replace(/_/g, ' ')}
                                    </span>
                                    {getStatusIcon(value.status)}
                                </div>
                                <div className="text-xs text-gray-600">
                                    {value.interval && `Interval: ${value.interval}`}
                                    {value.schedule && `Schedule: ${value.schedule}`}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
