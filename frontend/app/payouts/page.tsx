"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Wallet, DollarSign, Clock, AlertCircle, Timer } from "lucide-react";
import PayoutStats from "@/components/payouts/PayoutStats";
import PayoutHistoryTable from "@/components/payouts/PayoutHistoryTable";
import RequestPayoutCard from "@/components/payouts/RequestPayoutCard";
import CountdownTimer from "@/components/payouts/CountdownTimer";

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
        kycVerified: false,
        bankDetailsConnected: false
    });
    const [eligibleAccounts, setEligibleAccounts] = useState<any[]>([]);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [bankDetails, setBankDetails] = useState<any | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [requesting, setRequesting] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<any>(null); // State for debug info

    useEffect(() => {
        fetchPayoutData();
    }, []);

    const fetchPayoutData = async () => {
        try {
            // Fetch balance and wallet info from API
            const balanceData = await fetchFromBackend('/api/payouts/balance');
            console.log("PAYOUT BALANCE DATA:", balanceData);

            setStats({
                available: balanceData.balance.available || 0,
                totalPaid: balanceData.balance.totalPaid || 0,
                pending: balanceData.balance.pending || 0
            });
            if (balanceData.eligibility) {
                setEligibility(balanceData.eligibility);
            }

            if (balanceData.accountList) {
                setEligibleAccounts(balanceData.accountList);
            } else if (balanceData.eligibleAccounts) {
                // Fallback for older backend versions
                setEligibleAccounts(balanceData.eligibleAccounts);
            }
            if (balanceData.debug) {
                setDebugInfo(balanceData.debug);
            }

            setWalletAddress(balanceData.walletAddress || null);
            setBankDetails(balanceData.bankDetails || null);

            // Fetch payout history from API
            const historyData = await fetchFromBackend('/api/payouts/history');
            setHistory(historyData.payouts || []);

        } catch (error) {
            console.error("Error fetching payout data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRequestPayout = async (amount: number, method: string, otp: string, accountId?: string): Promise<boolean> => {
        try {
            setRequesting(true);

            if (method === 'crypto' && !walletAddress) {
                alert("Please set up a wallet address first.");
                return false;
            }

            if (method === 'bank' && !bankDetails) {
                alert("Please set up your bank details first.");
                return false;
            }

            if (!otp || otp.length !== 6) {
                alert("Please enter a valid 6-digit verification code.");
                return false;
            }

            // Call API to request payout
            const data = await fetchFromBackend('/api/payouts/request', {
                method: 'POST',
                body: JSON.stringify({
                    amount,
                    method,
                    challenge_id: accountId,
                    otp
                }),
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

            {/* Cooling Period Banner */}
            {eligibleAccounts.some(acc => acc.payout_eligibility && !acc.payout_eligibility.time_met) && (
                <motion.div 
                    initial={{ opacity: 0, y: -20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="relative overflow-hidden bg-[#050923] border border-blue-500/30 rounded-2xl p-0 shadow-[0_0_40px_rgba(59,130,246,0.15)] group"
                >
                    {/* Animated Background Glow */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative flex flex-col md:flex-row items-stretch">
                        {/* Status Section */}
                        <div className="flex-1 p-5 flex items-center gap-5 border-b md:border-b-0 md:border-r border-white/5">
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/20 blur-lg rounded-full animate-pulse" />
                                <div className="relative w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30">
                                    <Clock className="text-blue-400 group-hover:rotate-12 transition-transform duration-500" size={24} />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-white font-bold text-base tracking-tight">Active Cooling Period</h3>
                                    <span className="bg-blue-500/20 text-blue-400 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-blue-500/20">System Rule</span>
                                </div>
                                <p className="text-gray-400 text-xs mt-1 max-w-md font-medium leading-relaxed">
                                    Next payout for account <span className="text-blue-400 font-bold">{eligibleAccounts.find(a => a.id === (selectedAccountId || eligibleAccounts.find(ea => ea.payout_eligibility && !ea.payout_eligibility.time_met)?.id))?.login || "Selected Account"}</span>.
                                    <span className="text-gray-500 ml-1">(24h rule)</span>
                                </p>
                            </div>
                        </div>

                        {/* Countdown Section */}
                        <div className="bg-white/5 p-5 md:px-10 flex flex-col items-center justify-center gap-1 min-w-[240px]">
                            <span className="text-gray-500 text-[10px] uppercase font-black tracking-[0.2em]">Next Unlock In</span>
                            <CountdownTimer 
                                targetDate={
                                    (() => {
                                        const selected = eligibleAccounts.find(a => a.id === selectedAccountId);
                                        if (selected?.payout_eligibility && !selected.payout_eligibility.time_met) {
                                            return selected.payout_eligibility.next_payout_date;
                                        }
                                        // Fallback to the first account in cooling if no selection or selection not in cooling
                                        return eligibleAccounts
                                            .filter(a => a.payout_eligibility && !a.payout_eligibility.time_met)
                                            .map(a => a.payout_eligibility!.next_payout_date)
                                            .sort()[0] || "";
                                    })()
                                }
                                className="text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 tracking-tighter"
                            />
                        </div>
                    </div>
                </motion.div>
            )}


            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <PayoutStats
                    title="Available for Payout"
                    value={`$${stats.available.toFixed(2)}`}
                    description="Withdraw your earned profit"
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
                        onRequestPayout={handleRequestPayout}
                        accounts={eligibleAccounts}
                        isKycVerified={eligibility.kycVerified}
                        bankDetails={bankDetails}
                        onAccountSelect={(id) => setSelectedAccountId(id)}
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
                                { label: "KYC Verified", status: eligibility.kycVerified },
                                { label: "Profit Target Met", status: eligibility.profitTargetMet },
                                { label: "Wallet Connected", status: eligibility.walletConnected },
                                { label: "Bank Details Connected", status: eligibility.bankDetailsConnected },
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
