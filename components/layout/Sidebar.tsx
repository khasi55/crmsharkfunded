"use client";

import Image from "next/image";
import { Trophy, UserCheck, Gift, BarChart2, Calendar, Wallet, Settings, LogOut, ChevronLeft, LayoutDashboard, Medal, Users, HelpCircle, PieChart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
    { icon: PieChart, label: "Overview", href: "/overview" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Trophy, label: "Challenges", href: "/challenges" },
    { icon: UserCheck, label: "KYC", href: "/kyc" },
    { icon: Gift, label: "Rewards", href: "/rewards" },
    { icon: Medal, label: "Certificates", href: "/certificates" },
    { icon: BarChart2, label: "Ranking", href: "/ranking" },
    { icon: Calendar, label: "Calendar", href: "/economics" },
    { icon: Wallet, label: "Payouts", href: "/payouts" },
    { icon: Users, label: "Affiliate", href: "/affiliate" },
];

const bottomItems = [
    { icon: Settings, label: "Settings", href: "/settings" },
];

export default function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <motion.aside
            initial={false}
            animate={{ width: isCollapsed ? "80px" : "260px" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border-r border-gray-800/50 hidden md:flex flex-col sticky top-0 z-50"
        >
            {/* Logo Header */}
            <div className={cn(
                "h-16 flex items-center border-b border-gray-800/50 relative",
                isCollapsed ? "justify-center px-4" : "px-5"
            )}>
                {!isCollapsed ? (
                    <div className="relative w-40 h-10">
                        <Image
                            src="/shark-logo.png"
                            alt="SharkFunded"
                            fill
                            className="object-contain object-left"
                            priority
                        />
                    </div>
                ) : (
                    <div className="relative w-10 h-10">
                        <Image
                            src="/shark-icon.jpg"
                            alt="SharkFunded Icon"
                            fill
                            className="object-contain"
                            priority
                        />
                    </div>
                )}

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={cn(
                        "w-6 h-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-700 absolute -right-3 top-5 transition-all shadow-md",
                        isCollapsed && "rotate-180"
                    )}
                >
                    <ChevronLeft size={12} />
                </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-3 py-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                {!isCollapsed && (
                    <p className="px-3 text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-5">
                        Navigation
                    </p>
                )}

                <div className="space-y-3">
                    {menuItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <motion.div
                                    whileHover={{ x: isCollapsed ? 0 : 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative",
                                        isActive
                                            ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/25"
                                            : "text-gray-400 hover:bg-gray-800/80 hover:text-white",
                                        isCollapsed && "justify-center"
                                    )}
                                >
                                    {/* Active indicator */}
                                    {isActive && !isCollapsed && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/30 rounded-r-full" />
                                    )}

                                    <item.icon
                                        size={20}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={cn(
                                            "shrink-0 transition-colors",
                                            isActive ? "text-white" : "text-gray-500 group-hover:text-blue-400"
                                        )}
                                    />

                                    <AnimatePresence>
                                        {!isCollapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                exit={{ opacity: 0, x: -10 }}
                                                className="text-sm font-medium whitespace-nowrap"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>

                                    {/* Tooltip for collapsed state */}
                                    {isCollapsed && (
                                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-sm font-medium rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl z-50 whitespace-nowrap">
                                            {item.label}
                                        </div>
                                    )}
                                </motion.div>
                            </Link>
                        );
                    })}
                </div>
            </nav>

            {/* Bottom Section */}
            <div className="px-3 py-4 border-t border-gray-800/50 space-y-2">
                {/* Settings */}
                {bottomItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href}>
                            <div className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                                isActive
                                    ? "bg-gray-800 text-white"
                                    : "text-gray-500 hover:bg-gray-800/50 hover:text-white",
                                isCollapsed && "justify-center"
                            )}>
                                <item.icon size={20} strokeWidth={2} />
                                {!isCollapsed && (
                                    <span className="text-sm font-medium">{item.label}</span>
                                )}
                            </div>
                        </Link>
                    );
                })}

                {/* User Profile */}
                <div className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r from-gray-800/80 to-gray-800/40 border border-gray-700/50 cursor-pointer hover:border-gray-600/50 transition-all",
                    isCollapsed && "justify-center p-2"
                )}>
                    <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                            V
                        </div>
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-gray-900 rounded-full" />
                    </div>

                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">ViswanathReddy</p>
                            <p className="text-[11px] text-gray-500">Pro Trader</p>
                        </div>
                    )}

                    {!isCollapsed && (
                        <LogOut size={16} className="text-gray-500 hover:text-red-400 transition-colors shrink-0" />
                    )}
                </div>
            </div>
        </motion.aside>
    );
}
