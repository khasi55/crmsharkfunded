"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import { Search, Loader2, User, Tag, Calendar, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Sale {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    coupon_code: string;
    created_at: string;
    customer: {
        email: string;
        full_name: string;
    } | null;
    affiliate: {
        email: string;
        full_name: string;
    } | null;
}

export default function AffiliateSalesClient() {
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [searchQuery, setSearchQuery] = useState("");
    const [total, setTotal] = useState(0); // Renamed to total, as totalSales is for summary
    const limit = 20;

    const affiliateSummaries = useMemo(() => {
        const summaries: Record<string, { name: string, email: string, orders: number, volume: number }> = {};

        sales.forEach(sale => {
            const affiliateId = sale.affiliate?.email || 'direct';
            if (!summaries[affiliateId]) {
                summaries[affiliateId] = {
                    name: sale.affiliate?.full_name || 'Direct / Unknown',
                    email: sale.affiliate?.email || 'N/A',
                    orders: 0,
                    volume: 0
                };
            }
            summaries[affiliateId].orders += 1;
            summaries[affiliateId].volume += Number(sale.amount) || 0;
        });

        return Object.values(summaries).sort((a, b) => b.volume - a.volume);
    }, [sales]);

    const fetchSales = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                search: searchQuery
            });
            const res = await fetch(`/api/admin/affiliates/sales?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                setSales(data.sales || []);
                setTotal(data.total || 0);
            }
        } catch (error) {
            console.error("Error fetching sales:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSales();
    }, [page]);

    // Handle search with debounce
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (page === 0) fetchSales();
            else setPage(0);
        }, 500);
        return () => clearTimeout(timeoutId);
    }, [searchQuery]);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-slate-900">Affiliate Sales</h1>
                    <p className="text-sm text-slate-500 mt-1">Track conversions and affiliate attributed orders</p>
                </div>
            </div>

            {/* Sales Summary */}
            {!loading && sales.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {affiliateSummaries.map((summary, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                    <User size={18} />
                                </div>
                                <div className="overflow-hidden">
                                    <div className="font-bold text-slate-900 truncate">{summary.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{summary.email}</div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Orders</div>
                                    <div className="text-lg font-mono font-bold text-slate-900">{summary.orders}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Sales</div>
                                    <div className="text-lg font-mono font-bold text-emerald-600">${summary.volume.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search order, customer, affiliate or coupon..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Date</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Order ID</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Customer Name</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Customer Email</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Source / Affiliate</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Coupon</th>
                                <th className="px-6 py-4 font-semibold uppercase text-xs">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-500" />
                                        Loading sales data...
                                    </td>
                                </tr>
                            ) : sales.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                                        No affiliate sales found.
                                    </td>
                                </tr>
                            ) : (
                                sales.map((sale) => (
                                    <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                                <Calendar size={14} className="text-slate-400" />
                                                {format(new Date(sale.created_at), 'MMM d, yyyy')}
                                            </div>
                                            <div className="text-[10px] ml-5 text-slate-400">
                                                {format(new Date(sale.created_at), 'HH:mm')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-900">
                                            {sale.order_id}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                                                    <User size={12} />
                                                </div>
                                                <span className="font-medium text-slate-900 whitespace-nowrap">
                                                    {sale.customer?.full_name || "Guest"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">
                                            {sale.customer?.email || "Unknown"}
                                        </td>
                                        <td className="px-6 py-4">
                                            {sale.affiliate ? (
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="flex items-center gap-1.5 text-blue-700 font-medium text-sm">
                                                        <User size={12} />
                                                        {sale.affiliate.full_name}
                                                    </div>
                                                    <div className="text-[10px] text-blue-500 ml-4.5">
                                                        {sale.affiliate.email}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 italic text-xs">Direct / Unknown</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold border border-amber-100 uppercase">
                                                <Tag size={12} />
                                                {sale.coupon_code}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 font-bold text-slate-900">
                                                <DollarSign size={14} className="text-slate-400" />
                                                {sale.amount.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] text-slate-400 uppercase font-medium">
                                                {sale.currency}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {total > limit && (
                    <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Showing <span className="font-medium text-slate-900">{page * limit + 1}</span> to <span className="font-medium text-slate-900">{Math.min((page + 1) * limit, total)}</span> of <span className="font-medium text-slate-900">{total}</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(0, p - 1))}
                                disabled={page === 0 || loading}
                                className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => p + 1)}
                                disabled={(page + 1) * limit >= total || loading}
                                className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
