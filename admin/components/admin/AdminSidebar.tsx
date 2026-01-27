"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
    Send
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAdmin } from "@/app/actions/admin-auth";

// ... (imports remain)

const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin', 'payouts_admin'] },
    { name: "Users", href: "/users", icon: Users, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "Accounts List", href: "/accounts", icon: List, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "MT5 Accounts", href: "/mt5", icon: Server, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "Risk Settings", href: "/mt5-risk", icon: Gauge, roles: ['super_admin', 'admin', 'risk_admin'] },
    { name: "Payments", href: "/payments", icon: CreditCard, roles: ['super_admin', 'admin', 'sub_admin'] }, // Changed from settings/payment to /payments for report
    { name: "Settings", href: "/settings/payment", icon: Settings, roles: ['super_admin', 'admin'] },
    { name: "Assign Account", href: "/mt5/assign", icon: UserPlus, roles: ['super_admin', 'admin', 'sub_admin', 'risk_admin'] },
    { name: "KYC Requests", href: "/kyc", icon: FileText, roles: ['super_admin', 'admin', 'sub_admin', 'payouts_admin'] },
    { name: "Payouts", href: "/payouts", icon: CreditCard, roles: ['super_admin', 'admin', 'sub_admin', 'payouts_admin'] },
    { name: "Affiliate Payouts", href: "/affiliates", icon: Wallet, roles: ['super_admin', 'admin', 'payouts_admin', 'sub_admin'] },
    { name: "Competitions", href: "/competitions", icon: Trophy, roles: ['super_admin', 'admin', 'sub_admin'] },
    { name: "Coupons", href: "/coupons", icon: Ticket, roles: ['super_admin', 'admin', 'sub_admin'] },
    { name: "System Health", href: "/system-health", icon: Activity, roles: ['super_admin', 'admin'] },
    { name: "Event Scanner", href: "/event-scanner", icon: Scan, roles: ['super_admin', 'admin', 'sub_admin'] },
    { name: "Emails", href: "/emails", icon: Send, roles: ['super_admin', 'admin'] },
    { name: "Admins", href: "/admins", icon: ShieldCheck, roles: ['super_admin', 'admin'] },
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
    const userRole = user?.role || 'sub_admin';
    const userPermissions = user?.permissions || [];

    const filteredNavigation = navigation.filter(item => {
        // 1. Super Admin always has access to everything
        if (userRole === 'super_admin') return true;

        // 2. Granular Permissions (Whitelist Mode)
        // If the user has explicitly defined permissions (non-empty array), 
        // we STRICTLY respect those and ignore role defaults.
        // This allows creating "Limited" admins by giving them specific permissions.
        if (userPermissions && userPermissions.length > 0) {
            return userPermissions.includes(item.name.toLowerCase());
        }

        // 3. Fallback to Role-Based Access
        // If no permissions are set, fall back to the default role configuration.
        return item.roles.includes(userRole);
    });

    return (
        <div className="flex h-full w-64 flex-col bg-[#0a0d20] border-r border-white/5">
            {/* Logo Section */}
            <div className="flex h-16 items-center px-6 border-b border-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="block text-base font-semibold text-white">SharkFunded</span>
                        <span className="block text-xs text-gray-400">Admin Portal</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Navigation</p>
                </div>
                {filteredNavigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={cn(
                                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                                isActive
                                    ? "text-white bg-[linear-gradient(180deg,#0066FF_0%,#0066FF_50%,#96C0FF_100%)] shadow-[inset_0_-2px_0_0_#B7DCFF]"
                                    : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5",
                                isActive ? "text-white" : "text-gray-400"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            {/* Footer / User Profile */}
            <div className="border-t border-white/5 p-4">
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-white/[0.03] p-3">
                    <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center">
                        <span className="font-semibold text-white text-sm uppercase">
                            {user?.full_name?.substring(0, 2) || "AD"}
                        </span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-white">{user?.full_name || 'Admin'}</p>
                        <p className="truncate text-xs text-gray-400">{user?.email}</p>
                        <p className="truncate text-[10px] text-blue-400 font-medium capitalize mt-0.5">{userRole.replace('_', ' ')}</p>
                    </div>
                </div>

                <form action={logoutAdmin}>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-400 hover:bg-white/[0.03] hover:text-red-400 transition-colors">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </form>
            </div>
        </div>
    );
}

