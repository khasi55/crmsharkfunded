"use client";

import { usePathname } from "next/navigation";
import { Bell, Search, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Header() {
    const pathname = usePathname();

    if (pathname === "/challenges") return null;

    return (
        <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-40 bg-bg-main border-b border-white/5">
            {/* Search Input */}
            <div className="flex-1 max-w-md hidden md:flex">
                <div className="relative w-full group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-shark-blue transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Search markets, challenges..."
                        className="w-full bg-white border-transparent focus:border-shark-blue/20 focus:ring-4 focus:ring-shark-blue/5 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none transition-all shadow-sm group-hover:shadow-md"
                    />
                </div>
            </div>

            {/* Mobile Title (visible only on small screens) */}
            <h1 className="md:hidden font-bold text-xl text-shark-dark">SharkFunded</h1>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
                {/* Help */}
                <button className="p-2.5 text-gray-400 hover:text-shark-blue hover:bg-white rounded-full transition-all hover:shadow-sm">
                    <HelpCircle size={22} />
                </button>

                {/* Notifications */}
                <button className="relative p-2.5 text-gray-400 hover:text-shark-blue hover:bg-white rounded-full transition-all hover:shadow-sm">
                    <Bell size={22} />
                    <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-bg-main" />
                </button>

                {/* CTA Button */}
                <button className="bg-shark-blue hover:bg-blue-600 text-white text-sm font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all hidden sm:block">
                    New Challenge
                </button>
            </div>
        </header>
    );
}
