"use client";

import { motion } from "framer-motion";
import { HelpCircle, X, MessageCircle } from "lucide-react";

const sessions = [
    { name: "New York", winRate: 48.8, color: "#3b82f6" },
    { name: "London", winRate: 46.5, color: "#3b82f6" },
    { name: "Asia", winRate: 34.8, color: "#3b82f6" }, // Changed color to match reference blue/purple
];

export default function SessionStats() {
    return (
        <div className="flex flex-col h-full relative bg-[#121826]/30 rounded-2xl border border-white/5 p-6">
            <h3 className="text-white font-medium text-lg relative z-10 mb-6 flex justify-between items-center">
                Session Win Rates
                <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                </div>
            </h3>

            <div className="flex flex-col gap-5">
                {sessions.map((session, i) => (
                    <div key={session.name} className="flex items-center gap-4">
                        <span className="text-xs font-bold text-gray-400 w-16 uppercase tracking-wider">{session.name}</span>

                        {/* Custom Bar */}
                        <div className="flex-1 h-2.5 bg-[#0a0f1c] rounded-full overflow-hidden relative ring-1 ring-white/5 p-[1px] flex items-center">
                            {/* Blue Progress */}
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${session.winRate}%` }}
                                transition={{ duration: 1, delay: i * 0.1 }}
                                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full relative z-10 flex items-center justify-end pr-0.5 shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                            >
                                {/* Dot indicator */}
                                <div className="w-1 h-1 bg-white rounded-full shadow-sm" />
                            </motion.div>
                        </div>

                        <span className="text-xs font-bold text-white w-10 text-right">{session.winRate}%</span>
                    </div>
                ))}
            </div>

            {/* Help Floating Button removed */}
        </div>
    );
}
