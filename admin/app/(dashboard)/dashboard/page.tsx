export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createAdminClient } from "@/utils/supabase/admin";
import Link from "next/link";
import { Users, FileText, CreditCard, DollarSign, TrendingUp, AlertCircle, ChevronRight, AlertTriangle } from "lucide-react";
import { FinancialChart } from "@/components/admin/FinancialChart";

async function fetchAllRows(supabase: any, table: string, selectFields: string, queryModifier?: (q: any) => any) {
    let allData: any[] = [];
    let start = 0;
    const limit = 1000;

    while (true) {
        let q = supabase.from(table).select(selectFields).range(start, start + limit - 1);
        if (queryModifier) q = queryModifier(q);
        const { data, error } = await q;
        if (error) {
            console.error(`Error fetching ${table}:`, error);
            break;
        }
        if (!data || data.length === 0) break;
        allData = allData.concat(data);
        if (data.length < limit) break;
        start += limit;
    }
    return { data: allData };
}

async function getStats() {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // 1. Fetch Counts & Amounts
    const [
        { count: usersCount },
        { count: kycCount },
        { count: payoutsCount },
        { count: violationsCount }
    ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("kyc_sessions").select("*", { count: "exact", head: true }).in("status", ["pending", "requires_review"]),
        supabase.from("payout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("advanced_risk_flags").select("*", { count: "exact", head: true }) // Count all violations
    ]);

    // 1.5 Fetch Paginated Data Sets
    const [
        { data: paidOrders },
        { data: allChallenges },
        { data: processedPayouts },
        { data: pendingUpgrades }, // Accounts waiting for upgrade
    ] = await Promise.all([
        fetchAllRows(supabase, "payment_orders", "amount, created_at, payment_gateway", q => q.eq("status", "paid")),
        fetchAllRows(supabase, "challenges", "challenge_type, status, upgraded_to"),
        fetchAllRows(supabase, "payout_requests", "amount, processed_at, created_at", q => q.in("status", ["approved", "processed"])),
        fetchAllRows(supabase, "challenges", "id, challenge_type, status", q => q.eq("status", "passed"))
    ]);

    // 2. Calculate Revenue
    const totalRevenue = paidOrders?.reduce((sum, order) => sum + (Number(order.amount) || 0), 0) || 0;

    // 2.5 Calculate Revenue by Gateway
    const revenueByGateway: Record<string, number> = {};
    paidOrders?.forEach(order => {
        const gateway = order.payment_gateway || 'Other';
        const displayGateway = gateway.charAt(0).toUpperCase() + gateway.slice(1);
        revenueByGateway[displayGateway] = (revenueByGateway[displayGateway] || 0) + (Number(order.amount) || 0);
    });

    // 3. Calculate Account Categories
    let phase1Count = 0;
    let phase2Count = 0;
    let liveCount = 0;
    let instantCount = 0;
    let breachedCount = 0;

    allChallenges?.forEach(c => {
        const type = (c.challenge_type || '').toLowerCase();
        const status = (c.status || '').toLowerCase();
        const upgradedTo = c.upgraded_to;

        // If breached/failed/disabled/upgraded OR has been upgraded to a new account, count in breached category
        if (status === 'breached' || status === 'failed' || status === 'disabled' || status === 'upgraded' || !!upgradedTo) {
            breachedCount++;
            return; // Skip type categorization for stopped accounts
        }

        // Regular type categorization (only for non-breached accounts)
        if (type.includes('instant')) {
            instantCount++;
        } else if (type.includes('funded') || type.includes('master') || type.includes('live')) {
            liveCount++;
        } else if (type.includes('phase 2') || type.includes('phase_2') || type.includes('step 2') || type.includes('step_2')) {
            phase2Count++;
        } else if (type.includes('phase 1') || type.includes('phase_1') || type.includes('step 1') || type.includes('step_1') || type.includes('evaluation')) {
            phase1Count++;
        } else {
            // Default to Phase 1 for anything else that isn't clearly categorized
            phase1Count++;
        }
    });

    // 4. Detailed Financial Metrics (Daily, Weekly, Monthly, Yearly)
    const now = new Date();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;
    const oneYear = 365 * oneDay;

    // Calculate Start of Day in IST (UTC+5:30)
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const getISTDate = (date: Date) => new Date(date.getTime() + IST_OFFSET);

    const getISTStartOfDay = () => {
        const istTime = getISTDate(new Date());
        istTime.setUTCHours(0, 0, 0, 0);
        return new Date(istTime.getTime() - IST_OFFSET);
    };
    const startOfDayIST = getISTStartOfDay();

    const sumByPeriod = (items: any[], dateField: string, amountField: string = 'amount') => {
        const stats = { daily: 0, weekly: 0, monthly: 0, yearly: 0, total: 0 };

        items?.forEach(item => {
            const date = new Date(item[dateField] || item.created_at || now);
            const diff = now.getTime() - date.getTime();
            const amount = Number(item[amountField]) || 0;

            if (date >= startOfDayIST) stats.daily += amount;
            if (diff <= oneWeek) stats.weekly += amount;
            if (diff <= oneMonth) stats.monthly += amount;
            if (diff <= oneYear) stats.yearly += amount;
            stats.total += amount;
        });
        return stats;
    };

    const paymentStats = sumByPeriod(paidOrders || [], 'created_at');
    const payoutStats = sumByPeriod(processedPayouts || [], 'processed_at');

    const equityStats = {
        daily: paymentStats.daily - payoutStats.daily,
        weekly: paymentStats.weekly - payoutStats.weekly,
        monthly: paymentStats.monthly - payoutStats.monthly,
        yearly: paymentStats.yearly - payoutStats.yearly,
        total: paymentStats.total - payoutStats.total
    };

    // Count pending upgrades (passed Phase 1 and Phase 2 accounts only)
    const pendingUpgradesCount = pendingUpgrades?.filter(account => {
        const type = (account.challenge_type || '').toLowerCase();
        return type.includes('phase 1') || type.includes('phase 2') ||
            type.includes('step 1') || type.includes('step 2') ||
            type.includes('1_step') || type.includes('2_step');
    }).length || 0;

    // 5. Chart Data (Time Series)
    const dateMap = new Map<string, { date: string, rawDate: string, revenue: number, payouts: number }>();
    const getDateKey = (d: Date) => getISTDate(d).toISOString().split('T')[0];
    const getDisplayDate = (d: Date) => getISTDate(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

    // Populate with orders
    paidOrders?.forEach(order => {
        const d = new Date(order.created_at);
        const key = getDateKey(d);
        if (!dateMap.has(key)) dateMap.set(key, { date: getDisplayDate(d), rawDate: key, revenue: 0, payouts: 0 });

        const entry = dateMap.get(key)!;
        entry.revenue += Number(order.amount) || 0;
    });

    // Populate with payouts
    processedPayouts?.forEach(payout => {
        const d = new Date(payout.processed_at || payout.created_at);
        const key = getDateKey(d);
        if (!dateMap.has(key)) dateMap.set(key, { date: getDisplayDate(d), rawDate: key, revenue: 0, payouts: 0 });

        const entry = dateMap.get(key)!;
        entry.payouts += Number(payout.amount) || 0;
    });

    // Sort full history
    const sortedDailyData = Array.from(dateMap.values())
        .sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Calculate Rolling Equity on Full History
    let rollingEquity = 0;
    const fullHistoryWithEquity = sortedDailyData.map(day => {
        const net = day.revenue - day.payouts;
        rollingEquity += net;
        return {
            ...day,
            net,
            cumulativeEquity: rollingEquity
        };
    });

    // Extract Last 30 Days (filling gaps)
    const last30Days = [];
    const historyMap = new Map(fullHistoryWithEquity.map(d => [d.rawDate, d]));

    // Find equity start point (equity at t-30)
    const t30 = new Date();
    t30.setDate(t30.getDate() - 30);
    const t30Key = getDateKey(t30);

    let currentEquity = 0;
    // Find last known equity before window
    for (const d of fullHistoryWithEquity) {
        if (d.rawDate < t30Key) {
            currentEquity = d.cumulativeEquity;
        } else {
            break;
        }
    }

    for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = getDateKey(d);

        const actualData = historyMap.get(key);
        const net = actualData ? actualData.net : 0;

        currentEquity += net;

        last30Days.push({
            date: getDisplayDate(d),
            rawDate: key,
            revenue: actualData ? actualData.revenue : 0,
            payouts: actualData ? actualData.payouts : 0,
            net: net,
            cumulativeEquity: currentEquity
        });
    }

    return {
        totalUsers: usersCount || 0,
        pendingKYC: kycCount || 0,
        pendingPayouts: payoutsCount || 0,
        pendingUpgrades: pendingUpgradesCount, // New stat for pending upgrades
        violationsCount: violationsCount || 0, // Risk violations count
        totalRevenue: paymentStats.total,
        phase1Count,
        phase2Count,
        liveCount,
        instantCount,
        breachedCount,
        totalAccounts: allChallenges?.length || 0, // Total count of ALL challenges
        financials: {
            payments: paymentStats,
            payouts: payoutStats,
            equity: equityStats
        },
        revenueByGateway,
        chartData: last30Days
    };
}

export default async function AdminDashboardPage() {
    const stats = await getStats();

    const statCards = [
        {
            title: "Total Revenue",
            value: `$${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            icon: DollarSign,
            color: "emerald",
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600",
            textColor: "text-emerald-600",
            href: null
        },
        {
            title: "Phase 1 Accounts",
            value: stats.phase1Count,
            icon: TrendingUp, // or BarChart
            color: "blue",
            bgColor: "bg-blue-50",
            iconColor: "text-blue-600",
            textColor: "text-blue-600",
            href: "/mt5?tab=first"
        },
        {
            title: "Phase 2 Accounts",
            value: stats.phase2Count,
            icon: TrendingUp,
            color: "indigo",
            bgColor: "bg-indigo-50",
            iconColor: "text-indigo-600",
            textColor: "text-indigo-600",
            href: "/mt5?tab=second"
        },
        {
            title: "Live Accounts",
            value: stats.liveCount,
            icon: CreditCard, // or Award
            color: "purple",
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
            textColor: "text-purple-600",
            href: "/mt5?tab=funded"
        },
        {
            title: "Instant Accounts",
            value: stats.instantCount,
            icon: FileText, // or Zap
            color: "amber",
            bgColor: "bg-amber-50",
            iconColor: "text-amber-600",
            textColor: "text-amber-600",
            href: "/mt5?tab=instant"
        },
        {
            title: "Breached Accounts",
            value: stats.breachedCount,
            icon: AlertCircle,
            color: "red",
            bgColor: "bg-red-50",
            iconColor: "text-red-600",
            textColor: "text-red-600",
            href: "/mt5?status=breached"
        },
        {
            title: "Total MT5 Accounts",
            value: stats.totalAccounts,
            icon: FileText,
            color: "slate",
            bgColor: "bg-slate-50",
            iconColor: "text-slate-600",
            textColor: "text-slate-600",
            href: "/accounts" // Link to full accounts list
        },
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: Users,
            color: "gray",
            bgColor: "bg-gray-50",
            iconColor: "text-gray-600",
            textColor: "text-gray-600",
            href: "/users"
        },
        {
            title: "Pending KYC",
            value: stats.pendingKYC,
            icon: AlertCircle,
            color: "amber",
            bgColor: "bg-amber-50",
            iconColor: "text-amber-600",
            textColor: "text-amber-600",
            href: "/kyc"
        },
        {
            title: "Pending Payouts",
            value: stats.pendingPayouts,
            icon: CreditCard,
            color: "red",
            bgColor: "bg-red-50",
            iconColor: "text-red-600",
            textColor: "text-red-600",
            href: "/payouts"
        },
        {
            title: "Risk Violations",
            value: stats.violationsCount,
            icon: AlertTriangle,
            color: "orange",
            bgColor: "bg-orange-50",
            iconColor: "text-orange-600",
            textColor: "text-orange-600",
            href: "/risk-violations"
        },
        {
            title: "Pending Upgrades",
            value: stats.pendingUpgrades,
            icon: TrendingUp,
            color: "green",
            bgColor: "bg-green-50",
            iconColor: "text-green-600",
            textColor: "text-green-600",
            href: "/passed-accounts"
        },
    ];

    const formatCurrency = (amount: number) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="space-y-8 bg-[#FAFAFA] min-h-screen pb-12">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-200 px-8 py-8 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] text-left mb-8 -mx-8 -mt-8">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-sm text-gray-500 mt-2 font-medium">Monitor your platform's key performance metrics</p>
            </div>

            <div className="px-8 max-w-[1920px] mx-auto space-y-8">
                {/* Main Stat Cards */}
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {statCards.map((stat) => {
                        const CardContent = () => (
                            <div className={`bg-white rounded-2xl border border-gray-100 p-6 flex flex-col justify-between h-full shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group/card`}>
                                {/* Decorative background glow */}
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-white/50 to-transparent blur-xl rounded-full opacity-0 group-hover/card:opacity-100 transition-opacity"></div>

                                <div className="flex items-start justify-between relative z-10">
                                    <div className="space-y-2">
                                        <p className="text-[13px] font-semibold text-gray-500 uppercase tracking-wider">{stat.title}</p>
                                        <p className="text-3xl font-bold text-gray-900 tracking-tight">{stat.value}</p>
                                    </div>
                                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-inner ${stat.bgColor}`}>
                                        <stat.icon className={`h-6 w-6 ${stat.iconColor} group-hover/card:scale-110 transition-transform duration-300`} strokeWidth={2.5} />
                                    </div>
                                </div>
                                {stat.href && (
                                    <div className="mt-6 pt-4 border-t border-gray-50 flex items-center text-sm text-indigo-600 font-bold group-hover/link:text-indigo-700 transition-colors">
                                        <span className="group-hover/card:underline decoration-2 underline-offset-4">View Report</span>
                                        <ChevronRight className="ml-1 h-4 w-4 group-hover/card:translate-x-1.5 transition-transform duration-300" strokeWidth={3} />
                                    </div>
                                )}
                            </div>
                        );

                        return stat.href ? (
                            <Link key={stat.title} href={stat.href} className="block h-full">
                                <CardContent />
                            </Link>
                        ) : (
                            <div key={stat.title} className="block h-full">
                                <CardContent />
                            </div>
                        );
                    })}
                </div>

                {/* Financial Performance */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    <div className="lg:col-span-12 xl:col-span-7 bg-white p-6 rounded-2xl border border-gray-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] h-full">
                        <FinancialChart data={stats.chartData} />
                    </div>

                    {/* Metrics Table */}
                    <div className="lg:col-span-12 xl:col-span-5 h-full">
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)] flex flex-col h-full">
                            <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                                <h2 className="text-[15px] font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                    <DollarSign size={18} className="text-emerald-500" />
                                    Financial Details
                                </h2>
                            </div>
                            <div className="overflow-x-auto flex-1">
                                <table className="w-full text-left text-[13px] whitespace-nowrap">
                                    <thead className="bg-[#FCFCFC] border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[10px]">Metric</th>
                                            <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[10px] text-right">Daily</th>
                                            <th className="px-6 py-4 font-bold text-gray-500 uppercase tracking-widest text-[10px] text-right">All Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        <tr className="hover:bg-gray-50">
                                            <td className="px-6 py-5 font-semibold text-gray-900 flex items-center gap-3">
                                                <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 shadow-sm border border-emerald-100/50"><DollarSign size={14} strokeWidth={3} /></div>
                                                Gross Revenue
                                            </td>
                                            <td className="px-6 py-5 text-right font-medium text-gray-700">{formatCurrency(stats.financials.payments.daily)}</td>
                                            <td className="px-6 py-5 text-right font-bold text-emerald-600">{formatCurrency(stats.financials.payments.total)}</td>
                                        </tr>
                                        <tr className="hover:bg-[#FAFAFA] transition-colors group">
                                            <td className="px-6 py-5 font-semibold text-gray-900 flex items-center gap-3">
                                                <div className="p-1.5 bg-red-50 rounded-lg text-red-600 shadow-sm border border-red-100/50"><CreditCard size={14} strokeWidth={3} /></div>
                                                Payouts Sent
                                            </td>
                                            <td className="px-6 py-5 text-right font-medium text-gray-700">{formatCurrency(stats.financials.payouts.daily)}</td>
                                            <td className="px-6 py-5 text-right font-bold text-red-500">{formatCurrency(stats.financials.payouts.total)}</td>
                                        </tr>
                                        <tr className="bg-[#F8FAFF] border-y border-indigo-100/50 font-semibold group/equity hover:bg-indigo-50/50 transition-colors">
                                            <td className="px-6 py-5 text-indigo-900 flex items-center gap-3">
                                                <div className="p-1.5 bg-indigo-100 rounded-lg text-indigo-600 shadow-sm border border-indigo-200/50 group-hover/equity:scale-110 transition-transform"><TrendingUp size={14} strokeWidth={3} /></div>
                                                Net Profit
                                            </td>
                                            <td className={`px-6 py-5 text-right font-bold ${stats.financials.equity.daily >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {formatCurrency(stats.financials.equity.daily)}
                                            </td>
                                            <td className={`px-6 py-5 text-right font-extrabold ${stats.financials.equity.total >= 0 ? 'text-emerald-600' : 'text-rose-600'} text-[15px]`}>
                                                {formatCurrency(stats.financials.equity.total)}
                                            </td>
                                        </tr>
                                        {Object.entries(stats.revenueByGateway).map(([gateway, amount]) => (
                                            <tr key={gateway} className="hover:bg-[#FAFAFA] transition-colors group">
                                                <td className="px-6 py-4 font-medium text-gray-600 flex items-center gap-3 pl-12 text-xs">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 group-hover:scale-150 transition-transform"></div>
                                                    {gateway}
                                                </td>
                                                <td className="px-6 py-4 text-right text-gray-400">-</td>
                                                <td className="px-6 py-4 text-right font-semibold text-gray-700">{formatCurrency(amount as number)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.03)]">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-[17px] font-bold text-gray-900 tracking-tight">Quick Actions</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                        <Link href="/users" className="group flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-indigo-200 bg-[#FAFAFA] hover:bg-white hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                                <Users className="h-6 w-6" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 group-hover:text-indigo-900 transition-colors">Manage Users</p>
                                <p className="text-xs text-gray-500 font-medium">View and edit user profiles</p>
                            </div>
                        </Link>
                        <Link href="/kyc" className="group flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-amber-200 bg-[#FAFAFA] hover:bg-white hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300">
                            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:bg-amber-500 group-hover:text-white transition-colors duration-300 shadow-sm">
                                <FileText className="h-6 w-6" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 group-hover:text-amber-900 transition-colors">Review KYC</p>
                                <p className="text-xs text-gray-500 font-medium">{stats.pendingKYC} pending requests</p>
                            </div>
                        </Link>
                        <Link href="/payouts" className="group flex items-center gap-4 p-5 rounded-2xl border border-gray-100 hover:border-purple-200 bg-[#FAFAFA] hover:bg-white hover:shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] transition-all duration-300">
                            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors duration-300 shadow-sm">
                                <CreditCard className="h-6 w-6" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="font-bold text-gray-900 group-hover:text-purple-900 transition-colors">Process Payouts</p>
                                <p className="text-xs text-gray-500 font-medium">{stats.pendingPayouts} pending withdrawals</p>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
