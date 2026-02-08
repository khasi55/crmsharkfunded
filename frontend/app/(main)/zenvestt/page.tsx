"use client";

import { useAccount } from "@/contexts/AccountContext";
import { motion } from "framer-motion";
import { Sparkles, Download, CheckCircle, AlertCircle } from "lucide-react";
import { useState } from "react";
import { fetchFromBackend } from "@/lib/backend-api";

export default function ZenvesttPage() {
    const { accounts, loading } = useAccount();
    const [importing, setImporting] = useState<string | null>(null);
    const [status, setStatus] = useState<{ [key: string]: 'success' | 'error' | null }>({});

    const handleImportToZenvestt = async (accountId: string) => {
        setImporting(accountId);
        setStatus(prev => ({ ...prev, [accountId]: null }));

        try {
            // 1. Fetch Trades for this account
            const response = await fetchFromBackend(`/api/dashboard/trades?accountId=${accountId}&limit=10000`);

            if (!response || !response.trades) {
                throw new Error("No trades found or failed to fetch");
            }

            const trades = response.trades;

            // console.log(`Fetched ${trades.length} trades for account ${accountId}`);

            // 2. Prepare Payload (The "Parameters")
            const payload = {
                source: "sharkfunded_crm",
                account_id: accountId,
                timestamp: new Date().toISOString(),
                trades: trades.map((t: any) => ({
                    ticket: t.ticket_number,
                    open_time: t.open_time,
                    close_time: t.close_time,
                    symbol: t.symbol,
                    type: t.type,
                    lots: Number(t.lots),
                    open_price: Number(t.open_price),
                    close_price: Number(t.close_price),
                    profit: Number(t.profit_loss),
                    commission: Number(t.commission || 0),
                    swap: Number(t.swap || 0)
                }))
            };

            // console.log("Preparing to send payload to Zenvestt:", payload);

            // Placeholder for the URL the user will provide
            // const ZENVESTT_URL = "https://api.zenvestt.com/import"; 

            // Simulation of sending
            await new Promise(resolve => setTimeout(resolve, 1500));

            // alert("Ready to send " + trades.length + " trades. waiting for URL.");

            setStatus(prev => ({ ...prev, [accountId]: 'success' }));

        } catch (error) {
            console.error("Import failed:", error);
            setStatus(prev => ({ ...prev, [accountId]: 'error' }));
        } finally {
            setImporting(null);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Sparkles className="text-purple-600 w-8 h-8" />
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Zenvestt Integration</h1>
                </div>
                <p className="text-slate-500 font-medium">Import your trading history directly to Zenvestt for advanced analytics.</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {accounts.map((account) => (
                        <motion.div
                            key={account.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.02 }}
                            className="bg-[#0a0d20] border border-white/10 rounded-2xl p-6 relative overflow-hidden group"
                        >
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Sparkles className="w-24 h-24 text-purple-600 rotate-12" />
                            </div>

                            <div className="relative z-10 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm text-gray-400 font-medium">Account</p>
                                        <p className="text-xl font-bold text-white font-mono">{account.login}</p>
                                    </div>
                                    <div className={`px-2 py-1 rounded-md text-xs font-bold ${account.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                        account.status === 'breached' ? 'bg-red-500/20 text-red-400' : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {account.status.toUpperCase()}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2 border-y border-white/5">
                                    <div>
                                        <p className="text-xs text-gray-500">Balance</p>
                                        <p className="text-lg font-semibold text-white">${account.balance.toLocaleString()}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Equity</p>
                                        <p className="text-lg font-semibold text-blue-400">${account.equity.toLocaleString()}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleImportToZenvestt(account.id)}
                                    disabled={importing === account.id || status[account.id] === 'success'}
                                    className={`w-full py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${status[account.id] === 'success'
                                        ? 'bg-green-500/20 text-green-400 cursor-default'
                                        : status[account.id] === 'error'
                                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                            : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-500/20'
                                        }`}
                                >
                                    {importing === account.id ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Exporting...</span>
                                        </>
                                    ) : status[account.id] === 'success' ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Sent to Zenvestt</span>
                                        </>
                                    ) : status[account.id] === 'error' ? (
                                        <>
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Retry Import</span>
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            <span>Import to Zenvestt</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}
