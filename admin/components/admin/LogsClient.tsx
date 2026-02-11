"use client";

import { History, Shield, Info, AlertTriangle, AlertCircle, Search, ChevronRight, ChevronLeft, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

interface LogsClientProps {
    logs: any[];
    count: number;
    page: number;
    totalPages: number;
    levelFilter: string;
    query: string;
}

export function LogsClient({ logs, count, page, totalPages, levelFilter, query }: LogsClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState(query);
    const [selectedLog, setSelectedLog] = useState<any>(null);

    const updateFilters = (newFilters: Record<string, string>) => {
        const params = new URLSearchParams(searchParams.toString());
        Object.entries(newFilters).forEach(([key, value]) => {
            if (value && value !== 'all') {
                params.set(key, value);
            } else {
                params.delete(key);
            }
        });
        params.set('page', '1'); // Reset to first page on filter change
        router.push(`?${params.toString()}`);
    };

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', String(newPage));
        router.push(`?${params.toString()}`);
    };

    const getLevelIcon = (level: string) => {
        switch (level) {
            case 'INFO': return <Info className="h-4 w-4 text-blue-500" />;
            case 'WARN': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
            case 'ERROR': return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'CRITICAL': return <Shield className="h-4 w-4 text-purple-600" />;
            default: return <Info className="h-4 w-4 text-gray-500" />;
        }
    };

    const getLevelBadgeStyle = (level: string) => {
        switch (level) {
            case 'INFO': return "bg-blue-50 text-blue-700 border-blue-200";
            case 'WARN': return "bg-amber-50 text-amber-700 border-amber-200";
            case 'ERROR': return "bg-red-50 text-red-700 border-red-200";
            case 'CRITICAL': return "bg-purple-50 text-purple-700 border-purple-200";
            default: return "bg-gray-50 text-gray-700 border-gray-200";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <History className="text-blue-600" /> Audit Logs
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">Track all administrative actions and system events</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 shadow-sm">
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mb-1">Total Records</p>
                    <p className="text-2xl font-bold text-blue-600 leading-none">{count || 0}</p>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                updateFilters({ query: searchQuery });
                            }
                        }}
                    />
                </div>
                <div>
                    <select
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                        value={levelFilter || 'all'}
                        onChange={(e) => updateFilters({ level: e.target.value })}
                    >
                        <option value="all">All Levels</option>
                        <option value="INFO">Info</option>
                        <option value="WARN">Warning</option>
                        <option value="ERROR">Error</option>
                        <option value="CRITICAL">Critical</option>
                    </select>
                </div>
                <div className="md:col-span-2 flex justify-end gap-2">
                    <button
                        onClick={() => {
                            setSearchQuery('');
                            router.push('/logs');
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg bg-white hover:bg-gray-50 transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        onClick={() => updateFilters({ query: searchQuery })}
                        className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        Filter
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50/50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Level</th>
                                <th className="px-6 py-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Admin / Source</th>
                                <th className="px-6 py-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Action / Message</th>
                                <th className="px-6 py-4 font-bold text-gray-700 text-xs uppercase tracking-wider">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs?.map((log) => {
                                const adminEmail = log.details?.admin_email;

                                return (
                                    <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {new Date(log.created_at).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={cn(
                                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold uppercase",
                                                getLevelBadgeStyle(log.level)
                                            )}>
                                                {getLevelIcon(log.level)}
                                                {log.level}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            {adminEmail ? (
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-gray-900 flex items-center gap-1.5">
                                                        <Shield className="h-3.5 w-3.5 text-blue-600" />
                                                        {adminEmail}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">{log.source}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col">
                                                    <span className="text-gray-900 font-medium italic">{log.source}</span>
                                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">System</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-md truncate text-gray-900 font-medium" title={log.message}>
                                                {log.message}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors uppercase tracking-widest"
                                                onClick={() => setSelectedLog(log)}
                                            >
                                                <Eye className="h-3 w-3" />
                                                Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                            {logs?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center gap-3">
                                            <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center">
                                                <History className="h-6 w-6 text-gray-300" />
                                            </div>
                                            <p className="text-gray-400 font-medium">No system logs found matching your filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-gray-50/50 border-t border-gray-100 px-6 py-5 flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Page <span className="text-gray-900">{page}</span> of <span className="text-gray-900">{totalPages}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page <= 1}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Prev
                            </button>
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page >= totalPages}
                                className="inline-flex items-center gap-1 px-4 py-1.5 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all uppercase"
                            >
                                Next
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl border border-gray-200 w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <h2 className="text-lg font-bold text-gray-900">Log Details</h2>
                            <button onClick={() => setSelectedLog(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <AlertCircle className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Message</p>
                                <p className="text-gray-900 font-medium">{selectedLog.message}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Raw Metadata (JSON)</p>
                                <div className="bg-[#1e1e1e] p-6 rounded-xl overflow-x-auto border border-white/5">
                                    <pre className="text-blue-300 text-xs font-mono leading-relaxed">
                                        {JSON.stringify(selectedLog.details, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-2 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
