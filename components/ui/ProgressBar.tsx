"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
    value: number; // 0 to 100
    max?: number;
    label?: string;
    subLabel?: string;
    color?: "blue" | "green" | "red" | "orange";
    showValue?: boolean;
}

export default function ProgressBar({ value, max = 100, label, subLabel, color = "blue", showValue = true }: ProgressBarProps) {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

    const colorStyles = {
        blue: "bg-shark-blue",
        green: "bg-green-500",
        red: "bg-red-500",
        orange: "bg-orange-500",
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-end mb-2">
                <div>
                    {label && <p className="font-medium text-sm text-text-primary">{label}</p>}
                    {subLabel && <p className="text-xs text-text-secondary mt-0.5">{subLabel}</p>}
                </div>
                {showValue && (
                    <div className="text-right">
                        <span className="font-bold text-text-primary">{value}</span>
                        <span className="text-text-secondary text-xs ml-1">/ {max}</span>
                    </div>
                )}
            </div>
            <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn("h-full rounded-full", colorStyles[color])}
                />
            </div>
        </div>
    );
}
