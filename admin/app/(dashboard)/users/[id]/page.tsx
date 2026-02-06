import { createAdminClient } from "@/utils/supabase/admin";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import {
    ArrowLeft,
    Users,
    DollarSign,
    Award,
    TrendingUp,
    ShieldCheck,
    CreditCard,
    FileText,
    ExternalLink
} from "lucide-react";
import { EditUserButton } from "@/components/users/EditUserButton";

export default async function AdminUserDetailsPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // Await params in Next.js 15+
    const supabase = createAdminClient();

    // Fetch all user data in parallel
    const [
        { data: profile },
        { data: challenges },
        { data: certificates },
        { data: kycRequests },
        { data: payoutRequests },
    ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("challenges").select("*").eq("user_id", id).order('created_at', { ascending: false }),
        supabase.from("certificates").select("*").eq("user_id", id),
        supabase.from("kyc_requests").select("*").eq("user_id", id),
        supabase.from("payout_requests").select("*").eq("user_id", id),
    ]);

    if (!profile) {
        notFound();
    }

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link
                        href="/admin/users"
                        className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-2 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Users
                    </Link>
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{profile.full_name}</h1>
                        <div className="ml-4">
                            <EditUserButton user={profile} />
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                        <p className="text-sm text-gray-600 px-2.5 py-0.5 bg-gray-100 rounded-full">{profile.email}</p>
                        <span className="text-xs font-mono text-gray-400 font-medium tracking-tight">ID: {profile.id}</span>
                        <span className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded font-medium">Joined: {new Date(profile.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Referral Code</p>
                            <p className="text-2xl font-black text-gray-900 mt-1 font-mono">{profile.referral_code || "N/A"}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                            <ShieldCheck className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Referrals</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">{profile.total_referrals || 0}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                            <Users className="h-6 w-6 text-indigo-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Commission</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">${(Number(profile.total_commission) || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                            <DollarSign className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active Accounts</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">{challenges?.length || 0}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50">
                            <TrendingUp className="h-6 w-6 text-purple-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Trading Accounts Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Trading Accounts</h2>
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {challenges?.length || 0} Accounts Total
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Plan Type</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Account ID</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Credentials</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100 text-right">Balance</th>
                                <th className="px-6 py-4 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {challenges?.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-gray-900 capitalize">{c.challenge_type || 'Evaluation'}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">{c.platform || 'MT5'} • {new Date(c.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-mono font-bold text-gray-700 tracking-tight">{c.challenge_number || `SF-${c.id.slice(0, 8)}`}</span>
                                            <span className="text-[10px] text-gray-400 font-medium">UUID: {c.id.slice(0, 8)}...</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 cursor-default">
                                        <div className="flex flex-col gap-1.5">
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-[9px] font-black text-gray-300 w-9 uppercase tracking-tighter">Login</span>
                                                <code className="text-xs bg-gray-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100/50 select-all font-mono font-bold">{c.login || '-'}</code>
                                            </div>
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-[9px] font-black text-gray-300 w-9 uppercase tracking-tighter">Pass</span>
                                                <code className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded border border-gray-100 select-all font-mono font-bold">{c.master_password || '-'}</code>
                                            </div>
                                            <div className="flex items-center gap-2 group">
                                                <span className="text-[9px] font-black text-gray-300 w-9 uppercase tracking-tighter">Invest</span>
                                                <code className="text-xs bg-gray-50 text-gray-400 px-2 py-0.5 rounded border border-gray-50 select-all font-mono font-bold">{c.investor_password || '-'}</code>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex flex-col">
                                            <span className="font-black text-emerald-600 text-base">${c.initial_balance?.toLocaleString()}</span>
                                            <span className="text-[10px] text-gray-400 font-medium tracking-tight uppercase truncate max-w-[120px] ml-auto">{c.server || 'Main Server'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <StatusBadge status={c.status} />
                                    </td>
                                </tr>
                            ))}
                            {(!challenges || challenges.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center justify-center opacity-40">
                                            <TrendingUp className="h-12 w-12 mb-3 text-gray-300" />
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No trading accounts detected</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* KYC History */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <ShieldCheck className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">KYC History</h2>
                    </div>
                    <div>
                        {kycRequests && kycRequests.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Document</th>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Status</th>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Submitted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {kycRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900 capitalize italic-none">{req.document_type}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-medium">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="py-12 text-center">
                                <div className="flex flex-col items-center justify-center opacity-40">
                                    <FileText className="h-10 w-10 mb-2 text-gray-300" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No KYC records</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Payout History */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <CreditCard className="h-5 w-5 text-indigo-600" />
                        </div>
                        <h2 className="text-lg font-black text-gray-900 tracking-tight">Payout History</h2>
                    </div>
                    <div>
                        {payoutRequests && payoutRequests.length > 0 ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Amount</th>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Status</th>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Process Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {payoutRequests.map(req => (
                                        <tr key={req.id} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="font-black text-gray-900 text-sm italic-none">${(Number(req.amount) || 0).toLocaleString()}</span>
                                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-tighter">{req.payment_method}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={req.status} />
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 font-medium">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="py-12 text-center">
                                <div className="flex flex-col items-center justify-center opacity-40">
                                    <CreditCard className="h-10 w-10 mb-2 text-gray-300" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No payout history</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
