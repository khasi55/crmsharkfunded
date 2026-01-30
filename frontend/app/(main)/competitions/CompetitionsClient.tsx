"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Calendar, Users, DollarSign, Clock, BarChart2, Tag, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from 'next/link';
import { fetchFromBackend } from "@/lib/backend-api";

interface Competition {
    id: string;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    entry_fee: number;
    prize_pool: number;
    max_participants: number | null;
    status: string;
    participant_count?: number;
    joined?: boolean;
    platform?: string;
    image_url?: string;
}

export default function CompetitionsClient() {
    const [competitions, setCompetitions] = useState<Competition[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCompetitions();
    }, []);

    const fetchCompetitions = async () => {
        try {
            const { createClient } = await import("@/utils/supabase/client");
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            let endpoint = '/api/competitions';
            if (user) {
                endpoint += `?userId=${user.id}`;
            }

            const data = await fetchFromBackend(endpoint);
            setCompetitions(data);
        } catch (error) {
            console.error("Failed to fetch competitions:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading competitions...</div>;
    }

    const activeCompetitions = competitions.filter(c => c.status === 'active' || c.status === 'upcoming');
    const featuredCompetition = activeCompetitions[0];
    const otherCompetitions = activeCompetitions.slice(1);
    const endedCompetitions = competitions.filter(c => c.status === 'ended' || c.status === 'completed');

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8 sm:space-y-12 max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            {/* <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Competitions</h1>
                <p className="text-slate-500">Compete with other traders and win prizes.</p>
            </div> */}

            {/* Featured Hero Card */}
            {featuredCompetition && (
                <div className="relative bg-[#EEF2FF] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 overflow-hidden shadow-sm border border-slate-200">
                    <div className="relative z-10 max-w-2xl space-y-4 sm:space-y-6">
                        <div className="text-xs sm:text-sm font-semibold text-slate-500 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            Monthly Competition
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight">
                            {featuredCompetition.title}
                        </h2>

                        <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-slate-600 text-xs sm:text-sm font-medium">
                            <div className="flex items-center gap-2">
                                <span className={cn(
                                    "w-2 h-2 rounded-full",
                                    featuredCompetition.status === 'active' ? 'bg-green-500' : 'bg-blue-500'
                                )}></span>
                                {featuredCompetition.status === 'active' ? 'Ongoing' : 'Upcoming'}
                            </div>
                            <div className="flex items-center gap-2 uppercase">
                                {featuredCompetition.platform || 'MetaTrader 5'}
                            </div>
                            <div className="flex items-center gap-2">
                                <Users size={12} className="text-slate-400 sm:w-[14px] sm:h-[14px]" />
                                {featuredCompetition.participant_count || 0} Participants
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 pt-2 sm:pt-4">
                            <div>
                                <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold mb-1">Starts</div>
                                <div className="font-bold text-slate-900 text-sm sm:text-base md:text-lg">
                                    {new Date(featuredCompetition.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                            <div>
                                <div className="text-[10px] sm:text-xs text-slate-400 uppercase font-semibold mb-1">Ends</div>
                                <div className="font-bold text-slate-900 text-sm sm:text-base md:text-lg">
                                    {new Date(featuredCompetition.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </div>
                            </div>
                            {/* Countdown could go here */}
                        </div>

                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 pt-2 sm:pt-4">
                            <Link href={`/competitions/${featuredCompetition.id}`} className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 bg-blue-600 active:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/20 transition-all active:scale-95 touch-manipulation text-center text-sm sm:text-base">
                                View Competition
                            </Link>

                            <button className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-slate-600 font-semibold active:text-slate-900 transition-colors text-sm sm:text-base">
                                Show Prizepool
                            </button>
                        </div>
                    </div>

                    {/* 3D Asset / Image */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1/2 sm:w-1/3 md:w-1/2 h-full flex items-center justify-center pointer-events-none opacity-10 sm:opacity-20 md:opacity-100">
                        {/* Placeholder for 3D Trophy */}
                        {featuredCompetition.image_url ? (
                            <img src={featuredCompetition.image_url} alt="Competition Trophy" className="object-contain h-full max-h-[200px] sm:max-h-[300px] md:max-h-[400px]" />
                        ) : (
                            <Trophy className="w-32 h-32 sm:w-48 sm:h-48 md:w-64 md:h-64 text-blue-200" strokeWidth={0.5} />
                        )}
                    </div>
                </div>
            )}


            {/* Filter Tabs - Scrollable on mobile */}
            <div className="flex items-center gap-4 sm:gap-8 border-b border-slate-200 pb-2 text-xs sm:text-sm font-medium text-slate-500 overflow-x-auto">
                <button className="text-slate-900 border-b-2 border-blue-600 pb-2 -mb-2.5 whitespace-nowrap">Joined</button>
                <button className="active:text-slate-700 pb-2 whitespace-nowrap">Championships</button>
                <button className="active:text-slate-700 pb-2 whitespace-nowrap">Hosted</button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[...otherCompetitions, ...endedCompetitions].map((comp) => (
                    <div key={comp.id} className="bg-white rounded-xl sm:rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm active:shadow-md transition-shadow relative overflow-hidden group">
                        {/* Countdown Badge */}
                        <div className="inline-block bg-slate-100 text-slate-600 text-[10px] sm:text-xs font-mono py-1 px-2 rounded-md mb-3 sm:mb-4 font-medium">
                            {/* Mock Countdown */}
                            00:00:00:00
                        </div>

                        <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4 group-active:text-blue-600 transition-colors">
                            {comp.title}
                        </h3>

                        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-medium text-slate-500 mb-4 sm:mb-6">
                            <div className="flex items-center gap-1.5">
                                <span className={cn(
                                    "w-1.5 h-1.5 rounded-full",
                                    comp.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                )}></span>
                                {comp.status === 'active' ? 'Ongoing' : 'Ended'}
                            </div>
                            {comp.joined && (
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    Joined
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <Tag size={10} className="sm:w-3 sm:h-3" />
                                {comp.entry_fee > 0 ? 'Paid' : 'Free'}
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Users size={10} className="sm:w-3 sm:h-3" />
                                {(comp.participant_count || 0).toLocaleString()}
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-auto">
                            <div className="flex gap-2 text-xs sm:text-sm text-slate-600">
                                {comp.platform || 'MetaTrader 5'}
                            </div>
                            <Link href={`/competitions/${comp.id}`} className={cn(
                                "px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors touch-manipulation",
                                comp.joined
                                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100"
                                    : "bg-blue-600 active:bg-blue-700 text-white"
                            )}>
                                {comp.joined ? 'Participating' : 'View'}
                            </Link>
                        </div>
                    </div>
                ))}
                {competitions.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center">
                        <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No competitions found.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
