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
    UserPlus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAdmin } from "@/app/actions/admin-auth";

const navigation = [
    { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { name: "Users", href: "/admin/users", icon: Users },
    { name: "MT5 Accounts", href: "/admin/mt5", icon: Server },
    { name: "Assign Account", href: "/admin/mt5/assign", icon: UserPlus },
    { name: "KYC Requests", href: "/admin/kyc", icon: FileText },
    { name: "Risk Settings", href: "/admin/risk", icon: Shield },
    { name: "Payouts", href: "/admin/payouts", icon: CreditCard },
];

export function AdminSidebar() {
    const pathname = usePathname();

    return (
        <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200">
            {/* Logo Section */}
            <div className="flex h-16 items-center px-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="block text-base font-semibold text-gray-900">SharkFunded</span>
                        <span className="block text-xs text-gray-500">Admin Portal</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex flex-1 flex-col gap-1 p-4">
                <div className="px-3 mb-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Navigation</p>
                </div>
                {navigation.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-indigo-50 text-indigo-600"
                                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                            )}
                        >
                            <item.icon className={cn(
                                "h-5 w-5",
                                isActive ? "text-indigo-600" : "text-gray-400"
                            )} />
                            {item.name}
                        </Link>
                    );
                })}
            </div>

            {/* Footer / User Profile */}
            <div className="border-t border-gray-200 p-4">
                <div className="mb-3 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                    <div className="h-9 w-9 rounded-full bg-indigo-600 flex items-center justify-center">
                        <span className="font-semibold text-white text-sm">SA</span>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-gray-900">Super Admin</p>
                        <p className="truncate text-xs text-gray-500">admin@sharkfunded.com</p>
                    </div>
                </div>

                <form action={logoutAdmin}>
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors">
                        <LogOut className="h-4 w-4" />
                        Sign Out
                    </button>
                </form>
            </div>
        </div>
    );
}
