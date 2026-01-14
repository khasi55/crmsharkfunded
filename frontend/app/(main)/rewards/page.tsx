"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Star, Trophy, Crown, Zap, Award, TrendingUp, CheckCircle, DollarSign, Users } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface LoyaltyTier {
    name: string;
    minPoints: number;
    maxPoints: number;
    icon: any;
    color: string;
    bgColor: string;
    benefits: string[];
}

const tiers: LoyaltyTier[] = [
    {
        name: "Bronze",
        minPoints: 0,
        maxPoints: 999,
        icon: Award,
        color: "text-amber-500",
        bgColor: "bg-amber-500/10",
        benefits: ["5% discount on challenges", "Email support", "Basic trading resources"],
    },
    {
        name: "Silver",
        minPoints: 1000,
        maxPoints: 4999,
        icon: Star,
        color: "text-gray-300",
        bgColor: "bg-gray-400/10",
        benefits: ["10% discount on challenges", "Priority email support", "Exclusive webinars", "Basic trading analytics"],
    },
    {
        name: "Gold",
        minPoints: 5000,
        maxPoints: 9999,
        icon: Trophy,
        color: "text-yellow-400",
        bgColor: "bg-yellow-500/10",
        benefits: ["15% discount on challenges", "24/7 chat support", "Personal account manager", "Advanced analytics", "1 free challenge reset"],
    },
    {
        name: "Platinum",
        minPoints: 10000,
        maxPoints: Infinity,
        icon: Crown,
        color: "text-purple-400",
        bgColor: "bg-purple-500/10",
        benefits: ["20% discount on challenges", "VIP priority support", "Dedicated success manager", "Premium analytics suite", "2 free challenge resets", "Exclusive VIP events"],
    },
];

export default function RewardsPage() {
    const [currentPoints, setCurrentPoints] = useState(1250);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 500);
        return () => clearTimeout(timer);
    }, []);

    const currentTier = tiers.find(t => currentPoints >= t.minPoints && currentPoints <= t.maxPoints) || tiers[0];
    const currentTierIndex = tiers.findIndex(t => t.name === currentTier.name);
    const nextTier = currentTierIndex < tiers.length - 1 ? tiers[currentTierIndex + 1] : null;

    const progressToNextTier = nextTier
        ? ((currentPoints - currentTier.minPoints) / (nextTier.minPoints - currentTier.minPoints)) * 100
        : 100;

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    const CurrentTierIcon = currentTier.icon;

    return (
        <div className="p-4 md:p-8 max-w-[1920px] mx-auto min-h-full">
            <div className="max-w-6xl mx-auto">

                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8"
                >
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">Loyalty Rewards</h1>
                    <p className="text-slate-500 font-medium">Earn points and unlock exclusive benefits</p>
                </motion.div>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className={`p-3 ${currentTier.bgColor} rounded-xl`}>
                                <CurrentTierIcon size={24} className={currentTier.color} />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Current Tier</p>
                                <p className="text-xl font-bold text-slate-900">{currentTier.name}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-50 rounded-xl">
                                <Zap size={24} className="text-blue-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Your Points</p>
                                <p className="text-xl font-bold text-slate-900">{currentPoints.toLocaleString()}</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-green-50 rounded-xl">
                                <TrendingUp size={24} className="text-green-600" />
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Next Tier In</p>
                                <p className="text-xl font-bold text-slate-900">
                                    {nextTier ? `${(nextTier.minPoints - currentPoints).toLocaleString()} pts` : 'Max Level'}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Progress Bar */}
                {nextTier && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-8"
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <CurrentTierIcon size={18} className={currentTier.color} />
                                <span className="font-bold text-slate-900">{currentTier.name}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900">{nextTier.name}</span>
                                <nextTier.icon size={18} className={nextTier.color} />
                            </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(progressToNextTier, 100)}%` }}
                                transition={{ duration: 1, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                            />
                        </div>
                        <p className="text-sm text-slate-500 mt-2 text-center font-medium">
                            {currentPoints.toLocaleString()} / {nextTier.minPoints.toLocaleString()} points
                        </p>
                    </motion.div>
                )}

                {/* How to Earn */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-8"
                >
                    <h2 className="text-xl font-bold text-slate-900 mb-4">How to Earn Points</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2 bg-blue-50 rounded-lg w-fit mb-3">
                                <DollarSign size={20} className="text-blue-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">Trade Profits</h3>
                            <p className="text-2xl font-bold text-blue-600">+10 pts</p>
                            <p className="text-sm text-slate-500 font-medium">per profitable trade</p>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2 bg-green-50 rounded-lg w-fit mb-3">
                                <Trophy size={20} className="text-green-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">Pass Challenge</h3>
                            <p className="text-2xl font-bold text-green-600">+500 pts</p>
                            <p className="text-sm text-slate-500 font-medium">per challenge passed</p>
                        </div>

                        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="p-2 bg-purple-50 rounded-lg w-fit mb-3">
                                <Users size={20} className="text-purple-600" />
                            </div>
                            <h3 className="font-bold text-slate-900 mb-1">Referrals</h3>
                            <p className="text-2xl font-bold text-purple-600">+1000 pts</p>
                            <p className="text-sm text-slate-500 font-medium">per successful referral</p>
                        </div>
                    </div>
                </motion.div>

                {/* All Tiers */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <h2 className="text-xl font-bold text-slate-900 mb-4">Membership Tiers</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {tiers.map((tier, index) => {
                            const TierIcon = tier.icon;
                            const isCurrentTier = tier.name === currentTier.name;

                            return (
                                <motion.div
                                    key={tier.name}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.7 + index * 0.1 }}
                                    className={`bg-white rounded-xl p-5 border shadow-sm transition-all ${isCurrentTier ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'
                                        } relative`}
                                >
                                    {isCurrentTier && (
                                        <div className="absolute top-3 right-3 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-xs font-bold text-blue-600">
                                            CURRENT
                                        </div>
                                    )}

                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`p-3 ${tier.bgColor} rounded-xl`}>
                                            <TierIcon size={22} className={tier.color} />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
                                            <p className="text-xs text-slate-500 font-medium">
                                                {tier.maxPoints === Infinity
                                                    ? `${tier.minPoints.toLocaleString()}+ points`
                                                    : `${tier.minPoints.toLocaleString()} - ${tier.maxPoints.toLocaleString()} points`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {tier.benefits.map((benefit, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                                                <p className="text-sm text-slate-600 font-medium">{benefit}</p>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
