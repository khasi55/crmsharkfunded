"use client";

import { useState } from "react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface AdminLayoutClientProps {
    children: React.ReactNode;
    user: any; // Using any for now to match typical user object, or strictly type if possible
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="flex h-screen w-full bg-white">
            {/* Desktop Sidebar */}
            <div className="hidden md:block h-full">
                <AdminSidebar user={user} />
            </div>

            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="fixed inset-0 z-40 bg-black md:hidden"
                        />
                        <motion.div
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 left-0 z-50 w-64 md:hidden"
                        >
                            <div className="relative h-full">
                                <AdminSidebar user={user} onClose={() => setIsSidebarOpen(false)} />
                                <button
                                    onClick={() => setIsSidebarOpen(false)}
                                    className="absolute right-2 top-4 p-2 text-gray-400 hover:text-white"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <AdminHeader onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 overflow-y-auto bg-gray-50 p-4 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
