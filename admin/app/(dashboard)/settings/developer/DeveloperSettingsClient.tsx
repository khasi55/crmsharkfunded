"use client";

import { useState, useEffect } from "react";
import { Save, Key, Globe, Shield } from "lucide-react";
// We'll reuse the pricing settings actions or create new ones if needed
// For now let's assume we can save to pricing_configurations as 'developer_settings'
import { saveDeveloperSettings, getDeveloperSettings } from "@/app/actions/settings-actions";

export function DeveloperSettingsClient() {
    const [settings, setSettings] = useState({
        backendUrl: "",
        frontendUrl: "",
        webhookUrl: "",
        cregisBusinessId: "",
        cregisApiKey: "",
        cregisSecret: "",
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await getDeveloperSettings();
                setSettings(prev => ({ ...prev, ...data }));
            } catch (e) {
                console.error("Error fetching developer settings:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        try {
            await saveDeveloperSettings(settings);
            alert("Developer settings saved!");
        } catch (e) {
            console.error("Error saving developer settings:", e);
            alert("Error saving settings");
        }
    };

    if (loading) return <div className="p-8">Loading developer settings...</div>;

    return (
        <div className="max-w-4xl space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Globe className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Endpoint Configuration</h3>
                        <p className="text-sm text-gray-500">Base URLs for different environments</p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Backend URL</label>
                        <input
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={settings.backendUrl}
                            placeholder="https://api.example.com"
                            onChange={e => setSettings({ ...settings, backendUrl: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Frontend URL</label>
                        <input
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={settings.frontendUrl}
                            placeholder="https://example.com"
                            onChange={e => setSettings({ ...settings, frontendUrl: e.target.value })}
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Callback URL</label>
                        <input
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={settings.webhookUrl}
                            placeholder="https://api.example.com/api/payments/webhook"
                            onChange={e => setSettings({ ...settings, webhookUrl: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                        <Shield className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Cregis Specific Config</h3>
                        <p className="text-sm text-gray-500">General Cregis settings shared across environments</p>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business ID</label>
                        <input
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={settings.cregisBusinessId}
                            onChange={e => setSettings({ ...settings, cregisBusinessId: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                        <input
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={settings.cregisApiKey}
                            onChange={e => setSettings({ ...settings, cregisApiKey: e.target.value })}
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                        <input
                            type="password"
                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            value={settings.cregisSecret}
                            onChange={e => setSettings({ ...settings, cregisSecret: e.target.value })}
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95"
                >
                    <Save className="w-5 h-5" />
                    Save Developer Settings
                </button>
            </div>
        </div>
    );
}
