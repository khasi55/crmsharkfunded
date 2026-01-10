"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";

interface CreateCouponModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateCouponModal({ isOpen, onClose, onSuccess }: CreateCouponModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        code: "",
        description: "",
        discount_type: "percentage",
        discount_value: "",
        max_discount_amount: "",
        min_purchase_amount: "0",
        max_uses: "",
        max_uses_per_user: "1",
        valid_until: "",
        is_active: true
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const payload = {
                ...formData,
                discount_value: parseFloat(formData.discount_value),
                max_discount_amount: formData.max_discount_amount ? parseFloat(formData.max_discount_amount) : null,
                min_purchase_amount: parseFloat(formData.min_purchase_amount),
                max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
                max_uses_per_user: parseInt(formData.max_uses_per_user),
                // transform empty string valid_until to null
                valid_until: formData.valid_until || null
            };

            const response = await fetch('/api/admin/coupons', {
                method: 'POST',
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
                max_uses_per_user: "1",
                valid_until: "",
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
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
                    <h3 className="text-lg font-semibold text-gray-900">Create New Coupon</h3>
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
                                    value={formData.discount_value}
                                    onChange={handleChange}
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
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
                            {loading ? "Creating..." : "Create Coupon"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
