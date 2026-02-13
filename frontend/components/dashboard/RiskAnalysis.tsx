"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle, RefreshCw, Scale, ShieldAlert, Newspaper, Zap, ChevronDown, AlertTriangle, ShieldCheck, Loader2, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "@/contexts/AccountContext";
import { useDashboardData } from "@/contexts/DashboardDataContext";
import { fetchFromBackend } from "@/lib/backend-api";

interface BreachDetail {
    ticket: string;
    symbol: string;
    time: string;
    reason: string;
}

interface RiskRule {
    key: string;
    label: string;
    description: string;
    icon: any;
    violationTypes: string[]; // Maps to violation_type in DB
}

interface RiskItemProps {
    label: string;
    description: string;
    status: "Passed" | "Failed";
    icon: any;
    breaches?: BreachDetail[];
}

// Define risk rules with their corresponding violation types from the database
const RISK_RULES: RiskRule[] = [
    { key: "martingale", label: "Martingale", description: "Monitoring for progressive betting patterns.", icon: RefreshCw, violationTypes: ["martingale", "revenge_trading"] },
    { key: "arbitrage", label: "Arbitrage", description: "Latency arbitrage and error detection.", icon: Scale, violationTypes: ["arbitrage", "latency"] },
    { key: "hedging", label: "Hedging", description: "Correlation and opposing position checks.", icon: ShieldAlert, violationTypes: ["hedging", "copy_trading"] },
    { key: "news_trading", label: "News Trading", description: "Trading activity during high-impact events.", icon: Newspaper, violationTypes: ["news_trading"] },
    { key: "tick_scalping", label: "Tick Scalping", description: "Minimum trade duration verification.", icon: Zap, violationTypes: ["tick_scalping", "min_duration"] },
];

function RiskItem({ label, description, status, icon: Icon, breaches }: RiskItemProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isPassed = status === "Passed";
    const hasBreaches = !isPassed && breaches && breaches.length > 0;

    return (
        <div className="relative group">
            <div
                className={cn(
                    "flex flex-col h-full bg-[#050923] border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all",
                    hasBreaches ? "cursor-pointer hover:bg-[#050923]/80" : "cursor-default"
                )}
                onClick={() => hasBreaches && setIsExpanded(!isExpanded)}
            >
                {/* Header */}
                <div className="flex justify-end items-start mb-2 h-6">
                    {hasBreaches && (
                        <button className="text-gray-500 hover:text-white transition-colors">
                            <ChevronDown size={18} className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col justify-end">
                    <h4 className="text-lg font-bold text-white mb-1">{label}</h4>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed mb-4 min-h-[32px]">
                        {description}
                    </p>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                        <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Status</span>
                        <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold",
                            isPassed ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                        )}>
                            {status.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && hasBreaches && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-full left-0 right-0 mt-2 z-20"
                    >
                        <div className="bg-[#050923] border border-red-500/20 rounded-xl shadow-2xl overflow-hidden p-4">
                            <h5 className="text-xs font-bold text-red-400 mb-3 flex items-center gap-2">
                                <AlertTriangle size={12} />
                                VIOLATIONS ({breaches.length})
                            </h5>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {breaches.map((breach, idx) => (
                                    <div key={idx} className="bg-red-500/5 rounded-lg p-2 text-xs border border-red-500/10">
                                        <div className="flex justify-between mb-1">
                                            <span className="font-bold text-white">{breach.symbol}</span>
                                            <span className="font-mono text-gray-400">#{breach.ticket}</span>
                                        </div>
                                        <div className="text-red-300 mb-1">{breach.reason}</div>
                                        <div className="text-gray-500 text-[10px] text-right">{breach.time}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

interface ViolationData {
    [key: string]: BreachDetail[];
}

interface RiskAnalysisProps {
    account?: any;
    data?: { violations: any[] };
    isPublic?: boolean;
}

export default function RiskAnalysis({ account: initialAccount, data: initialData, isPublic }: RiskAnalysisProps = {}) {
    const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
    const { selectedAccount } = useAccount();
    const [violations, setViolations] = useState<ViolationData>({});
    const loading = dashboardLoading.global;
    const [lastUpdate, setLastUpdate] = useState<Date | null>(initialData ? new Date() : null);

    useEffect(() => {
        if (isPublic && initialData) {
            processViolations(initialData.violations);
            return;
        }

        if (dashboardData.risk) {
            processViolations(dashboardData.risk.violations);
            setLastUpdate(new Date());
        }
    }, [dashboardData.risk, initialData, isPublic]);

    const processViolations = (violationList: any[]) => {
        const grouped: ViolationData = {};
        RISK_RULES.forEach(rule => {
            grouped[rule.key] = [];
        });

        if (!violationList || !Array.isArray(violationList)) {
            setViolations(grouped);
            return;
        }

        violationList.forEach((violation: any) => {
            const rule = RISK_RULES.find(r =>
                r.violationTypes.includes(violation.violation_type)
            );

            if (rule) {
                grouped[rule.key].push({
                    ticket: violation.trade_ticket || 'N/A',
                    symbol: violation.symbol || 'Unknown',
                    time: new Date(violation.created_at).toLocaleString(),
                    reason: violation.description || violation.violation_type,
                });
            }
        });

        setViolations(grouped);
    };

    const fetchViolations = async () => {
        // No longer needed independently
    };

    if (loading && !dashboardData.risk) {
        return (
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck size={24} className="text-blue-600" />
                        Risk Analysis
                    </h2>
                </div>
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
            </div>
        );
    }

    if (!selectedAccount) {
        return (
            <div className="w-full">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck size={24} className="text-blue-600" />
                        Risk Analysis
                    </h2>
                </div>
                <div className="p-8 text-center text-gray-500 border border-white/10 rounded-xl bg-[#050923]">
                    Select an account to view risk analysis
                </div>
            </div>
        );
    }

    // Check if any violations exist
    const hasAnyViolations = Object.values(violations).some(v => v.length > 0);

    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <ShieldCheck size={24} className="text-blue-600" />
                        Risk Analysis
                    </h2>
                    <span className="text-xs text-gray-500">
                        {selectedAccount.account_number}
                    </span>
                </div>
                <div className="flex items-center gap-3">
                    {lastUpdate && (
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock size={10} />
                            Updated: {lastUpdate.toLocaleTimeString()}
                        </span>
                    )}
                    <div className={cn(
                        "flex items-center gap-2 px-3 py-1 rounded-full border",
                        hasAnyViolations
                            ? "bg-red-500/10 border-red-500/20"
                            : "bg-green-500/10 border-green-500/20"
                    )}>
                        <div className={cn(
                            "w-2 h-2 rounded-full animate-pulse",
                            hasAnyViolations ? "bg-red-500" : "bg-green-500"
                        )} />
                        <span className={cn(
                            "text-xs font-bold uppercase tracking-wide",
                            hasAnyViolations ? "text-red-400" : "text-green-400"
                        )}>
                            {hasAnyViolations ? `${Object.values(violations).flat().length} Violations` : "All Clear"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
                {RISK_RULES.map(rule => {
                    const ruleViolations = violations[rule.key] || [];
                    const hasFailed = ruleViolations.length > 0;

                    return (
                        <RiskItem
                            key={rule.key}
                            label={rule.label}
                            description={rule.description}
                            status={hasFailed ? "Failed" : "Passed"}
                            icon={rule.icon}
                            breaches={hasFailed ? ruleViolations : undefined}
                        />
                    );
                })}
            </div>
        </div>
    );
}

