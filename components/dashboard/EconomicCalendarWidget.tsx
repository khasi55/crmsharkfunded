"use client";

import { cn } from "@/lib/utils";
import { CalendarDays, Filter } from "lucide-react";

interface EconomicEvent {
    time: string;
    currency: string;
    event: string;
    impact: "High" | "Medium" | "Low";
}

const events: EconomicEvent[] = [
    { time: "08:30", currency: "USD", event: "Non-Farm Playing Rolls (NFP)", impact: "High" },
    { time: "09:00", currency: "EUR", event: "ECB President Lagarde Speaks", impact: "High" },
    { time: "10:30", currency: "GBP", event: "GDP Monthly Month/Month", impact: "Medium" },
    { time: "14:00", currency: "CAD", event: "Ivey PMI", impact: "Medium" },
    { time: "16:00", currency: "JPY", event: "Trade Balance", impact: "Low" },
];

export default function EconomicCalendarWidget() {
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-4 px-1">
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                    <CalendarDays className="text-blue-500" size={18} />
                    Economic Calendar
                </h2>
                <div className="text-xs font-medium text-gray-500">Today</div>
            </div>

            <div className="bg-gray-900 border border-white/10 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-white/5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                            <th className="px-5 py-3">Time</th>
                            <th className="px-5 py-3">Cur</th>
                            <th className="px-5 py-3 w-full">Event</th>
                            <th className="px-5 py-3 text-right">Impact</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {events.map((item, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors group">
                                <td className="px-5 py-3 text-xs font-mono text-gray-400 group-hover:text-white transition-colors">{item.time}</td>
                                <td className="px-5 py-3">
                                    <span className="text-[10px] font-bold text-gray-300 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                                        {item.currency}
                                    </span>
                                </td>
                                <td className="px-5 py-3">
                                    <p className="font-bold text-xs text-white truncate max-w-[200px]">{item.event}</p>
                                </td>
                                <td className="px-5 py-3 text-right">
                                    <span className={cn(
                                        "inline-block px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide min-w-[50px] text-center",
                                        item.impact === "High" ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                                            item.impact === "Medium" ? "bg-orange-500/10 text-orange-400 border border-orange-500/20" :
                                                "bg-green-500/10 text-green-400 border border-green-500/20"
                                    )}>
                                        {item.impact}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {events.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-5 py-8 text-center text-xs text-gray-500">
                                    No economic events scheduled for today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
