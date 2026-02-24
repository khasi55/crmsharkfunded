
import { createAdminClient } from "@/utils/supabase/admin";
import { SearchInput } from "@/components/admin/SearchInput";
import { CheckCircle, Trophy } from "lucide-react";
import PassedAccountActions from "@/components/admin/PassedAccountActions";

import { AdminPagination } from "@/components/admin/AdminPagination";

export default async function PassedAccountsPage({
    searchParams,
}: {
    searchParams: { query?: string; page?: string };
}) {
    const supabase = createAdminClient();
    const query = (await searchParams)?.query || "";
    const page = parseInt((await searchParams)?.page || "1");
    const PAGE_SIZE = 50;

    // Build Query - Show active passed challenges (waiting for upgrade)
    let dbQuery = supabase
        .from("challenges")
        .select("*", { count: "exact" })
        .eq("status", "passed") // Only show passed accounts waiting for upgrade
        .or('challenge_type.ilike.%phase 1%,challenge_type.ilike.%phase 2%,challenge_type.ilike.%step 1%,challenge_type.ilike.%step 2%,challenge_type.ilike.%1_step%,challenge_type.ilike.%2_step%')
        .order("updated_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

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

    const { data: accounts, count, error } = await dbQuery;

    if (error) {
        console.error("Error fetching passed accounts:", error);
    }

    // Fetch profiles separately
    const userIds = [...new Set(accounts?.map((a: any) => a.user_id).filter(Boolean))];
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

    const profilesMap = new Map(profiles?.map((p: any) => [p.id, p]));

    // Enrich accounts with profile data
    const eligibleAccounts = accounts?.map((account: any) => ({
        ...account,
        profiles: profilesMap.get(account.user_id)
    })) || [];

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

    return (
        <div className="space-y-6">
            {/* Header Bento Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-2xl border border-gray-100 p-6 shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                        <Trophy className="text-yellow-500" /> Pending Upgrades
                    </h1>
                    <p className="text-[14px] text-gray-500 font-medium mt-1">Passed accounts waiting to be upgraded to next phase</p>
                </div>
                <div className="bg-gray-50/80 border border-gray-100 rounded-xl px-5 py-3 shadow-sm flex flex-col items-end sm:items-center">
                    <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Pending Upgrades</p>
                    <p className="text-2xl font-bold text-green-600 mt-0.5">{eligibleAccounts?.length || 0}</p>
                </div>
            </div>

            {/* Search Bento Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="w-full max-w-lg">
                    <SearchInput placeholder="Search by Login ID..." />
                </div>
            </div>

            {/* Table Bento Card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-[14px]">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Login</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Credentials</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">User</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Type</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap text-right">Target</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap text-right">Initial Bal</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap text-right">Final Bal</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap text-right">Final Equity</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Passed Date</th>
                                <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {eligibleAccounts?.map((account: any) => (
                                <tr key={account.id} className="hover:bg-gray-50/80 transition-colors duration-200">
                                    <td className="px-6 py-4 whitespace-nowrap font-mono text-indigo-600 font-semibold text-[13px]">
                                        {account.login}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-[13px]">
                                                <span className="font-bold text-gray-400 uppercase w-14 text-[10px]">Master</span>
                                                <span className="font-mono text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">
                                                    {account.master_password || "-"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-[13px]">
                                                <span className="font-bold text-gray-400 uppercase w-14 text-[10px]">Investor</span>
                                                <span className="font-mono text-gray-600 bg-gray-50 px-1.5 py-0.5 rounded">
                                                    {account.investor_password || "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-semibold text-gray-900">
                                                {account.profiles?.full_name || "Unknown"}
                                            </span>
                                            <span className="text-[12px] text-gray-500">
                                                {account.profiles?.email}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 capitalize tracking-wide">
                                            {account.challenge_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-green-600 text-[13px]">
                                        {account.profit_target ? `${account.profit_target}%` : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600 text-[13px] font-medium">
                                        ${Number(account.initial_balance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900 text-[13px]">
                                        ${Number(account.current_balance || account.initial_balance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-blue-600 font-semibold text-[13px]">
                                        ${Number(account.current_equity || account.initial_balance).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-100 text-yellow-800 tracking-wide uppercase">
                                            <CheckCircle size={12} />
                                            PENDING
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-[12px] font-medium">
                                        {new Date(account.updated_at).toLocaleDateString(undefined, {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        })}
                                        <div className="text-[10px] opacity-70 mt-0.5">
                                            {new Date(account.updated_at).toLocaleTimeString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <PassedAccountActions
                                            accountId={account.id}
                                            accountLogin={account.login}
                                            upgradedTo={account.upgraded_to}
                                            currentStatus={account.status}
                                        />
                                    </td>
                                </tr>
                            ))}
                            {eligibleAccounts?.length === 0 && (
                                <tr>
                                    <td colSpan={11} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <p className="text-[14px] font-medium text-gray-900 mb-1">No accounts pending upgrade.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <AdminPagination currentPage={page} totalPages={totalPages} />
        </div>
    );
}
