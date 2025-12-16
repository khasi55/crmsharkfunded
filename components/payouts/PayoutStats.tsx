import { motion } from "framer-motion";
import { DivideIcon as LucideIcon } from "lucide-react";

interface PayoutStatsProps {
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    trend?: {
        value: string;
        isPositive: boolean;
    };
}

export default function PayoutStats({ title, value, description, icon: Icon, trend }: PayoutStatsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-xl p-6 border border-white/10 hover:border-shark-blue/50 transition-colors duration-200"
        >
            <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-white/5 rounded-lg text-shark-blue">
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className={`text-xs font-semibold px-2 py-1 rounded-md ${trend.isPositive ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                        }`}>
                        {trend.isPositive ? "+" : ""}{trend.value}
                    </span>
                )}
            </div>

            <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold text-white tracking-tight">{value}</span>
            </div>
            <p className="text-gray-500 text-xs mt-2">{description}</p>
        </motion.div>
    );
}
