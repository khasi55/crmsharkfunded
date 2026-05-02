"use client";

import { useState } from "react";
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, TrendingDown, Clock, BarChart3, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ParsedTrade {
    ticket_number: string;
    symbol: string;
    type: "buy" | "sell";
    lots: number;
    open_price: number;
    close_price?: number;
    open_time: Date;
    close_time?: Date;
    profit_loss: number;
    commission?: number;
    swap?: number;
    magic_number?: number;
    comment?: string;
}

interface AnalysisResult {
    trade: ParsedTrade;
    violations: any[];
    is_breached: boolean;
    warnings: string[];
}

export default function RiskAnalysisPage() {
    const [file, setFile] = useState<File | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [results, setResults] = useState<AnalysisResult[]>([]);
    const [summary, setSummary] = useState<any>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const uploadedFile = e.target.files?.[0];
        if (!uploadedFile) return;

        setFile(uploadedFile);
        setAnalyzing(true);

        try {
            // Parse CSV file
            const text = await uploadedFile.text();
            const trades = parseCSV(text);

            // Analyze each trade
            const analysisResults: AnalysisResult[] = [];

            for (const trade of trades) {
                const response = await fetch('/api/risk/check', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        challengeId: 'demo-challenge',
                        trade
                    })
                });

                const result = await response.json();
                analysisResults.push({
                    trade,
                    violations: result.violations || [],
                    is_breached: result.is_breached || false,
                    warnings: result.warnings || []
                });
            }

            setResults(analysisResults);
            calculateSummary(analysisResults);
        } catch (error) {
            console.error('Analysis failed:', error);
            alert('Failed to analyze trades. Please check the file format.');
        } finally {
            setAnalyzing(false);
        }
    };

    const parseCSV = (text: string): ParsedTrade[] => {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

        return lines.slice(1).map(line => {
            const values = line.split(',');
            const row: any = {};
            headers.forEach((header, i) => {
                row[header] = values[i]?.trim();
            });

            return {
                ticket_number: row.ticket || row.ticket_number || Math.random().toString(),
                symbol: row.symbol || 'UNKNOWN',
                type: (row.type || row.action || 'buy').toLowerCase() as "buy" | "sell",
                lots: parseFloat(row.lots || row.volume || '0'),
                open_price: parseFloat(row.open_price || row.price || '0'),
                close_price: row.close_price ? parseFloat(row.close_price) : undefined,
                open_time: new Date(row.open_time || row.time || Date.now()),
                close_time: row.close_time ? new Date(row.close_time) : undefined,
                profit_loss: parseFloat(row.profit || row.profit_loss || row.pnl || '0'),
                commission: row.commission ? parseFloat(row.commission) : undefined,
                swap: row.swap ? parseFloat(row.swap) : undefined,
                magic_number: row.magic_number ? parseInt(row.magic_number) : undefined,
                comment: row.comment || undefined
            };
        });
    };

    const calculateSummary = (results: AnalysisResult[]) => {
        const totalTrades = results.length;
        const violatedTrades = results.filter(r => r.violations.length > 0).length;
        const breachedTrades = results.filter(r => r.is_breached).length;
        const cleanTrades = totalTrades - violatedTrades;

        const violationTypes: Record<string, number> = {};
        results.forEach(r => {
            r.violations.forEach(v => {
                violationTypes[v.violation_type] = (violationTypes[v.violation_type] || 0) + 1;
            });
        });

        setSummary({
            totalTrades,
            violatedTrades,
            breachedTrades,
            cleanTrades,
            violationTypes
        });
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'breach': return 'text-red-400 bg-red-500/10 border-red-500/20';
            case 'critical': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
            case 'warning': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
            default: return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-background p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground mb-2">Trade Risk Analysis</h1>
                    <p className="text-muted-foreground">Upload your trade history to analyze violations and risk compliance</p>
                </div>

                {/* Upload Section */}
                <div className="pro-card mb-8">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Upload className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-foreground">Upload Trade File</h2>
                                <p className="text-sm text-muted-foreground">Supports CSV format from MT4/MT5</p>
                            </div>
                        </div>
                    </div>

                    <label className={cn(
                        "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                        "hover:border-primary/50 hover:bg-primary/5",
                        file ? "border-primary/50 bg-primary/5" : "border-border"
                    )}>
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <FileText className="w-12 h-12 text-muted-foreground mb-3" />
                            <p className="mb-2 text-sm text-foreground font-semibold">
                                {file ? file.name : "Click to upload or drag and drop"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                CSV file with columns: ticket, symbol, type, lots, open_price, open_time, profit
                            </p>
                        </div>
                        <input
                            type="file"
                            className="hidden"
                            accept=".csv,.txt"
                            onChange={handleFileUpload}
                            disabled={analyzing}
                        />
                    </label>

                    {analyzing && (
                        <div className="mt-4 flex items-center justify-center gap-3 text-primary">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                            <span className="font-medium">Analyzing trades...</span>
                        </div>
                    )}
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="pro-card"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <BarChart3 className="w-5 h-5 text-blue-400" />
                                <span className="text-sm text-muted-foreground">Total Trades</span>
                            </div>
                            <p className="text-3xl font-bold text-foreground">{summary.totalTrades}</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                            className="pro-card"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <CheckCircle className="w-5 h-5 text-green-400" />
                                <span className="text-sm text-muted-foreground">Clean Trades</span>
                            </div>
                            <p className="text-3xl font-bold text-green-400">{summary.cleanTrades}</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className="pro-card"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <AlertTriangle className="w-5 h-5 text-orange-400" />
                                <span className="text-sm text-muted-foreground">Violated</span>
                            </div>
                            <p className="text-3xl font-bold text-orange-400">{summary.violatedTrades}</p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="pro-card"
                        >
                            <div className="flex items-center gap-3 mb-2">
                                <XCircle className="w-5 h-5 text-red-400" />
                                <span className="text-sm text-muted-foreground">Breached</span>
                            </div>
                            <p className="text-3xl font-bold text-red-400">{summary.breachedTrades}</p>
                        </motion.div>
                    </div>
                )}

                {/* Violation Types Breakdown */}
                {summary && Object.keys(summary.violationTypes).length > 0 && (
                    <div className="pro-card mb-8">
                        <h3 className="text-lg font-bold text-foreground mb-4">Violation Types</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {Object.entries(summary.violationTypes).map(([type, count]) => (
                                <div key={type} className="flex items-center justify-between p-3 rounded-lg bg-background border border-border">
                                    <span className="text-sm font-medium text-foreground capitalize">
                                        {type.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-lg font-bold text-destructive">{count as number}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trade Results */}
                {results.length > 0 && (
                    <div className="pro-card">
                        <h3 className="text-lg font-bold text-foreground mb-4">Detailed Trade Analysis</h3>
                        <div className="space-y-3">
                            <AnimatePresence>
                                {results.map((result, idx) => (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className={cn(
                                            "p-4 rounded-xl border transition-all",
                                            result.violations.length > 0
                                                ? "bg-destructive/5 border-destructive/20"
                                                : "bg-success/5 border-success/20"
                                        )}
                                    >
                                        {/* Trade Header */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                {result.violations.length > 0 ? (
                                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                                ) : (
                                                    <CheckCircle className="w-5 h-5 text-success" />
                                                )}
                                                <div>
                                                    <span className="font-bold text-foreground">#{result.trade.ticket_number}</span>
                                                    <span className="text-muted-foreground mx-2">•</span>
                                                    <span className="text-foreground">{result.trade.symbol}</span>
                                                    <span className="text-muted-foreground mx-2">•</span>
                                                    <span className={cn(
                                                        "text-xs font-semibold px-2 py-0.5 rounded-md",
                                                        result.trade.type === 'buy' ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                                                    )}>
                                                        {result.trade.type.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "font-bold text-lg",
                                                    result.trade.profit_loss >= 0 ? "text-success" : "text-destructive"
                                                )}>
                                                    {result.trade.profit_loss >= 0 ? "+" : ""}{result.trade.profit_loss.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">{result.trade.lots} lots</p>
                                            </div>
                                        </div>

                                        {/* Violations */}
                                        {result.violations.length > 0 && (
                                            <div className="space-y-2 mt-3 pt-3 border-t border-border">
                                                {result.violations.map((violation, vIdx) => (
                                                    <div
                                                        key={vIdx}
                                                        className={cn(
                                                            "flex items-start gap-3 p-3 rounded-lg border text-sm",
                                                            getSeverityColor(violation.severity)
                                                        )}
                                                    >
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="font-bold uppercase text-xs">
                                                                    {violation.severity}
                                                                </span>
                                                                <span className="text-xs opacity-75">•</span>
                                                                <span className="font-semibold capitalize">
                                                                    {violation.violation_type.replace(/_/g, ' ')}
                                                                </span>
                                                            </div>
                                                            <p className="opacity-90">{violation.description}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
