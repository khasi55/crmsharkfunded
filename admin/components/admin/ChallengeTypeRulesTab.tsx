"use client";

import { useState, useEffect } from "react";
import { Save, Filter } from "lucide-react";
import { getChallengeTypeRules, saveChallengeTypeRule } from "@/app/actions/risk-actions";
import { toast } from "react-hot-toast";

export default function ChallengeTypeRulesTab() {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const data = await getChallengeTypeRules();
            setRules(data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to fetch rules");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRules(); }, []);

    const handleSave = async (rule: any) => {
        const loadingToast = toast.loading("Saving rule...");
        try {
            await saveChallengeTypeRule(rule);
            toast.success("Rule saved successfully!", { id: loadingToast });
            fetchRules();
        } catch (e) {
            toast.error("Failed to save rule", { id: loadingToast });
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white rounded-xl border border-gray-200">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="font-medium">Loading challenge rules...</p>
        </div>
    );

    const liteRules = rules.filter(r => r.challenge_type.toLowerCase().includes('lite'));
    const primeRules = rules.filter(r => r.challenge_type.toLowerCase().includes('prime'));
    const directRules = rules.filter(r => r.challenge_type.toLowerCase().includes('direct') || r.challenge_type.toLowerCase().includes('direct-sf'));

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Challenge Type Rules</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure profit targets and drawdown limits for each challenge type</p>
                </div>
            </div>

            {/* Direct Funded Rules */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">⚡</span>
                    <h4 className="text-lg font-semibold text-gray-900">Direct Funded Accounts</h4>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/80">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Challenge Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Profit Target (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Daily DD (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Max DD (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {directRules.map((rule, idx) => (
                                    <RuleRow key={idx} rule={rule} handleSave={handleSave} />
                                ))}
                                {directRules.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">No direct funded rules found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Lite Rules */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">💎</span>
                    <h4 className="text-lg font-semibold text-gray-900">Lite Accounts</h4>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/80">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Challenge Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Profit Target (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Daily DD (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Max DD (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {liteRules.map((rule, idx) => (
                                    <RuleRow key={idx} rule={rule} handleSave={handleSave} />
                                ))}
                                {liteRules.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">No lite rules found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Prime Rules */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600">👑</span>
                    <h4 className="text-lg font-semibold text-gray-900">Prime Accounts</h4>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 bg-gray-50/80">
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Challenge Type</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Profit Target (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Daily DD (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Max DD (%)</th>
                                    <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {primeRules.map((rule, idx) => (
                                    <RuleRow key={idx} rule={rule} handleSave={handleSave} />
                                ))}
                                {primeRules.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 font-medium">No prime rules found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RuleRow({ rule, handleSave }: { rule: any, handleSave: (rule: any) => void }) {
    const [localRule, setLocalRule] = useState(rule);

    return (
        <tr className="hover:bg-gray-50/50 transition-colors group">
            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                {localRule.description || localRule.challenge_type}
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="relative w-24">
                    <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                        value={localRule.profit_target_percent}
                        onChange={(e) => setLocalRule({ ...localRule, profit_target_percent: parseFloat(e.target.value) })}
                    />
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="relative w-24">
                    <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                        value={localRule.daily_drawdown_percent}
                        onChange={(e) => setLocalRule({ ...localRule, daily_drawdown_percent: parseFloat(e.target.value) })}
                    />
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="relative w-24">
                    <input
                        type="number"
                        step="0.01"
                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-medium"
                        value={localRule.max_drawdown_percent}
                        onChange={(e) => setLocalRule({ ...localRule, max_drawdown_percent: parseFloat(e.target.value) })}
                    />
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                <button
                    onClick={() => handleSave(localRule)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 rounded-lg text-xs font-semibold transition-colors ring-1 ring-emerald-600/20 active:scale-95"
                >
                    <Save className="w-3.5 h-3.5" />
                    Save
                </button>
            </td>
        </tr>
    );
}
