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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200/60 bg-white/70 px-4 backdrop-blur-xl md:px-8 shadow-sm">
            <div className="flex items-center gap-4">
                {/* Mobile Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100/50 rounded-lg transition-all"
                >
                    <Menu className="h-5 w-5" />
                </button>

                {/* Breadcrumbs */}
                <div className="flex items-center gap-2.5 text-[13px] overflow-hidden whitespace-nowrap">
                    <span className="font-semibold text-gray-400 hidden sm:inline">Admin</span>
                    {segments.length > 0 && <ChevronRight className="h-3.5 w-3.5 text-gray-300 hidden sm:block" />}
                    {segments.map((segment, index) => (
                        <div key={segment} className="flex items-center gap-2.5">
                            <span className="capitalize font-semibold text-gray-800">{segment.replace(/-/g, ' ')}</span>
                            {index < segments.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 md:gap-5">
                <div className="relative hidden w-64 md:block lg:w-72 group">
                    <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Quick search..."
                        defaultValue={searchParams.get('query')?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="h-9 w-full rounded-xl border border-gray-100 bg-gray-50/50 pl-10 pr-4 text-[13px] outline-none transition-all focus:border-blue-500/20 focus:bg-white focus:ring-4 focus:ring-blue-500/5 placeholder:text-gray-400 shadow-inner"
                    />
                </div>

                <div className="flex items-center gap-3">
                    <NotificationPopover />
                    <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />
                </div>
            </div>
        </header>
    );
}
