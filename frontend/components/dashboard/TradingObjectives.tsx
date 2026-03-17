"use client";

import { motion } from "framer-motion";
import { Clock, AlertCircle, Loader2, Target, Calendar, CheckCircle2, Zap, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccount } from "@/contexts/AccountContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { fetchFromBackend } from "@/lib/backend-api";
import { useState, useEffect } from "react";

interface ObjectiveRowProps {
    title: string;
    timer?: string;
    max: number;
    current: number;
    threshold: number;
    status: "Passed" | "Failed" | "Ongoing";
    isLossLimit?: boolean;
}

interface ChallengeRules {
    max_daily_loss_percent: number;
    max_total_loss_percent: number;
    profit_target_percent: number;
    min_trading_days: number;
    max_daily_loss_amount: number;
    max_total_loss_amount: number;
    profit_target_amount: number;
    // Current values from backend API
    current_daily_loss?: number;
    current_total_loss?: number;
    current_profit?: number;
    start_of_day_equity?: number;
    daily_remaining?: number;
    total_remaining?: number;
    payout_eligibility?: {
        min_profit_amount: number;
        current_profit: number;
        profit_met: boolean;
        last_payout_date: string;
        profitable_days: number;
        days_required: number;
        time_met: boolean;
        today_profit: number;
        today_goal_met: boolean;
        daily_goal: number;
    };
}

function ObjectiveRow({ title, timer, max, current, threshold, status, isLossLimit, remainingOverride }: ObjectiveRowProps & { remainingOverride?: number }) {
    const percentage = Math.min(100, Math.max(0, (current / max) * 100));

    // Use override if available, otherwise fallback to simple calc (for loading states etc)
    const remainingVal = remainingOverride !== undefined ? remainingOverride : Math.max(0, max - current);

    return (
        <div className="p-5 rounded-xl border border-white/10 bg-[#050923] hover:border-white/20 transition-all">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-sm">{title}</h3>
                    {isLossLimit && (
                        <div className="group relative">
                            <AlertCircle size={14} className="text-gray-500 cursor-help" />
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block w-48 p-2 bg-black text-white text-[10px] rounded-lg z-20 border border-white/10">
                                Breaching this limit will close your account.
                            </div>
                        </div>
                    )}
                    {timer && (
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                            <Clock size={12} /> {timer}
                        </span>
                    )}
                </div>
                <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border",
                    status === "Failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                        status === "Passed" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                            "bg-blue-500/10 text-blue-400 border-blue-500/20"
                )}>
                    {status}
                </span>
            </div>

            <div className="flex justify-between text-[11px] text-gray-500 mb-2 font-medium">
                <span>Max Allowed: ${max.toLocaleString()}</span>
                <span>Threshold: ${threshold.toLocaleString()}</span>
            </div>

            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden relative">
                {/* Progress Bar */}
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={cn(
                        "h-full rounded-full relative",
                        isLossLimit ? "bg-gradient-to-r from-red-500 to-red-600" : "bg-gradient-to-r from-green-400 to-green-600"
                    )}
                >
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-white rounded-full shadow-sm mr-1" />
                </motion.div>
            </div>

            <div className="flex justify-between mt-2">
                <span className={cn("text-xs font-bold", isLossLimit ? "text-red-400" : "text-green-400")}>
                    ${current.toLocaleString()}
                </span>
                <span className="text-xs font-bold text-white">
                    Remaining: ${remainingVal.toLocaleString()}
                </span>
            </div>
        </div>
    );
}

const RequirementItem = ({
    icon: Icon,
    title,
    current,
    target,
    isMet,
    isCurrency = true,
    suffix = ""
}: {
    icon: any;
    title: string;
    current: number;
    target: number;
    isMet: boolean;
    isCurrency?: boolean;
    suffix?: string;
}) => {
    const percentage = Math.min(100, (Math.max(0, current) / (target || 1)) * 100);
    const colorClass = isMet ? "bg-green-500" : "bg-shark-blue";
    const shadowClass = isMet ? "shadow-[0_0_12px_rgba(34,197,94,0.4)]" : "shadow-[0_0_12px_rgba(59,130,246,0.4)]";

    return (
        <div className="group/item relative p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        isMet ? "bg-green-500/10 text-green-400" : "bg-shark-blue/10 text-shark-blue"
                    )}>
                        <Icon size={16} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{title}</p>
                        <p className="text-sm font-bold text-white mt-0.5 flex items-center gap-2">
                            {isCurrency ? `$${current.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : current}
                            <span className="text-gray-500 font-normal">/</span>
                            <span className="text-gray-400 group-hover/item:text-white transition-colors">
                                {isCurrency ? `$${target.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : `${target}${suffix}`}
                            </span>
                            {isMet && (
                                <span className="flex items-center gap-1 text-[10px] text-green-400 font-black uppercase tracking-tighter bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20 ml-auto">
                                    <CheckCircle2 size={10} /> Met
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                {!isMet && target > 0 && (
                    <div className="text-[10px] font-bold text-shark-blue bg-shark-blue/10 px-2 py-0.5 rounded-full border border-shark-blue/20">
                        {Math.round(percentage)}%
                    </div>
                )}
            </div>

            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    layout
                    transition={{ duration: 0.5 }}
                    className={cn("h-full rounded-full transition-shadow duration-500", colorClass, shadowClass)}
                />
            </div>
        </div>
    );
};

const PayoutEligibilityMeter = ({ eligibility }: { eligibility: any }) => {
    if (!eligibility) return null;

    const isFullyEligible = eligibility.profit_met && eligibility.time_met;

    return (
        <div className="relative p-6 rounded-2xl border border-white/10 bg-[#050923] overflow-hidden group">
            {/* Background glow effects */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-shark-blue/10 blur-[80px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-green-500/5 blur-[80px] rounded-full pointer-events-none" />

            <div className="relative flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-shark-blue/20 to-shark-blue/5 border border-white/10 flex items-center justify-center shadow-inner">
                        <Zap className="text-shark-blue" size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-base tracking-tight">Payout Eligibility</h3>
                        <p className="text-[10px] text-gray-500 font-medium uppercase tracking-[0.2em] mt-0.5">Verification Requirements</p>
                    </div>
                    <div className="group/info relative ml-1">
                        <Info size={14} className="text-gray-500 cursor-help hover:text-white transition-colors" />
                        <div className="absolute left-0 bottom-full mb-3 hidden group-hover/info:block w-56 p-3 bg-[#0a102a] text-white text-[10px] leading-relaxed rounded-xl z-20 border border-white/10 shadow-2xl backdrop-blur-xl">
                            <p className="font-bold mb-1.5 text-shark-blue">Requirements Tracker:</p>
                            <ul className="space-y-1 text-gray-400">
                                <li className="flex items-center gap-1.5">• KYC Verification</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <motion.div
                    animate={{
                        scale: isFullyEligible ? [1, 1.05, 1] : 1
                    }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className={cn(
                        "px-4 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-widest flex items-center gap-2",
                        isFullyEligible
                            ? "bg-green-500/20 text-green-400 border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.2)]"
                            : "bg-white/5 text-gray-400 border-white/10"
                    )}
                >
                    {isFullyEligible && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                    {isFullyEligible ? "Verification Passed" : "In Progress"}
                </motion.div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RequirementItem
                    icon={Target}
                    title="Daily Target"
                    current={eligibility.today_profit || 0}
                    target={eligibility.daily_goal || 1}
                    isMet={eligibility.today_goal_met}
                />
                <RequirementItem
                    icon={Zap}
                    title="Total Profit"
                    current={eligibility.current_profit || 0}
                    target={eligibility.min_profit_amount || 1}
                    isMet={eligibility.profit_met}
                />
            </div>

            {isFullyEligible && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-transparent border border-green-500/20 flex items-center gap-4"
                >
                    <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white">Eligibility Confirmed</p>
                        <p className="text-xs text-green-400 opacity-80 mt-1">You've successfully met all performance verification criteria.</p>
                    </div>
                </motion.div>
            )}
        </div>
    );
};

interface TradingObjectivesProps {
    objectives?: any;
    account?: any;
    isPublic?: boolean;
}

export default function TradingObjectives({ objectives: initialObjectives, account, isPublic }: TradingObjectivesProps = {}) {
    const accountContext = isPublic ? null : useAccount();
    const selectedAccount = account || accountContext?.selectedAccount;
    const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
    const [resetTimer, setResetTimer] = useState("--:--:--");
    const [rules, setRules] = useState<ChallengeRules | null>(null);

    // Debug Logs
    useEffect(() => {
        if (rules) {
            console.log('[TradingObjectives] Rules Updated:', JSON.stringify(rules, null, 2));
        }
    }, [rules]);

    // Calculate time until midnight UTC (daily reset)
    useEffect(() => {
        const updateTimer = () => {
            const now = new Date();
            const midnight = new Date(now);
            midnight.setUTCHours(24, 0, 0, 0);
            const diff = midnight.getTime() - now.getTime();

            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            setResetTimer(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, []);

    // Sync with DashboardData
    useEffect(() => {
        if (initialObjectives) {
            console.log('[TradingObjectives] Using initialObjectives:', !!initialObjectives.daily_loss);
            setRules({
                max_daily_loss_percent: initialObjectives.daily_loss?.max_allowed_percent ?? 5,
                max_total_loss_percent: initialObjectives.total_loss?.max_allowed_percent ?? 10,
                profit_target_percent: initialObjectives.profit_target?.target_percent ?? 8,
                min_trading_days: 0,
                max_daily_loss_amount: initialObjectives.daily_loss?.max_allowed ?? 0,
                max_total_loss_amount: initialObjectives.total_loss?.max_allowed ?? 0,
                profit_target_amount: initialObjectives.profit_target?.target ?? 0,
                current_daily_loss: initialObjectives.daily_loss?.current ?? 0,
                current_total_loss: initialObjectives.total_loss?.current ?? 0,
                current_profit: initialObjectives.profit_target?.current ?? 0,
                start_of_day_equity: (initialObjectives.daily_loss?.threshold ?? 0) + (initialObjectives.daily_loss?.max_allowed ?? 0),
                daily_remaining: initialObjectives.daily_loss?.remaining ?? 0,
                total_remaining: initialObjectives.total_loss?.remaining ?? 0,
                payout_eligibility: initialObjectives.payout_eligibility
            });
            return;
        }

        if (dashboardData.objectives) {
            if (!dashboardData.objectives.daily_loss) {
                console.warn('[TradingObjectives] objectives found but daily_loss is missing structure! Structure:', Object.keys(dashboardData.objectives));
                return;
            }

            const data = dashboardData.objectives;
            setRules({
                max_daily_loss_percent: data.rules?.max_daily_loss_percent ?? 5,
                max_total_loss_percent: data.rules?.max_total_loss_percent ?? 10,
                profit_target_percent: data.rules?.profit_target_percent ?? 8,
                min_trading_days: 0,
                max_daily_loss_amount: data.daily_loss.max_allowed ?? 0,
                max_total_loss_amount: data.total_loss.max_allowed ?? 0,
                profit_target_amount: data.profit_target.target ?? 0,
                current_daily_loss: data.daily_loss.current ?? 0,
                current_total_loss: data.total_loss.current ?? 0,
                current_profit: data.profit_target.current ?? 0,
                start_of_day_equity: data.daily_loss.start_of_day_equity ?? 0,
                daily_remaining: data.daily_loss.remaining,
                total_remaining: data.total_loss.remaining,
                payout_eligibility: data.payout_eligibility
            });
        }
    }, [dashboardData.objectives, initialObjectives]);

    if (dashboardLoading.global && !rules) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Trading Objectives</h2>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            </div>
        );
    }

    if (!selectedAccount || !rules) {
        return (
            <div className="space-y-4">
                <h2 className="text-lg font-bold text-slate-900">Trading Objectives</h2>
                <div className="p-8 text-center text-gray-500 border border-slate-200 rounded-xl bg-slate-100">
                    Select an account to view trading objectives
                </div>
            </div>
        );
    }

    // Calculate current values based on account data
    const initialBalance = selectedAccount.initial_balance || 100000;

    // Use backend-calculated values if available, otherwise fall back to account balance
    const currentDailyLoss = (rules as any).current_daily_loss ?? 0;
    const currentTotalLoss = (rules as any).current_total_loss ?? 0;
    const currentProfit = (rules as any).current_profit ?? 0;

    // Determine status
    const getDailyLossStatus = (): "Passed" | "Failed" | "Ongoing" => {
        if (currentDailyLoss >= rules.max_daily_loss_amount) return "Failed";
        if (currentDailyLoss === 0) return "Passed";
        return "Ongoing";
    };

    const getTotalLossStatus = (): "Passed" | "Failed" | "Ongoing" => {
        if (currentTotalLoss >= rules.max_total_loss_amount) return "Failed";
        if (currentTotalLoss === 0) return "Passed";
        return "Ongoing";
    };

    const getProfitStatus = (): "Passed" | "Failed" | "Ongoing" => {
        if (rules.profit_target_amount === 0) return "Passed"; // Funded accounts have no profit target
        if (currentProfit >= rules.profit_target_amount) return "Passed";
        return "Ongoing";
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-bold text-slate-900">Trading Objectives</h2>
                    {selectedAccount && (
                        <span className="text-xs text-gray-500 font-medium">
                            {selectedAccount.account_number} • ${initialBalance.toLocaleString()}
                        </span>
                    )}
                </div>
            </div>



            <div className="grid gap-4">
                {rules.max_daily_loss_percent > 0 && (
                    <ObjectiveRow
                        title={`Maximum Daily Loss (${rules.max_daily_loss_percent}%)`}
                        timer={`Resets In: ${resetTimer}`}
                        max={rules.max_daily_loss_amount}
                        current={currentDailyLoss}
                        threshold={(rules.start_of_day_equity || initialBalance) - rules.max_daily_loss_amount}
                        status={getDailyLossStatus()}
                        isLossLimit={true}
                        remainingOverride={rules.daily_remaining}
                    />
                )}

                {rules.max_total_loss_percent > 0 && (
                    <ObjectiveRow
                        title={`Maximum Total Loss (${rules.max_total_loss_percent}%)`}
                        max={rules.max_total_loss_amount}
                        current={currentTotalLoss}
                        threshold={initialBalance - rules.max_total_loss_amount}
                        status={getTotalLossStatus()}
                        isLossLimit={true}
                        remainingOverride={rules.total_remaining}
                    />
                )}

                {rules.profit_target_amount > 0 && (
                    <ObjectiveRow
                        title={`Profit Target (${rules.profit_target_percent}%)`}
                        max={rules.profit_target_amount}
                        current={currentProfit}
                        threshold={initialBalance + rules.profit_target_amount}
                        status={getProfitStatus()}
                        isLossLimit={false}
                    />
                )}

                {rules.payout_eligibility && (
                    <PayoutEligibilityMeter eligibility={rules.payout_eligibility} />
                )}
            </div>
        </div>
    );
}
