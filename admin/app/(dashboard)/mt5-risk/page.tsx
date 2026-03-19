"use client";



import { useState, useEffect } from "react";
import { Gauge, Server, Activity, Save, RefreshCw, Trash2 } from "lucide-react";
import { getRiskGroups, saveRiskGroup, deleteRiskGroup, getServerConfig, saveServerConfig, getSystemLogs } from "@/app/actions/risk-actions";
import ChallengeTypeRulesTab from "@/components/admin/ChallengeTypeRulesTab";
import { toast } from "react-hot-toast";

export default function MT5RiskPage() {
    const [activeTab, setActiveTab] = useState<"challenge_rules" | "groups" | "config" | "logs">("challenge_rules");

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure MT5 Bridge and Risk Rules</p>
                </div>
            </div>

            {/* TABS - Segmented Control Style */}
            <div className="inline-flex bg-gray-100/80 p-1 rounded-lg">
                <button
                    onClick={() => setActiveTab("challenge_rules")}
                    className={`px-4 py-2 flex items-center gap-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "challenge_rules"
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                        }`}
                >
                    <Gauge className="w-4 h-4" />
                    Challenge Type Rules
                </button>
                <button
                    onClick={() => setActiveTab("groups")}
                    className={`px-4 py-2 flex items-center gap-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "groups"
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                        }`}
                >
                    <Gauge className="w-4 h-4" />
                    MT5 Groups (Legacy)
                </button>
                <button
                    onClick={() => setActiveTab("config")}
                    className={`px-4 py-2 flex items-center gap-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "config"
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                        }`}
                >
                    <Server className="w-4 h-4" />
                    Server Config
                </button>
                <button
                    onClick={() => setActiveTab("logs")}
                    className={`px-4 py-2 flex items-center gap-2 rounded-md text-sm font-medium transition-all duration-200 ${activeTab === "logs"
                        ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200/50'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
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
            toast.error("Failed to load risk groups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchGroups(); }, []);

    const handleSave = async (group: any) => {
        const loadingToast = toast.loading("Saving group...");
        try {
            await saveRiskGroup(group);
            toast.success("Group saved successfully!", { id: loadingToast });
            fetchGroups();
        } catch (e) {
            toast.error("Error saving group", { id: loadingToast });
        }
    };

    const handleDelete = async (id: string, groupName: string) => {
        if (!confirm(`Are you sure you want to delete ${groupName}?`)) return;
        const loadingToast = toast.loading("Deleting group...");
        try {
            await deleteRiskGroup(id);
            toast.success("Group deleted successfully!", { id: loadingToast });
            fetchGroups();
        } catch (e) {
            toast.error("Error deleting group", { id: loadingToast });
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

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="font-medium">Loading groups...</p>
        </div>
    );

    return (
        <div className="space-y-6 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Group Rules</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure legacy MT5 group mappings</p>
                </div>
                <button onClick={addRow} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 font-medium transition-colors shadow-sm active:scale-95">
                    + Add Group
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/80 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Group Name (MT5)</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Challenge Type</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Max DD (%)</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Daily DD (%)</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Profit Target (%)</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {groups.map((g, idx) => (
                            <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                                <td className="px-6 py-4">
                                    <input
                                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium font-mono"
                                        value={g.group_name}
                                        onChange={(e) => {
                                            const newG = [...groups];
                                            newG[idx].group_name = e.target.value;
                                            setGroups(newG);
                                        }}
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <select
                                        className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
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
                                <td className="px-6 py-4">
                                    <div className="relative w-24">
                                        <input
                                            type="number"
                                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 transition-all font-medium"
                                            value={g.max_drawdown_percent}
                                            onChange={(e) => {
                                                const newG = [...groups];
                                                newG[idx].max_drawdown_percent = parseFloat(e.target.value);
                                                setGroups(newG);
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="relative w-24">
                                        <input
                                            type="number"
                                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all font-medium"
                                            value={g.daily_drawdown_percent}
                                            onChange={(e) => {
                                                const newG = [...groups];
                                                newG[idx].daily_drawdown_percent = parseFloat(e.target.value);
                                                setGroups(newG);
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="relative w-24">
                                        <input
                                            type="number"
                                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium"
                                            value={g.profit_target_percent ?? ''}
                                            onChange={(e) => {
                                                const newG = [...groups];
                                                newG[idx].profit_target_percent = e.target.value === '' ? null : parseFloat(e.target.value);
                                                setGroups(newG);
                                            }}
                                        />
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end gap-2">
                                        <button
                                            onClick={() => handleSave(g)}
                                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                                            title="Save"
                                        >
                                            <Save className="w-4 h-4" />
                                        </button>
                                        {g.id && (
                                            <button
                                                onClick={() => handleDelete(g.id, g.group_name)}
                                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {groups.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 font-medium">No legacy groups found.</td>
                            </tr>
                        )}
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
        } catch (e) {
            console.error(e);
            toast.error("Failed to load server config");
        }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchConfig(); }, []);

    const handleChange = (field: string, val: any) => {
        setConfig({ ...config, [field]: val });
    }

    const handleSave = async () => {
        const loadingToast = toast.loading("Saving configuration...");
        try {
            // Parse groups if string
            let payload = { ...config };
            if (typeof payload.monitored_groups === 'string') {
                try {
                    // Auto-convert comma separated string for easier UI
                    if (payload.monitored_groups.includes(",")) {
                        payload.monitored_groups = payload.monitored_groups.split(",").map((s: string) => s.trim());
                    } else if (payload.monitored_groups.startsWith("[")) {
                        payload.monitored_groups = JSON.parse(payload.monitored_groups);
                    } else {
                        // If empty string, send empty array, else single item string
                        payload.monitored_groups = payload.monitored_groups.trim() === "" ? [] : [payload.monitored_groups]; // Single item
                    }
                } catch (e) { }
            }

            await saveServerConfig(payload);
            toast.success("Saved! Restart Bridge to apply changes.", { id: loadingToast, duration: 4000 });
            fetchConfig();
        } catch (e) {
            toast.error("Error saving configuration", { id: loadingToast });
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="font-medium">Loading configuration...</p>
        </div>
    );

    return (
        <div className="max-w-3xl space-y-6">
            <div className="bg-white border text-gray-900 border-gray-200 p-8 rounded-xl space-y-6 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">MT5 Manager Details</h3>
                    <p className="text-sm text-gray-500 mt-1">Credentials for connecting to the Metatrader 5 Server</p>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">Server IP</label>
                        <input
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 font-mono"
                            value={config.server_ip || ''}
                            placeholder="e.g. 192.168.1.100"
                            onChange={e => handleChange('server_ip', e.target.value)}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">Port</label>
                        <input
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 font-mono"
                            value={config.api_port || ''}
                            placeholder="e.g. 443"
                            onChange={e => handleChange('api_port', parseInt(e.target.value))}
                            type="number"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-6 bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">Manager Login</label>
                        <input
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 font-mono"
                            value={config.manager_login || ''}
                            placeholder="Manager ID"
                            onChange={e => handleChange('manager_login', parseInt(e.target.value))}
                            type="number"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">Manager Password</label>
                        <input
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono"
                            value={config.manager_password || ''}
                            onChange={e => handleChange('manager_password', e.target.value)}
                            type="password"
                            placeholder="••••••••"
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border text-gray-900 border-gray-200 p-8 rounded-xl space-y-6 shadow-sm">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Poller Settings</h3>
                    <p className="text-sm text-gray-500 mt-1">Configure Webhook callbacks and account groups</p>
                </div>

                <div className="space-y-5 bg-gray-50/50 p-6 rounded-lg border border-gray-100">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700">Callback URL (Webhook)</label>
                        <input
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 font-mono"
                            value={config.callback_url || ''}
                            placeholder="https://api.yourdomain.com/webhook"
                            onChange={e => handleChange('callback_url', e.target.value)}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 text-gray-900 mb-1">Monitored Groups (Comma Separated)</label>
                        <textarea
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-mono min-h-[100px] resize-y"
                            value={Array.isArray(config.monitored_groups) ? config.monitored_groups.join(", ") : (config.monitored_groups || '')}
                            placeholder="demo\Group1, demo\Group2"
                            onChange={e => handleChange('monitored_groups', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 font-medium mt-1">Example: demo\Group1, demo\Group2</p>
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-8 py-3 rounded-lg font-medium shadow-sm transition-all active:scale-95"
                >
                    <Save className="w-5 h-5" />
                    Save Configuration
                </button>
            </div>
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
        } catch (e) {
            toast.error("Failed to fetch logs");
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchLogs(); }, []);

    return (
        <div className="space-y-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">System Logs</h3>
                    <p className="text-sm text-gray-500 mt-1">Real-time MT5 bridge and risk engine logs</p>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors active:scale-95"
                >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                </button>
            </div>

            <div className="bg-[#1e1e1e] border border-gray-800 rounded-lg p-5 font-mono text-xs text-gray-300 h-[600px] overflow-y-auto leading-relaxed shadow-inner">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-gray-500 gap-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-400"></div>
                        Loading system logs...
                    </div>
                ) : logs.map((l, i) => (
                    <div key={i} className="mb-2 border-b border-gray-800/50 pb-2 last:border-0 hover:bg-white/5 p-1 rounded transition-colors">
                        <span className="text-blue-400 font-medium">[{new Date(l.created_at).toLocaleString()}]</span>
                        <span className={`ml-3 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${l.level === 'ERROR' ? 'bg-red-500/20 text-red-400' :
                                l.level === 'WARNING' ? 'bg-amber-500/20 text-amber-400' :
                                    'bg-emerald-500/20 text-emerald-400'
                            }`}>{l.level}</span>
                        <span className="ml-3 text-gray-300/90 break-all">{l.message}</span>
                    </div>
                ))}
                {logs.length === 0 && !loading && (
                    <div className="flex items-center justify-center h-full text-gray-500 italic">
                        System logs empty.
                    </div>
                )}
            </div>
        </div>
    );
}
