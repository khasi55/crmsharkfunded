"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, Trash2, Edit, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import CreateCouponModal from "./CreateCouponModal";

interface Coupon {
    id: string;
    code: string;
    description: string;
    discount_type: string;
    discount_value: number;
    max_discount_amount: number | null;
    account_types: string[] | null;
    min_purchase_amount: number;
    max_uses: number | null;
    max_uses_per_user: number;
    valid_from: string;
    valid_until: string | null;
    is_active: boolean;
    created_at: string;
    commission_rate?: number;
    affiliate?: {
        id: string;
        email: string;
    } | null;
}

export default function CouponsClient() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

    // Filter states
    const [activeFilters, setActiveFilters] = useState({
        code: "",
        discount: "",
        commission: "",
        email: ""
    });

    const [tempFilters, setTempFilters] = useState({
        code: "",
        discount: "",
        commission: "",
        email: ""
    });

    // Sorting state
    const [sortConfig, setSortConfig] = useState<{
        key: keyof Coupon | 'affiliate_email' | 'discount_display' | 'commission_display' | null;
        direction: 'asc' | 'desc' | null;
    }>({ key: 'created_at', direction: 'desc' });

    // Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize] = useState(10);

    useEffect(() => {
        fetchCoupons();
    }, []);

    const fetchCoupons = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/coupons');
            if (!response.ok) {
                throw new Error('Failed to fetch coupons');
            }
            const data = await response.json();
            setCoupons(data.coupons || []);
        } catch (error) {
            console.error('Error fetching coupons:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setIsCreateModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsCreateModalOpen(false);
        setEditingCoupon(null);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this coupon?")) return;

        try {
            const response = await fetch(`/api/admin/coupons/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setCoupons(coupons.filter(c => c.id !== id));
            } else {
                alert("Failed to delete coupon");
            }
        } catch (error) {
            console.error("Error deleting coupon:", error);
            alert("Error deleting coupon");
        }
    };

    const applyFilter = (key: keyof typeof activeFilters) => {
        setActiveFilters(prev => ({ ...prev, [key]: tempFilters[key] }));
        setCurrentPage(1);
    };

    const quickFilter = (key: keyof typeof activeFilters, value: string) => {
        setTempFilters(prev => ({ ...prev, [key]: value }));
        setActiveFilters(prev => ({ ...prev, [key]: value }));
        setCurrentPage(1);
    };

    const clearFilters = () => {
        const cleared = { code: "", discount: "", commission: "", email: "" };
        setTempFilters(cleared);
        setActiveFilters(cleared);
        setCurrentPage(1);
    };

    const handleSort = (key: typeof sortConfig.key) => {
        let direction: 'asc' | 'desc' | null = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = null;
        }
        setSortConfig({ key, direction });
    };

    const sortedCoupons = [...coupons].filter(coupon => {
        const matchesCode = coupon.code.toLowerCase().includes(activeFilters.code.toLowerCase());
        const email = coupon.affiliate?.email || "No Affiliate";
        const matchesEmail = email.toLowerCase().includes(activeFilters.email.toLowerCase());

        const discountStr = coupon.discount_type === 'percentage'
            ? `${coupon.discount_value}%`
            : coupon.discount_type === 'bogo' ? 'BOGO' : `$${coupon.discount_value}`;
        const matchesDiscount = discountStr.toLowerCase().includes(activeFilters.discount.toLowerCase());

        const commissionStr = coupon.commission_rate ? `${coupon.commission_rate}%` : "-";
        const matchesCommission = commissionStr.toLowerCase().includes(activeFilters.commission.toLowerCase());

        return matchesCode && matchesEmail && matchesDiscount && matchesCommission;
    }).sort((a, b) => {
        if (!sortConfig.key || !sortConfig.direction) return 0;

        let aValue: any;
        let bValue: any;

        if (sortConfig.key === 'affiliate_email') {
            aValue = a.affiliate?.email || "";
            bValue = b.affiliate?.email || "";
        } else if (sortConfig.key === 'discount_display') {
            aValue = a.discount_value;
            bValue = b.discount_value;
        } else if (sortConfig.key === 'commission_display') {
            aValue = a.commission_rate || 0;
            bValue = b.commission_rate || 0;
        } else {
            aValue = a[sortConfig.key as keyof Coupon];
            bValue = b[sortConfig.key as keyof Coupon];
        }

        if (aValue === bValue) return 0;
        const multiplier = sortConfig.direction === 'asc' ? 1 : -1;
        return aValue < bValue ? -1 * multiplier : 1 * multiplier;
    });

    const filteredCoupons = sortedCoupons;

    // Pagination logic
    const totalItems = filteredCoupons.length;
    const totalPages = Math.ceil(totalItems / pageSize);
    const startIndex = (currentPage - 1) * pageSize;
    const paginatedCoupons = filteredCoupons.slice(startIndex, startIndex + pageSize);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Coupons Management</h1>
                    <p className="text-sm text-gray-500">
                        Total Coupons: <span className="font-semibold text-indigo-600">{totalItems}</span>
                        {Object.values(activeFilters).some(v => v !== "") && (
                            <button
                                onClick={clearFilters}
                                className="ml-4 text-xs text-red-600 hover:text-red-700 font-medium underline"
                            >
                                Clear All Filters
                            </button>
                        )}
                    </p>
                </div>
                <button
                    className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus className="h-4 w-4" />
                    Create Coupon
                </button>
            </div>

            {/* Coupons Table */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[140px]">
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleSort('code')}
                                            className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase"
                                        >
                                            Code
                                            {sortConfig.key === 'code' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            ) : <ChevronsUpDown size={14} className="text-gray-300" />}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                placeholder="Code..."
                                                value={tempFilters.code}
                                                onChange={(e) => setTempFilters(prev => ({ ...prev, code: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && applyFilter('code')}
                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-normal normal-case"
                                            />
                                            <button
                                                onClick={() => applyFilter('code')}
                                                className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-500 transition-colors"
                                                title="Filter"
                                            >
                                                <Filter size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[120px]">
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleSort('discount_display')}
                                            className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase"
                                        >
                                            Discount
                                            {sortConfig.key === 'discount_display' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            ) : <ChevronsUpDown size={14} className="text-gray-300" />}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                placeholder="Val..."
                                                value={tempFilters.discount}
                                                onChange={(e) => setTempFilters(prev => ({ ...prev, discount: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && applyFilter('discount')}
                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-normal normal-case"
                                            />
                                            <button
                                                onClick={() => applyFilter('discount')}
                                                className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-500 transition-colors"
                                                title="Filter"
                                            >
                                                <Filter size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[120px]">
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleSort('commission_display')}
                                            className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase"
                                        >
                                            Commission
                                            {sortConfig.key === 'commission_display' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            ) : <ChevronsUpDown size={14} className="text-gray-300" />}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                placeholder="Rate..."
                                                value={tempFilters.commission}
                                                onChange={(e) => setTempFilters(prev => ({ ...prev, commission: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && applyFilter('commission')}
                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-normal normal-case"
                                            />
                                            <button
                                                onClick={() => applyFilter('commission')}
                                                className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-500 transition-colors"
                                                title="Filter"
                                            >
                                                <Filter size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider min-w-[180px]">
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => handleSort('affiliate_email')}
                                            className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase"
                                        >
                                            Affiliate Email
                                            {sortConfig.key === 'affiliate_email' ? (
                                                sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                            ) : <ChevronsUpDown size={14} className="text-gray-300" />}
                                        </button>
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                placeholder="Email..."
                                                value={tempFilters.email}
                                                onChange={(e) => setTempFilters(prev => ({ ...prev, email: e.target.value }))}
                                                onKeyDown={(e) => e.key === 'Enter' && applyFilter('email')}
                                                className="block w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-normal normal-case"
                                            />
                                            <button
                                                onClick={() => applyFilter('email')}
                                                className="p-1 bg-white border border-gray-300 rounded hover:bg-gray-50 text-gray-500 transition-colors"
                                                title="Filter"
                                            >
                                                <Filter size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">
                                    <button
                                        onClick={() => handleSort('max_uses')}
                                        className="flex items-center gap-1 hover:text-indigo-600 transition-colors uppercase"
                                    >
                                        Usage
                                        {sortConfig.key === 'max_uses' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                                        ) : <ChevronsUpDown size={14} className="text-gray-300" />}
                                    </button>
                                </th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                                            <span>Loading coupons...</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : paginatedCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        No coupons match your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCoupons.map((coupon) => {
                                    const discountValue = coupon.discount_type === 'percentage'
                                        ? `${coupon.discount_value}%`
                                        : coupon.discount_type === 'bogo' ? 'BOGO' : `$${coupon.discount_value}`;
                                    const commissionValue = coupon.commission_rate ? `${coupon.commission_rate}%` : "-";
                                    const emailValue = coupon.affiliate?.email || "No Affiliate";

                                    return (
                                        <tr key={coupon.id} className="hover:bg-gray-50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => quickFilter('code', coupon.code)}
                                                    className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded inline-block hover:bg-indigo-100 transition-colors cursor-pointer text-left"
                                                    title="Filter by this code"
                                                >
                                                    {coupon.code}
                                                </button>
                                                <div className="text-xs text-gray-400 mt-1 max-w-[150px] truncate" title={coupon.description}>
                                                    {coupon.description}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => quickFilter('discount', discountValue)}
                                                    className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                                                    title="Filter by this discount"
                                                >
                                                    {discountValue}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => quickFilter('commission', commissionValue)}
                                                    className="font-semibold text-green-600 hover:text-indigo-600 transition-colors cursor-pointer text-left"
                                                    title="Filter by this commission"
                                                >
                                                    {commissionValue}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => quickFilter('email', emailValue)}
                                                    className="text-gray-600 font-medium hover:text-indigo-600 transition-colors cursor-pointer text-left"
                                                    title="Filter by this email"
                                                >
                                                    {emailValue}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-900">{coupon.max_uses ? coupon.max_uses : "∞"}</span>
                                                    <span className="text-[10px] uppercase text-gray-400">Limit</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={coupon.is_active ? "active" : "inactive"} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 shrink-0">
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                        onClick={() => handleEdit(coupon)}
                                                        title="Edit Coupon"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        onClick={() => handleDelete(coupon.id)}
                                                        title="Delete Coupon"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                        <div className="text-sm text-gray-500">
                            Showing <span className="font-medium text-gray-900">{startIndex + 1}</span> to <span className="font-medium text-gray-900">{Math.min(startIndex + pageSize, totalItems)}</span> of <span className="font-medium text-gray-900">{totalItems}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Previous
                            </button>
                            <div className="flex gap-1">
                                {[...Array(totalPages)].map((_, i) => (
                                    <button
                                        key={i + 1}
                                        onClick={() => setCurrentPage(i + 1)}
                                        className={`w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors ${currentPage === i + 1
                                            ? "bg-indigo-600 text-white"
                                            : "text-gray-700 hover:bg-gray-200"
                                            }`}
                                    >
                                        {i + 1}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 border border-gray-300 rounded text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <CreateCouponModal
                isOpen={isCreateModalOpen}
                onClose={handleCloseModal}
                onSuccess={fetchCoupons}
                initialData={editingCoupon}
            />
        </div >
    );
}
