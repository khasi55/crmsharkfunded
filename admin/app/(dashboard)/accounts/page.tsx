import { createAdminClient } from "@/utils/supabase/admin";
import { SearchInput } from "@/components/admin/SearchInput";
import Link from "next/link";
import { Server, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AccountActions } from "@/components/admin/AccountActions";
import { AccountsTable } from "@/components/admin/AccountsTable";

export default async function AccountsListPage({
    searchParams,
}: {
    searchParams: { query?: string; page?: string; group?: string; status?: string; tab?: string };
}) {
    const query = (await searchParams)?.query || "";
    const page = parseInt((await searchParams)?.page || "1");
    const groupFilter = (await searchParams)?.group || "";
    const statusFilter = (await searchParams)?.status || "";
    const PAGE_SIZE = 50;

    const supabase = createAdminClient();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let queryBuilder = supabase
        .from("challenges")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (query) {
        // Search by login or ID. Profile search (email/name) would require a different approach or RPC
        queryBuilder = queryBuilder.or(`login.ilike.%${query}%,id.ilike.%${query}%`);
    }

    if (groupFilter) {
        queryBuilder = queryBuilder.eq('group', groupFilter);
    }
    
    if (statusFilter) {
        queryBuilder = queryBuilder.eq('status', statusFilter);
    }

    const { data: accountsData, count, error } = await queryBuilder;

    if (error) {
        console.error("Error fetching accounts:", error);
    }

    // Manual join with profiles
    const userIds = Array.from(new Set(accountsData?.map(a => (a as any).user_id).filter(Boolean) || []));
    let profilesData: any[] = [];
    
    if (userIds.length > 0) {
        const { data: pData } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', userIds);
        profilesData = pData || [];
    }

    const accountsWithProfiles = accountsData?.map(acc => ({
        ...acc,
        profile: profilesData.find(p => p.id === (acc as any).user_id) || { 
            full_name: 'Unknown', 
            email: 'Unknown' 
        },
        plan_type: (acc as any).challenge_type
    })) || [];

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Get unique groups for the filter dropdown
    const { data: groupsData } = await supabase
        .from('challenges')
        .select('group')
        .not('group', 'is', null);
    const uniqueGroups = Array.from(new Set(groupsData?.map(g => g.group).filter(Boolean) || []));

    return (
        <div className="space-y-6">
            {/* Header Bento Card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white rounded-2xl border border-gray-100 p-6 shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900">All MT5 Accounts</h1>
                    <p className="text-[14px] text-gray-500 font-medium mt-1">Master list of all created trading accounts</p>
                </div>
                <div className="bg-gray-50/80 border border-gray-100 rounded-xl px-5 py-3 shadow-sm flex flex-col items-end sm:items-center">
                    <p className="text-[11px] text-gray-500 uppercase font-semibold tracking-wider">Total Accounts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-0.5">{count || 0}</p>
                </div>
            </div>

            {/* Search Bento Card */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="w-full max-w-lg">
                    <SearchInput placeholder="Search by Email, Login, or ID..." />
                </div>
            </div>

            {/* Table Bento Card */}
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                <AccountsTable
                    accounts={accountsWithProfiles}
                    groups={uniqueGroups}
                    currentPage={page}
                    totalPages={totalPages}
                    currentGroupFilter={groupFilter}
                />
            </div>
        </div>
    );
}
