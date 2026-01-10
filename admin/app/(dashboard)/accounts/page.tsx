import { createAdminClient } from "@/utils/supabase/admin";
import { SearchInput } from "@/components/admin/SearchInput";
import Link from "next/link";
import { Server, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AccountActions } from "@/components/admin/AccountActions";

export default async function AccountsListPage({
    searchParams,
}: {
    searchParams: { query?: string; page?: string };
}) {
    const query = (await searchParams)?.query || "";
    // const page = parseInt((await searchParams)?.page || "1");

    const supabase = createAdminClient();

    // 1. Build Query for Challenges
    let challengeQuery = supabase
        .from("challenges")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .limit(100);

    // Note: Search logic is harder with manual join. 
    // If query is present, we might ideally search profiles first then get challenges, 
    // or search challenges (login, id).
    // For now, let's assume search is for Account ID or Login or plan type.
    if (query) {
        const filters = [];

        // Check if query is valid UUID
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
        if (isUUID) {
            filters.push(`id.eq.${query}`);
        }

        // Check if query is number (for login)
        if (!isNaN(Number(query))) {
            filters.push(`login.eq.${query}`);
        }

        // Always search text fields
        filters.push(`challenge_type.ilike.%${query}%`);

        if (filters.length > 0) {
            challengeQuery = challengeQuery.or(filters.join(','));
        }
    }

    const { data: challenges, count, error } = await challengeQuery;

    if (error) {
        console.error("Error fetching accounts:", error);
    }

    // 2. Manual Join with Profiles (to avoid FK issues)
    let accountsWithProfiles: any[] = challenges || [];

    if (challenges && challenges.length > 0) {
        const userIds = Array.from(new Set(challenges.map((c: any) => c.user_id).filter(Boolean)));

        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.id, p]));

        // If searching by name/email, we might filter here in JS since we can't easily join-filter in Supabase w/o FK
        // But for "just add all mt5 accounts", basic listing is priority.

        accountsWithProfiles = challenges.map((c: any) => ({
            ...c,
            profile: profileMap.get(c.user_id) || { full_name: 'Unknown', email: 'No email' },
            plan_type: c.metadata?.plan_type || c.plan_type
        }));
    }

    // Total Count logic
    // 'count' from query gives total matching the query (or total table if no query)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900">All MT5 Accounts</h1>
                    <p className="text-sm text-gray-600 mt-1">Master list of all created trading accounts</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Accounts</p>
                    <p className="text-2xl font-bold text-indigo-600">{count || 0}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="w-full max-w-md">
                    <SearchInput placeholder="Search by Account ID or Login..." />
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Account ID</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">User</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Login</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Type</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Plan / Group</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Balance</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Actions</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Created</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {accountsWithProfiles.map((account) => (
                                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                        <div className="text-indigo-600 font-medium">
                                            {account.challenge_number || `SF-${account.id.slice(0, 8)}`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {account.profile?.full_name || "Unknown"}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                                {account.profile?.email || "No email"}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-900">
                                        {account.login || "-"}
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 capitalize">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                            {account.challenge_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900 font-medium text-xs break-words max-w-[150px]">
                                            {account.plan_type || "Standard"}
                                        </div>
                                        <div className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]" title={account.server}>
                                            {account.mt5_group}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        ${account.initial_balance?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={account.status} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <AccountActions login={account.login} currentStatus={account.status} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-xs">
                                        {new Date(account.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                            {accountsWithProfiles.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                        No accounts found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
