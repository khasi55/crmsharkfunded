"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, Download, Copy, Check, Filter } from "lucide-react";
import { toast } from "react-hot-toast";

interface PaymentOrder {
    id: string;
    order_id: string;
    payment_id?: string;
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
    const [copiedId, setCopiedId] = useState<string | null>(null);

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

    const handleCopy = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        toast.success("Order ID copied to clipboard");
        setTimeout(() => setCopiedId(null), 2000);
    };

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

    // Helper function to get initials for avatar
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div className="space-y-6">
            {/* Filters & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">

                {/* Status Filters - Segmented Control Style */}
                <div className="inline-flex bg-gray-100/80 p-1 rounded-lg">
                    {['all', 'paid', 'pending', 'failed'].map((status) => (
                        <button
                            key={status}
                            onClick={() => { setStatusFilter(status); setPage(1); }}
                            className={`px-4 py-2 rounded-md text-sm font-medium capitalize whitespace-nowrap transition-all duration-200 ${statusFilter === status
                                ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50'
                                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    {/* Search */}
                    <div className="relative flex-1 md:w-72">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or order ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-lg bg-gray-50 border border-gray-200 pl-10 pr-4 py-2 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
                        />
                    </div>

                    {/* Export */}
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all shadow-sm active:scale-95 text-sm font-medium whitespace-nowrap"
                    >
                        <Download className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-200 bg-gray-50/80">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Order ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">User</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Gateway</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Account</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Coupon</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Amount</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-gray-500">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                            <p className="font-medium">Loading payments...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredPayments.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-20 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3 text-gray-400">
                                            <Filter className="h-10 w-10 text-gray-300" />
                                            <p className="font-medium text-gray-500">No payments found</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-gray-900">{format(new Date(payment.created_at), 'MMM d, yyyy')}</span>
                                                <span className="text-xs">{format(new Date(payment.created_at), 'HH:mm')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-gray-900 font-semibold">{payment.order_id}</span>
                                                    <button
                                                        onClick={() => handleCopy(payment.order_id, payment.id)}
                                                        className="text-gray-400 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-md p-0.5 opacity-0 group-hover:opacity-100"
                                                        title="Copy Order ID"
                                                    >
                                                        {copiedId === payment.id ? (
                                                            <Check className="h-3 w-3 text-green-500" />
                                                        ) : (
                                                            <Copy className="h-3 w-3" />
                                                        )}
                                                    </button>
                                                </div>
                                                {payment.payment_id && (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] text-gray-400 font-medium">Gateway: {payment.payment_id}</span>
                                                        <button
                                                            onClick={() => handleCopy(payment.payment_id!, payment.id + '-gateway')}
                                                            className="text-gray-400 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 rounded-md p-0.5 opacity-0 group-hover:opacity-100"
                                                            title="Copy Gateway ID"
                                                        >
                                                            {copiedId === payment.id + '-gateway' ? (
                                                                <Check className="h-2.5 w-2.5 text-green-500" />
                                                            ) : (
                                                                <Copy className="h-2.5 w-2.5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100 text-blue-700 font-semibold text-xs shrink-0">
                                                    {getInitials(payment.user_name || '?')}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-gray-900 font-semibold">{payment.user_name}</span>
                                                    <span className="text-xs text-gray-500">{payment.user_email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-900 capitalize font-medium">
                                                    {(payment.payment_gateway && payment.payment_gateway !== 'Unknown') ? payment.payment_gateway : 'Gateway'}
                                                </span>
                                                <span className="text-xs text-gray-500 uppercase flex items-center gap-1">
                                                    {payment.payment_method || 'Unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm text-gray-900 font-semibold">
                                                    {payment.account_size > 0 ? `$${(payment.account_size / 1000).toLocaleString()}k` : '-'}
                                                </span>
                                                <span className="text-[10px] tracking-wider text-gray-500 uppercase font-bold mt-0.5">
                                                    {payment.account_type?.toLowerCase().includes('lite')
                                                        ? 'LITE'
                                                        : payment.account_type?.toLowerCase().includes('prime')
                                                            ? 'PRIME'
                                                            : payment.account_type || 'Challenge'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                            {payment.coupon_code && payment.coupon_code !== '-' ? (
                                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-700 text-xs font-mono font-medium border border-gray-200">
                                                    {payment.coupon_code}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="text-sm font-bold text-gray-900 flex items-center gap-1">
                                                    {payment.currency !== 'INR' && <span className="text-gray-400 font-medium text-xs">US</span>}
                                                    {payment.currency === 'INR' ? '₹' : '$'}{payment.amount.toLocaleString()}
                                                </span>
                                                {payment.currency !== 'INR' && (
                                                    <div className="text-xs text-gray-500 font-medium mt-0.5">
                                                        ≈ ₹{(payment.amount * 98).toLocaleString()}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-center">
                                            <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wider capitalize border ${payment.status === 'paid' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20 border-transparent' :
                                                payment.status === 'pending' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20 border-transparent' :
                                                    'bg-red-50 text-red-700 ring-1 ring-red-600/20 border-transparent'
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
                <div className="border-t border-gray-200 bg-gray-50/80 px-6 py-4 flex items-center justify-between">
                    <p className="text-sm text-gray-500 font-medium">
                        Page <span className="font-semibold text-gray-900">{page}</span> of <span className="font-semibold text-gray-900">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page === totalPages || loading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-95"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

