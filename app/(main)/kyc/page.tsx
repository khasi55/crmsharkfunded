"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
    ShieldCheck,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    AlertTriangle,
    UserCheck,
    FileCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

type KycStatus = 'not_started' | 'pending' | 'in_progress' | 'approved' | 'declined' | 'expired' | 'requires_review';

interface KycStatusData {
    status: KycStatus;
    hasSession: boolean;
    sessionId?: string;
    verificationUrl?: string;
    createdAt?: string;
    updatedAt?: string;
    completedAt?: string;
    firstName?: string;
    lastName?: string;
}

export default function KYCPage() {
    const [status, setStatus] = useState<KycStatusData | null>(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStatus();

        // Set up real-time subscription for KYC status updates
        const supabase = createClient();

        const channel = supabase
            .channel('kyc-realtime')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'kyc_sessions',
                },
                (payload) => {
                    console.log('🔄 KYC session updated:', payload);
                    fetchStatus();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchStatus = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/kyc/status');
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to fetch status');
            }

            setStatus(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const startVerification = async () => {
        try {
            setCreating(true);
            setError(null);
            const res = await fetch('/api/kyc/create-session', { method: 'POST' });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to start verification');
            }

            if (data.verificationUrl) {
                window.open(data.verificationUrl, '_blank');
                await fetchStatus();
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const getStatusConfig = (status: KycStatus) => {
        const configs = {
            not_started: {
                icon: ShieldCheck,
                title: 'Verify Your Identity',
                description: 'Complete KYC verification to enable withdrawals and unlock all features.',
                color: 'text-gray-400',
                bgColor: 'bg-gray-500/10',
                borderColor: 'border-gray-500/20',
            },
            pending: {
                icon: Clock,
                title: 'Verification Pending',
                description: 'Your verification session has been created. Click below to continue.',
                color: 'text-yellow-400',
                bgColor: 'bg-yellow-500/10',
                borderColor: 'border-yellow-500/20',
            },
            in_progress: {
                icon: Loader2,
                title: 'Verification In Progress',
                description: 'We are reviewing your documents. This usually takes a few minutes.',
                color: 'text-blue-400',
                bgColor: 'bg-blue-500/10',
                borderColor: 'border-blue-500/20',
            },
            approved: {
                icon: CheckCircle2,
                title: 'Verification Successful',
                description: 'Your identity has been verified. You now have full access to all features.',
                color: 'text-green-400',
                bgColor: 'bg-green-500/10',
                borderColor: 'border-green-500/20',
            },
            declined: {
                icon: XCircle,
                title: 'Verification Declined',
                description: 'Your verification was not successful. Please try again with valid documents.',
                color: 'text-red-400',
                bgColor: 'bg-red-500/10',
                borderColor: 'border-red-500/20',
            },
            expired: {
                icon: AlertTriangle,
                title: 'Session Expired',
                description: 'Your verification session has expired. Please start a new verification.',
                color: 'text-orange-400',
                bgColor: 'bg-orange-500/10',
                borderColor: 'border-orange-500/20',
            },
            requires_review: {
                icon: FileCheck,
                title: 'Under Manual Review',
                description: 'Your documents are being manually reviewed. This may take 24-48 hours.',
                color: 'text-purple-400',
                bgColor: 'bg-purple-500/10',
                borderColor: 'border-purple-500/20',
            },
        };
        return configs[status] || configs.not_started;
    };

    if (loading) {
        return (
            <div className="max-w-2xl mx-auto flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const currentStatus = status?.status || 'not_started';
    const config = getStatusConfig(currentStatus);
    const StatusIcon = config.icon;

    return (
        <div className="max-w-2xl mx-auto space-y-6 pt-4">
            {/* Header */}
            <div className="text-center mb-6">
                <h1 className="text-2xl font-bold text-white mb-1">Identity Verification</h1>
                <p className="text-gray-400 text-sm">Complete KYC verification to enable withdrawals and unlock all features.</p>
            </div>

            {/* Error Alert */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
                >
                    <AlertTriangle className="text-red-400" size={20} />
                    <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
            )}

            {/* Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "rounded-2xl p-8 border",
                    config.bgColor,
                    config.borderColor
                )}
            >
                <div className="flex flex-col items-center text-center">
                    <div className={cn(
                        "w-20 h-20 rounded-full flex items-center justify-center mb-6",
                        config.bgColor
                    )}>
                        <StatusIcon
                            size={40}
                            className={cn(
                                config.color,
                                currentStatus === 'in_progress' && 'animate-spin'
                            )}
                        />
                    </div>

                    <h2 className={cn("text-2xl font-bold mb-2", config.color)}>
                        {config.title}
                    </h2>
                    <p className="text-gray-400 mb-6 max-w-md">
                        {config.description}
                    </p>

                    {/* Action Buttons based on status */}
                    {(currentStatus === 'not_started' || currentStatus === 'declined' || currentStatus === 'expired') && (
                        <button
                            onClick={startVerification}
                            disabled={creating}
                            className="btn-primary px-8 py-3 flex items-center gap-2"
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Starting Verification...
                                </>
                            ) : (
                                <>
                                    <UserCheck size={18} />
                                    Start Verification
                                </>
                            )}
                        </button>
                    )}

                    {currentStatus === 'pending' && status?.verificationUrl && (
                        <a
                            href={status.verificationUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-primary px-8 py-3 flex items-center gap-2"
                        >
                            <ExternalLink size={18} />
                            Continue Verification
                        </a>
                    )}
                </div>
            </motion.div>

            {/* Approved User Info */}
            {currentStatus === 'approved' && status?.firstName && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-gray-900 border border-white/10 rounded-xl p-6"
                >
                    <h3 className="text-lg font-bold text-white mb-4">Verified Information</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-500">Name</span>
                            <p className="text-white font-medium">{status.firstName} {status.lastName}</p>
                        </div>
                        <div>
                            <span className="text-gray-500">Verified On</span>
                            <p className="text-white font-medium">
                                {status.completedAt ? new Date(status.completedAt).toLocaleDateString() : '-'}
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Steps/Info Section - Only show when not verified */}
            {currentStatus !== 'approved' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="bg-gray-900/50 border border-white/5 rounded-xl p-5"
                >
                    <h3 className="text-base font-bold text-white mb-3">What You'll Need</h3>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">1</div>
                            <p className="text-gray-300 text-sm">Government-Issued ID (Passport, License, or National ID)</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">2</div>
                            <p className="text-gray-300 text-sm">Selfie for face verification</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-5 h-5 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 text-xs font-bold">3</div>
                            <p className="text-gray-300 text-sm">Good lighting for clear photos</p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Footer Note - Only show when not verified */}
            {currentStatus !== 'approved' && (
                <p className="text-center text-gray-500 text-xs">
                    Your data is encrypted and processed securely. Verification typically completes within 2-5 minutes.
                </p>
            )}
        </div>
    );
}
