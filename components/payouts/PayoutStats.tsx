import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";

interface PayoutStatsProps {
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    trend?: {
        value: string;
        isPositive: boolean;
    };
    secondaryValue?: string;
}

export default function PayoutStats({ title, value, description, icon: Icon, trend, secondaryValue }: PayoutStatsProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#050923] rounded-xl p-6 border border-white/10 hover:border-shark-blue/50 transition-colors duration-200"
        >
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br transition-all duration-300 shadow-lg ${title.includes("Available") ? "from-green-500/20 to-emerald-500/10 text-green-400 border border-green-500/20" :
                    title.includes("Total") ? "from-blue-500/20 to-indigo-500/10 text-blue-400 border border-blue-500/20" :
                        "from-amber-500/20 to-orange-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                    <Icon size={24} />
                </div>
                {trend && (
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${trend.isPositive ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
                        }`}>
                        {trend.isPositive ? "+" : ""}{trend.value}
                    </span>
                )}
            </div>

            <h3 className="text-gray-400 text-sm font-semibold mb-1 uppercase tracking-wider">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
                {secondaryValue && (
                    <span className="text-sm font-medium text-gray-500 ml-1">{secondaryValue}</span>
                )}
            </div>
            <p className="text-gray-300 font-medium text-xs mt-2 opacity-80">{description}</p>
        </motion.div>
    );
}
