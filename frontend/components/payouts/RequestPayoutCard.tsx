import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Wallet, AlertTriangle, CheckCircle, Loader2, ChevronDown, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface AccountOption {
    id: string;
    account_number: string;
    available: number;
    profit: number;
    type: string;
    consistency?: {
        enabled: boolean;
        passed: boolean;
        score: number;
        maxAllowed: number;
        details: string;
    };
}

interface RequestPayoutCardProps {
    availablePayout: number; // Fallback global available
    walletAddress: string | null;
    isLoading: boolean;
    onRequestPayout: (amount: number, method: string, accountId?: string) => Promise<boolean>;
    accounts?: AccountOption[];
    isKycVerified: boolean;
    bankDetails?: {
        bank_name: string;
        account_number: string;
        is_locked: boolean;
    } | null;
}

export default function RequestPayoutCard({ availablePayout: globalAvailable, walletAddress, isLoading, onRequestPayout, accounts = [], isKycVerified, bankDetails }: RequestPayoutCardProps) {
    console.log("RequestPayoutCard received accounts:", accounts);
    const [amount, setAmount] = useState("");
    const [method, setMethod] = useState<"crypto" | "bank">("crypto");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState<string>("");

    const [showConfirmation, setShowConfirmation] = useState(false);
    const [submittedAmount, setSubmittedAmount] = useState<string | null>(null);

    // Initialize selected account
    useEffect(() => {
        if (accounts && accounts.length > 0 && !selectedAccountId) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts]);

    const getSelectedAccount = () => accounts.find(a => a.id === selectedAccountId);

    // Calculate available based on selection
    const currentAvailable = selectedAccountId
        ? (getSelectedAccount()?.available || 0)
        : globalAvailable;

    const handleInitialSubmit = () => {
        setError(null);
        if (!amount || parseFloat(amount) <= 0) {
            setError("Please enter a valid amount");
            return;
        }
        if (parseFloat(amount) > currentAvailable) {
            setError("Amount exceeds available payout for selected account");
            return;
        }
        if (parseFloat(amount) < 50) {
            setError("Minimum withdrawal is $50");
            return;
        }
        if (method === 'crypto' && !walletAddress) {
            setError("No wallet address found");
            return;
        }
        if (method === 'bank' && (!bankDetails || !bankDetails.is_locked)) {
            setError("No locked bank details found");
            return;
        }
        if (accounts.length > 0 && !selectedAccountId) {
            setError("Please select an account");
            return;
        }
        setShowConfirmation(true);
    };

    const confirmAndPay = async () => {
        const currentAmount = amount;
        const payoutMethodName = method === 'crypto' ? "USDT (TRC20)" : "Bank Transfer";
        const isSuccess = await onRequestPayout(parseFloat(currentAmount), method, selectedAccountId);

        if (isSuccess) {
            setSubmittedAmount(currentAmount);
            setShowConfirmation(false);
            setSuccess(true);
            setAmount("");
            setTimeout(() => {
                setSuccess(false);
                setSubmittedAmount(null);
            }, 4000);
        }
    };

    return (
        <div className="bg-[#050923] rounded-xl p-8 border border-white/10 relative overflow-hidden min-h-[460px]">
            <AnimatePresence mode="wait">
                {success ? (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[#050923]/95 backdrop-blur-xl z-20"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
                            className="relative w-24 h-24 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_rgba(34,197,94,0.4)]"
                        >
                            <CheckCircle size={48} className="text-white z-10" />
                            {[...Array(12)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ x: 0, y: 0, opacity: 0, scale: 0 }}
                                    animate={{
                                        x: (Math.random() - 0.5) * 250,
                                        y: (Math.random() - 0.5) * 250,
                                        opacity: [0, 1, 0],
                                        scale: [0, 1, 0],
                                        rotate: Math.random() * 360,
                                    }}
                                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                                    style={{
                                        backgroundColor: ['#22c55e', '#3b82f6', '#facc15', '#ffffff'][Math.floor(Math.random() * 4)],
                                    }}
                                    className="absolute w-2 h-2 rounded-full"
                                />
                            ))}
                        </motion.div>
                        <motion.h3
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="text-3xl font-bold text-white mb-2"
                        >
                            Success!
                        </motion.h3>
                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-gray-400 max-w-xs mx-auto"
                        >
                            Your withdrawal of <span className="text-white font-semibold">${submittedAmount}</span> has been requested.
                        </motion.p>
                    </motion.div>
                ) : showConfirmation ? (
                    <motion.div
                        key="confirm"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="flex flex-col p-8 bg-[#050923] z-10"
                    >
                        <h2 className="text-xl font-bold text-white mb-6">Confirm Withdrawal</h2>

                        <div className="flex-1 space-y-4">
                            <div className="bg-white/5 rounded-xl p-5 space-y-4 border border-white/5">
                                {selectedAccountId && (
                                    <div className="flex justify-between items-center pb-4 border-b border-white/10">
                                        <span className="text-gray-400 text-sm font-medium">Account</span>
                                        <span className="text-white text-sm font-mono tracking-tight">{getSelectedAccount()?.account_number}</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm font-medium">Amount</span>
                                    <span className="text-white text-xl font-bold tracking-tight">${parseFloat(amount).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400 text-sm font-medium">Fee (20% Profit Split)</span>
                                    <span className="text-red-400 text-xl font-bold tracking-tight">-${(parseFloat(amount) * 0.20).toFixed(2)}</span>
                                </div>
                                <div className="h-px bg-white/10 my-2" />
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-gray-300 text-sm font-medium uppercase tracking-wider">Total Receive (80%)</span>
                                    <span className="text-blue-400 text-2xl font-bold tracking-tight">${(parseFloat(amount) * 0.80).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 shadow-inner">
                                <span className="text-[10px] text-blue-400 uppercase font-black tracking-widest mb-2 block opacity-90">
                                    {method === 'crypto' ? 'Destination Wallet' : 'Bank Destination'}
                                </span>
                                <p className="text-xs text-gray-200 font-mono break-all leading-relaxed bg-black/20 p-2 rounded-lg border border-white/5">
                                    {method === 'crypto' ? walletAddress : `${bankDetails?.bank_name} - ${bankDetails?.account_number}`}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="px-4 py-3 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmAndPay}
                                disabled={isLoading}
                                className="px-4 py-3 rounded-lg bg-shark-blue hover:bg-blue-600 text-white font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 size={18} className="animate-spin" /> : "Confirm"}
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <motion.div
                        key="form"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Request Withdrawal</h2>
                        <p className="text-gray-300 font-medium text-sm mb-6 opacity-80">Choose your preferred withdrawal method and account.</p>

                        <div className="space-y-6">
                            {/* Method Selection */}
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setMethod("crypto")}
                                    className={cn(
                                        "p-3 rounded-lg border flex flex-col items-center gap-2 transition-all",
                                        method === "crypto"
                                            ? "bg-shark-blue/20 border-shark-blue text-white"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    <Wallet size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Crypto</span>
                                </button>
                                <button
                                    onClick={() => setMethod("bank")}
                                    className={cn(
                                        "p-3 rounded-lg border flex flex-col items-center gap-2 transition-all",
                                        method === "bank"
                                            ? "bg-shark-blue/20 border-shark-blue text-white"
                                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
                                    )}
                                >
                                    <MapPin size={18} />
                                    <span className="text-xs font-bold uppercase tracking-wider">Bank</span>
                                </button>
                            </div>
                            {/* Account Selection */}
                            {accounts.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Select Source Account
                                    </label>
                                    <div className="relative">
                                        <select
                                            value={selectedAccountId}
                                            onChange={(e) => {
                                                setSelectedAccountId(e.target.value);
                                                setAmount(""); // Reset amount on change
                                                setError(null);
                                            }}
                                            className="w-full pl-4 pr-10 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-shark-blue text-white appearance-none cursor-pointer transition-colors"
                                        >
                                            {accounts.map(acc => (
                                                <option key={acc.id} value={acc.id} className="bg-[#050923]">
                                                    {acc.account_number} ({acc.type}) - Avail: ${acc.available.toFixed(2)}
                                                </option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                                    </div>
                                </div>
                            )}

                            {/* Amount Input */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Withdrawal Amount (USD)
                                </label>
                                <div className="relative group">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => {
                                            setAmount(e.target.value);
                                            setError(null);
                                        }}
                                        disabled={currentAvailable <= 0 || !walletAddress || isLoading}
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-shark-blue text-white font-medium placeholder:text-gray-500 transition-colors disabled:opacity-50"
                                        placeholder="0.00"
                                    />
                                </div>

                                {error && (
                                    <p className="text-red-400 text-xs mt-2 flex items-center gap-1">
                                        <AlertTriangle size={12} /> {error}
                                    </p>
                                )}

                                <div className="flex justify-between items-center mt-3 text-xs">
                                    <span className="text-gray-400 font-medium">Available to withdraw: <span className="text-white font-bold ml-1">${currentAvailable.toFixed(2)}</span></span>
                                    <button
                                        onClick={() => setAmount(currentAvailable.toFixed(2))}
                                        disabled={currentAvailable <= 0 || !walletAddress}
                                        className="text-shark-blue font-bold uppercase tracking-tight hover:text-blue-400 transition-colors disabled:text-gray-600 px-2 py-1 bg-shark-blue/10 rounded-md"
                                    >
                                        Max Amount
                                    </button>
                                </div>
                            </div>

                            {/* Destination Info */}
                            {method === "crypto" ? (
                                walletAddress ? (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                                        <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-xs text-green-400 font-medium">Wallet Connected</p>
                                            <p className="text-xs text-gray-400 font-mono mt-1 break-all">{walletAddress}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-xs text-yellow-500 font-medium">No Wallet Address</p>
                                            <Link href="/settings" className="text-xs text-white underline hover:text-blue-400 mt-1 block">
                                                Add payout wallet in Settings
                                            </Link>
                                        </div>
                                    </div>
                                )
                            ) : (
                                bankDetails?.is_locked ? (
                                    <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                                        <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-xs text-green-400 font-medium">Bank Details Connected</p>
                                            <p className="text-xs text-gray-400 font-mono mt-1 break-all">{bankDetails.bank_name} - {bankDetails.account_number}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-3">
                                        <AlertTriangle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                                        <div>
                                            <p className="text-xs text-yellow-500 font-medium">No Bank Details</p>
                                            <Link href="/settings" className="text-xs text-white underline hover:text-blue-400 mt-1 block">
                                                Add bank details in Settings
                                            </Link>
                                        </div>
                                    </div>
                                )
                            )}

                            {/* KYC Warning */}
                            {!isKycVerified && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
                                    <div>
                                        <p className="text-xs text-red-500 font-medium">KYC Verification Required</p>
                                        <Link href="/kyc" className="text-xs text-white underline hover:text-red-400 mt-1 block">
                                            Complete verification here
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <button
                                onClick={handleInitialSubmit}
                                disabled={currentAvailable <= 0 || !walletAddress || isLoading || !amount || !isKycVerified}
                                className="relative w-full py-4 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all group disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-[0_0_20px_rgba(34,197,94,0.0)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] active:scale-[0.98]"
                                style={{
                                    background: isKycVerified
                                        ? "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)"
                                        : "linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)", // Red for blocked
                                }}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />

                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin relative z-10" />
                                        <span className="relative z-10">Processing...</span>
                                    </>
                                ) : !isKycVerified ? (
                                    <>
                                        <span className="relative z-10">Complete KYC First</span>
                                        <AlertTriangle size={20} className="relative z-10" />
                                    </>
                                ) : (
                                    <>
                                        <span className="relative z-10">Request Withdrawal</span>
                                        <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-gray-500">
                                Process time: 24-48 hours. Minimum withdrawal: $50.
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
