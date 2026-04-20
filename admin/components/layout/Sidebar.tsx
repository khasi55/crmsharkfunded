"use client";

import Image from "next/image";
import { Trophy, UserCheck, Gift, BarChart2, Calendar, Wallet, Settings, LogOut, ChevronLeft, LayoutDashboard, Medal, Users, HelpCircle, PieChart, X, Ticket, Mail, Key } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = [
    { icon: PieChart, label: "Overview", href: "/overview" },
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
    { icon: Trophy, label: "Challenges", href: "/accounts" },
    { icon: Trophy, label: "Passed Accounts", href: "/passed-accounts" },
    { icon: Trophy, label: "Competitions", href: "/competitions" },
    { icon: UserCheck, label: "KYC", href: "/kyc" },
    { icon: Gift, label: "Rewards", href: "/rewards" },
    { icon: Medal, label: "Certificates", href: "/certificates" },
    { icon: BarChart2, label: "Ranking", href: "/ranking" },
    { icon: Calendar, label: "Calendar", href: "/economics" },
    { icon: Wallet, label: "Payouts", href: "/payouts" },
    { icon: Users, label: "Affiliate", href: "/affiliates" },
    { icon: Ticket, label: "Coupons", href: "/coupons" },
    { icon: Mail, label: "Emails", href: "/emails" },
    { icon: Key, label: "Developer Settings", href: "/settings/developer" },
];

const bottomItems = [
    { icon: Settings, label: "Settings", href: "/settings" },
];

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Close on route change on mobile
    useEffect(() => {
        onClose();
    }, [pathname]);

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/auth/logout', {
                method: 'POST',
            });
            const data = await response.json();

            if (response.ok) {
                router.push('/login');
                router.refresh();
            } else {
                console.error('Logout failed:', data.error);
            }
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: isCollapsed ? "80px" : "260px"
                }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className={cn(
                    "fixed inset-y-0 left-0 z-50 flex flex-col h-screen bg-[#09090b] border-r border-[#1f1f23] transition-all duration-300",
                    "md:sticky md:top-0 md:translate-x-0 shadow-2xl md:shadow-none",
                    isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
                )}
            >
                {/* Logo Header */}
                <div className={cn(
                    "h-16 flex items-center border-b border-[#1f1f23] relative",
                    isCollapsed ? "justify-center px-4" : "px-6"
                )}>
                    {!isCollapsed ? (
                        <div className="relative w-36 h-8">
                            <Image
                                src="/shark-logo.png"
                                alt="SharkFunded"
                                fill
                                className="object-contain object-left brightness-110"
                                priority
                            />
                        </div>
                    ) : (
                        <div className="relative w-8 h-8">
                            <Image
                                src="/shark-icon.jpg"
                                alt="SharkFunded Icon"
                                fill
                                className="object-contain rounded-lg"
                                priority
                            />
                        </div>
                    )}

                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "w-5 h-5 rounded-md bg-[#1f1f23] border border-[#27272a] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#27272a] absolute -right-2.5 top-5 transition-all shadow-lg z-10",
                            isCollapsed && "rotate-180"
                        )}
                    >
                        <ChevronLeft size={10} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 py-6 overflow-y-auto custom-scrollbar">
                    {!isCollapsed && (
                        <p className="px-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">
                            Platform
                        </p>
                    )}

                    <div className="space-y-1">
                        {menuItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link key={item.href} href={item.href}>
                                    <motion.div
                                        whileTap={{ scale: 0.98 }}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                                            isActive
                                                ? "text-white bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.02)]"
                                                : "text-gray-400 hover:text-white hover:bg-white/[0.03]",
                                            isCollapsed && "justify-center px-0"
                                        )}
                                    >
                                        {isActive && (
                                            <motion.div
                                                layoutId="active-pill"
                                                className="absolute left-0 w-1 h-4 bg-blue-500 rounded-r-full"
                                                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                            />
                                        )}

                                        <item.icon
                                            size={18}
                                            strokeWidth={isActive ? 2 : 1.5}
                                            className={cn(
                                                "shrink-0 transition-colors duration-200",
                                                isActive ? "text-blue-500" : "text-gray-500 group-hover:text-gray-300"
                                            )}
                                        />

                                        <AnimatePresence>
                                            {!isCollapsed && (
                                                <motion.span
                                                    initial={{ opacity: 0, x: -8 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, x: -8 }}
                                                    className="text-[13px] font-medium whitespace-nowrap"
                                                >
                                                    {item.label}
                                                </motion.span>
                                            )}
                                        </AnimatePresence>

                                        {/* Tooltip for collapsed state */}
                                        {isCollapsed && (
                                            <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[#1f1f23] border border-[#27272a] text-white text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-xl z-50 whitespace-nowrap -translate-x-2 group-hover:translate-x-0">
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
                <div className="px-4 py-4 border-t border-[#1f1f23] space-y-3">
                    {/* Settings */}
                    {bottomItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <div className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all group",
                                    isActive
                                        ? "bg-white/5 text-white border border-white/10"
                                        : "text-gray-400 hover:bg-white/[0.03] hover:text-white",
                                    isCollapsed && "justify-center px-0"
                                )}>
                                    <item.icon size={18} strokeWidth={1.5} className={isActive ? "text-blue-500" : "text-gray-500 group-hover:text-gray-300"} />
                                    {!isCollapsed && (
                                        <span className="text-[13px] font-medium">{item.label}</span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}

                    {/* User Profile */}
                    <div className={cn(
                        "flex items-center gap-3 p-2 rounded-xl bg-[#161618] border border-[#27272a]/50 cursor-pointer hover:border-[#27272a] transition-all duration-200",
                        isCollapsed && "justify-center p-1.5"
                    )}>
                        <div className="relative shrink-0">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs shadow-inner">
                                V
                            </div>
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#161618] rounded-full shadow-sm" />
                        </div>

                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-white truncate">ViswanathReddy</p>
                                <p className="text-[10px] text-gray-500 font-medium">Pro Trader</p>
                            </div>
                        )}

                        {!isCollapsed && (
                            <button
                                onClick={handleLogout}
                                className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-400/5 transition-all duration-200"
                            >
                                <LogOut size={14} />
                            </button>
                        )}
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
