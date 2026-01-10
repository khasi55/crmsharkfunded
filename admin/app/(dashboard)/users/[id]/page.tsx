import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";

export default async function AdminUserDetailsPage({
    params,
}: {
    params: { id: string };
}) {
    const { id } = await params; // Await params in Next.js 15+
    const supabase = await createClient();

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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-gray-900">{profile.full_name}</h1>
                <p className="text-sm text-gray-600 mt-1">{profile.email || "No email available (Auth ID linkage only)"}</p>
                <p className="font-mono text-xs text-gray-500 mt-1">{profile.id}</p>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {/* Profile Details */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Profile Details</h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Referral Code</dt>
                            <dd className="font-medium text-gray-900">{profile.referral_code}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Total Referrals</dt>
                            <dd className="font-medium text-gray-900">{profile.total_referrals}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Total Commission</dt>
                            <dd className="font-medium text-gray-900">${profile.total_commission}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Joined</dt>
                            <dd className="font-medium text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</dd>
                        </div>
                    </dl>
                </div>

                {/* Account Summary */}
                <div className="rounded-lg border border-gray-200 bg-white p-6">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900">Account Summary</h2>
                    <dl className="space-y-3 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Active Challenges</dt>
                            <dd className="font-medium text-gray-900">
                                {challenges?.length || 0}
                            </dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Certificates Issued</dt>
                            <dd className="font-medium text-gray-900">{certificates?.length || 0}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-600">Pending Withdrawals</dt>
                            <dd className="font-medium text-gray-900">
                                {payoutRequests?.filter(p => p.status === 'pending').length}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>

            {/* Challenges Section */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Trading Accounts</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Type</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Account ID</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Login</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Password</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Inv. Pass</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Server</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Size</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Platform</th>
                                <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {challenges?.map((c) => (
                                <tr key={c.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-gray-900 capitalize">{c.challenge_type || 'Phase 1'}</td>
                                    <td className="px-4 py-3 font-mono text-gray-600">
                                        {c.challenge_number || `SF-${c.id.slice(0, 8)}`}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-900">{c.login || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-gray-600 select-all">{c.master_password || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-gray-600 select-all">{c.investor_password || '-'}</td>
                                    <td className="px-4 py-3 text-gray-600">{c.server || '-'}</td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                        ${c.initial_balance?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-gray-900 capitalize">{c.platform || 'MT5'}</td>
                                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                                </tr>
                            ))}
                            {(!challenges || challenges.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        No trading accounts found for this user.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* KYC History */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">KYC History</h2>
                {kycRequests && kycRequests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Type</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Date</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Reason</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {kycRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 capitalize text-gray-900">{req.document_type}</td>
                                        <td className="px-4 py-3 text-gray-600">{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                                        <td className="px-4 py-3 text-red-600">{req.rejection_reason}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No KYC requests found.</p>
                )}
            </div>

            {/* Payout History */}
            <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h2 className="mb-4 text-lg font-semibold text-gray-900">Payout History</h2>
                {payoutRequests && payoutRequests.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Amount</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Method</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Date</th>
                                    <th className="px-4 py-3 font-semibold text-gray-700 text-xs uppercase">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {payoutRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 font-medium text-gray-900">${req.amount}</td>
                                        <td className="px-4 py-3 capitalize text-gray-600">{req.payment_method}</td>
                                        <td className="px-4 py-3 text-gray-600">{new Date(req.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-500 text-sm">No payout requests found.</p>
                )}
            </div>
        </div>
    );
}
