import { createAdminClient } from "@/utils/supabase/admin";
import { LogsClient } from "@/components/admin/LogsClient";



export default async function AuditLogsPage({
    searchParams,
}: {
    searchParams: { page?: string; email?: string; level?: string; query?: string };
}) {
    const supabase = createAdminClient();
    const page = parseInt((await searchParams)?.page || "1");
    const levelFilter = (await searchParams)?.level || "";
    const query = (await searchParams)?.query || "";
    const PAGE_SIZE = 50;

    // Build query
    let logsQuery = supabase
        .from("system_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    if (levelFilter && levelFilter !== 'all') {
        logsQuery = logsQuery.eq("level", levelFilter);
    }

    if (query) {
        // Search in message or admin_email if available in JSON
        logsQuery = logsQuery.or(`message.ilike.%${query}%,details->>admin_email.ilike.%${query}%,source.ilike.%${query}%`);
    }

    const { data: logs, count, error } = await logsQuery;

    if (error) {
        console.error("Error fetching logs:", error);
    }

    const totalPages = Math.ceil((count || 0) / PAGE_SIZE);

    return (
        <LogsClient
            logs={logs || []}
            count={count || 0}
            page={page}
            totalPages={totalPages}
            levelFilter={levelFilter}
            query={query}
        />
    );
}
