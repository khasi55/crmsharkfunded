import { createAdminClient } from "@/utils/supabase/admin";
import { AlertTriangle, ShieldAlert, RefreshCw, Scale, Zap, Newspaper } from "lucide-react";
import ViolationsFilters from "@/components/admin/ViolationsFilters";
import ViolationDetailsRow from "@/components/admin/ViolationDetailsRow";

export default async function RiskViolationsPage({
    searchParams,
}: {
    searchParams: { type?: string; severity?: string; page?: string };
}) {
    const supabase = createAdminClient();
    const violationType = (await searchParams)?.type || "";
    const severity = (await searchParams)?.severity || "";
    const page = parseInt((await searchParams)?.page || "1");
    const PAGE_SIZE = 50;

    // Build query for ALL violations first (to group by account)
    let allViolationsQuery = supabase
        .from("advanced_risk_flags")
        .select(`
            id,
            challenge_id,
            user_id,
            flag_type,
            severity,
            description,
            trade_ticket,
            symbol,
            analysis_data,
            created_at
        `)
        .order("created_at", { ascending: false });

    if (violationType) {
        allViolationsQuery = allViolationsQuery.eq("flag_type", violationType);
    }

    if (severity) {
        allViolationsQuery = allViolationsQuery.eq("severity", severity);
    }

    const { data: allViolations, error } = await allViolationsQuery;

    if (error) {
        console.error("Error fetching violations:", error);
    }

    // Group violations by account/challenge_id
    const violationsByAccount = new Map<string, any[]>();
    allViolations?.forEach(violation => {
        const challengeId = violation.challenge_id;
        if (!violationsByAccount.has(challengeId)) {
            violationsByAccount.set(challengeId, []);
        }
        violationsByAccount.get(challengeId)!.push(violation);
    });

    // Get unique challenge IDs and paginate
    const uniqueChallengeIds = Array.from(violationsByAccount.keys());
    const totalAccounts = uniqueChallengeIds.length;
    const totalPages = Math.ceil(totalAccounts / PAGE_SIZE);

    // Paginate at account level
    const paginatedChallengeIds = uniqueChallengeIds.slice(
        (page - 1) * PAGE_SIZE,
        page * PAGE_SIZE
    );

    // Fetch account and user details for paginated accounts
    let enrichedAccounts: any[] = [];
    if (paginatedChallengeIds.length > 0) {
        const { data: challenges } = await supabase
            .from('challenges')
            .select('id, login, challenge_type, status, user_id')
            .in('id', paginatedChallengeIds);

        const userIds = [...new Set(challenges?.map(c => c.user_id).filter(Boolean))];
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

        const challengeMap = new Map(challenges?.map(c => [c.id, c]));
        const profileMap = new Map(profiles?.map(p => [p.id, p]));

        // Build enriched account-level data
        enrichedAccounts = paginatedChallengeIds.map(challengeId => {
            const violations = violationsByAccount.get(challengeId) || [];
            const challenge = challengeMap.get(challengeId);
            const profile = profileMap.get(challenge?.user_id);

            // Count by type
            const violationCounts = violations.reduce((acc, v) => {
                acc[v.flag_type] = (acc[v.flag_type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>);

            return {
                challengeId,
                challenge,
                profile,
                violations,
                totalViolations: violations.length,
                violationCounts,
                latestViolation: violations[0]
            };
        }).filter(a => a.challenge); // Filter out any without challenge data
    }

    // Stats for all violations
    const totalViolationsCount = allViolations?.length || 0;
    const typeCounts: Record<string, number> = {};
    allViolations?.forEach((v: any) => {
        typeCounts[v.flag_type] = (typeCounts[v.flag_type] || 0) + 1;
    });

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <AlertTriangle className="text-red-500" /> Risk Violations
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">All flagged behavioral risk violations</p>
                </div>
                <div className="flex gap-4 items-center">
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Total Violations</p>
                        <p className="text-2xl font-bold text-red-600">{totalViolationsCount}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                        <p className="text-xs text-gray-500 uppercase font-semibold">Flagged Accounts</p>
                        <p className="text-2xl font-bold text-orange-600">{totalAccounts}</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                        <strong>Error:</strong> {error.message || 'Failed to fetch violations'}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                        The advanced_risk_flags table may not exist. Please run the migration script.
                    </p>
                </div>
            )}

            {/* Filters */}
            <ViolationsFilters violationType={violationType} severity={severity} />

            {/* Violations Table - Grouped by Account */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Account</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">User</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Total Violations</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Violation Types</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Latest</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {enrichedAccounts?.map((account: any) => (
                                <tr key={account.challengeId} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <a
                                            href={`/mt5?account=${account.challenge?.login}`}
                                            className="font-mono text-indigo-600 font-medium hover:text-indigo-800 hover:underline"
                                        >
                                            {account.challenge?.login || 'N/A'}
                                        </a>
                                        <div className="text-xs text-gray-500 capitalize">
                                            {account.challenge?.challenge_type}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900">
                                            {account.profile?.full_name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-gray-500 font-mono">
                                            {account.profile?.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-red-100 text-red-800">
                                            {account.totalViolations}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(account.violationCounts).map(([type, count]: [string, any]) => (
                                                <span
                                                    key={type}
                                                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                                                >
                                                    {type.replace('_', ' ')}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                                        {new Date(account.latestViolation.created_at).toLocaleDateString()}
                                        <div className="text-[10px] opacity-70">
                                            {new Date(account.latestViolation.created_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <a
                                            href={`/risk-violations/${account.challengeId}`}
                                            className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
                                        >
                                            View Details →
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {enrichedAccounts?.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No risk violations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="border-t border-gray-200 px-6 py-4 flex items-center justify-between">
                        <div className="text-sm text-gray-700">
                            Showing page {page} of {totalPages} ({totalAccounts} accounts)
                        </div>
                        <div className="flex gap-2">
                            {page > 1 && (
                                <a
                                    href={`?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams()), page: String(page - 1) }).toString()}`}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Previous
                                </a>
                            )}
                            <div className="flex gap-1">
                                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <a
                                            key={pageNum}
                                            href={`?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams()), page: String(pageNum) }).toString()}`}
                                            className={`px-3 py-2 text-sm font-medium rounded-lg ${pageNum === page
                                                ? 'bg-indigo-600 text-white'
                                                : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {pageNum}
                                        </a>
                                    );
                                })}
                            </div>
                            {page < totalPages && (
                                <a
                                    href={`?${new URLSearchParams({ ...Object.fromEntries(new URLSearchParams()), page: String(page + 1) }).toString()}`}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Next
                                </a>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Stats */}
            {typeCounts && Object.keys(typeCounts).length > 0 && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4">Violation Breakdown</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {Object.entries(typeCounts).map(([type, count]) => {
                            const Icon = getViolationIcon(type);
                            return (
                                <div key={type} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                    <Icon size={20} className="text-red-500" />
                                    <div>
                                        <div className="text-xs text-gray-500 capitalize">{type.replace('_', ' ')}</div>
                                        <div className="text-lg font-bold text-gray-900">{count}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
