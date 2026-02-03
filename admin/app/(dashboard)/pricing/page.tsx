"use client";

import { useState, useEffect } from "react";
import { Save, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { fetchFromBackend } from "@/lib/backend-api";

// Initial Default Config (Fallback)
const DEFAULT_PRICING = {
    Prime: {
        '5K': { price: '$59', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
        '10K': { price: '$89', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
        '25K': { price: '$236', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
        '50K': { price: '$412', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
        '100K': { price: '$610', dailyLoss: '4%', maxLoss: '10%', target1: '9%', target2: '6%' },
    },
    LiteTwoStep: {
        '5K': { price: '$30', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
        '10K': { price: '$55', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
        '25K': { price: '$125', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
        '50K': { price: '$235', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
        '100K': { price: '$440', dailyLoss: '3%', maxLoss: '6%', target1: '6%', target2: '6%' },
    },
    LiteOneStep: {
        '5K': { price: '$48', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
        '10K': { price: '$70', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
        '25K': { price: '$150', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
        '50K': { price: '$260', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
        '100K': { price: '$550', dailyLoss: '3%', maxLoss: '6%', target1: '9%', target2: '-' },
    },
    InstantLite: {
        '3K': { price: '$34', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '6K': { price: '$59', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '12K': { price: '$89', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '25K': { price: '$249', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '50K': { price: '$499', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
        '100K': { price: '$799', dailyLoss: '-', maxLoss: '3%', target1: '8%', target2: '-', validity: '30 Days', consistencyRule: 'No' },
    },
    InstantPrime: {
        '5K': { price: '$49', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
        '10K': { price: '$83', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
        '25K': { price: '$199', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
        '50K': { price: '$350', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
        '100K': { price: '$487', dailyLoss: '4%', maxLoss: '7%', target1: '-', target2: '-', consistencyRule: 'Yes' },
    }
};

export default function PricingPage() {
    const [config, setConfig] = useState<any>(DEFAULT_PRICING);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        setLoading(true);
        try {
            const data = await fetchFromBackend('/api/admin/settings/pricing');
            if (data && Object.keys(data).length > 0) {
                setConfig(data);
            }
        } catch (error) {
            console.error('Failed to load pricing:', error);
            toast.error('Failed to load pricing config');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await fetchFromBackend('/api/admin/settings/pricing', {
                method: 'POST',
                body: JSON.stringify(config)
            });
            toast.success('Pricing configuration saved!');
        } catch (error) {
            console.error('Failed to save pricing:', error);
            toast.error('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (category: string, size: string, field: string, value: string) => {
        setConfig((prev: any) => ({
            ...prev,
            [category]: {
                ...prev[category],
                [size]: {
                    ...prev[category][size],
                    [field]: value
                }
            }
        }));
    };

    if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-500" /></div>;

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Pricing & Rules Configuration</h1>
                    <p className="text-slate-500">Manage plan prices, drawdown limits, and targets dynamically.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={loadConfig} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <RefreshCw size={20} />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Save Changes
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {Object.entries(config).map(([category, sizes]: [string, any]) => (
                    <div key={category} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h2 className="text-lg font-bold text-slate-800">{category.replace(/([A-Z])/g, ' $1').trim()}</h2>
                        </div>
                        <div className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100">
                                            <th className="pb-3 font-semibold text-slate-500">Size</th>
                                            <th className="pb-3 font-semibold text-slate-500">Price</th>
                                            <th className="pb-3 font-semibold text-slate-500">Max Loss</th>
                                            <th className="pb-3 font-semibold text-slate-500">Daily Loss</th>
                                            <th className="pb-3 font-semibold text-slate-500">Target 1</th>
                                            <th className="pb-3 font-semibold text-slate-500">Target 2</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {Object.entries(sizes).map(([sizeKey, details]: [string, any]) => (
                                            <tr key={sizeKey} className="group hover:bg-slate-50/50 transition-colors">
                                                <td className="py-3 font-medium text-slate-900 pr-4">{sizeKey}</td>
                                                <td className="py-3 pr-2">
                                                    <input
                                                        type="text"
                                                        value={details.price}
                                                        onChange={(e) => handleChange(category, sizeKey, 'price', e.target.value)}
                                                        className="w-20 bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="py-3 pr-2">
                                                    <input
                                                        type="text"
                                                        value={details.maxLoss}
                                                        onChange={(e) => handleChange(category, sizeKey, 'maxLoss', e.target.value)}
                                                        className="w-16 bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="py-3 pr-2">
                                                    <input
                                                        type="text"
                                                        value={details.dailyLoss}
                                                        onChange={(e) => handleChange(category, sizeKey, 'dailyLoss', e.target.value)}
                                                        className="w-16 bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="py-3 pr-2">
                                                    <input
                                                        type="text"
                                                        value={details.target1}
                                                        onChange={(e) => handleChange(category, sizeKey, 'target1', e.target.value)}
                                                        className="w-16 bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                                <td className="py-3 pr-2">
                                                    <input
                                                        type="text"
                                                        value={details.target2}
                                                        onChange={(e) => handleChange(category, sizeKey, 'target2', e.target.value)}
                                                        className="w-16 bg-white border border-slate-200 rounded px-2 py-1 focus:border-blue-500 focus:outline-none"
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
