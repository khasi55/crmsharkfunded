"use client";

import { useRouter } from "next/navigation";
import { ArrowUp } from "lucide-react";
import { useState } from "react";

export default function UpgradeButton({ accountId, accountLogin, upgradedTo }: { accountId: string, accountLogin: string, upgradedTo?: string }) {
    const router = useRouter();
    const [isUpgrading, setIsUpgrading] = useState(false);

    const handleUpgrade = async () => {
        if (!confirm(`Are you sure you want to upgrade account ${accountLogin} to the next phase?`)) {
            return;
        }

        setIsUpgrading(true);

        try {
            const response = await fetch('/api/admin/upgrade-account', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accountId })
            });

            if (response.ok) {
                alert('Account upgraded successfully!');
                router.refresh();
            } else {
                const error = await response.json();
                alert(`Error: ${error.message || 'Failed to upgrade account'}`);
            }
        } catch (error) {
            console.error('Upgrade error:', error);
            alert('Failed to upgrade account');
        } finally {
            setIsUpgrading(false);
        }
    };

    if (upgradedTo) return null; // Hide if already upgraded

    return (
        <button
            onClick={handleUpgrade}
            disabled={isUpgrading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-400 rounded-md transition-colors"
        >
            <ArrowUp size={14} />
            {isUpgrading ? 'Upgrading...' : 'Upgrade'}
        </button>
    );
}
