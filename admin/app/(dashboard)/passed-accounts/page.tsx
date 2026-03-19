import { createAdminClient } from "@/utils/supabase/admin";
import { SearchInput } from "@/components/admin/SearchInput";
import { CheckCircle, Trophy, User, Hash } from "lucide-react";
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

    const formatCurrency = (val: number | string | undefined) => {
        if (val === undefined || val === null) return '-';
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));
    };

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header section with Stats Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-yellow-100 text-yellow-600 rounded-xl shadow-sm border border-yellow-200/50">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Pending Upgrades</h1>
                    </div>
                    <p className="text-sm text-gray-500 font-medium ml-[3.5rem]">Passed accounts currently waiting to be upgraded to the next phase.</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm min-w-[180px] flex flex-col justify-center">
                    <p className="text-[11px] text-gray-400 uppercase font-bold tracking-widest mb-1">Accounts Pending</p>
                    <p className="text-3xl font-black text-emerald-600 tracking-tighter">{eligibleAccounts?.length || 0}</p>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">

                {/* Tools Bar (Search) */}
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="w-full sm:w-80 relative">
                        <SearchInput placeholder="Search by Login ID..." />
                    </div>
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto w-full">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Account Login</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Credentials</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">User Details</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right">Final Equity</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider">Passed Date</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-wider text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {eligibleAccounts?.map((account: any) => (
                                <tr key={account.id} className="hover:bg-gray-50/80 transition-colors duration-200 group">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-mono text-indigo-600 font-bold text-sm tracking-tight flex items-center gap-1">
                                                <Hash className="w-3.5 h-3.5 opacity-50" />
                                                {account.login}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-400 uppercase w-12 text-[10px] tracking-wider">Master</span>
                                                <span className="font-mono text-indigo-700 font-semibold bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded text-xs select-all">
                                                    {account.master_password || "-"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-gray-400 uppercase w-12 text-[10px] tracking-wider">Invest</span>
                                                <span className="font-mono text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded text-xs select-all">
                                                    {account.investor_password || "-"}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs ring-1 ring-blue-50 shrink-0">
                                                {account.profiles?.full_name?.charAt(0) || <User className="w-4 h-4" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                                    {account.profiles?.full_name || "Unknown"}
                                                </span>
                                                <span className="text-xs text-gray-500 font-medium mb-1">
                                                    {account.profiles?.email}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 border border-blue-100 text-blue-700 capitalize self-start tracking-wide">
                                                    {account.challenge_type?.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right font-extrabold text-gray-900 tracking-tight text-sm">
                                        {formatCurrency(account.current_equity || account.initial_balance)}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-yellow-100 text-yellow-800 tracking-widest uppercase border border-yellow-200 shadow-sm">
                                            <CheckCircle size={12} className="text-yellow-600" />
                                            PENDING
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-sm font-medium text-gray-900">
                                                {new Date(account.updated_at).toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium tracking-wide">
                                                {new Date(account.updated_at).toLocaleTimeString(undefined, {
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
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
                                    <td colSpan={7} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Trophy className="w-12 h-12 text-gray-200 mb-4" />
                                            <p className="text-base font-bold text-gray-900 mb-1">No pending upgrades</p>
                                            <p className="text-sm text-gray-500">There are no accounts currently waiting to be upgraded.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex justify-end">
                    <AdminPagination currentPage={page} totalPages={totalPages} />
                </div>
            )}
        </div>
    );
}
