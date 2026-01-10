import { createAdminClient } from "@/utils/supabase/admin";
import { Users, FileText, CreditCard, DollarSign, TrendingUp, AlertCircle } from "lucide-react";

async function getStats() {
    // Use admin client to bypass RLS
    const supabase = createAdminClient();

    // Parallel fetching for stats
    const [
        { count: usersCount },
        { count: kycCount },
        { count: payoutsCount }
    ] = await Promise.all([
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("kyc_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("payout_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    return {
        totalUsers: usersCount || 0,
        pendingKYC: kycCount || 0,
        pendingPayouts: payoutsCount || 0,
        totalPayoutsValue: 0, // Placeholder as we'd need to sum
    };
}

export default async function AdminDashboardPage() {
    const stats = await getStats();

    const statCards = [
        {
            title: "Total Users",
            value: stats.totalUsers,
            icon: Users,
            color: "indigo",
            bgColor: "bg-indigo-50",
            iconColor: "text-indigo-600",
            textColor: "text-indigo-600"
        },
        {
            title: "Pending KYC",
            value: stats.pendingKYC,
            icon: FileText,
            color: "amber",
            bgColor: "bg-amber-50",
            iconColor: "text-amber-600",
            textColor: "text-amber-600"
        },
        {
            title: "Pending Payouts",
            value: stats.pendingPayouts,
            icon: CreditCard,
            color: "purple",
            bgColor: "bg-purple-50",
            iconColor: "text-purple-600",
            textColor: "text-purple-600"
        },
        {
            title: "Revenue",
            value: "$0.00",
            icon: DollarSign,
            color: "emerald",
            bgColor: "bg-emerald-50",
            iconColor: "text-emerald-600",
            textColor: "text-emerald-600"
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">Dashboard Overview</h1>
                <p className="text-sm text-gray-600 mt-1">Monitor your platform's key metrics</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
                {statCards.map((stat) => (
                    <div key={stat.title} className="bg-white rounded-lg border border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                                <p className="text-2xl font-semibold text-gray-900 mt-2">{stat.value}</p>
                            </div>
                            <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bgColor}`}>
                                <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <a href="/admin/users" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                        <Users className="h-5 w-5 text-indigo-600" />
                        <div>
                            <p className="font-medium text-gray-900">Manage Users</p>
                            <p className="text-sm text-gray-600">View all users</p>
                        </div>
                    </a>
                    <a href="/admin/kyc" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-amber-300 hover:bg-amber-50 transition-colors">
                        <FileText className="h-5 w-5 text-amber-600" />
                        <div>
                            <p className="font-medium text-gray-900">Review KYC</p>
                            <p className="text-sm text-gray-600">Pending requests</p>
                        </div>
                    </a>
                    <a href="/admin/payouts" className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors">
                        <CreditCard className="h-5 w-5 text-purple-600" />
                        <div>
                            <p className="font-medium text-gray-900">Process Payouts</p>
                            <p className="text-sm text-gray-600">Manage withdrawals</p>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    );
}
