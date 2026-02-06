"use client";

import { useState, useEffect } from "react";
import { Gauge, Server, Activity, Save, RefreshCw, Trash2 } from "lucide-react";
import { getRiskGroups, saveRiskGroup, deleteRiskGroup, getServerConfig, saveServerConfig, getSystemLogs } from "@/app/actions/risk-actions";
import ChallengeTypeRulesTab from "@/components/admin/ChallengeTypeRulesTab";

export default function MT5RiskPage() {
    const [activeTab, setActiveTab] = useState<"challenge_rules" | "groups" | "config" | "logs">("challenge_rules");

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
                    <p className="text-gray-600">Configure MT5 Bridge and Risk Rules</p>
                </div>
            </div>

            {/* TABS */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab("challenge_rules")}
                    className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === "challenge_rules"
                        ? "text-blue-500 border-b-2 border-blue-500"
                        : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    <Gauge className="w-4 h-4" />
                    Challenge Type Rules
                </button>
                <button
                    onClick={() => setActiveTab("groups")}
                    className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === "groups"
                        ? "text-blue-500 border-b-2 border-blue-500"
                        : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    <Gauge className="w-4 h-4" />
                    MT5 Groups (Legacy)
                </button>
                <button
                    onClick={() => setActiveTab("config")}
                    className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === "config"
                        ? "text-blue-500 border-b-2 border-blue-500"
                        : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    <Server className="w-4 h-4" />
                    Server Config
                </button>
                <button
                    onClick={() => setActiveTab("logs")}
                    className={`pb-3 px-1 flex items-center gap-2 text-sm font-medium transition-colors ${activeTab === "logs"
                        ? "text-blue-500 border-b-2 border-blue-500"
                        : "text-gray-600 hover:text-gray-900"
                        }`}
                >
                    <Activity className="w-4 h-4" />
                    System Logs
                </button>
            </div>

            {/* CONTENT */}
            <div className="min-h-[400px]">
                {activeTab === "challenge_rules" && <ChallengeTypeRulesTab />}
                {activeTab === "groups" && <RiskGroupsTab />}
                {activeTab === "config" && <ServerConfigTab />}
                {activeTab === "logs" && <SystemLogsTab />}
            </div>
        </div>
    );
}

// --- TAB COMPONENTS (Internal for now, can extract) ---

function RiskGroupsTab() {
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchGroups = async () => {
        setLoading(true);
        try {
            const data = await getRiskGroups();
            setGroups(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGroups(); }, []);

    const handleSave = async (group: any) => {
        try {
            await saveRiskGroup(group);
            alert("Saved!");
            fetchGroups();
        } catch (e) {
            alert("Error saving");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this group?")) return;
        try {
            await deleteRiskGroup(id);
            alert("Deleted!");
            fetchGroups();
        } catch (e) {
            alert("Error deleting");
        }
    };

    // Helper to add new group local row
    const addRow = () => {
        setGroups([...groups, {
            group_name: "demo\\NewGroup",
            challenge_type: "Phase 1",
            max_drawdown_percent: 10,
            daily_drawdown_percent: 5,
            profit_target_percent: 8
        }]);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Group Rules</h3>
                <button onClick={addRow} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 font-medium">+ Add Group</button>
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm text-gray-900">
                    <thead className="bg-white border border-gray-200 text-gray-900 uppercase">
                        <tr>
                            <th className="px-4 py-3">Group Name (MT5)</th>
                            <th className="px-4 py-3">Challenge Type</th>
                            <th className="px-4 py-3">Max DD (%)</th>
                            <th className="px-4 py-3">Daily DD (%)</th>
                            <th className="px-4 py-3">Profit Target (%)</th>
                            <th className="px-4 py-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {groups.map((g, idx) => (
                            <tr key={idx} className="hover:bg-white border border-gray-200">
                                <td className="px-4 py-2">
                                    <input
                                        className="bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-900 w-full"
                                        value={g.group_name}
                                        onChange={(e) => {
                                            const newG = [...groups];
                                            newG[idx].group_name = e.target.value;
                                            setGroups(newG);
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <select
                                        className="bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-900 w-32"
                                        value={g.challenge_type || 'Phase 1'}
                                        onChange={(e) => {
                                            const newG = [...groups];
                                            newG[idx].challenge_type = e.target.value;
                                            setGroups(newG);
                                        }}
                                    >
                                        <option value="Phase 1">Phase 1</option>
                                        <option value="Phase 2">Phase 2</option>
                                        <option value="funded">Funded</option>
                                        <option value="instant">Instant</option>
                                        <option value="competition">Competition</option>
                                    </select>
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        className="bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-900 w-24"
                                        value={g.max_drawdown_percent}
                                        onChange={(e) => {
                                            const newG = [...groups];
                                            newG[idx].max_drawdown_percent = parseFloat(e.target.value);
                                            setGroups(newG);
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        className="bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-900 w-24"
                                        value={g.daily_drawdown_percent}
                                        onChange={(e) => {
                                            const newG = [...groups];
                                            newG[idx].daily_drawdown_percent = parseFloat(e.target.value);
                                            setGroups(newG);
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-2">
                                    <input
                                        type="number"
                                        className="bg-transparent border border-gray-200 rounded px-2 py-1 text-gray-900 w-24"
                                        value={g.profit_target_percent ?? ''}
                                        onChange={(e) => {
                                            const newG = [...groups];
                                            newG[idx].profit_target_percent = e.target.value === '' ? null : parseFloat(e.target.value);
                                            setGroups(newG);
                                        }}
                                    />
                                </td>
                                <td className="px-4 py-2 flex gap-2">
                                    <button onClick={() => handleSave(g)} className="text-blue-400 hover:text-blue-300" title="Save">
                                        <Save className="w-4 h-4" />
                                    </button>
                                    {g.id && (
                                        <button
                                            onClick={() => handleDelete(g.id)}
                                            className="text-red-400 hover:text-red-300"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ServerConfigTab() {
    const [config, setConfig] = useState<any>({});
    const [loading, setLoading] = useState(true);

    const fetchConfig = async () => {
        setLoading(true);
        try {
            const data = await getServerConfig();
            setConfig(data || {});
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchConfig(); }, []);

    const handleChange = (field: string, val: any) => {
        setConfig({ ...config, [field]: val });
    }

    const handleSave = async () => {
        try {
            // Parse groups if string
            let payload = { ...config };
            if (typeof payload.monitored_groups === 'string') {
                try {
                    // If user typed JSON string manually, keep it active? No, let's assume UI handles it.
                    // For now, simpler to leave monitored_groups as JSON array in UI?
                    // Currently text area
                    // payload.monitored_groups = JSON.parse(payload.monitored_groups);
                    // Actually, let's auto-convert comma separated string for easier UI
                    if (payload.monitored_groups.includes(",")) {
                        payload.monitored_groups = payload.monitored_groups.split(",").map((s: string) => s.trim());
                    } else if (payload.monitored_groups.startsWith("[")) {
                        payload.monitored_groups = JSON.parse(payload.monitored_groups);
                    } else {
                        payload.monitored_groups = [payload.monitored_groups]; // Single item
                    }
                } catch (e) { }
            }

            await saveServerConfig(payload);
            alert("Saved! Restart Bridge to apply changes.");
            fetchConfig();
        } catch (e) {
            alert("Error saving");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="max-w-2xl space-y-6">
            <div className="bg-white border border-gray-200 p-6 rounded-lg space-y-4 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">MT5 Manager Details</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-900 mb-1">Server IP</label>
                        <input className="w-full bg-white border border-gray-300 border border-gray-200 rounded p-2 text-gray-900" value={config.server_ip || ''} onChange={e => handleChange('server_ip', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-900 mb-1">Port</label>
                        <input className="w-full bg-white border border-gray-300 border border-gray-200 rounded p-2 text-gray-900" value={config.api_port || ''} onChange={e => handleChange('api_port', parseInt(e.target.value))} type="number" />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-900 mb-1">Manager Login</label>
                        <input className="w-full bg-white border border-gray-300 border border-gray-200 rounded p-2 text-gray-900" value={config.manager_login || ''} onChange={e => handleChange('manager_login', parseInt(e.target.value))} type="number" />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-900 mb-1">Manager Password</label>
                        <input className="w-full bg-white border border-gray-300 border border-gray-200 rounded p-2 text-gray-900" value={config.manager_password || ''} onChange={e => handleChange('manager_password', e.target.value)} type="password" placeholder="********" />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 p-6 rounded-lg space-y-4 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Poller Settings</h3>

                <div>
                    <label className="block text-xs text-gray-900 mb-1">Callback URL (Webhook)</label>
                    <input className="w-full bg-white border border-gray-300 border border-gray-200 rounded p-2 text-gray-900" value={config.callback_url || ''} onChange={e => handleChange('callback_url', e.target.value)} />
                </div>

                <div>
                    <label className="block text-xs text-gray-900 mb-1">Monitored Groups (Comma Separated)</label>
                    <textarea
                        className="w-full bg-white border border-gray-300 border border-gray-200 rounded p-2 text-gray-900 h-24"
                        value={Array.isArray(config.monitored_groups) ? config.monitored_groups.join(", ") : (config.monitored_groups || '')}
                        onChange={e => handleChange('monitored_groups', e.target.value)}
                    />
                    <p className="text-xs text-gray-500 mt-1">Example: demo\Group1, demo\Group2</p>
                </div>
            </div>

            <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium w-full">
                Save Configuration
            </button>
        </div>
    );
}

function SystemLogsTab() {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const data = await getSystemLogs();
            setLogs(data || []);
        } catch (e) { } finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, []);

    return (
        <div className="space-y-4">
            <div className="flex justify-between">
                <h3 className="text-lg font-medium text-gray-900">System Logs</h3>
                <button onClick={fetchLogs}><RefreshCw className="w-4 h-4 text-gray-400" /></button>
            </div>
            <div className="bg-white border border-gray-300 rounded border border-gray-200 p-4 font-mono text-xs text-gray-700 h-[500px] overflow-y-auto">
                {loading ? "Loading..." : logs.map((l, i) => (
                    <div key={i} className="mb-1 border-b border-gray-200 pb-1 last:border-0">
                        <span className="text-blue-600">[{new Date(l.created_at).toLocaleString()}]</span>
                        <span className={`ml-2 font-bold ${l.level === 'ERROR' ? 'text-red-500' : 'text-green-500'}`}>{l.level}</span>:
                        <span className="ml-2 text-gray-700">{l.message}</span>
                    </div>
                ))}
                {logs.length === 0 && !loading && <p>No logs found.</p>}
            </div>
        </div>
    );
}
