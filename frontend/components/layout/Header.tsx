import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search, HelpCircle, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
    onMenuClick: () => void;
}

export default function Header({ onMenuClick }: HeaderProps) {
    const pathname = usePathname();

    if (pathname === "/challenges") return null;

    return (
        <header className="h-20 px-8 flex items-center justify-between sticky top-0 z-40 bg-bg-main border-b border-white/5">
            {/* Left Section (Mobile Menu + Search) */}
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors"
                >
                    <Menu size={24} />
                </button>

                {/* Search Input */}
                <div className="max-w-md hidden md:block w-96">
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
            </div>

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
                <Link
                    href="/challenges"
                    className="flex items-center gap-1.5 bg-gradient-to-b from-[#1d4ed8] to-[#1e40af] hover:from-[#2563EB] hover:to-[#1E3A8A] text-white text-sm font-medium px-4 py-2 rounded-full shadow-lg shadow-blue-900/20 transition-all border border-blue-500/20 active:scale-95 hidden sm:flex"
                >
                    <Plus size={16} strokeWidth={2.5} />
                    <span>New Challenge</span>
                </Link>
            </div>
        </header>
    );
}

