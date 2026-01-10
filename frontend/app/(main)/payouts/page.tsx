"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, DollarSign, Clock, AlertCircle } from "lucide-react";
import PayoutStats from "@/components/payouts/PayoutStats";
import PayoutHistoryTable from "@/components/payouts/PayoutHistoryTable";
import RequestPayoutCard from "@/components/payouts/RequestPayoutCard";

import { fetchFromBackend } from "@/lib/backend-api";

export default function PayoutsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        available: 0,
        totalPaid: 0,
        pending: 0
    });
    const [eligibility, setEligibility] = useState({
        fundedAccountActive: false,
        walletConnected: false,
        profitTargetMet: false,
        kycVerified: false
    });
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [requesting, setRequesting] = useState(false);

    useEffect(() => {
        fetchPayoutData();
    }, []);

    const fetchPayoutData = async () => {
        try {
            // Fetch balance and wallet info from API
            const balanceData = await fetchFromBackend('/api/payouts/balance');

            setStats({
                available: balanceData.balance.available || 0,
                totalPaid: balanceData.balance.totalPaid || 0,
                pending: balanceData.balance.pending || 0
            });
            if (balanceData.eligibility) {
                setEligibility(balanceData.eligibility);
            }
            setWalletAddress(balanceData.walletAddress || null);

            // Fetch payout history from API
            const historyData = await fetchFromBackend('/api/payouts/history');
            setHistory(historyData.payouts || []);

        } catch (error) {
            console.error("Error fetching payout data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async (amount: number, method: string): Promise<boolean> => {
        try {
            setRequesting(true);

            if (!walletAddress) {
                alert("Please set up a wallet address first.");
                return false;
            }

            // Call API to request payout
            const data = await fetchFromBackend('/api/payouts/request', {
                method: 'POST',
                body: JSON.stringify({ amount, method }),
            });


            // Standard fetchFromBackend throws on error, so we catch it below
            // But if we need custom checking of data.error:
            if (data.error) {
                throw new Error(data.error);
            }

            // Refresh Data
            await fetchPayoutData();
            return true;

        } catch (error: any) {
            console.error("Payout request failed:", error);
            alert(error.message || "Failed to request payout. Please contact support.");
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
                    <h1 className="text-2xl font-bold text-black tracking-tight">Payouts</h1>
                    <p className="text-black mt-1 font-medium">Manage your withdrawals and view transaction history</p>
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
                    <div className="bg-[#050923] rounded-xl p-6 border border-white/10 shadow-xl transition-all duration-300 hover:border-shark-blue/30">
                        <h3 className="font-bold text-white mb-6 flex items-center gap-3 uppercase tracking-wider text-sm">
                            <div className="p-2 bg-shark-blue/10 rounded-lg">
                                <AlertCircle size={18} className="text-shark-blue" />
                            </div>
                            Eligibility Checklist
                        </h3>
                        <ul className="space-y-3">
                            {[
                                { label: "Funded Account Active", status: eligibility.fundedAccountActive },
                                { label: "Wallet Connected", status: eligibility.walletConnected },
                                { label: "Profit Target Met", status: eligibility.profitTargetMet },
                                { label: "KYC Verified", status: eligibility.kycVerified },
                            ].map((item, i) => (
                                <li key={i} className="flex items-center justify-between text-sm">
                                    <span className="text-gray-300 font-medium">{item.label}</span>
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
