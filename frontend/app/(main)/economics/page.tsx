"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Filter, CalendarDays, ChevronLeft, ChevronRight, Search, Globe, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Mock Data ---
interface EconomicEvent {
    id: string;
    time: string;
    currency: string;
    event: string;
    impact: "High" | "Medium" | "Low";
    forecast: string;
    previous: string;
    actual?: string;
}

const ALL_EVENTS: EconomicEvent[] = [
    { id: "1", time: "08:30", currency: "USD", event: "Non-Farm Payrolls (NFP)", impact: "High", forecast: "180K", previous: "150K", actual: "185K" },
    { id: "2", time: "09:00", currency: "EUR", event: "ECB President Lagarde Speaks", impact: "High", forecast: "-", previous: "-" },
    { id: "3", time: "10:30", currency: "GBP", event: "GDP Monthly Month/Month", impact: "Medium", forecast: "0.2%", previous: "0.1%" },
    { id: "4", time: "14:00", currency: "CAD", event: "Ivey PMI", impact: "Medium", forecast: "55.2", previous: "53.1" },
    { id: "5", time: "15:00", currency: "USD", event: "ISM Services PMI", impact: "High", forecast: "52.0", previous: "51.8" },
    { id: "6", time: "16:00", currency: "JPY", event: "Trade Balance", impact: "Low", forecast: "-0.5T", previous: "-0.4T" },
    { id: "7", time: "17:30", currency: "AUD", event: "RBA Meeting Minutes", impact: "Medium", forecast: "-", previous: "-" },
];

const IMPACT_COLORS = {
    High: "text-red-500 bg-red-500/10 border-red-500/20",
    Medium: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    Low: "text-green-500 bg-green-500/10 border-green-500/20",
};

const TAB_OPTIONS = ["Today", "Tomorrow", "This Week", "Next Week"];

export default function EconomicsPage() {
    const [selectedTab, setSelectedTab] = useState("Today");
    const [selectedImpacts, setSelectedImpacts] = useState<string[]>(["High", "Medium", "Low"]);
    const [searchQuery, setSearchQuery] = useState("");

    const toggleImpact = (impact: string) => {
        if (selectedImpacts.includes(impact)) {
            setSelectedImpacts(selectedImpacts.filter(i => i !== impact));
        } else {
            setSelectedImpacts([...selectedImpacts, impact]);
        }
    };

    const filteredEvents = ALL_EVENTS.filter(ev => {
        const matchesSearch = ev.event.toLowerCase().includes(searchQuery.toLowerCase()) || ev.currency.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesImpact = selectedImpacts.includes(ev.impact);
        return matchesSearch && matchesImpact;
    });

    return (
        <div className="min-h-screen bg-transparent text-slate-900 p-6 md:p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* HEADLINE */}
                <div className="flex flex-col md:flex-row justify-between items-end gap-6 pb-6 border-b border-white/5">
                    <div>
                        <h1 className="text-3xl font-black text-black flex items-center gap-3 tracking-tight mb-2">
                            <Globe className="text-blue-600 drop-shadow-[0_0_15px_rgba(37,99,235,0.2)]" size={32} />
                            Economic Calendar
                        </h1>
                        <p className="text-slate-500 font-medium">Track global market-moving events in real-time.</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative group w-full md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-[#00E5FF] transition-colors" />
                            <input
                                type="text"
                                placeholder="Search events or currency..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#00E5FF] transition-all placeholder:text-gray-600 shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                {/* CONTROLS */}
                <div className="flex flex-col lg:flex-row gap-6 justify-between items-start lg:items-center">

                    {/* Date Navigation */}
                    <div className="flex bg-[#0a0f1c] p-1 rounded-xl border border-white/5">
                        {TAB_OPTIONS.map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setSelectedTab(tab)}
                                className={cn(
                                    "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                                    selectedTab === tab
                                        ? "bg-[#00E5FF]/10 text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.1)]"
                                        : "text-gray-400 hover:text-white"
                                )}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>

                    {/* Impact Filter */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest mr-2">Impact:</span>
                        {["High", "Medium", "Low"].map(impact => (
                            <button
                                key={impact}
                                onClick={() => toggleImpact(impact)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg border text-xs font-bold uppercase transition-all flex items-center gap-2",
                                    selectedImpacts.includes(impact)
                                        ? IMPACT_COLORS[impact as keyof typeof IMPACT_COLORS]
                                        : "border-white/5 bg-transparent text-gray-500 hover:border-white/20"
                                )}
                            >
                                <div className={cn("w-2 h-2 rounded-full",
                                    selectedImpacts.includes(impact) ? "bg-current" : "bg-gray-600"
                                )} />
                                {impact}
                            </button>
                        ))}
                    </div>
                </div>

                {/* EVENTS TABLE */}
                <div className="bg-[#0a0f1c] rounded-2xl overflow-hidden shadow-2xl border border-white/5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#0a0f1c] text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-white/5">
                                    <th className="px-6 py-4 w-24">Time</th>
                                    <th className="px-6 py-4 w-20">Cur</th>
                                    <th className="px-6 py-4 w-24 text-center">Impact</th>
                                    <th className="px-6 py-4">Event</th>
                                    <th className="px-6 py-4 text-right w-32">Actual</th>
                                    <th className="px-6 py-4 text-right w-32">Forecast</th>
                                    <th className="px-6 py-4 text-right w-32">Previous</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 bg-[#0a0f1c]">
                                <AnimatePresence initial={false}>
                                    {filteredEvents.map((item) => (
                                        <motion.tr
                                            key={item.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            className="group hover:bg-white/5 transition-colors cursor-default"
                                        >
                                            <td className="px-6 py-4 font-mono text-xs text-white font-medium">
                                                {item.time}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-block px-1.5 py-0.5 rounded-[4px] bg-black text-[10px] font-bold text-white shadow-sm min-w-[32px] text-center">
                                                    {item.currency}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center">
                                                    <span className={cn(
                                                        "px-3 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wide min-w-[60px] text-center shadow-sm",
                                                        item.impact === 'High' ? "bg-[#f23d4f] text-white" :
                                                            item.impact === 'Medium' ? "bg-[#ff9000] text-white" :
                                                                "bg-[#22c55e] text-white"
                                                    )}>
                                                        {item.impact}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-bold text-white mb-0.5">{item.event}</p>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {item.actual ? (
                                                    <span className="text-sm font-bold text-cyan-300">{item.actual}</span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-300 font-medium">{item.forecast}</td>
                                            <td className="px-6 py-4 text-right text-sm text-gray-400 font-medium">{item.previous}</td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                                {filteredEvents.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                                            <div className="flex flex-col items-center justify-center gap-2">
                                                <AlertTriangle size={24} className="opacity-50" />
                                                <p className="text-sm font-medium">No events found matching your criteria.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* DISCLAIMER */}
                <p className="text-center text-xs text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    Financial calendar data is provided for informational purposes only. Shark Funded does not guarantee the accuracy of this data.
                    Trading during high-impact news events carries significant risk.
                </p>
            </div>
        </div>
    );
}
