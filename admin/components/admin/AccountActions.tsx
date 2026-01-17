"use client";

import { useState } from "react";
import { Loader2, Ban, AlertOctagon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { executeAccountAction } from "@/app/actions/mt5-actions";
import { createClient } from "@/utils/supabase/client";

interface AccountActionsProps {
    accountId: string; // Added accountId
    login: number;
    currentStatus: string;
}

export function AccountActions({ accountId, login, currentStatus }: AccountActionsProps) {
    const [loading, setLoading] = useState(false);

    const handleAction = async (action: 'disable' | 'stop-out' | 'enable') => {
        let actionName = '';
        let confirmMsg = '';

        if (action === 'disable') {
            actionName = 'Disable Account';
            confirmMsg = `Are you sure you want to DISABLE account ${login}? This will prevent further trading.`;
        } else if (action === 'stop-out') {
            actionName = 'STOP OUT Account';
            confirmMsg = `⚠️ DANGER: Are you sure you want to STOP OUT account ${login}?\n\nThis will CLOSE ALL POSITIONS and DISABLE the account immediately.`;
        } else if (action === 'enable') {
            actionName = 'Enable Account';
            confirmMsg = `Are you sure you want to RE-ENABLE (Unbreach) account ${login}? This will allow trading again.`;
        }

        if (!confirm(confirmMsg)) return;

        setLoading(true);
        try {
            console.log(`🖱️ ${actionName} invoking Server Action for ${login}`);

            const result = await executeAccountAction(login, action);

            if (result.error) {
                console.error("❌ Server Action Error:", result.error);
                throw new Error(result.error);
            }

            console.log("✅ Success result:", result);
            toast.success(result.message || `${actionName} successful`);

            window.location.reload();

        } catch (error: any) {
            console.error(`${actionName} Error:`, error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        if (!confirm(`Are you sure you want to UPGRADE account ${login} to the Next Phase?`)) return;

        setLoading(true);
        try {
            const response = await fetch('/api/admin/risk/upgrade-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Upgrade failed');
            }

            toast.success('Account Upgraded Successfully! New account created.');
            window.location.reload();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    // If failed/banned/breached, show Enable Option (except hard "failed" maybe? assuming breached is reversible here)
    // Actually user asked for "Unbreach", so basically mostly for 'breached' or 'disabled' status.

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => handleAction('disable')}
                disabled={loading}
                className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
                title="Disable Account"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />}
            </button>
            <button
                onClick={() => handleAction('stop-out')}
                disabled={loading}
                className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                title="STOP OUT (Close All + Disable)"
            >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <AlertOctagon size={16} />}
            </button>

            {(currentStatus === 'breached' || currentStatus === 'disabled') && (
                <button
                    onClick={() => handleAction('enable')}
                    disabled={loading}
                    className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                    title="Enable / Unbreach Account"
                >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                </button>
            )}

            {currentStatus === 'passed' && (
                <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="px-2 py-1 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                    title="Upgrade to Next Phase"
                >
                    {loading ? <Loader2 size={12} className="animate-spin" /> : "UPGRADE"}
                </button>
            )}
        </div>
    );
}
