"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";

interface ViolationsFiltersProps {
    violationType: string;
    severity: string;
    searchQuery?: string;
}

export default function ViolationsFilters({ violationType, severity, searchQuery = "" }: ViolationsFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [search, setSearch] = useState(searchQuery);

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`?${params.toString()}`);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        handleFilterChange('search', search);
    };

    const clearFilters = () => {
        setSearch("");
        router.push('/risk-violations');
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <form onSubmit={handleSearch} className="w-full">
                    <label className="text-xs font-semibold text-gray-700 uppercase mb-2 block">
                        Search
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Ticket, Login, Name..."
                            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </form>

                <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase mb-2 block">
                        Violation Type
                    </label>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={violationType}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                    >
                        <option value="">All Types</option>
                        <option value="martingale">Martingale</option>
                        <option value="revenge_trading">Revenge Trading</option>
                        <option value="hedging">Hedging</option>
                        <option value="tick_scalping">Tick Scalping</option>
                        <option value="min_duration">Min Duration</option>
                        <option value="arbitrage">Arbitrage</option>
                        <option value="latency">Latency</option>
                        <option value="news_trading">News Trading</option>
                    </select>
                </div>

                <div>
                    <label className="text-xs font-semibold text-gray-700 uppercase mb-2 block">
                        Severity
                    </label>
                    <select
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        value={severity}
                        onChange={(e) => handleFilterChange('severity', e.target.value)}
                    >
                        <option value="">All Severities</option>
                        <option value="warning">Warning</option>
                        <option value="breach">Breach</option>
                    </select>
                </div>

                <div className="flex items-end h-full">
                    <button
                        onClick={clearFilters}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors h-[38px]"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
