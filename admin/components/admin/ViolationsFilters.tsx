"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ViolationsFiltersProps {
    violationType: string;
    severity: string;
}

export default function ViolationsFilters({ violationType, severity }: ViolationsFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`?${params.toString()}`);
    };

    const clearFilters = () => {
        router.push('/risk-violations');
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <option value="hedging">Hedging</option>
                        <option value="tick_scalping">Tick Scalping</option>
                        <option value="arbitrage">Arbitrage</option>
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

                <div className="flex items-end">
                    <button
                        onClick={clearFilters}
                        className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>
        </div>
    );
}
