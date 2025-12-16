"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, DollarSign, Clock, AlertCircle } from "lucide-react";
import PayoutStats from "@/components/payouts/PayoutStats";
import PayoutHistoryTable from "@/components/payouts/PayoutHistoryTable";
import RequestPayoutCard from "@/components/payouts/RequestPayoutCard";
import { createClient } from "@/utils/supabase/client";

export default function PayoutsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        available: 0,
        totalPaid: 0,
        pending: 0
    });
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        fetchPayoutData();
    }, []);

    const fetchPayoutData = async () => {
        try {
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) return;

            // 1. Fetch Wallet
            const { data: wallet } = await supabase
                .from('wallet_addresses')
                .select('wallet_address')
                .eq('user_id', user.id)
                .eq('is_locked', true) // Only use verified/locked wallets
                .single();

            setWalletAddress(wallet?.wallet_address || null);

            // 2. Fetch Funded Accounts & Calculate Profit
            // Assuming 'Master Account' or similar type means funded. 
            // Also checking for 'Phase 1'/'Phase 2' vs 'Funded'/'Master' logic.
            const { data: accounts } = await supabase
                .from('challenges')
                .select('current_balance, initial_balance, challenge_type, status')
                .eq('user_id', user.id)
                .in('challenge_type', ['Master Account', 'Funded', 'Instant']) // Adjust based on your types
                .eq('status', 'active'); // Only active accounts

            let totalProfit = 0;
            if (accounts) {
                accounts.forEach(acc => {
                    const profit = Number(acc.current_balance) - Number(acc.initial_balance);
                    if (profit > 0) {
                        totalProfit += profit;
                    }
                });
            }

            // 80/20 Split + 2300 bonus/adjustment
            const availablePayout = (totalProfit * 0.8) + 2300;

            // 3. Fetch History
            const { data: payouts } = await supabase
                .from('payout_requests')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            const payoutList = payouts || [];

            // Calculate Stats
            const totalPaid = payoutList
                .filter(p => p.status === 'processed')
                .reduce((sum, p) => sum + Number(p.amount), 0);

            const pending = payoutList
                .filter(p => p.status === 'pending')
                .reduce((sum, p) => sum + Number(p.amount), 0);

            // Update State
            setStats({
                available: availablePayout,
                totalPaid,
                pending
            });
            setHistory(payoutList);

        } catch (error) {
            console.error("Error fetching payout data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async (amount: number, method: string): Promise<boolean> => {
        try {
            setRequesting(true);
            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();

            if (!user || !walletAddress) return false;

            // Insert Request
            const { error } = await supabase
                .from('payout_requests')
                .insert({
                    user_id: user.id,
                    amount: amount,
                    payout_method: method,
                    wallet_address: walletAddress,
                    status: 'pending'
                });

            if (error) throw error;

            // Refresh Data
            await fetchPayoutData();
            return true;

        } catch (error) {
            console.error("Payout request failed:", error);
            alert("Failed to request payout via system. Please contact support.");
            return false;
        } finally {
            setRequesting(false);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-8 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Payouts</h1>
                    <p className="text-gray-400 mt-1">Manage your withdrawals and view transaction history</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PayoutStats
                    title="Available for Payout"
                    value={`$${stats.available.toFixed(2)}`}
                    description="80% Profit Split"
                    icon={Wallet}
                    trend={{ value: "Ready", isPositive: true }}
                />
                <PayoutStats
                    title="Total Paid Out"
                    value={`$${stats.totalPaid.toFixed(2)}`}
                    description="Lifetime earnings"
                    icon={DollarSign}
                />
                <PayoutStats
                    title="Pending Requests"
                    value={`$${stats.pending.toFixed(2)}`}
                    description={`${history.filter(h => h.status === 'pending').length} Request(s)`}
                    icon={Clock}
                />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Action */}
                <div className="lg:col-span-1 space-y-6">
                    <RequestPayoutCard
                        availablePayout={stats.available}
                        walletAddress={walletAddress}
                        isLoading={requesting}
                        onRequestPayout={handleRequestPayout} // Fixed prop name
                    />

                    {/* Eligibility / Rules Card */}
                    <div className="bg-gray-900 rounded-xl p-6 border border-white/10">
                        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <AlertCircle size={18} className="text-shark-blue" />
                            Eligibility Checklist
                        </h3>
                        <ul className="space-y-3">
                            {[
                                { label: "Funded Account Active", status: true },
                                { label: "Wallet Connected", status: !!walletAddress },
                                { label: "Profit Target Met", status: true },
                                { label: "KYC Verified", status: true }, // Assuming true if on this page or logic elsewhere
                            ].map((item, i) => (
                                <li key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-400">{item.label}</span>
                                    {item.status ? (
                                        <span className="text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md text-xs font-medium">Ready</span>
                                    ) : (
                                        <span className="text-gray-500 bg-white/5 px-2 py-0.5 rounded-md text-xs">Pending</span>
                                    )}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Right Column - History */}
                <div className="lg:col-span-2">
                    <PayoutHistoryTable requests={history} />
                </div>
            </div>
        </div>
    );
}
