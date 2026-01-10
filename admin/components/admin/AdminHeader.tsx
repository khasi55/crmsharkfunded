"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, ChevronRight } from "lucide-react";

export function AdminHeader() {
    const pathname = usePathname();

    // Generate breadcrumbs from pathname
    const segments = pathname.split('/').filter(Boolean).slice(1); // remove 'admin'

    return (
        <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-gray-900">Admin</span>
                {segments.length > 0 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                {segments.map((segment, index) => (
                    <div key={segment} className="flex items-center gap-2">
                        <span className="capitalize font-medium text-gray-600">{segment}</span>
                        {index < segments.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                    </div>
                ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <div className="relative hidden w-80 md:block">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                </div>

                <div className="flex items-center gap-3 border-l border-gray-200 pl-4">
                    <button className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-50">
                        <Bell className="h-5 w-5" />
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    </button>
                </div>
            </div>
        </header>
    );
}
