import { createAdminClient } from "@/utils/supabase/admin";
import { SearchInput } from "@/components/admin/SearchInput";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ExportUsersButton } from "@/components/admin/ExportUsersButton";

export default async function AdminUsersPage({
    searchParams,
}: {
    searchParams: { query?: string; page?: string };
}) {
    const query = (await searchParams)?.query || "";
    const page = parseInt((await searchParams)?.page || "1");
    const pageSize = 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    let userQuery = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

    if (query) {
        // Simple regex to check if query looks like a UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);

        if (isUuid) {
            userQuery = userQuery.or(`full_name.ilike.%${query}%,id.eq.${query},email.ilike.%${query}%`);
        } else {
            userQuery = userQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);
        }
    }

    const { data: users, count, error } = await userQuery;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">User Management</h1>
                <p className="text-sm text-gray-600 mt-1">View and manage all registered users</p>
            </div>

            <div className="flex justify-end">
                <ExportUsersButton />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="w-full max-w-md">
                    <SearchInput placeholder="Search by name, email or ID..." />
                </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">User Details</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Commission</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Referrals</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Joined Date</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users?.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold">
                                                {user.full_name?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">
                                                    {user.full_name || "Unknown"}
                                                </div>
                                                <div className="text-xs text-gray-500 font-mono">
                                                    {user.email || user.id.slice(0, 8) + "..."}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status="Active" />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        ${user.total_commission || 0}
                                    </td>
                                    <td className="px-6 py-4 text-gray-600">{user.total_referrals || 0}</td>
                                    <td className="px-6 py-4 text-gray-600">
                                        {new Date(user.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/admin/users/${user.id}`}
                                            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            View Details
                                            <ChevronRight className="ml-1 h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {users?.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        No users found matching your search.
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
