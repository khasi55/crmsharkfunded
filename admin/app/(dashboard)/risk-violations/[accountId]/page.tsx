import { createAdminClient } from "@/utils/supabase/admin";
import { AlertTriangle, ArrowLeft, RefreshCw, ShieldAlert, Zap, Scale, Newspaper } from "lucide-react";
import Link from "next/link";
import AccountViolationsClient from "@/components/admin/AccountViolationsClient";

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

    // Convert Map to a regular JS object because Map cannot be passed to a Client Component via Props
    const tradesMapData = Object.fromEntries(tradesMap.entries());

    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
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
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <AlertTriangle className="text-red-500" size={32} />
                        Account Violations
                    </h1>
                </div>

                {/* Account Info Card */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 sm:p-6 mb-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Account Login</p>
                            <p className="text-lg font-mono font-bold text-indigo-600">{challenge?.login}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Account Type</p>
                            <p className="text-lg font-medium text-gray-900 capitalize">{challenge?.challenge_type}</p>
                        </div>
                        <div className="col-span-2 lg:col-span-1">
                            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Trader</p>
                            <p className="text-lg font-medium text-gray-900 truncate">{profile?.full_name}</p>
                            <p className="text-xs text-gray-500 font-mono truncate">{profile?.email}</p>
                        </div>
                        <div className="col-span-2 lg:col-span-1">
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

                {/* Violations List (Client Component with Search & Delete) */}
                <AccountViolationsClient
                    initialViolations={violations || []}
                    tradesMapData={tradesMapData}
                />
            </div>
        </div>
    );
}
