"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Filter, Trash2, Edit, Power, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
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
    affiliate?: { email: string };
    commission_rate?: number;
}

export default function CouponsClient() {
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [editingCoupon, setEditingCoupon] = useState<Coupon | undefined>(undefined);
    const itemsPerPage = 10;

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

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this coupon?")) return;

        try {
            const response = await fetch(`/api/admin/coupons/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setCoupons(coupons.filter(c => c.id !== id));
                toast.success("Coupon deleted");
            } else {
                toast.error("Failed to delete coupon");
            }
        } catch (error) {
            console.error("Error deleting coupon:", error);
            toast.error("Error deleting coupon");
        }
    };

    const handleToggleStatus = async (id: string, currentStatus: boolean, code: string) => {
        try {
            const response = await fetch(`/api/admin/coupons/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !currentStatus })
            });

            if (response.ok) {
                setCoupons(coupons.map(c => c.id === id ? { ...c, is_active: !currentStatus } : c));
                toast.success(`Coupon ${code} ${!currentStatus ? 'activated' : 'deactivated'}`);
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Error updating status");
        }
    };

    const handleEdit = (coupon: Coupon) => {
        setEditingCoupon(coupon);
        setIsCreateModalOpen(true);
    };

    const filteredCoupons = coupons.filter(coupon =>
        coupon.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        coupon.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const totalPages = Math.ceil(filteredCoupons.length / itemsPerPage);
    const paginatedCoupons = filteredCoupons.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="space-y-6">
            {/* Header with Count */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Coupons</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Total: <span className="font-semibold text-gray-700">{coupons.length}</span> coupons
                    </p>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search coupons..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setCurrentPage(1); // Reset to page 1 on search
                            }}
                            className="pl-9 pr-3 py-1.5 w-full border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500"
                        />
                    </div>

                    <button
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                        onClick={() => {
                            setEditingCoupon(undefined);
                            setIsCreateModalOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        Create Coupon
                    </button>
                </div>
            </div>

            {/* Coupons Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Code</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Discount</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Type</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Usage Limit</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Commission</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Affiliate</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Valid Until</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                <th className="px-6 py-3 font-semibold text-gray-700 text-xs uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        Loading coupons...
                                    </td>
                                </tr>
                            ) : filteredCoupons.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                                        No coupons found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedCoupons.map((coupon) => (
                                    <tr key={coupon.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-mono font-medium text-indigo-600">
                                                {coupon.code}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-0.5">
                                                {coupon.description}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {coupon.discount_type === 'percentage'
                                                ? `${coupon.discount_value}%`
                                                : `$${coupon.discount_value}`
                                            }
                                        </td>
                                        <td className="px-6 py-4 capitalize text-gray-600">
                                            {coupon.discount_type}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {coupon.max_uses ? `${coupon.max_uses} total` : "Unlimited"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {coupon.commission_rate ? `${coupon.commission_rate}%` : "-"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-xs font-mono">
                                            {coupon.affiliate?.email || "-"}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {coupon.valid_until
                                                ? new Date(coupon.valid_until).toLocaleDateString()
                                                : "Forever"
                                            }
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={coupon.is_active ? "active" : "inactive"} />
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className="p-1 text-gray-500 hover:text-indigo-600 transition-colors"
                                                    onClick={() => handleEdit(coupon)}
                                                    title="Edit Coupon"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="p-1 text-gray-500 hover:text-red-600 transition-colors"
                                                    onClick={() => handleDelete(coupon.id)}
                                                    title="Delete Coupon"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className={`p-1 transition-colors ${coupon.is_active ? 'text-green-600 hover:text-green-700' : 'text-gray-400 hover:text-green-600'}`}
                                                    onClick={() => handleToggleStatus(coupon.id, coupon.is_active, coupon.code)}
                                                    title={coupon.is_active ? "Deactivate" : "Activate"}
                                                >
                                                    <Power className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {filteredCoupons.length > itemsPerPage && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredCoupons.length)}</span> of <span className="font-medium">{filteredCoupons.length}</span> results
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <CreateCouponModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setEditingCoupon(undefined);
                }}
                onSuccess={fetchCoupons}
                initialData={editingCoupon}
            />
        </div>
    );
}
