"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import { ChevronRight, FileText, Search, Filter, Inbox } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { format } from "date-fns";

interface KYCRequest {
    id: string;
    user_id: string;
    status: string;
    document_type: string;
    created_at: string;
    profiles?: {
        full_name?: string;
        email?: string;
    };
}

interface KYCTableProps {
    requests: KYCRequest[];
}

export function KYCTable({ requests = [] }: KYCTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Filter logic
    const filteredRequests = requests.filter(req => {
        const matchesSearch =
            (req.profiles?.full_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (req.profiles?.email?.toLowerCase() || "").includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === "all" || req.status.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    // Helper to get initials
    const getInitials = (name: string = "") => {
        return name
            .split(" ")
            .map(n => n[0])
            .slice(0, 2)
            .join("")
            .toUpperCase() || "??";
    };

    // Helper for avatar background color based on name
    const getAvatarColor = (name: string = "") => {
        const colors = [
            "bg-blue-100 text-blue-700",
            "bg-purple-100 text-purple-700",
            "bg-pink-100 text-pink-700",
            "bg-orange-100 text-orange-700",
            "bg-emerald-100 text-emerald-700",
            "bg-cyan-100 text-cyan-700"
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm transition-all hover:shadow-md">

                {/* Status Tabs */}
                <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-lg">
                    {['all', 'pending', 'requires_review', 'approved', 'rejected'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-all ${statusFilter === status
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-lg bg-gray-50 border border-transparent pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-500 hover:bg-white hover:border-gray-200 focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                </div>
            </div>

            {/* Stats Summary - Optional Polish */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Total Requests</p>
                        <p className="text-2xl font-semibold text-gray-900">{requests.length}</p>
                    </div>
                    <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                        <Inbox className="h-5 w-5" />
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500">Pending Review</p>
                        <p className="text-2xl font-semibold text-gray-900">
                            {requests.filter(r => r.status === 'pending' || r.status === 'requires_review').length}
                        </p>
                    </div>
                    <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
                        <FileText className="h-5 w-5" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50/80 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">User Profile</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Document</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Status</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs">Submitted</th>
                                <th className="px-6 py-4 font-semibold text-gray-500 uppercase tracking-wider text-xs text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredRequests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <div className="h-12 w-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                                                <Search className="h-6 w-6 text-gray-300" />
                                            </div>
                                            <p className="text-base font-medium text-gray-900">No requests found</p>
                                            <p className="text-sm">Try adjusting your filters or search query.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredRequests.map((req) => {
                                    const userName = req.profiles?.full_name || req.profiles?.email?.split('@')[0] || "Unknown User";
                                    const userEmail = req.profiles?.email || "No Email";

                                    return (
                                        <tr key={req.id} className="group hover:bg-gray-50/80 transition-colors duration-200">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${getAvatarColor(userName)}`}>
                                                        {getInitials(userName)}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-gray-900">{userName}</div>
                                                        <div className="text-xs text-gray-500 font-mono">{userEmail}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-600 font-medium text-xs capitalize">
                                                    <FileText className="h-3.5 w-3.5 text-gray-400" />
                                                    {(req.document_type || "Unknown Type").replace(/_/g, " ")}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={req.status} className="shadow-sm" />
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                {format(new Date(req.created_at), 'MMM d, yyyy')}
                                                <span className="block text-gray-400 text-[10px] uppercase mt-0.5">
                                                    {format(new Date(req.created_at), 'hh:mm a')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Link
                                                    href={`/kyc/${req.id}`}
                                                    className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 shadow-sm transition-all group-hover:scale-110"
                                                    title="Review Application"
                                                >
                                                    <ChevronRight className="h-4 w-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
