"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { AccountActions } from "@/components/admin/AccountActions";
import { bulkDisableAccounts } from "@/app/actions/mt5-actions";
import { Loader2, Ban, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { disableAccountsByGroup } from "@/app/actions/mt5-actions";
import { ChevronLeft, ChevronRight, Filter } from "lucide-react";

interface AccountsTableProps {
    accounts: any[];
    currentPage: number;
    totalPages: number;
    groups: string[];
    currentGroupFilter: string;
}

export function AccountsTable({ accounts, currentPage, totalPages, groups, currentGroupFilter }: AccountsTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [isBulkActing, setIsBulkActing] = useState(false);

    // Toggle single row selection
    const toggleSelection = (login: number) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(login)) {
            newSelected.delete(login);
        } else {
            newSelected.add(login);
        }
        setSelectedIds(newSelected);
    };

    // Toggle all visible rows
    const toggleSelectAll = () => {
        if (selectedIds.size === accounts.length) {
            setSelectedIds(new Set());
        } else {
            // Only select items that have a login number
            const allLogins = accounts.map(a => a.login).filter(l => !!l);
            setSelectedIds(new Set(allLogins));
        }
    };

    const handleBulkDisable = async () => {
        if (selectedIds.size === 0) return;

        const confirmMsg = `Are you sure you want to DISABLE ALL ${selectedIds.size} selected accounts? This cannot be easily undone via bulk action.`;
        if (!confirm(confirmMsg)) return;

        setIsBulkActing(true);
        const loginsToDisable = Array.from(selectedIds);

        try {
            const result = await bulkDisableAccounts(loginsToDisable);
            if ('success' in result && result.success) {
                toast.success(result.message);
                setSelectedIds(new Set()); // Clear selection
                // The server action doesn't automatically revalidate client cache perfectly in all cases, 
                // so a hard refresh ensures UI consistency.
                window.location.reload();
            } else {
                toast.error(`Bulk action failed: ${result.error}`);
                if (result.details?.errors?.length) {
                    console.error("Bulk errors:", result.details.errors);
                }
            }
        } catch (error: any) {
            toast.error("Failed to execute bulk action");
            console.error(error);
        } finally {
            setIsBulkActing(false);
        }
    };

    const isAllSelected = accounts.length > 0 && selectedIds.size === accounts.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < accounts.length;

    const handlePageChange = (newPage: number) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', newPage.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleGroupFilterChange = (group: string) => {
        const params = new URLSearchParams(searchParams);
        if (group) {
            params.set('group', group);
        } else {
            params.delete('group');
        }
        params.set('page', '1'); // Reset to page 1
        router.push(`${pathname}?${params.toString()}`);
    };

    const handleDisableEntireGroup = async () => {
        if (!currentGroupFilter) return;

        const confirmMsg = `⚠️ DANGER ZONE ⚠️\n\nAre you sure you want to DISABLE ALL ACCOUNTS in group "${currentGroupFilter}"?\n\nThis will affect ALL pages, not just the visible ones. This action cannot be easily undone.`;

        // Double confirmation
        if (!confirm(confirmMsg)) return;
        const doubleConfirm = prompt(`Type "DISABLE ${currentGroupFilter}" to confirm.`);
        if (doubleConfirm !== `DISABLE ${currentGroupFilter}`) {
            toast.error("Confirmation failed. Action cancelled.");
            return;
        }

        setIsBulkActing(true);
        try {
            const result = await disableAccountsByGroup(currentGroupFilter);
            if ('success' in result && result.success) {
                toast.success(result.message);
                window.location.reload();
            } else {
                toast.error(`Group disable failed: ${result.error}`);
            }
        } catch (error: any) {
            toast.error("Failed to execute group disable");
            console.error(error);
        } finally {
            setIsBulkActing(false);
        }
    };

    const getPlanDisplay = (account: any) => {
        const groupStr = (account.mt5_group || account.group || '').toLowerCase();
        const typeStr = (account.challenge_type || '').toLowerCase();

        // 1. Type-First Detection: Trust the database challenge_type IF explicit
        let plan = '';
        if (typeStr.includes('prime')) plan = 'Prime';
        else if (typeStr.includes('lite')) plan = 'Lite';
        else if (typeStr.includes('instant')) plan = 'Instant';

        // 2. Fallback to MT5 Group path for legacy/generic types
        if (!plan) {
            if (groupStr.includes('\\sf\\') || groupStr.includes('pro')) plan = 'Prime';
            else if (groupStr.includes('-sf') || (groupStr.includes('\\s\\') && !groupStr.includes('\\sf\\'))) plan = 'Lite';
            else if (groupStr.includes('instant')) plan = 'Instant';
            else plan = account.plan_type || 'Standard';
        }

        // 3. Step detection
        let steps = '';
        if (typeStr.includes('1-step') || typeStr.includes('one step') || typeStr.includes('step_1') || typeStr.includes('1_step')) steps = '1 Step';
        else if (typeStr.includes('2-step') || typeStr.includes('two step') || typeStr.includes('step_2') || typeStr.includes('2_step')) steps = '2 Step';

        // Combined output
        if (plan && steps) return `${plan} - ${steps}`;
        if (plan && plan !== 'Standard') return plan;
        if (steps) return `Standard - ${steps}`;

        return plan || 'Standard';
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter size={16} className="text-gray-500" />
                    <select
                        value={currentGroupFilter}
                        onChange={(e) => handleGroupFilterChange(e.target.value)}
                        className="bg-white border border-gray-300 text-gray-700 text-sm rounded-md focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:w-64 p-2"
                    >
                        <option value="">All Groups</option>
                        {groups.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Account ID</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">User</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Login</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Password</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Type</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Plan / Group</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Balance</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Equity</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                            <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {accounts.map((account) => {
                            const isSelected = selectedIds.has(account.login);
                            return (
                                <tr
                                    key={account.id}
                                    className={`transition-colors ${isSelected ? 'bg-indigo-50/50 hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                                >
                                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                        <div className="text-indigo-600 font-medium">
                                            {account.challenge_number || `SF-${account.id.slice(0, 8)}`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {account.profile?.full_name || "Unknown"}
                                            </div>
                                            <div className="text-xs text-gray-500 font-mono">
                                                {account.profile?.email || "No email"}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-900">
                                        {account.login || "-"}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-900">
                                        <div className="flex flex-col">
                                            <span title="Master Password">{account.master_password || "-"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-900 capitalize">
                                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                                            {account.challenge_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-900 font-medium text-xs break-words max-w-[150px]">
                                            {getPlanDisplay(account)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono truncate max-w-[150px]">
                                            <span title={account.server}>{account.group || account.mt5_group || "-"}</span>
                                            {(() => {
                                                const typeStr = (account.challenge_type || '').toLowerCase();
                                                const groupStr = (account.mt5_group || account.group || '').toLowerCase();

                                                const isTypePrime = typeStr.includes('prime');
                                                const isTypeLite = typeStr.includes('lite');
                                                const isGroupPrime = groupStr.includes('\\sf\\') || groupStr.includes('pro');
                                                const isGroupLite = (groupStr.includes('\\s\\') && !groupStr.includes('\\sf\\')) || groupStr.includes('-sf');

                                                if ((isTypePrime && isGroupLite) || (isTypeLite && isGroupPrime)) {
                                                    return (
                                                        <span title="Type/Group Mismatch: This account may have incorrect risk rules applied." className="text-amber-500">
                                                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                                            </svg>
                                                        </span>
                                                    );
                                                }
                                                return null;
                                            })()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        ${account.initial_balance?.toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-blue-600">
                                        ${account.current_equity?.toLocaleString() ?? '-'}
                                    </td>
                                    <td className="px-6 py-4">
                                        <StatusBadge status={account.status} upgradedTo={account.upgraded_to} />
                                    </td>
                                    <td className="px-6 py-4 text-gray-600 text-xs">
                                        {new Date(account.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            );
                        })}
                        {accounts.length === 0 && (
                            <tr>
                                <td colSpan={12} className="px-6 py-12 text-center text-gray-500">
                                    No accounts found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-xs text-gray-700">
                                Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                </button>
                                {/* Simple pagination: Show current page */}
                                <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                    {currentPage}
                                </span>
                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:bg-gray-100 disabled:text-gray-400"
                                >
                                    <span className="sr-only">Next</span>
                                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
