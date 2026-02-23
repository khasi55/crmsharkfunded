"use client";

import { useState, useMemo } from "react";
import { AlertTriangle, RefreshCw, ShieldAlert, Zap, Scale, Newspaper, Trash2, Search } from "lucide-react";

export default function AccountViolationsClient({
    initialViolations,
    tradesMapData
}: {
    initialViolations: any[];
    tradesMapData: Record<string, any>;
}) {
    const [violations, setViolations] = useState(initialViolations);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    const tradesMap = new Map(Object.entries(tradesMapData));

    const getViolationIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'martingale':
            case 'revenge_trading':
                return RefreshCw;
            case 'hedging':
                return ShieldAlert;
            case 'tick_scalping':
            case 'min_duration':
                return Zap;
            case 'arbitrage':
            case 'latency':
                return Scale;
            case 'news_trading':
                return Newspaper;
            default:
                return AlertTriangle;
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this violation?")) return;

        setIsDeleting(id);
        try {
            const res = await fetch(`/api/admins/risk-violations/${id}`, {
                method: "DELETE",
                headers: {
                    // Pass authorization if stored in cookies/localStorage, or assume middleware handles it
                    "Content-Type": "application/json"
                }
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to delete violation");
            }

            // Remove from state
            setViolations(prev => prev.filter(v => v.id !== id));

        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredViolations = useMemo(() => {
        if (!searchTerm) return violations;
        const lowerSearch = searchTerm.toLowerCase();
        return violations.filter(v => {
            const ticketMatch = v.trade_ticket && v.trade_ticket.toString().toLowerCase().includes(lowerSearch);
            const symbolMatch = v.symbol && v.symbol.toLowerCase().includes(lowerSearch);
            const typeMatch = v.flag_type && v.flag_type.toLowerCase().replace('_', ' ').includes(lowerSearch);
            return ticketMatch || symbolMatch || typeMatch;
        });
    }, [violations, searchTerm]);

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-gray-900">
                    All Violations ({filteredViolations.length}{searchTerm && ` found out of ${violations.length}`})
                </h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search ticket, symbol, type..."
                        className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {filteredViolations.map((violation: any) => {
                const Icon = getViolationIcon(violation.flag_type);
                const trade = tradesMap.get(violation.trade_id);

                // Calculate duration if trade is closed
                let duration = null;
                if (trade?.open_time && trade?.close_time) {
                    const durationMs = new Date(trade.close_time).getTime() - new Date(trade.open_time).getTime();
                    const durationSec = Math.floor(durationMs / 1000);
                    const hours = Math.floor(durationSec / 3600);
                    const minutes = Math.floor((durationSec % 3600) / 60);
                    const seconds = durationSec % 60;
                    duration = hours > 0
                        ? `${hours}h ${minutes}m ${seconds}s`
                        : minutes > 0
                            ? `${minutes}m ${seconds}s`
                            : `${seconds}s`;
                }

                // Format lot size
                const lots = trade?.lots
                    ? (trade.lots >= 100 ? (trade.lots / 100).toFixed(2) : trade.lots)
                    : null;

                return (
                    <div
                        key={violation.id}
                        className={`bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow relative ${isDeleting === violation.id ? 'opacity-50 pointer-events-none' : ''}`}
                    >
                        <div className="absolute top-4 right-4 flex gap-2">
                            <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${violation.severity === 'breach'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                    }`}
                            >
                                {violation.severity?.toUpperCase()}
                            </span>
                            <button
                                onClick={() => handleDelete(violation.id)}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                title="Delete Violation"
                                disabled={isDeleting === violation.id}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>

                        <div className="flex items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 rounded-lg">
                                    <Icon className="text-red-600" size={20} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                        {violation.flag_type.replace('_', ' ')}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {new Date(violation.created_at).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-3">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Trade Ticket</p>
                                <p className="font-mono text-sm text-gray-900">
                                    {violation.trade_ticket || 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Symbol</p>
                                <p className="font-medium text-sm text-gray-900">
                                    {violation.symbol || 'N/A'}
                                </p>
                            </div>
                            <div className="col-span-2 sm:col-span-1">
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Detected</p>
                                <p className="text-sm text-gray-900">
                                    {new Date(violation.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Description</p>
                            <p className="text-sm text-gray-900">{violation.description}</p>
                        </div>

                        {/* Trade Details Section */}
                        {trade && (
                            <div className="border-t border-gray-200 pt-3 mt-3">
                                <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Trade Details</p>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Type</p>
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold ${trade.type === 'buy'
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {trade.type?.toUpperCase()}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Lot Size</p>
                                        <p className="font-mono text-sm text-gray-900 font-bold">{lots}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Open Price</p>
                                        <p className="font-mono text-sm text-gray-900">{trade.open_price?.toFixed(5)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Close Price</p>
                                        <p className="font-mono text-sm text-gray-900">
                                            {trade.close_price?.toFixed(5) || 'Open'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Duration</p>
                                        <p className="font-mono text-sm text-gray-900">{duration || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Profit/Loss</p>
                                        <p className={`font-mono text-sm font-bold ${(trade.profit_loss || 0) >= 0
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                            }`}>
                                            ${trade.profit_loss?.toFixed(2)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Open Time</p>
                                        <p className="text-xs text-gray-900">
                                            {new Date(trade.open_time).toLocaleString()}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Close Time</p>
                                        <p className="text-xs text-gray-900">
                                            {trade.close_time ? new Date(trade.close_time).toLocaleString() : 'Open'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}

            {filteredViolations.length === 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                    <AlertTriangle className="mx-auto text-gray-400 mb-3" size={48} />
                    <p className="text-gray-500">
                        {violations.length === 0
                            ? "No violations found for this account."
                            : "No violations match your search criteria."}
                    </p>
                </div>
            )}
        </div>
    );
}
