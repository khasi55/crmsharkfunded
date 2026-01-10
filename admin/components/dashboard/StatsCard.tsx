"use client";

import { motion } from "framer-motion";
import { ArrowUpRight, ArrowDownRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
    title: string;
    value: string;
    change?: string;
    isPositive?: boolean;
    trend?: "up" | "down" | "neutral";
    icon?: any;
    color?: "blue" | "green" | "orange" | "purple" | "red";
}

export default function StatsCard({ title, value, change, isPositive, icon: Icon, color = "blue" }: StatsCardProps) {
    const colorStyles = {
        blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        green: "bg-green-500/10 text-green-400 border-green-500/20",
        orange: "bg-orange-500/10 text-orange-400 border-orange-500/20",
        purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        red: "bg-red-500/10 text-red-400 border-red-500/20",
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-xl border border-white/10 p-6 relative overflow-hidden group hover:border-white/20 transition-all"
        >
            <div className="flex justify-between items-start mb-6 relative z-10">
                <div className="flex items-center gap-3">
                    {Icon && (
                        <div className={cn("p-2 rounded-lg border", colorStyles[color])}>
                            <Icon size={18} />
                        </div>
                    )}
                    <h3 className="text-gray-400 font-medium text-sm tracking-wide">{title}</h3>
                </div>
                <button className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg">
                    <MoreHorizontal size={18} />
                </button>
            </div>

            <div className="flex items-end justify-between relative z-10">
                <div>
                    <h2 className="text-2xl font-bold text-white tracking-tight">{value}</h2>
                    {change && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className={cn(
                                "flex items-center text-xs font-bold px-2 py-0.5 rounded-md border",
                                isPositive
                                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                                    : "text-red-400 bg-red-500/10 border-red-500/20"
                            )}>
                                {isPositive ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
                                {change}
                            </span>
                            <span className="text-gray-500 text-xs">vs last month</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
