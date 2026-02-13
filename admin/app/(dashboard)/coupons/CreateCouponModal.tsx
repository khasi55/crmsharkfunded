"use client";

import { useState, useEffect } from "react";
import { X, Loader2, User } from "lucide-react";

interface CreateCouponModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any; // Coupon object
}

export default function CreateCouponModal({ isOpen, onClose, onSuccess, initialData }: CreateCouponModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [affiliates, setAffiliates] = useState<any[]>([]);
    const [fetchingAffiliates, setFetchingAffiliates] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [showResults, setShowResults] = useState(false);
    const [selectedAffiliate, setSelectedAffiliate] = useState<any>(null);

    const [formData, setFormData] = useState({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: "",
        max_discount_amount: "",
        min_purchase_amount: "0",
        max_uses: "",
        max_uses_per_user: "",
        valid_until: "",
        affiliate_id: "",
        commission_rate: "",
        is_active: true
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Edit Mode: Populate Form
                setFormData({
                    code: initialData.code,
                    description: initialData.description || "",
                    discount_type: initialData.discount_type,
                    discount_value: initialData.discount_value.toString(),
                    max_discount_amount: initialData.max_discount_amount?.toString() || "",
                    min_purchase_amount: initialData.min_purchase_amount?.toString() || "0",
                    max_uses: initialData.max_uses?.toString() || "",
                    max_uses_per_user: initialData.max_uses_per_user?.toString() || "",
                    valid_until: initialData.valid_until ? new Date(initialData.valid_until).toISOString().slice(0, 16) : "",
                    affiliate_id: initialData.affiliate_id || "",
                    commission_rate: initialData.commission_rate?.toString() || "",
                    is_active: initialData.is_active
                });

                if (initialData.affiliate) {
                    setSelectedAffiliate({
                        id: initialData.affiliate.id,
                        email: initialData.affiliate.email,
                        full_name: initialData.affiliate.email.split('@')[0] // Fallback
                    });
                } else if (initialData.affiliate_id) {
                    // If we have ID but no object (shouldn't happen with updated query), fetch?
                    // For now trust query.
                }

            } else {
                // Create Mode: Reset
                setFormData({
                    code: "",
                    description: "",
                    discount_type: "percentage",
                    discount_value: "",
                    max_discount_amount: "",
                    min_purchase_amount: "0",
                    max_uses: "",
                    max_uses_per_user: "1",
                    valid_until: "",
                    affiliate_id: "",
                    commission_rate: "",
                    is_active: true
                });
                setSelectedAffiliate(null);
            }
        }
    }, [isOpen, initialData]);

    useEffect(() => {
        if (isOpen && searchQuery) {
            const timer = setTimeout(() => {
                if (searchQuery.length >= 2) {
                    fetchAffiliates(searchQuery);
                } else if (searchQuery.length === 0) {
                    fetchAffiliates();
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [searchQuery, isOpen]);

    const fetchAffiliates = async (query?: string) => {
        setFetchingAffiliates(true);
        try {
            // Fetch users who have referral codes (likely affiliates)
            const url = query
                ? `/api/admin/users/search?q=${encodeURIComponent(query)}&hasReferral=true`
                : '/api/admin/users?hasReferral=true';

            const response = await fetch(url);
            if (response.ok) {
                const data = await response.json();
                setAffiliates(data.users || []);
            }
        } catch (err) {
            console.error("Failed to fetch affiliates:", err);
        } finally {
            setFetchingAffiliates(false);
            setShowResults(true);
        }
    };

    const handleSelectAffiliate = (aff: any) => {
        setSelectedAffiliate(aff);
        setFormData(prev => ({ ...prev, affiliate_id: aff.id }));
        setShowResults(false);
        setSearchQuery("");
    };

    const clearSelectedAffiliate = () => {
        setSelectedAffiliate(null);
        setFormData(prev => ({ ...prev, affiliate_id: "" }));
        setSearchQuery("");
        fetchAffiliates();
    };

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                discount_value: formData.discount_type === 'bogo' ? 0 : parseFloat(formData.discount_value),
                max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
                min_purchase_amount: parseFloat(formData.min_purchase_amount),
                max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                max_uses_per_user: formData.max_uses_per_user ? parseInt(formData.max_uses_per_user) : null,
                affiliate_id: formData.affiliate_id || null,
                commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : null,
                // transform empty string valid_until to null
                valid_until: formData.valid_until || null
            };

            const url = initialData ? `/api/admin/coupons/${initialData.id}` : '/api/admin/coupons';
            const method = initialData ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to create coupon");
            }

            onSuccess();
            onClose();
            // Reset form
            setFormData({
                code: "",
                description: "",
                discount_type: "percentage",
                discount_value: "",
                max_discount_amount: "",
                min_purchase_amount: "0",
                max_uses: "",
                max_uses_per_user: "",
                valid_until: "",
                affiliate_id: "",
                commission_rate: "",
                is_active: true
            });

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value as any }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {initialData ? "Edit Coupon" : "Create New Coupon"}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Coupon Code</label>
                            <input
                                type="text"
                                name="code"
                                required
                                value={formData.code}
                                onChange={handleChange}
                                placeholder="e.g. SUMMER2024"
                                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none uppercase"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Internal note or customer facing description"
                                rows={2}
                                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Discount Settings */}
                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Discount Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    name="discount_type"
                                    value={formData.discount_type}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="percentage">Percentage (%)</option>
                                    <option value="fixed">Fixed Amount ($)</option>
                                    <option value="bogo">Buy One Get One (BOGO)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Value</label>
                                <input
                                    type="number"
                                    name="discount_value"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.discount_type === 'bogo' ? "0" : formData.discount_value}
                                    onChange={handleChange}
                                    disabled={formData.discount_type === 'bogo'}
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                                />
                            </div>

                            {formData.discount_type === 'percentage' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Discount Amount ($)</label>
                                    <input
                                        type="number"
                                        name="max_discount_amount"
                                        min="0"
                                        step="0.01"
                                        value={formData.max_discount_amount}
                                        onChange={handleChange}
                                        placeholder="Optional limit"
                                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Min Purchase Amount ($)</label>
                                <input
                                    type="number"
                                    name="min_purchase_amount"
                                    min="0"
                                    step="0.01"
                                    value={formData.min_purchase_amount}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Usage Limits */}
                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Usage Limits</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Max Uses</label>
                                <input
                                    type="number"
                                    name="max_uses"
                                    min="1"
                                    value={formData.max_uses}
                                    onChange={handleChange}
                                    placeholder="Unlimited if empty"
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses Per User</label>
                                <input
                                    type="number"
                                    name="max_uses_per_user"
                                    min="1"
                                    value={formData.max_uses_per_user}
                                    onChange={handleChange}
                                    placeholder="Unlimited if empty"
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                                <input
                                    type="datetime-local"
                                    name="valid_until"
                                    value={formData.valid_until}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                />
                            </div>

                            <div className="flex items-center pt-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        name="is_active"
                                        checked={formData.is_active}
                                        onChange={handleChange}
                                        className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                    />
                                    <span className="text-sm font-medium text-gray-700">Currently Active</span>
                                </label>
                            </div>
                        </div>
                    </div>
                    {/* affiliate link */}
                    <div className="border-t border-gray-100 pt-4">
                        <h4 className="text-sm font-medium text-gray-900 mb-4">Affiliate Attribution</h4>
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    Search & Link Affiliate
                                </label>

                                <div className="space-y-2 relative">
                                    {selectedAffiliate ? (
                                        <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-indigo-900">{selectedAffiliate.full_name}</p>
                                                    <p className="text-xs text-indigo-600">{selectedAffiliate.email}</p>
                                                </div>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={clearSelectedAffiliate}
                                                className="p-1 hover:bg-indigo-100 rounded-full transition-colors"
                                            >
                                                <X className="h-4 w-4 text-indigo-600" />
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="Type name or email to search..."
                                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 pl-9 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    value={searchQuery}
                                                    onFocus={() => setShowResults(true)}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    {fetchingAffiliates ? (
                                                        <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
                                                    ) : (
                                                        <X className="h-4 w-4 text-gray-400 rotate-45" />
                                                    )}
                                                </div>
                                            </div>

                                            {showResults && (searchQuery.length > 0 || affiliates.length > 0) && (
                                                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                    {affiliates.length > 0 ? (
                                                        affiliates.map((aff) => (
                                                            <button
                                                                key={aff.id}
                                                                type="button"
                                                                onClick={() => handleSelectAffiliate(aff)}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                                                            >
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">{aff.full_name}</p>
                                                                    <p className="text-xs text-gray-500">{aff.email}</p>
                                                                </div>
                                                                <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                                                    {aff.referral_code}
                                                                </span>
                                                            </button>
                                                        ))
                                                    ) : (
                                                        <div className="p-4 text-center text-sm text-gray-500">
                                                            No affiliates found
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                    {selectedAffiliate ? "Affiliate linked successfully." : "Search and select an affiliate from the results."}
                                </p>
                            </div>

                            {formData.affiliate_id && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Custom Commission Rate (%)
                                    </label>
                                    <input
                                        type="number"
                                        name="commission_rate"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        value={formData.commission_rate}
                                        onChange={handleChange}
                                        placeholder="Defaults to 7% if empty"
                                        className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">
                                        Override the global 7% commission for this specific coupon.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {loading ? (initialData ? "Updating..." : "Creating...") : (initialData ? "Update Coupon" : "Create Coupon")}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
