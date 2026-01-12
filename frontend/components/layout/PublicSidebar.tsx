"use client";

import Image from "next/image";
import {
    LayoutGrid,
    LogIn,
    UserPlus,
    CreditCard,
    Shield,
    HelpCircle,
    Home,
    Phone
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion } from "framer-motion";

const menuItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: CreditCard, label: "Plans", href: "/checkoutpage" },
    { icon: Shield, label: "Features", href: "/features" },
    { icon: HelpCircle, label: "FAQ", href: "/faq" },
    { icon: Phone, label: "Contact", href: "/contact" },
];

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function PublicSidebar({ isOpen = true, onClose }: SidebarProps) {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    return (
        <>
            {/* Sidebar */}
            <motion.aside
                initial={false}
                animate={{
                    width: isCollapsed ? "80px" : "260px"
                }}
                className={cn(
                    "fixed z-50 flex flex-col transition-all duration-300 overflow-hidden",
                    // Mobile: full height, no roundness (standard drawer)
                    "inset-y-0 left-0 h-screen w-[260px] md:w-auto", // Fixed width on mobile
                    // Desktop: floating, rounded, shorter height
                    "md:relative md:h-[calc(100vh-2rem)] md:m-4 md:rounded-3xl md:block hidden", // Hidden on mobile by default unless handled by layout
                    "bg-[#0a0d20] bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[#1a2342] via-[#0a0d20] to-[#0a0d20] border-r border-white/5 md:border border-white/10 shadow-2xl"
                )}
            >
                {/* Background Overlay */}
                <div className="absolute inset-0 z-0 pointer-events-none mix-blend-screen opacity-50">
                    <Image
                        src="/sidebar-overlay.png"
                        alt=""
                        fill
                        className="object-cover object-top"
                        priority
                    />
                </div>

                {/* Pattern Overlay */}
                <div className="absolute inset-0 z-0 pointer-events-none opacity-100">
                    <Image
                        src="/sidebar-pattern.svg"
                        alt=""
                        fill
                        className="object-cover object-top"
                        priority
                    />
                </div>

                {/* Logo Area */}
                <div className={cn(
                    "h-24 flex items-center mb-2 relative z-10",
                    isCollapsed ? "justify-center px-2" : "px-6"
                )}>
                    <Link href="/" className="flex items-center gap-3 group w-full h-full relative">
                        <div className="relative w-10 h-10 shrink-0">
                            <Image
                                src="/shark-icon.svg"
                                alt="SharkFunded"
                                fill
                                className="object-contain"
                                priority
                            />
                        </div>

                        {!isCollapsed && (
                            <span className="text-xl font-bold text-white tracking-wide">
                                SharkFunded
                            </span>
                        )}
                    </Link>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col min-h-0 relative z-10">

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto px-4 space-y-2 scrollbar-hide">
                        {!isCollapsed && (
                            <div className="px-4 mb-3">
                                <span className="text-xs font-medium text-gray-500/80">Menu</span>
                            </div>
                        )}

                        {menuItems.map((item) => {
                            const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));

                            return (
                                <Link key={item.href} href={item.href}>
                                    <div
                                        className={cn(
                                            "relative flex items-center gap-3.5 px-4 py-3.5 rounded-xl transition-all duration-200 group",
                                            isCollapsed ? "justify-center px-2" : "",
                                            isActive
                                                ? "text-white bg-gradient-to-b from-blue-600/0 via-blue-600/50 to-[#96C0FF] border-b-[3px] border-[#B7DCFF] shadow-lg shadow-blue-500/20"
                                                : "text-gray-400 hover:text-white hover:bg-white/[0.03]"
                                        )}
                                    >

                                        <item.icon
                                            size={20}
                                            strokeWidth={isActive ? 2.5 : 1.5}
                                            className={cn(
                                                "relative z-10 shrink-0 transition-colors",
                                                isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                                            )}
                                        />

                                        {!isCollapsed && (
                                            <span className={cn(
                                                "relative z-10 text-[14px] tracking-wide transition-colors",
                                                isActive ? "text-white font-semibold" : "text-gray-400 font-medium group-hover:text-white"
                                            )}>
                                                {item.label}
                                            </span>
                                        )}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Auth Buttons */}
                    <div className="p-4 space-y-2 mt-auto">
                        <Link href="/login">
                            <div className={cn(
                                "flex items-center justify-center w-full bg-white/5 hover:bg-white/10 text-white transition-all duration-300 border border-white/10",
                                isCollapsed ? "p-3 rounded-xl" : "py-3 px-4 rounded-xl gap-3"
                            )}>
                                <LogIn size={20} />
                                {!isCollapsed && "Log In"}
                            </div>
                        </Link>
                        <Link href="/signup">
                            <div className={cn(
                                "flex items-center justify-center w-full bg-blue-600 hover:bg-blue-500 text-white transition-all duration-300 shadow-lg shadow-blue-900/20",
                                isCollapsed ? "p-3 rounded-xl" : "py-3 px-4 rounded-xl gap-3"
                            )}>
                                <UserPlus size={20} />
                                {!isCollapsed && "Sign Up"}
                            </div>
                        </Link>
                    </div>
                </div>
            </motion.aside>
        </>
    );
}
