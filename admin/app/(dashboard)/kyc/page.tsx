import { fetchWithAuth } from "@/utils/fetch-with-auth";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default async function AdminKYCPage() {
    let requests = [];
    try {
        const response = await fetchWithAuth(`/api/kyc/admin`, {
            cache: 'no-store'
        });

        if (response.ok) {
            const data = await response.json();
            requests = data.sessions || []; // Backend returns { sessions: [...] }
        } else {
            console.error('Failed to fetch KYC requests from backend:', response.statusText);
        }
    } catch (e) {
        console.error('Error in AdminKYCPage fetch:', e);
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Pending KYC Requests</h1>

            <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                            <tr>
                                <th className="px-6 py-4 font-medium">User</th>
                                <th className="px-6 py-4 font-medium">Type</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                            {requests?.map((req: any) => (
                                <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                            {req.profiles?.full_name || req.profiles?.email?.split('@')[0] || "Unknown User"}
                                        </div>
                                        <div className="text-xs text-gray-500">{req.profiles?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 capitalize">{req.document_type}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <Link
                                            href={`/kyc/${req.id}`}
                                            className="inline-flex items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
                                        >
                                            Review
                                            <ChevronRight className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {requests?.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No pending KYC requests
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
