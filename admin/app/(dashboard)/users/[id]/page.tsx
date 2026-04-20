import { createAdminClient } from "@/utils/supabase/admin";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { cn } from "@/lib/utils";
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
    ExternalLink,
    MapPin,
    User,
    CheckCircle2,
    AlertTriangle,
    Image as ImageIcon
} from "lucide-react";
import { EditUserButton } from "@/components/users/EditUserButton";
import { ResetPasswordButton } from "@/components/users/ResetPasswordButton";

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
        { data: kycSessions },
        { data: payoutRequests },
        { data: paymentOrders },
        { data: bankDetails },
    ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", id).single(),
        supabase.from("challenges").select("*").eq("user_id", id).order('created_at', { ascending: false }),
        supabase.from("certificates").select("*").eq("user_id", id),
        supabase.from("kyc_requests").select("*").eq("user_id", id).order('created_at', { ascending: false }),
        supabase.from("kyc_sessions").select("*").eq("user_id", id).order('created_at', { ascending: false }),
        supabase.from("payout_requests").select("*").eq("user_id", id).order('created_at', { ascending: false }),
        supabase.from("payment_orders").select("*").eq("user_id", id).eq("status", "paid"),
        supabase.from("bank_details").select("*").eq("user_id", id).maybeSingle(),
    ]);

    const totalPaid = (paymentOrders || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const totalPayouts = (payoutRequests || []).filter(r => ['approved', 'processed'].includes(r.status)).reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

    if (!profile) {
        notFound();
    }

    const latestKycSession = kycSessions?.[0];

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <Link
                        href="/users"
                        className="inline-flex items-center text-sm text-gray-500 hover:text-indigo-600 mb-2 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Users
                    </Link>
                    <div className="flex items-center justify-between">
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{profile.full_name}</h1>
                        <div className="ml-4 flex items-center gap-2">
                            <ResetPasswordButton user={profile} />
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Paid</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">${totalPaid.toLocaleString()}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50">
                            <CreditCard className="h-6 w-6 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Payout</p>
                            <p className="text-2xl font-black text-emerald-600 mt-1">${totalPayouts.toLocaleString()}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                            <DollarSign className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Commission</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">${(Number(profile.total_commission) || 0).toLocaleString()}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50">
                            <Users className="h-6 w-6 text-indigo-600" />
                        </div>
                    </div>
                </div>
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
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Referrals</p>
                            <p className="text-2xl font-black text-gray-900 mt-1">{profile.total_referrals || 0}</p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                            <Users className="h-6 w-6 text-blue-600" />
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

            {/* KYC Details Section (if available) */}
            {latestKycSession && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-50 rounded-lg">
                                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">KYC Information</h2>
                        </div>
                        <StatusBadge status={latestKycSession.status} className="px-3 py-1 shadow-sm font-bold" />
                    </div>
                    
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                            {/* Personal Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                                    <User className="h-4 w-4 text-indigo-500" />
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Personal Details</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                            {latestKycSession.first_name} {latestKycSession.last_name || ''}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Date of Birth</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                            {latestKycSession.date_of_birth ? new Date(latestKycSession.date_of_birth).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'N/A'}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nationality</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{latestKycSession.nationality || 'N/A'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Address Details */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                                    <MapPin className="h-4 w-4 text-emerald-500" />
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Address Details</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Street Address</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">
                                            {latestKycSession.address_line1 || 'N/A'}
                                            {latestKycSession.address_line2 ? `, ${latestKycSession.address_line2}` : ''}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">City</p>
                                            <p className="text-sm font-bold text-gray-900 mt-1">{latestKycSession.city || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">State/Region</p>
                                            <p className="text-sm font-bold text-gray-900 mt-1">{latestKycSession.state || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Postal Code</p>
                                            <p className="text-sm font-mono font-bold text-indigo-600 mt-1">{latestKycSession.postal_code || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Country</p>
                                            <p className="text-sm font-bold text-gray-900 mt-1">{latestKycSession.country || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Document & Fraud Analysis */}
                            <div className="space-y-6">
                                <div className="flex items-center gap-2 border-b border-gray-50 pb-2">
                                    <FileText className="h-4 w-4 text-orange-500" />
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Verification Info</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document Type</p>
                                            <p className="text-sm font-bold text-gray-900 mt-1 capitalize">{latestKycSession.document_type || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Document Number</p>
                                            <p className="text-sm font-mono font-bold text-indigo-600 mt-1">{latestKycSession.document_number || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="pt-4 grid grid-cols-2 gap-4 border-t border-gray-50">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                Face Match
                                                {latestKycSession.face_match_score >= 80 ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> : <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn("h-full rounded-full transition-all", 
                                                            latestKycSession.face_match_score >= 80 ? "bg-emerald-500" : 
                                                            latestKycSession.face_match_score >= 50 ? "bg-amber-500" : "bg-red-500")}
                                                        style={{ width: `${latestKycSession.face_match_score || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-600">{latestKycSession.face_match_score || 0}%</span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                                                Liveness
                                                {latestKycSession.liveness_score >= 80 ? <CheckCircle2 className="h-2.5 w-2.5 text-emerald-500" /> : <AlertTriangle className="h-2.5 w-2.5 text-amber-500" />}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={cn("h-full rounded-full transition-all", 
                                                            latestKycSession.liveness_score >= 80 ? "bg-emerald-500" : 
                                                            latestKycSession.liveness_score >= 50 ? "bg-amber-500" : "bg-red-500")}
                                                        style={{ width: `${latestKycSession.liveness_score || 0}%` }}
                                                    />
                                                </div>
                                                <span className="text-[10px] font-black text-gray-600">{latestKycSession.liveness_score || 0}%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">AML Status</p>
                                        <span className={cn(
                                            "inline-flex items-center mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                                            latestKycSession.aml_status === 'clear' ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                                        )}>
                                            {latestKycSession.aml_status || 'Pending'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Evidence Images */}
                        <div className="mt-12 pt-8 border-t border-gray-100">
                             <div className="flex items-center gap-2 mb-6">
                                <ImageIcon className="h-4 w-4 text-purple-500" />
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Document Evidence</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {(latestKycSession.front_id_url || (latestKycSession.raw_response as any)?.id_document?.front_url) && (
                                    <a 
                                        href={latestKycSession.front_id_url || `/api/kyc/image-proxy?url=${encodeURIComponent((latestKycSession.raw_response as any)?.id_document?.front_url)}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:ring-2 hover:ring-indigo-500 transition-all shadow-sm"
                                    >
                                        <img 
                                            src={latestKycSession.front_id_url || `/api/kyc/image-proxy?url=${encodeURIComponent((latestKycSession.raw_response as any)?.id_document?.front_url)}`} 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                            alt="Front ID" 
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">View Front ID</span>
                                        </div>
                                    </a>
                                )}
                                {(latestKycSession.back_id_url || (latestKycSession.raw_response as any)?.id_document?.back_url) && (
                                    <a 
                                        href={latestKycSession.back_id_url || `/api/kyc/image-proxy?url=${encodeURIComponent((latestKycSession.raw_response as any)?.id_document?.back_url)}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:ring-2 hover:ring-indigo-500 transition-all shadow-sm"
                                    >
                                        <img 
                                            src={latestKycSession.back_id_url || `/api/kyc/image-proxy?url=${encodeURIComponent((latestKycSession.raw_response as any)?.id_document?.back_url)}`} 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                            alt="Back ID" 
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">View Back ID</span>
                                        </div>
                                    </a>
                                )}
                                {(latestKycSession.selfie_url || (latestKycSession.raw_response as any)?.selfie?.url) && (
                                    <a 
                                        href={latestKycSession.selfie_url || `/api/kyc/image-proxy?url=${encodeURIComponent((latestKycSession.raw_response as any)?.selfie?.url)}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:ring-2 hover:ring-indigo-500 transition-all shadow-sm"
                                    >
                                        <img 
                                            src={latestKycSession.selfie_url || `/api/kyc/image-proxy?url=${encodeURIComponent((latestKycSession.raw_response as any)?.selfie?.url)}`} 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                            alt="Selfie" 
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">View Selfie</span>
                                        </div>
                                    </a>
                                )}
                                {latestKycSession.manual_document_url && (
                                    <a 
                                        href={latestKycSession.manual_document_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="group relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 border border-gray-200 hover:ring-2 hover:ring-indigo-500 transition-all shadow-sm"
                                    >
                                        <img 
                                            src={latestKycSession.manual_document_url} 
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105" 
                                            alt="Manual Doc" 
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-white text-[10px] font-black uppercase tracking-widest">View Manual Doc</span>
                                        </div>
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-[10px] font-bold text-gray-400">
                            MODE: <span className="text-gray-600 uppercase tracking-normal">{latestKycSession.kyc_mode || 'AUTOMATED'}</span>
                            <span className="mx-2">•</span>
                            PROVIDER: <span className="text-gray-600 uppercase tracking-normal">{latestKycSession.didit_session_id ? 'DIDIT' : 'DIRECT'}</span>
                        </p>
                        <Link 
                            href={`/kyc/${latestKycSession.id}`}
                            className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center gap-1.5"
                        >
                            Review Detailed Logs <ExternalLink className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            )}

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
                        {((kycRequests || []).length > 0 || (kycSessions || []).length > 0) ? (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Document</th>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Status</th>
                                        <th className="px-6 py-3 font-bold text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">Submitted</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {/* Show sessions first then requests */}
                                    {(kycSessions || []).map(req => (
                                        <tr key={`session-${req.id}`} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 capitalize italic-none">{req.document_type || 'Identity Verification'}</span>
                                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">DiDit Session</span>
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
                                    {(kycRequests || []).map(req => (
                                        <tr key={`request-${req.id}`} className="hover:bg-gray-50/80 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-900 capitalize italic-none">{req.document_type}</span>
                                                    <span className="text-[9px] font-black text-amber-400 uppercase tracking-tighter">Legacy Request</span>
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
                                    <FileText className="h-10 w-10 mb-2 text-gray-300" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No KYC records</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bank Details */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-lg">
                                <CreditCard className="h-5 w-5 text-emerald-600" />
                            </div>
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">Bank Details</h2>
                        </div>
                        {bankDetails?.is_locked && (
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                Locked
                            </span>
                        )}
                    </div>
                    <div>
                        {bankDetails ? (
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Holder</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{bankDetails.account_holder_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bank Name</p>
                                        <p className="text-sm font-bold text-gray-900 mt-1">{bankDetails.bank_name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account Number</p>
                                        <p className="text-sm font-mono font-bold text-indigo-600 mt-1 bg-indigo-50 px-2 py-1 rounded select-all w-fit">
                                            {bankDetails.account_number}
                                        </p>
                                    </div>
                                    <div className="flex gap-4">
                                        {bankDetails.ifsc_code && (
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">IFSC</p>
                                                <p className="text-sm font-mono font-bold text-gray-700 mt-1">{bankDetails.ifsc_code}</p>
                                            </div>
                                        )}
                                        {bankDetails.swift_code && (
                                            <div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">SWIFT</p>
                                                <p className="text-sm font-mono font-bold text-gray-700 mt-1">{bankDetails.swift_code}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-gray-50 flex justify-between items-center text-[10px] text-gray-400">
                                    <span>Last Updated: {new Date(bankDetails.updated_at).toLocaleString()}</span>
                                    <span className="font-mono">ID: {bankDetails.id.slice(0, 8)}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <div className="flex flex-col items-center justify-center opacity-40">
                                    <CreditCard className="h-10 w-10 mb-2 text-gray-300" />
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No bank details saved</p>
                                </div>
                            </div>
                        )}
                    </div>
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
                                    {(payoutRequests || []).map(req => (
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
    );
}
