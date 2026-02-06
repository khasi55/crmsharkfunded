import { createAdminClient } from "@/utils/supabase/admin";
import { AlertTriangle, ArrowLeft, RefreshCw, ShieldAlert, Zap, Scale, Newspaper } from "lucide-react";
import Link from "next/link";

export default async function AccountViolationsPage({
    params,
}: {
    params: { accountId: string };
}) {
    const supabase = createAdminClient();
    const accountId = (await params).accountId;

    // Fetch violations for this account
    const { data: violations } = await supabase
        .from("advanced_risk_flags")
        .select("*")
        .eq("challenge_id", accountId)
        .order("created_at", { ascending: false });

    // Fetch account details
    const { data: challenge } = await supabase
        .from("challenges")
        .select("id, login, challenge_type, status, user_id")
        .eq("id", accountId)
        .single();

    // Fetch user details
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .eq("id", challenge?.user_id)
        .single();

    // Fetch trade details for violations that have trade_ids
    const tradeIds = violations
        ?.filter(v => v.trade_id)
        .map(v => v.trade_id) || [];

    let tradesMap = new Map();
    if (tradeIds.length > 0) {
        const { data: trades } = await supabase
            .from("trades")
            .select("*")
            .in("id", tradeIds);

        tradesMap = new Map(trades?.map(t => [t.id, t]) || []);
    }

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

    // Count by type
    const violationCounts: Record<string, number> = {};
    violations?.forEach((v: any) => {
        violationCounts[v.flag_type] = (violationCounts[v.flag_type] || 0) + 1;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <Link
                        href="/risk-violations"
                        className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 mb-4"
                    >
                        <ArrowLeft size={16} />
                        Back to All Violations
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={32} />
                        Account Violations
                    </h1>
                </div>

                {/* Account Info Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
                    <div className="grid grid-cols-4 gap-6">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Account Login</p>
                            <p className="text-lg font-mono font-bold text-indigo-600">{challenge?.login}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Account Type</p>
                            <p className="text-lg font-medium text-gray-900 capitalize">{challenge?.challenge_type}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Trader</p>
                            <p className="text-lg font-medium text-gray-900">{profile?.full_name}</p>
                            <p className="text-xs text-gray-500 font-mono">{profile?.email}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Total Violations</p>
                            <p className="text-3xl font-bold text-red-600">{violations?.length || 0}</p>
                        </div>
                    </div>

                    {/* Violation Type Breakdown */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Violation Breakdown</p>
                        <div className="flex flex-wrap gap-2">
                            {Object.entries(violationCounts).map(([type, count]) => (
                                <span
                                    key={type}
                                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700"
                                >
                                    {type.replace('_', ' ')}: {count}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Quick Link to MT5 */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <Link
                            href={`/mt5?account=${challenge?.login}`}
                            className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                        >
                            View Full Trade History →
                        </Link>
                    </div>
                </div>

                {/* Violations List */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-900">All Violations ({violations?.length})</h2>

                    {violations?.map((violation: any, idx: number) => {
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

                        // Format lot size (convert from micro lots if needed)
                        const lots = trade?.lots
                            ? (trade.lots >= 100 ? (trade.lots / 100).toFixed(2) : trade.lots)
                            : null;

                        return (
                            <div
                                key={violation.id}
                                className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
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
                                    <span
                                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${violation.severity === 'breach'
                                            ? 'bg-red-100 text-red-800'
                                            : 'bg-yellow-100 text-yellow-800'
                                            }`}
                                    >
                                        {violation.severity?.toUpperCase()}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-4 mb-3">
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
                                    <div>
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
                                        <div className="grid grid-cols-5 gap-4">
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
                                        <div className="grid grid-cols-3 gap-4 mt-3">
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

                    {(!violations || violations.length === 0) && (
                        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                            <AlertTriangle className="mx-auto text-gray-400 mb-3" size={48} />
                            <p className="text-gray-500">No violations found for this account.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
