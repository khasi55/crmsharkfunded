
import { createAdminClient } from "@/utils/supabase/admin";
import { SearchInput } from "@/components/admin/SearchInput";
import { CheckCircle, Trophy } from "lucide-react";
import UpgradeButton from "@/components/admin/UpgradeButton";

export default async function PassedAccountsPage({
    searchParams,
}: {
    searchParams: { query?: string; page?: string };
}) {
    const supabase = createAdminClient();
    const query = (await searchParams)?.query || "";

    // Build Query - Show active passed challenges (waiting for upgrade)
    let dbQuery = supabase
        .from("challenges")
        .select("*")
        .eq("status", "passed") // Only show passed accounts waiting for upgrade
        .order("updated_at", { ascending: false })
        .limit(100);

    // Apply Search
    if (query) {
        // Search logic similar to accounts page if needed
        // For now, simple ID/Login search
        if (!isNaN(Number(query))) {
            dbQuery = dbQuery.eq('login', query);
        } else {
            // Text search logic could go here
        }
    }

    const { data: accounts, error } = await dbQuery;

    if (error) {
        console.error("Error fetching passed accounts:", error);
    }

    // Fetch profiles separately
    const userIds = [...new Set(accounts?.map(a => a.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

    const profilesMap = new Map(profiles?.map(p => [p.id, p]));

    // Enrich accounts with profile data
    const enrichedAccounts = accounts?.map(account => ({
        ...account,
        profiles: profilesMap.get(account.user_id)
    }));

    // Filter to only show Phase 1 and Phase 2 (accounts eligible for upgrade)
    const eligibleAccounts = enrichedAccounts?.filter(account => {
        const type = (account.challenge_type || '').toLowerCase();
        return type.includes('phase 1') || type.includes('phase 2') ||
            type.includes('step 1') || type.includes('step 2') ||
            type.includes('1_step') || type.includes('2_step');
    }) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Pending Upgrades
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">Passed accounts waiting to be upgraded to next phase</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Pending Upgrades</p>
                    <p className="text-2xl font-bold text-green-600">{eligibleAccounts?.length || 0}</p>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="w-full max-w-md">
                    <SearchInput placeholder="Search by Login ID..." />
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Login</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">User</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Type</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Target</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Initial Bal</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Final Bal</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Final Equity</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Passed Date</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {eligibleAccounts?.map((account: any) => (
                                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-indigo-600 font-medium">
                                        {account.login}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {account.profiles?.full_name || "Unknown"}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                                {account.profiles?.email}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 capitalize">
                                            {account.challenge_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-green-600">
                                        {account.profit_target ? `${account.profit_target}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        ${Number(account.initial_balance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-gray-900">
                                        ${Number(account.current_balance || account.initial_balance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-right text-gray-600">
                                        ${Number(account.current_equity || account.initial_balance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                            <CheckCircle size={12} />
                                            PENDING UPGRADE
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500 text-xs">
                                        {new Date(account.updated_at).toLocaleDateString()}
                                        <div className="text-[10px] opacity-70">
                                            {new Date(account.updated_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <UpgradeButton
                                            accountId={account.id}
                                            accountLogin={account.login}
                                            upgradedTo={account.upgraded_to}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {eligibleAccounts?.length === 0 && (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        No accounts pending upgrade.
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
