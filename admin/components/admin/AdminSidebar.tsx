"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    Users,
    FileText,
    CreditCard,
    LogOut,
    Shield,
    Server,
    UserPlus,
    ShieldCheck,
    Wallet,
    Ticket,
    Trophy,
    List,
    Gauge,
    Settings,
    Activity,
    Scan,
    Send,
    AlertTriangle,
    Zap,
    ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAdmin } from "@/app/actions/admin-auth";

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin', 'payouts_admin'] },
    { name: "Users", href: "/users", icon: Users, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "Accounts List", href: "/accounts", icon: List, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "Pending Upgrades", href: "/passed-accounts", icon: Trophy, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "MT5 Accounts", href: "/mt5", icon: Server, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "MT5 Actions", href: "/mt5/actions", icon: Zap, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "Risk Settings", href: "/mt5-risk", icon: Gauge, roles: ['super_admin', 'admin', 'risk_admin'] },
    { name: "Risk Violations", href: "/risk-violations", icon: AlertTriangle, roles: ['super_admin', 'admin', 'risk_admin'] },
    { name: "Payments", href: "/payments", icon: CreditCard, roles: ['super_admin', 'admin', 'sub_admin'] },
    { name: "Cregis Check", href: "/payments/cregis", icon: Shield, roles: ['super_admin', 'admin'] },
    { name: "Settings", href: "/settings/security", icon: Settings, roles: ['super_admin', 'admin'] },
    { name: "Assign Account", href: "/mt5/assign", icon: UserPlus, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "KYC Requests", href: "/kyc", icon: FileText, roles: ['super_admin', 'admin', 'sub_admin', 'payouts_admin'] },
    { name: "Payouts", href: "/payouts", icon: CreditCard, roles: ['super_admin', 'admin', 'sub_admin', 'payouts_admin'] },
    { name: "Affiliate Payouts", href: "/affiliates", icon: Wallet, roles: ['super_admin', 'admin', 'payouts_admin', 'sub_admin'] },
    { name: "Sales", href: "/sales", icon: List, roles: ['super_admin'] },
    { name: "Competitions", href: "/competitions", icon: Trophy, roles: ['super_admin', 'admin', 'sub_admin'] },
    { name: "Coupons", href: "/coupons", icon: Ticket, roles: ['super_admin', 'admin', 'sub_admin'] },
    { name: "System Health", href: "/system-health", icon: Activity, roles: ['super_admin', 'admin'] },
    { name: "Event Scanner", href: "/event-scanner", icon: Scan, roles: ['super_admin', 'admin', 'sub_admin'] },
    { name: "Emails", href: "/emails", icon: Send, roles: ['super_admin', 'admin'] },
    { name: "Admins", href: "/admins", icon: ShieldCheck, roles: ['super_admin', 'admin'] },
    { name: "Audit Logs", href: "/logs", icon: List, roles: ['super_admin', 'admin'] },
];

interface AdminSidebarProps {
    user: {
        email: string;
        full_name: string;
        role: string;
        permissions?: string[];
    };
}

export function AdminSidebar({ user, onClose }: AdminSidebarProps & { onClose?: () => void }) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);
    const userRole = user?.role || 'sub_admin';
    const userPermissions = user?.permissions || [];

    const filteredNavigation = navigation.filter(item => {
        if (userRole === 'super_admin') return true;
        if (userPermissions && userPermissions.length > 0) {
            return userPermissions.includes(item.name.toLowerCase());
        }
        return item.roles.includes(userRole);
    });

    return (
        <motion.div
            initial={false}
            animate={{ width: isCollapsed ? "80px" : "260px" }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="flex h-full flex-col bg-[#09090b] border-r border-[#1f1f23] z-50 relative"
        >
            {/* Logo Section */}
            <div className={cn(
                "flex h-16 items-center border-b border-[#1f1f23] relative transition-all duration-200",
                isCollapsed ? "justify-center px-4" : "px-6"
            )}>
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 shadow-lg shadow-blue-500/20">
                        <Shield className="h-4.5 w-4.5 text-white" />
                    </div>
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex flex-col"
                        >
                            <span className="text-sm font-bold text-white tracking-tight leading-none">SharkFunded</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-0.5">Admin Portal</span>
                        </motion.div>
                    )}
                </div>

                {onClose ? null : (
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className={cn(
                            "w-5 h-5 rounded-md bg-[#1f1f23] border border-[#27272a] flex items-center justify-center text-gray-400 hover:text-white hover:bg-[#27272a] absolute -right-2.5 top-5 transition-all shadow-lg z-10",
                            isCollapsed && "rotate-180"
                        )}
                    >
                        <ChevronLeft size={10} />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <div className="flex flex-1 flex-col gap-1 p-4 overflow-y-auto custom-scrollbar">
                {!isCollapsed && (
                    <div className="px-2 mb-4 mt-2">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Menu</p>
                    </div>
                )}
                {filteredNavigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 relative",
                                isActive
                                    ? "text-white bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.02)]"
                                    : "text-gray-400 hover:text-white hover:bg-white/[0.03]",
                                isCollapsed && "justify-center px-0"
                            )}
                        >
                            {isActive && !isCollapsed && (
                                <motion.div
                                    layoutId="admin-active-pill"
                                    className="absolute left-0 w-1 h-4 bg-blue-500 rounded-r-full"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                />
                            )}
                            <item.icon className={cn(
                                "h-4.5 w-4.5 shrink-0 transition-colors duration-200",
                                isActive ? "text-blue-500" : "text-gray-500 group-hover:text-gray-300"
                            )} />
                            {!isCollapsed && (
                                <span className="text-[13px] font-medium truncate">{item.name}</span>
                            )}

                            {/* Tooltip for collapsed state */}
                            {isCollapsed && (
                                <div className="absolute left-full ml-4 px-2.5 py-1.5 bg-[#1f1f23] border border-[#27272a] text-white text-[11px] font-medium rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-xl z-50 whitespace-nowrap -translate-x-2 group-hover:translate-x-0">
                                    {item.name}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>

            {/* Footer / User Profile */}
            <div className="border-t border-[#1f1f23] p-4 bg-black/20">
                <div className={cn(
                    "mb-4 flex items-center gap-3 rounded-lg border border-[#27272a]/50 p-2.5 transition-all duration-200 bg-[#161618]",
                    isCollapsed && "justify-center p-2"
                )}>
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 shadow-inner">
                        <span className="font-bold text-blue-400 text-xs uppercase tracking-wider">
                            {user?.full_name?.substring(0, 2) || "AD"}
                        </span>
                    </div>
                    {!isCollapsed && (
                        <div className="flex-1 overflow-hidden">
                            <p className="truncate text-[12px] font-bold text-white leading-tight">{user?.full_name || 'Admin'}</p>
                            <p className="truncate text-[10px] font-medium text-gray-500 mt-0.5">{user?.email}</p>
                            <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/20 mt-1">
                                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-wider">{userRole.replace('_', ' ')}</span>
                            </div>
                        </div>
                    )}
                </div>

                <form action={logoutAdmin}>
                    <button className={cn(
                        "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-gray-400 border border-[#27272a] bg-[#1f1f23] hover:bg-red-500/5 hover:text-red-400 hover:border-red-500/20 transition-all duration-200 shadow-sm",
                        isCollapsed && "justify-center px-0"
                    )}>
                        <LogOut className="h-3.5 w-3.5 text-gray-500 group-hover:text-red-400 transition-colors" />
                        {!isCollapsed && <span>Sign Out</span>}
                    </button>
                </form>
            </div>
        </motion.div>
    );
}

