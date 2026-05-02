"use client";

import { Download } from "lucide-react";
import { useState } from "react";

export function ExportUsersButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = () => {
        setIsLoading(true);
        // Direct navigation to trigger download
        window.location.href = "/api/admin/users/export";

        // Reset loading state after a short delay (since we can't track download completion reliably via href)
        setTimeout(() => setIsLoading(false), 2000);
    };

    return (
        <button
            onClick={handleExport}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
        >
            <Download className={`mr-2 h-4 w-4 ${isLoading ? 'animate-bounce' : ''}`} />
            {isLoading ? "Exporting..." : "Export CSV"}
        </button>
    );
}
