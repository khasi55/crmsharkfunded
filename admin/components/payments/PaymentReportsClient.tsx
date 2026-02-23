"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, Download } from "lucide-react";

interface PaymentOrder {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    payment_method: string;
    payment_gateway: string;
    account_size: number;
    account_type: string;
    coupon_code: string;
    created_at: string;
    paid_at: string;
    user_name: string;
    user_email: string;
}

export function PaymentReportsClient() {
    const [payments, setPayments] = useState<PaymentOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchPayments = async () => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: "50",
                status: statusFilter
            });
            const res = await fetch(`/api/admin/payments?${queryParams}`);
            if (res.ok) {
                const { data, meta } = await res.json();
                setPayments(data || []);
                setTotalPages(meta?.totalPages || 1);
            }
        } catch (error) {
            console.error("Failed to fetch payments", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPayments();
    }, [page, statusFilter]);

    // Client-side search filtering (on top of server-side pagination/filtering)
    // Note: Ideally search should also be server-side for large datasets
    const filteredPayments = payments.filter(payment =>
        payment.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.user_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.order_id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleExport = () => {
        const headers = ["Date", "Order ID", "User Name", "User Email", "Gateway", "Method", "Amount", "Account Size", "Account Type", "Coupon", "Currency", "Status"];
        const csvContent = [
            headers.join(","),
            ...filteredPayments.map(p => [
                format(new Date(p.created_at), 'yyyy-MM-dd HH:mm:ss'),
                p.order_id,
                `"${p.user_name}"`, // Quote to handle commas in names
                p.user_email,
                p.payment_gateway || 'gateway',
                p.payment_method,
                p.amount,
                p.account_size || 'N/A',
                p.account_type || 'Challenge',
                p.coupon_code || 'None',
                p.currency,
                p.status
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `payment_report_${format(new Date(), 'yyyy-MM-dd')}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">

                {/* Status Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['all', 'paid', 'pending', 'failed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => { setStatusFilter(status); setPage(1); }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize whitespace-nowrap transition-colors ${statusFilter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search current page..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg bg-gray-50 border border-gray-200 pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>

                    {/* Export */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium whitespace-nowrap"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/50">
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order ID</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Gateway</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Account</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Coupon</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            Loading payments...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                                        No payments found
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {format(new Date(payment.created_at), 'MMM d, yyyy HH:mm')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                                            {payment.order_id}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-900 font-medium">{payment.user_name}</span>
                                                <span className="text-xs text-gray-500">{payment.user_email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-900 capitalize font-medium">
                                                    {(payment.payment_gateway && payment.payment_gateway !== 'Unknown') ? payment.payment_gateway : 'Gateway'}
                                                </span>
                                                <span className="text-xs text-gray-500 uppercase">{payment.payment_method || 'Unknown'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-900 font-medium">
                                                    {payment.account_size > 0 ? `$${(payment.account_size / 1000).toLocaleString()}k` : '-'}
                                                </span>
                                                <span className="text-xs text-gray-500 uppercase font-semibold">
                                                    {payment.account_type?.toLowerCase().includes('lite')
                                                        ? 'LITE'
                                                        : payment.account_type?.toLowerCase().includes('prime')
                                                            ? 'PRIME'
                                                            : payment.account_type || 'Challenge'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-mono">
                                            {payment.coupon_code && payment.coupon_code !== '-' ? payment.coupon_code : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {payment.currency === 'INR' ? '₹' : '$'}{payment.amount}
                                            {payment.currency !== 'INR' && (
                                                <div className="text-xs text-gray-400 mt-1">
                                                    ≈ ₹{(payment.amount * 98).toLocaleString()}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize border ${payment.status === 'paid' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                                payment.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' :
                                                    'bg-red-500/10 text-red-400 border-red-500/20'
                                                }`}>
                                                {payment.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Page <span className="font-medium text-gray-900">{page}</span> of <span className="font-medium text-gray-900">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            className="px-3 py-1 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
