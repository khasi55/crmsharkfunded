"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Search, ChevronRight, Menu } from "lucide-react";
import { NotificationPopover } from "@/components/admin/NotificationPopover";

interface AdminHeaderProps {
    onMenuClick?: () => void;
}

export function AdminHeader({ onMenuClick }: AdminHeaderProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    // Generate breadcrumbs from pathname
    const segments = pathname.split('/').filter(Boolean).slice(1); // remove 'admin'

    const handleSearch = (term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('query', term);
        } else {
            params.delete('query');
        }
        // Reset page when searching
        params.set('page', '1');

        router.replace(`${pathname}?${params.toString()}`);
    };

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/80 px-4 backdrop-blur-md md:px-8">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                    <Menu className="h-6 w-6" />
                </button>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm overflow-hidden whitespace-nowrap">
                    <span className="font-medium text-gray-900 hidden sm:inline">Admin</span>
                    {segments.length > 0 && <ChevronRight className="h-4 w-4 text-gray-400 hidden sm:block" />}
                    {segments.map((segment, index) => (
                        <div key={segment} className="flex items-center gap-2">
                            <span className="capitalize font-medium text-gray-600">{segment}</span>
                            {index < segments.length - 1 && <ChevronRight className="h-4 w-4 text-gray-400" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 md:gap-4">
                <div className="relative hidden w-64 md:block lg:w-80">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        defaultValue={searchParams.get('query')?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="h-9 w-full rounded-full border border-gray-200 bg-gray-50 pl-10 pr-4 text-sm outline-none transition-all focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
                    />
                </div>

                <div className="flex items-center gap-2 pl-2">
                    <NotificationPopover />
                    <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block" />
                </div>
            </div>
        </header>
    );
}
