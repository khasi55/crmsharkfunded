import { motion } from "framer-motion";
import { format } from "date-fns";
import Link from "next/link";
import { Award } from "lucide-react";

interface PayoutRequest {
    id: string;
    created_at: string;
    amount: number;
    payout_method: string;
    status: string;
}

export default function PayoutHistoryTable({ requests = [] }: { requests?: PayoutRequest[] }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-900 rounded-xl p-6 border border-white/10"
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-white">Transaction History</h2>
                    <p className="text-gray-400 text-sm">Recent payout requests and their status</p>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/5 text-left">
                            <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Method</th>
                            <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Certificate</th>
                            <th className="py-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">ID</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {requests.length === 0 ? (
                            <tr>
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                                        No payout history found.
                                    </td>
                                </tr>                            </tr>
                        ) : (
                            requests.map((tx, index) => (
                                <motion.tr
                                    key={tx.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group hover:bg-white/5 transition-colors"
                                >
                                    <td className="py-4 px-4 text-gray-400 text-sm">
                                        {format(new Date(tx.created_at), "MMM dd, yyyy")}
                                    </td>
                                    <td className="py-4 px-4 text-white font-medium text-sm">
                                        ${Number(tx.amount).toFixed(2)}
                                    </td>
                                    <td className="py-4 px-4 text-gray-400 text-sm">{tx.payout_method}</td>
                                    <td className="py-4 px-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium capitalize
                                            ${tx.status === 'processed' ? 'bg-green-500/20 text-green-400' : ''}
                                            ${tx.status === 'pending' ? 'bg-amber-500/20 text-amber-400' : ''}
                                            ${tx.status === 'rejected' ? 'bg-red-500/20 text-red-400' : ''}
                                        `}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-4 text-right">
                                        {tx.status === 'processed' ? (
                                            <Link
                                                href={`/certificates/${tx.id}`}
                                                className="inline-flex items-center gap-1 text-shark-blue hover:text-blue-400 text-xs font-medium transition-colors"
                                            >
                                                <Award size={14} /> View
                                            </Link>
                                        ) : (
                                            <span className="text-gray-600 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="py-4 px-4 text-gray-500 text-xs text-right font-mono">
                                        #{tx.id.slice(0, 8)}
                                    </td>
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </motion.div>
    );
}
