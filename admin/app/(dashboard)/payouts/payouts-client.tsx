"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

interface PayoutRequest {
    id: string;
    amount: number;
    payout_method: string;
    status: string;
    created_at: string;
    profiles: {
        full_name: string;
        email: string;
    };
}

export default function AdminPayoutsClient() {
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchPayouts() {
            try {
                const response = await fetch('/api/payouts/admin');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch payouts');
                }

                setRequests(data.payouts || []);
            } catch (err: any) {
                console.error('Error fetching payouts:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchPayouts();
    }, []);

    if (loading) {
        return (
            <div className="space-y-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payout Requests</h1>
                <div className="flex items-center justify-center py-12">
                    <div className="text-slate-500">Loading...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-8">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payout Requests</h1>
                <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
                    Error: {error}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payout Requests</h1>

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">User</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Amount</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Method</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Status</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Requested Date</th>
                                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {requests?.map((req) => (
                                <tr key={req.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">
                                            {req.profiles?.full_name || "Unknown User"}
                                        </div>
                                        <div className="text-xs text-slate-500">{req.profiles?.email}</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-900">${req.amount}</td>
                                    <td className="px-6 py-4 capitalize text-slate-600">{req.payout_method}</td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={req.status} />
                                    </td>
                                    <td className="px-6 py-4 text-slate-500">
                                        {new Date(req.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <Link
                                            href={`/payouts/${req.id}`}
                                            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                        >
                                            Process
                                            <ChevronRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {requests?.length === 0 && (
                                <tr key="no-requests">
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                                        No payout requests found
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
