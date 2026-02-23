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
        fetchAllRows(supabase, "payment_orders", "amount, created_at", q => q.eq("status", "paid")),
        fetchAllRows(supabase, "challenges", "challenge_type, status, upgraded_to"),
        fetchAllRows(supabase, "payout_requests", "amount, processed_at, created_at", q => q.in("status", ["approved", "processed"])),
        fetchAllRows(supabase, "challenges", "id, challenge_type, status", q => q.eq("status", "passed"))
    ]);

    // 2. Calculate Revenue
    const totalRevenue = paidOrders?.reduce((sum, order) => sum + (Number(order.amount) || 0), 0) || 0;

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
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
                <p className="text-sm text-gray-600 mt-1">Monitor your platform's key metrics</p>
            </div>

            {/* Main Stat Cards */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => {
                    const CardContent = () => (
                        <div className={`bg-white rounded-lg border border-gray-200 p-6 flex flex-col justify-between h-full ${stat.href ? 'hover:shadow-md transition-shadow' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                    <p className="text-2xl font-semibold text-gray-900 mt-2">{stat.value}</p>
                                </div>
                                <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                                    <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                                </div>
                            </div>
                            {stat.href && (
                                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center text-sm text-indigo-600 font-medium group">
                                    <span className="group-hover:underline">View more</span>
                                    <ChevronRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition-transform" />
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
            <div className="space-y-6">
                <FinancialChart data={stats.chartData} />

                {/* Metrics Table */}
                <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Detailed Breakdown</h2>
                    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Metric</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-right">Daily (IST)</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-right">Weekly (7d)</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-right">Monthly (30d)</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-right">Yearly (365d)</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700 text-right">All Time</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                            <div className="p-1 bg-emerald-100 rounded text-emerald-600"><DollarSign size={16} /></div>
                                            Payments Received
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(stats.financials.payments.daily)}</td>
                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(stats.financials.payments.weekly)}</td>
                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(stats.financials.payments.monthly)}</td>
                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(stats.financials.payments.yearly)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(stats.financials.payments.total)}</td>
                                    </tr>
                                    <tr className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                            <div className="p-1 bg-red-100 rounded text-red-600"><CreditCard size={16} /></div>
                                            Payouts Sent
                                        </td>
                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(stats.financials.payouts.daily)}</td>
                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(stats.financials.payouts.weekly)}</td>
                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(stats.financials.payouts.monthly)}</td>
                                        <td className="px-6 py-4 text-right text-gray-900">{formatCurrency(stats.financials.payouts.yearly)}</td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(stats.financials.payouts.total)}</td>
                                    </tr>
                                    <tr className="bg-gray-50/50 hover:bg-gray-50 font-semibold">
                                        <td className="px-6 py-4 text-gray-900 flex items-center gap-2">
                                            <div className="p-1 bg-indigo-100 rounded text-indigo-600"><TrendingUp size={16} /></div>
                                            Net Equity
                                        </td>
                                        <td className={`px-6 py-4 text-right ${stats.financials.equity.daily >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(stats.financials.equity.daily)}
                                        </td>
                                        <td className={`px-6 py-4 text-right ${stats.financials.equity.weekly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(stats.financials.equity.weekly)}
                                        </td>
                                        <td className={`px-6 py-4 text-right ${stats.financials.equity.monthly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(stats.financials.equity.monthly)}
                                        </td>
                                        <td className={`px-6 py-4 text-right ${stats.financials.equity.yearly >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(stats.financials.equity.yearly)}
                                        </td>
                                        <td className={`px-6 py-4 text-right ${stats.financials.equity.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(stats.financials.equity.total)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Link href="/users" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <div>
                            <p className="font-medium text-gray-900">Manage Users</p>
                            <p className="text-sm text-gray-600">View all users</p>
                        </div>
                    </Link>
                    <Link href="/kyc" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors">
                        <FileText className="h-5 w-5 text-amber-600" />
                        <div>
                            <p className="font-medium text-gray-900">Review KYC</p>
                            <p className="text-sm text-gray-600">Pending requests</p>
                        </div>
                    </Link>
                    <Link href="/payouts" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                        <div>
                            <p className="font-medium text-gray-900">Process Payouts</p>
                            <p className="text-sm text-gray-600">Manage withdrawals</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
