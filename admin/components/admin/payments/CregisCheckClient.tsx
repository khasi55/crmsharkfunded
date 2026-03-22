"use client";

import { useState } from "react";
import { fetchFromBackend } from "@/lib/backend-api";
import { Search, Loader2, CheckCircle, XCircle, Clock, Info, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export function CregisCheckClient() {
    const [orderId, setOrderId] = useState("");
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleCheck = async () => {
        if (!orderId.trim()) return;
        
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            // Call the local Next.js API route which proxies to the backend with proper auth
            const response = await fetch("/api/admin/payments/cregis/query", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ orderId: orderId.trim() }),
            });
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: response.statusText }));
                throw new Error(errorData.message || `Error ${response.status}`);
            }

            const data = await response.json();

            if (data.code === "00000") {
                setResult(data.data);
            } else {
                setError(data.msg || "Failed to fetch order status from Cregis");
            }
        } catch (err: any) {
            console.error("Cregis check error:", err);
            setError(err.message || "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    const getStatusIcon = (status: string) => {
        const s = String(status || '').toLowerCase();
        if (s === 'paid' || s === 'paid_over' || s === 'success') {
            return <CheckCircle className="h-5 w-5 text-green-500" />;
        }
        if (s === 'unpaid' || s === 'pending') {
            return <Clock className="h-5 w-5 text-yellow-500" />;
        }
        return <XCircle className="h-5 w-5 text-red-500" />;
    };

    const getStatusText = (status: string) => {
        const s = String(status || '').toLowerCase();
        if (s === 'paid_over') return "Paid (Overpaid)";
        if (s === 'paid') return "Paid / Success";
        if (s === 'unpaid') return "Unpaid / Pending";
        if (s === 'expired') return "Expired";
        if (s === 'cancel') return "Cancelled";
        return s.toUpperCase() || "Unknown";
    };

    // Helper to get payment info
    const firstPayment = result?.payment_detail?.[0] || {};

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Search Card */}
            <div className="bg-[#09090b] border border-[#1f1f23] rounded-xl overflow-hidden shadow-sm">
                <div className="p-6 space-y-4">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Search className="h-5 w-5 text-blue-500" />
                            Cregis Order Lookup
                        </h2>
                        <p className="text-sm text-gray-500">
                            Enter a Cregis Order ID or Merchant Order ID to check its current status.
                        </p>
                    </div>
                    
                    <div className="flex gap-3">
                        <input
                            type="text"
                            placeholder="Order ID (e.g. SF... or Cregis ID)"
                            value={orderId}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderId(e.target.value)}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && handleCheck()}
                            className="flex-1 bg-[#161618] border border-[#27272a] rounded-lg px-4 py-2 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                        <button 
                            onClick={handleCheck} 
                            disabled={loading || !orderId.trim()}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center min-w-[120px]"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check Status"}
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3 text-red-400">
                        <AlertTriangle className="h-5 w-5" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                </div>
            )}

            {result && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="bg-[#09090b] border border-[#1f1f23] rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-blue-600/10 border-b border-[#1f1f23] px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {getStatusIcon(result.status)}
                                <div>
                                    <h3 className="text-white font-bold">{getStatusText(result.status)}</h3>
                                    <p className="text-[11px] text-gray-500 uppercase tracking-wider mt-0.5">Payment Engine Status</p>
                                </div>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                                (result.status === 'paid' || result.status === 'paid_over')
                                    ? "bg-green-500/10 text-green-500 border-green-500/20" 
                                    : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20"
                            }`}>
                                {(result.status === 'paid' || result.status === 'paid_over') ? "COMPLETED" : "IN PROGRESS"}
                            </div>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <DetailItem label="Merchant Order ID" value={result.order_id || "-"} />
                                    <DetailItem label="Cregis ID" value={result.cregis_id || "-"} />
                                    <DetailItem label="Order Amount" value={`${result.order_amount || "-"} ${result.order_currency || ""}`} />
                                    <DetailItem label="Payer" value={result.payer_name || result.payer_email || "-"} />
                                </div>
                                <div className="space-y-4">
                                    <DetailItem label="Created At" value={result.created_time ? new Date(result.created_time).toLocaleString() : "-"} />
                                    <DetailItem label="Paid At" value={result.transact_time ? new Date(result.transact_time).toLocaleString() : "-"} />
                                    <DetailItem label="Network" value={`${firstPayment.blockchain || "-"} (${firstPayment.token_name || "-"})`} />
                                    <DetailItem 
                                        label="Transaction Hash" 
                                        value={firstPayment.tx_id || "-"} 
                                        isLink 
                                        link={firstPayment.blockchain?.toLowerCase().includes('tron') 
                                            ? `https://tronscan.org/#/transaction/${firstPayment.tx_id}` 
                                            : firstPayment.blockchain?.toLowerCase().includes('bsc') || firstPayment.blockchain?.toLowerCase().includes('smart chain')
                                                ? `https://bscscan.com/tx/${firstPayment.tx_id}`
                                                : `https://etherscan.io/tx/${firstPayment.tx_id}`} 
                                    />
                                </div>
                            </div>

                            {result.remark && (
                                <div className="mt-8 p-4 bg-[#161618] rounded-lg border border-[#27272a]">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Remark</p>
                                    <p className="text-sm text-gray-300">{result.remark}</p>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-[#1f1f23]">
                                <div className="flex items-center gap-2 text-gray-500">
                                    <Info className="h-4 w-4" />
                                    <p className="text-xs">Data directly from Cregis Gateway API v2</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

function DetailItem({ label, value, isLink, link }: { label: string, value: string, isLink?: boolean, link?: string }) {
    return (
        <div className="space-y-1">
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
            {isLink && value !== "-" ? (
                <a href={link} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:text-blue-300 hover:underline font-medium break-all flex items-center gap-1">
                    {value}
                    <Info className="h-3 w-3" />
                </a>
            ) : (
                <p className="text-sm text-white font-medium break-all">{value}</p>
            )}
        </div>
    );
}
