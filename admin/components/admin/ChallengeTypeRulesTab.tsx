"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { getChallengeTypeRules, saveChallengeTypeRule } from "@/app/actions/risk-actions";

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
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRules(); }, []);

    const handleSave = async (rule: any) => {
        try {
            await saveChallengeTypeRule(rule);
            alert("Saved!");
            fetchRules();
        } catch (e) {
            alert("Error saving");
        }
    };

    if (loading) return <div>Loading...</div>;

    const liteRules = rules.filter(r => r.challenge_type.includes('lite'));
    const primeRules = rules.filter(r => r.challenge_type.includes('prime'));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-medium text-gray-900">Challenge Type Rules</h3>
                    <p className="text-sm text-gray-600 mt-1">Configure profit targets and drawdown limits for each challenge type</p>
                </div>
            </div>

            {/* Lite Rules */}
            <div>
                <h4 className="text-md font-semibold text-blue-600 mb-3">💎 Lite Accounts</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left text-sm text-gray-900">
                        <thead className="bg-white border border-gray-200 text-gray-900 uppercase">
                            <tr>
                                <th className="px-4 py-3">Challenge Type</th>
                                <th className="px-4 py-3">Profit Target (%)</th>
                                <th className="px-4 py-3">Daily DD (%)</th>
                                <th className="px-4 py-3">Max DD (%)</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {liteRules.map((rule, idx) => (
                                <RuleRow key={idx} rule={rule} rules={liteRules} setRules={setRules} handleSave={handleSave} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Prime Rules */}
            <div>
                <h4 className="text-md font-semibold text-purple-600 mb-3">👑 Prime Accounts</h4>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-left text-sm text-gray-900">
                        <thead className="bg-white border border-gray-200 text-gray-900 uppercase">
                            <tr>
                                <th className="px-4 py-3">Challenge Type</th>
                                <th className="px-4 py-3">Profit Target (%)</th>
                                <th className="px-4 py-3">Daily DD (%)</th>
                                <th className="px-4 py-3">Max DD (%)</th>
                                <th className="px-4 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {primeRules.map((rule, idx) => (
                                <RuleRow key={idx} rule={rule} rules={primeRules} setRules={setRules} handleSave={handleSave} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function RuleRow({ rule, rules, setRules, handleSave }: any) {
    const [localRule, setLocalRule] = useState(rule);

    return (
        <tr className="hover:bg-white border border-gray-200">
            <td className="px-4 py-2 font-medium">{localRule.description || localRule.challenge_type}</td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    step="0.01"
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-900 w-24"
                    value={localRule.profit_target_percent}
                    onChange={(e) => setLocalRule({ ...localRule, profit_target_percent: parseFloat(e.target.value) })}
                />
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    step="0.01"
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-900 w-24"
                    value={localRule.daily_drawdown_percent}
                    onChange={(e) => setLocalRule({ ...localRule, daily_drawdown_percent: parseFloat(e.target.value) })}
                />
            </td>
            <td className="px-4 py-2">
                <input
                    type="number"
                    step="0.01"
                    className="bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-900 w-24"
                    value={localRule.max_drawdown_percent}
                    onChange={(e) => setLocalRule({ ...localRule, max_drawdown_percent: parseFloat(e.target.value) })}
                />
            </td>
            <td className="px-4 py-2">
                <button
                    onClick={() => handleSave(localRule)}
                    className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 font-medium flex items-center gap-1"
                >
                    <Save className="w-3 h-3" />
                    Save
                </button>
            </td>
        </tr>
    );
}
