"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Save, Trash2, X, AlertTriangle, Shield } from "lucide-react";

interface RiskGroup {
    id: string;
    group_name: string;
    max_drawdown_percent: number;
    daily_drawdown_percent: number;
    profit_target_percent: number;
    created_at?: string;
    updated_at?: string;
}

export default function RiskSettingsClient() {
    const [groups, setGroups] = useState<RiskGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [newGroup, setNewGroup] = useState<Partial<RiskGroup> | null>(null);

    const supabase = createClient();

    useEffect(() => {
        fetchGroups();
    }, []);

    async function fetchGroups() {
        setLoading(true);
        const { data, error } = await supabase
            .from("mt5_risk_groups")
            .select("*")
            .order("group_name");

        if (error) {
            console.error("Error fetching account groups:", error);
            setError("Failed to load account groups.");
        } else {
            setGroups(data || []);
        }
        setLoading(false);
    }

    async function handleSave(group: Partial<RiskGroup>) {
        try {
            if (group.id) {
                // Update
                const { error } = await supabase
                    .from("mt5_risk_groups")
                    .update({
                        group_name: group.group_name,
                        max_drawdown_percent: group.max_drawdown_percent,
                        daily_drawdown_percent: group.daily_drawdown_percent,
                        profit_target_percent: group.profit_target_percent,
                        updated_at: new Date()
                    })
                    .eq("id", group.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase
                    .from("mt5_risk_groups")
                    .insert([{
                        group_name: group.group_name,
                        max_drawdown_percent: group.max_drawdown_percent,
                        daily_drawdown_percent: group.daily_drawdown_percent,
                        profit_target_percent: group.profit_target_percent
                    }]);
                if (error) throw error;
            }

            setEditingId(null);
            setNewGroup(null);
            fetchGroups();
        } catch (err: any) {
            console.error("Error saving group:", err);
            setError(err.message || "Failed to save group.");
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure you want to delete this group?")) return;
        try {
            const { error } = await supabase
                .from("mt5_risk_groups")
                .delete()
                .eq("id", id);

            if (error) throw error;
            fetchGroups();
        } catch (err: any) {
            console.error("Error deleting:", err);
            setError("Failed to delete group.");
        }
    }

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-indigo-600" />
                        Risk Settings
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">
                        Configure MT5 Risk Groups: Drawdowns and Profit Targets
                    </p>
                </div>
                <button
                    onClick={() => setNewGroup({
                        group_name: "demo\\new-group",
                        max_drawdown_percent: 10,
                        daily_drawdown_percent: 5,
                        profit_target_percent: 8
                    })}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                    <Plus size={16} />
                    New Group
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
                    <AlertTriangle size={16} />
                    {error}
                </div>
            )}

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3">Group Name</th>
                            <th className="px-6 py-3 text-right">Max DD (%)</th>
                            <th className="px-6 py-3 text-right">Daily DD (%)</th>
                            <th className="px-6 py-3 text-right">Profit Target (%)</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">Loading configurations...</td></tr>
                        ) : groups.length === 0 && !newGroup ? (
                            <tr><td colSpan={5} className="p-8 text-center text-gray-500">No risk groups configured.</td></tr>
                        ) : null}

                        {/* New Group Row */}
                        {newGroup && (
                            <tr className="bg-blue-50/50">
                                <td className="px-6 py-3">
                                    <input
                                        type="text"
                                        value={newGroup.group_name}
                                        onChange={e => setNewGroup({ ...newGroup, group_name: e.target.value })}
                                        className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                                    />
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <input
                                        type="number"
                                        value={newGroup.max_drawdown_percent}
                                        onChange={e => setNewGroup({ ...newGroup, max_drawdown_percent: Number(e.target.value) })}
                                        className="border border-gray-300 rounded px-2 py-1 w-20 text-right text-sm"
                                    />
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <input
                                        type="number"
                                        value={newGroup.daily_drawdown_percent}
                                        onChange={e => setNewGroup({ ...newGroup, daily_drawdown_percent: Number(e.target.value) })}
                                        className="border border-gray-300 rounded px-2 py-1 w-20 text-right text-sm"
                                    />
                                </td>
                                <td className="px-6 py-3 text-right">
                                    <input
                                        type="number"
                                        value={newGroup.profit_target_percent}
                                        onChange={e => setNewGroup({ ...newGroup, profit_target_percent: Number(e.target.value) })}
                                        className="border border-gray-300 rounded px-2 py-1 w-20 text-right text-sm"
                                    />
                                </td>
                                <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                                    <button onClick={() => handleSave(newGroup)} className="text-green-600 hover:text-green-800"><Save size={16} /></button>
                                    <button onClick={() => setNewGroup(null)} className="text-gray-500 hover:text-gray-700"><X size={16} /></button>
                                </td>
                            </tr>
                        )}

                        {groups.map(group => (
                            <tr key={group.id} className="hover:bg-gray-50">
                                {editingId === group.id ? (
                                    <>
                                        <td className="px-6 py-3">
                                            <input
                                                defaultValue={group.group_name}
                                                id={`edit-name-${group.id}`}
                                                className="border border-gray-300 rounded px-2 py-1 w-full text-sm"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <input
                                                type="number"
                                                defaultValue={group.max_drawdown_percent}
                                                id={`edit-maxdd-${group.id}`}
                                                className="border border-gray-300 rounded px-2 py-1 w-20 text-right text-sm"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <input
                                                type="number"
                                                defaultValue={group.daily_drawdown_percent}
                                                id={`edit-dailydd-${group.id}`}
                                                className="border border-gray-300 rounded px-2 py-1 w-20 text-right text-sm"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <input
                                                type="number"
                                                defaultValue={group.profit_target_percent}
                                                id={`edit-profittarget-${group.id}`}
                                                className="border border-gray-300 rounded px-2 py-1 w-20 text-right text-sm"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => {
                                                    const name = (document.getElementById(`edit-name-${group.id}`) as HTMLInputElement).value;
                                                    const maxdd = Number((document.getElementById(`edit-maxdd-${group.id}`) as HTMLInputElement).value);
                                                    const dailydd = Number((document.getElementById(`edit-dailydd-${group.id}`) as HTMLInputElement).value);
                                                    const profitTarget = Number((document.getElementById(`edit-profittarget-${group.id}`) as HTMLInputElement).value);
                                                    handleSave({ ...group, group_name: name, max_drawdown_percent: maxdd, daily_drawdown_percent: dailydd, profit_target_percent: profitTarget });
                                                }}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                <Save size={16} />
                                            </button>
                                            <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700"><X size={16} /></button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-3 text-gray-900 font-medium">{group.group_name}</td>
                                        <td className="px-6 py-3 text-right text-gray-600">{group.max_drawdown_percent}%</td>
                                        <td className="px-6 py-3 text-right text-gray-600">{group.daily_drawdown_percent}%</td>
                                        <td className="px-6 py-3 text-right text-gray-600">{group.profit_target_percent}%</td>
                                        <td className="px-6 py-3 text-right flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => setEditingId(group.id)}
                                                className="text-blue-600 hover:text-blue-800 text-xs font-medium px-2 py-1 hover:bg-blue-50 rounded"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(group.id)}
                                                className="text-red-400 hover:text-red-600"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h2 className="text-sm font-bold text-gray-700 mb-2">Schema Info</h2>
                <p className="text-xs text-gray-500">
                    These settings map directly to the <code>mt5_risk_groups</code> table. The Risk Engine and Rules Service use this configuration to determine drawdown limits and profit targets for challenge accounts.
                </p>
            </div>
        </div>
    );
}
