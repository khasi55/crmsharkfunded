"use client";

import { useState, useEffect } from "react";
import { Save, AlertCircle } from "lucide-react";
import { getMerchantSettings, saveMerchantSetting } from "@/app/actions/settings-actions";

export function PaymentSettingsClient() {
    const [gateways, setGateways] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchSettings = async () => {
        setLoading(true);
        try {
            const data = await getMerchantSettings();
            // Ensure at least SharkPay and Paymid exist in UI even if DB is empty (should fail gracefully)
            const defaultGWs = ['SharkPay', 'Paymid', 'Cregis'];
            const merged = [...data];
            defaultGWs.forEach(name => {
                if (!merged.find(g => g.gateway_name === name)) {
                    merged.push({ gateway_name: name, is_active: false, environment: 'sandbox' });
                }
            });
            setGateways(merged);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSettings(); }, []);

    const handleSave = async (gw: any) => {
        try {
            await saveMerchantSetting(gw);
            alert(`Saved ${gw.gateway_name} settings!`);
            fetchSettings(); // Refresh to get masked secrets or updated styling
        } catch (e) {
            alert("Error saving settings.");
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {gateways.map((gw, idx) => (
                <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-900">{gw.gateway_name}</h3>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${gw.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-sm text-gray-500">{gw.is_active ? 'Active' : 'Inactive'}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {/* Status Toggle */}
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700">Enable Gateway</label>
                            <input
                                type="checkbox"
                                className="toggle"
                                checked={gw.is_active}
                                onChange={e => {
                                    const newG = [...gateways];
                                    newG[idx].is_active = e.target.checked;
                                    setGateways(newG);
                                }}
                            />
                        </div>

                        {/* Environment */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Environment</label>
                            <select
                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900"
                                value={gw.environment || 'sandbox'}
                                onChange={e => {
                                    const newG = [...gateways];
                                    newG[idx].environment = e.target.value;
                                    setGateways(newG);
                                }}
                            >
                                <option value="sandbox">Sandbox / Test</option>
                                <option value="production">Production / Live</option>
                            </select>
                        </div>

                        {/* API Key */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">API Key</label>
                            <input
                                type="text"
                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 font-mono"
                                value={gw.api_key || ''}
                                placeholder="Enter API Key"
                                onChange={e => {
                                    const newG = [...gateways];
                                    newG[idx].api_key = e.target.value;
                                    setGateways(newG);
                                }}
                            />
                        </div>

                        {/* API Secret */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">API Secret</label>
                            <input
                                type="password"
                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 font-mono"
                                value={gw.api_secret || ''}
                                placeholder={gw.api_secret ? "********" : "Enter API Secret"}
                                onChange={e => {
                                    const newG = [...gateways];
                                    newG[idx].api_secret = e.target.value;
                                    setGateways(newG);
                                }}
                            />
                        </div>

                        {/* Webhook Secret */}
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Webhook Secret (Optional)</label>
                            <input
                                type="password"
                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm text-gray-900 font-mono"
                                value={gw.webhook_secret || ''}
                                placeholder={gw.webhook_secret ? "********" : "Enter Webhook Secret"}
                                onChange={e => {
                                    const newG = [...gateways];
                                    newG[idx].webhook_secret = e.target.value;
                                    setGateways(newG);
                                }}
                            />
                        </div>

                        <button
                            onClick={() => handleSave(gw)}
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Save Config
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
