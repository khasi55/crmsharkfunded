"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ViolationDetailsProps {
    violations: any[];
}

export default function ViolationDetailsRow({ violations }: ViolationDetailsProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
            >
                {isExpanded ? (
                    <>
                        <ChevronUp size={14} /> Hide Details
                    </>
                ) : (
                    <>
                        <ChevronDown size={14} /> Show Details ({violations.length})
                    </>
                )}
            </button>

            {isExpanded && (
                <tr>
                    <td colSpan={6} className="px-6 py-4 bg-gray-50">
                        <div className="space-y-3">
                            <h4 className="text-sm font-semibold text-gray-900 mb-3">
                                Violation Details ({violations.length} total)
                            </h4>
                            <div className="space-y-2">
                                {violations.map((violation: any, idx: number) => (
                                    <div
                                        key={violation.id}
                                        className="bg-white border border-gray-200 rounded-lg p-3 text-xs"
                                    >
                                        <div className="grid grid-cols-4 gap-3">
                                            <div>
                                                <span className="font-semibold text-gray-600">Type:</span>
                                                <p className="text-gray-900 capitalize mt-1">
                                                    {violation.flag_type.replace('_', ' ')}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-600">Trade Ticket:</span>
                                                <p className="font-mono text-gray-900 mt-1">
                                                    {violation.trade_ticket || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-600">Symbol:</span>
                                                <p className="text-gray-900 mt-1">
                                                    {violation.symbol || 'N/A'}
                                                </p>
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-600">Severity:</span>
                                                <p className="mt-1">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${violation.severity === 'breach'
                                                            ? 'bg-red-100 text-red-800'
                                                            : 'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                        {violation.severity?.toUpperCase()}
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="col-span-4">
                                                <span className="font-semibold text-gray-600">Description:</span>
                                                <p className="text-gray-900 mt-1">{violation.description}</p>
                                            </div>
                                            <div className="col-span-4">
                                                <span className="font-semibold text-gray-600">Time:</span>
                                                <p className="text-gray-600 mt-1">
                                                    {new Date(violation.created_at).toLocaleString()}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    );
}
