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
    const statusFilter = (await searchParams)?.status || ""; // Add status filter extraction
    const PAGE_SIZE = 50;

    const supabase = createAdminClient();

    // 0. Fetch Unique Groups for Filter
    // Using a separate query to get distinct groups. 
    // Since distinct is hard in simple select, we fetch all non-null groups and de-dupe in JS (not efficient for huge DBs but fine for now)
    // Or use rpc if available. For now, assuming manageable size.
    const { data: allGroupsData } = await supabase
        .from('challenges')
        .select('group')
        .not('group', 'is', null);

    // @ts-ignore
    const uniqueGroups = Array.from(new Set(allGroupsData?.map(d => d.group))).filter(Boolean).sort() as string[];

    // 1. Build Query for Challenges
    let challengeQuery = supabase
        .from("challenges")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (groupFilter) {
        challengeQuery = challengeQuery.eq('group', groupFilter);
    }

    const tab = (await searchParams)?.tab || ""; // Add tab extraction

    // Unified status filtering logic (matches MT5 Dashboard)
    if (statusFilter === 'breached') {
        // Group all "terminating" statuses together
        challengeQuery = challengeQuery.or('status.in.("breached","failed","disabled","upgraded"),upgraded_to.not.is.null');
    } else if (statusFilter === 'disabled') {
        challengeQuery = challengeQuery.or('status.in.("disabled","upgraded"),upgraded_to.not.is.null');
    } else if (statusFilter) {
        challengeQuery = challengeQuery.eq('status', statusFilter);
    }
    // REMOVED: Default exclusion filter to show ALL accounts (428 total)

    // Tab Filtering Logic
    if (tab === 'first') {
        challengeQuery = challengeQuery.or('challenge_type.ilike.%phase 1%,challenge_type.ilike.%phase_1%,challenge_type.ilike.%step 1%,challenge_type.ilike.%step_1%,challenge_type.ilike.%evaluation%');
    } else if (tab === 'second') {
        challengeQuery = challengeQuery.or('challenge_type.ilike.%phase 2%,challenge_type.ilike.%phase_2%,challenge_type.ilike.%step 2%,challenge_type.ilike.%step_2%');
    } else if (tab === 'funded') {
        challengeQuery = challengeQuery.or('challenge_type.ilike.%funded%,challenge_type.ilike.%master%,challenge_type.ilike.%live%');
    } else if (tab === 'instant') {
        challengeQuery = challengeQuery.ilike('challenge_type', '%instant%');
    }

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

        // Mapping common terms like "Live" to "Funded" or search by status
        if (query.toLowerCase() === 'live') {
            filters.push(`challenge_type.ilike.%funded%`);
            filters.push(`status.eq.active`);
        }

        // If query has spaces, also search with underscores (common in DB)
        if (query.includes(' ')) {
            filters.push(`challenge_type.ilike.%${query.replace(/ /g, '_')}%`);
        }

        // Search in Group name too
        filters.push(`group.ilike.%${query}%`);

        // NEW: Search by Email (via Profiles)
        if (query.includes('@') || query.length > 3) {
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id')
                .ilike('email', `%${query}%`);

            if (profiles && profiles.length > 0) {
                const userIds = profiles.map(p => p.id).join(',');
                filters.push(`user_id.in.(${userIds})`);
            }
        }

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

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

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
                    <SearchInput placeholder="Search by Email, Login, or ID..." />
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
