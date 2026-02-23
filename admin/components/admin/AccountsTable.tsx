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
                router.refresh();
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
                router.refresh();
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
            else plan = account.plan_type || 'Lite';
        }

        // 3. Step detection
        let steps = '';
        if (typeStr.includes('1-step') || typeStr.includes('one step') || typeStr.includes('step_1') || typeStr.includes('1_step')) steps = '1 Step';
        else if (typeStr.includes('2-step') || typeStr.includes('two step') || typeStr.includes('step_2') || typeStr.includes('2_step')) steps = '2 Step';

        // Combined output
        if (plan && steps) return `${plan} - ${steps}`;
        if (plan && plan !== 'Lite') return plan;
        if (steps) return `Lite - ${steps}`;

        return plan || 'Lite';
    };

    return (
        <div className="flex flex-col h-full">
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-gray-50/50 p-4 border-b border-gray-100">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-white border border-gray-200 shadow-sm">
                        <Filter size={14} className="text-gray-500" />
                    </div>
                    <select
                        value={currentGroupFilter}
                        onChange={(e) => handleGroupFilterChange(e.target.value)}
                        className="bg-white border border-gray-200 text-[14px] font-medium text-gray-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 block w-full sm:w-64 p-2.5 transition-all shadow-sm outline-none cursor-pointer"
                    >
                        <option value="">All Groups</option>
                        {groups.map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-[14px]">
                    <thead className="bg-gray-50/80 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Account ID</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">User</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Login</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Password</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Type</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Plan / Group</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Balance</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Equity</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Status</th>
                            <th className="px-6 py-3.5 font-semibold text-gray-500 text-[11px] uppercase tracking-wider whitespace-nowrap">Created</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {accounts.map((account) => {
                            const isSelected = selectedIds.has(account.login);
                            return (
                                <tr
                                    key={account.id}
                                    className={`transition-colors duration-200 ${isSelected ? 'bg-blue-50/30' : 'hover:bg-gray-50/80'}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-[13px] font-mono font-semibold text-gray-900">
                                            {account.challenge_number || `SF-${account.id.slice(0, 8)}`}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-[14px] font-semibold text-gray-900">
                                                {account.profile?.full_name || "Unknown"}
                                            </span>
                                            <span className="text-[12px] text-gray-500">
                                                {account.profile?.email || "No email"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-[13px] font-mono font-semibold text-gray-900">
                                            {account.login || "-"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-[13px] font-mono text-gray-600">
                                            <span title="Master Password">{account.master_password || "-"}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 capitalize tracking-wide">
                                            {account.challenge_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="text-gray-900 font-medium text-[13px]">
                                            {getPlanDisplay(account)}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 truncate max-w-[150px] mt-0.5">
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
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-[13px] font-semibold text-gray-900">
                                            ${account.initial_balance?.toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-[13px] font-semibold text-blue-600">
                                            ${account.current_equity?.toLocaleString() ?? '-'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusBadge status={account.status} upgradedTo={account.upgraded_to} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-[12px] text-gray-500 font-medium">
                                            {new Date(account.created_at).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {accounts.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                        <p className="text-[14px] font-medium text-gray-900 mb-1">No accounts found</p>
                                        <p className="text-[13px]">Try adjusting your search or filters to find what you're looking for.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[13px] font-medium text-gray-500">
                                Page <span className="font-semibold text-gray-900">{currentPage}</span> of <span className="font-semibold text-gray-900">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-xl shadow-sm space-x-2" aria-label="Pagination">
                                <button
                                    onClick={() => handlePageChange(currentPage - 1)}
                                    disabled={currentPage <= 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
                                >
                                    <span className="sr-only">Previous</span>
                                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                                </button>

                                <span className="relative inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 bg-white text-[13px] font-semibold text-gray-900">
                                    {currentPage}
                                </span>

                                <button
                                    onClick={() => handlePageChange(currentPage + 1)}
                                    disabled={currentPage >= totalPages}
                                    className="relative inline-flex items-center px-2 py-2 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none transition-colors"
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
