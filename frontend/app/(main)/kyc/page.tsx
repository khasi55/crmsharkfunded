"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ShieldCheck,
    ExternalLink,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    AlertTriangle,
    UserCheck,
    FileCheck,
    Upload,
    Camera,
    Image as ImageIcon,
    ChevronRight,
    ChevronLeft
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { fetchFromBackend } from "@/lib/backend-api";

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

    // Manual Flow State
    const [showManualFlow, setShowManualFlow] = useState(false);
    const [step, setStep] = useState(1);
    const [files, setFiles] = useState<{
        front: File | null;
        back: File | null;
        selfie: File | null;
    }>({
        front: null,
        back: null,
        selfie: null
    });
    const [previews, setPreviews] = useState<{
        front: string | null;
        back: string | null;
        selfie: string | null;
    }>({
        front: null,
        back: null,
        selfie: null
    });
    const [submitting, setSubmitting] = useState(false);

    // Camera State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

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
            const data = await fetchFromBackend('/api/kyc/status');
            setStatus(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (type: 'front' | 'back' | 'selfie', file: File | null) => {
        if (!file) return;

        setFiles(prev => ({ ...prev, [type]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const uploadToSupabase = async (file: File | Blob, path: string) => {
        const supabase = createClient();
        const fileExt = file instanceof File ? file.name.split('.').pop() : 'jpg';
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${path}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
            .from('kyc-documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('kyc-documents')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    useEffect(() => {
        if (isCameraActive && videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
        }
    }, [isCameraActive]);

    const startCamera = async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
            });
            streamRef.current = stream;
            setIsCameraActive(true);
        } catch (err: any) {
            console.error('Camera error:', err);
            setCameraError('Unable to access camera. Please check permissions or upload a file instead.');
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(videoRef.current, 0, 0);

        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
                setFiles(prev => ({ ...prev, selfie: file }));
                setPreviews(prev => ({ ...prev, selfie: canvas.toDataURL('image/jpeg') }));
                stopCamera();
            }
        }, 'image/jpeg', 0.9);
    };

    const handleSubmitManual = async () => {
        try {
            setSubmitting(true);
            setError(null);

            if (!files.front || !files.selfie) {
                throw new Error('Front ID and Selfie are required');
            }

            const supabase = createClient();
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const userId = user.id;

            // 1. Upload files
            const frontUrl = await uploadToSupabase(files.front, `${userId}/front`);
            let backUrl = null;
            if (files.back) {
                backUrl = await uploadToSupabase(files.back, `${userId}/back`);
            }
            const selfieUrl = await uploadToSupabase(files.selfie, `${userId}/selfie`);

            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            // 2. Submit to backend
            const data = await fetchFromBackend('/api/kyc/submit-manual', {
                method: 'POST',
                body: JSON.stringify({
                    front_id_url: frontUrl,
                    back_id_url: backUrl,
                    selfie_url: selfieUrl,
                    // Optionally add more fields here if you want to collect them in the UI
                }),
            });

            setShowManualFlow(false);
            await fetchStatus();

        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusConfig = (status: KycStatus) => {
        const configs = {
            not_started: {
                icon: ShieldCheck,
                title: 'Verify Your Identity',
                description: 'Complete KYC verification to enable withdrawals and unlock all features.',
                color: 'text-slate-400',
                bgColor: 'bg-slate-500/10',
                borderColor: 'border-slate-500/20',
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

    if (showManualFlow) {
        return (
            <div className="max-w-2xl mx-auto space-y-6 pt-4 px-4 sm:px-0">
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={() => setShowManualFlow(false)}
                        className="text-slate-500 hover:text-black flex items-center gap-1 text-sm font-medium"
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map(s => (
                            <div
                                key={s}
                                className={cn(
                                    "w-8 h-1.5 rounded-full transition-all duration-300",
                                    step >= s ? "bg-blue-500" : "bg-slate-200"
                                )}
                            />
                        ))}
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm"
                >
                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-black mb-2">Step 1: ID Card (Front)</h2>
                                <p className="text-slate-500 text-sm">Please upload a clear photo of the front of your government-issued ID.</p>
                            </div>

                            <div
                                className={cn(
                                    "relative aspect-[3/2] rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors",
                                    previews.front ? "border-blue-500/50" : "border-slate-300 hover:border-blue-500/50"
                                )}
                            >
                                {previews.front ? (
                                    <>
                                        <img src={previews.front} alt="Front ID" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white text-sm font-medium">Click to Change</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm font-medium">ID Card Front Photo</p>
                                        <p className="text-slate-400 text-xs mt-1">PNG, JPG or WebP (Max 10MB)</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handleFileChange('front', e.target.files?.[0] || null)}
                                />
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!files.front}
                                className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next Step
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-black mb-2">Step 2: ID Card (Back)</h2>
                                <p className="text-slate-500 text-sm">Please upload a clear photo of the back of your government-issued ID.</p>
                            </div>

                            <div
                                className={cn(
                                    "relative aspect-[3/2] rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-colors",
                                    previews.back ? "border-blue-500/50" : "border-slate-300 hover:border-blue-500/50"
                                )}
                            >
                                {previews.back ? (
                                    <>
                                        <img src={previews.back} alt="Back ID" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white text-sm font-medium">Click to Change</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 text-sm font-medium">ID Card Back Photo</p>
                                        <p className="text-slate-400 text-xs mt-1">PNG, JPG or WebP (Optional)</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => handleFileChange('back', e.target.files?.[0] || null)}
                                />
                            </div>

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex-[2] btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
                                >
                                    Next Step
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <h2 className="text-xl font-bold text-black mb-2">Step 3: Live Selfie</h2>
                                <p className="text-slate-500 text-sm">Please upload a clear selfie of yourself holding your ID card (if possible).</p>
                            </div>

                            <div
                                className={cn(
                                    "relative aspect-[3/2] rounded-xl border-2 border-dashed flex flex-col items-center justify-center overflow-hidden transition-all duration-300",
                                    previews.selfie || isCameraActive ? "border-blue-500/50" : "border-slate-300 hover:border-blue-500/50",
                                    isCameraActive && "border-solid bg-black"
                                )}
                            >
                                {isCameraActive ? (
                                    <div className="relative w-full h-full">
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-cover mirror"
                                            style={{ transform: 'scaleX(-1)' }} // Mirror the selfie feed
                                        />
                                        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 px-4">
                                            <button
                                                onClick={stopCamera}
                                                className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={capturePhoto}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                                Capture Photo
                                            </button>
                                        </div>
                                    </div>
                                ) : previews.selfie ? (
                                    <>
                                        <img src={previews.selfie} alt="Selfie" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-3">
                                            <button
                                                onClick={startCamera}
                                                className="bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-blue-50"
                                            >
                                                <Camera size={16} />
                                                Retake Photo
                                            </button>
                                            <p className="text-white text-xs">Or click to upload different file</p>
                                        </div>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                            onChange={(e) => handleFileChange('selfie', e.target.files?.[0] || null)}
                                        />
                                    </>
                                ) : (
                                    <div className="relative w-full h-full flex flex-col items-center justify-center group">
                                        <div className="text-center p-6 mb-2">
                                            <Camera className="w-10 h-10 text-slate-300 mx-auto mb-3 group-hover:text-blue-400 transition-colors" />
                                            <p className="text-slate-500 text-sm font-medium">Capture or Upload Selfie</p>
                                            <p className="text-slate-400 text-xs mt-1">Make sure your face is clearly visible</p>
                                        </div>

                                        <div className="flex flex-col gap-2 w-full max-w-[200px] px-4">
                                            <button
                                                onClick={startCamera}
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-bold transition-all shadow-md flex items-center justify-center gap-2"
                                            >
                                                <Camera size={16} />
                                                Use Camera
                                            </button>
                                            <div className="relative">
                                                <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg text-sm font-medium transition-all">
                                                    Upload File
                                                </button>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => handleFileChange('selfie', e.target.files?.[0] || null)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {cameraError && (
                                <p className="text-red-500 text-xs text-center mt-2">{cameraError}</p>
                            )}

                            <div className="flex gap-4">
                                <button
                                    onClick={() => setStep(2)}
                                    disabled={submitting}
                                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={handleSubmitManual}
                                    disabled={!files.selfie || submitting}
                                    className="flex-[2] btn-primary py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : (
                                        <>
                                            <FileCheck size={18} />
                                            Submit for Review
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </motion.div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3"
                    >
                        <AlertTriangle className="text-red-400 flex-shrink-0" size={18} />
                        <p className="text-red-400 text-sm">{error}</p>
                    </motion.div>
                )
                }
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 pt-2 sm:pt-4 px-4 sm:px-0">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-black mb-1">Identity Verification</h1>
                <p className="text-slate-500 text-xs sm:text-sm">Complete KYC verification to enable withdrawals and unlock all features.</p>
            </div>

            {/* Error Alert */}
            {error && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
                    <AlertTriangle className="text-red-400" size={16} />
                    <p className="text-red-400 text-xs sm:text-sm">{error}</p>
                </motion.div>
            )}

            {/* Status Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                    "rounded-xl sm:rounded-2xl p-6 sm:p-8 border shadow-sm",
                    config.bgColor,
                    config.borderColor
                )}
            >
                <div className="flex flex-col items-center text-center">
                    <div className={cn(
                        "w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mb-4 sm:mb-6",
                        config.bgColor
                    )}>
                        <StatusIcon
                            size={32}
                            className={cn(
                                "sm:w-10 sm:h-10",
                                config.color,
                                currentStatus === 'in_progress' && 'animate-spin'
                            )}
                        />
                    </div>

                    <h2 className={cn("text-xl sm:text-2xl font-bold mb-2", config.color)}>
                        {config.title}
                    </h2>
                    <p className="text-slate-500 mb-4 sm:mb-6 max-w-md text-sm sm:text-base">
                        {config.description}
                    </p>

                    {/* Action Buttons based on status */}
                    {(currentStatus === 'not_started' || currentStatus === 'declined' || currentStatus === 'expired') && (
                        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setShowManualFlow(true)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-500/20"
                            >
                                <Upload size={18} />
                                Upload Documents Manually
                            </button>
                        </div>
                    )}

                    {currentStatus === 'pending' && status?.verificationUrl && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <a
                                href={status.verificationUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary px-6 sm:px-8 py-2.5 sm:py-3 flex items-center gap-2 touch-manipulation text-sm sm:text-base active:scale-95"
                            >
                                <ExternalLink size={16} className="sm:w-[18px] sm:h-[18px]" />
                                <span className="hidden sm:inline">Continue Didit Verification</span>
                                <span className="sm:hidden">Continue</span>
                            </a>
                            <button
                                onClick={() => setShowManualFlow(true)}
                                className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors"
                            >
                                Switch to Manual Upload
                            </button>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Approved User Info */}
            {currentStatus === 'approved' && status?.firstName && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6 shadow-sm"
                >
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">Verified Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                        <div>
                            <span className="text-slate-500">Name</span>
                            <p className="text-slate-900 font-medium">{status.firstName} {status.lastName}</p>
                        </div>
                        <div>
                            <span className="text-slate-500">Verified On</span>
                            <p className="text-slate-900 font-medium">
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
                    className="bg-[#050B24] border border-slate-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm"
                >
                    <h3 className="text-base sm:text-lg font-bold text-white mb-3 sm:mb-4">Manual KYC Requirements</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">1</div>
                            <div>
                                <p className="text-white text-sm font-medium">Front & Back of ID</p>
                                <p className="text-slate-400 text-xs mt-0.5">Passport, National ID, or Driver's License.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">2</div>
                            <div>
                                <p className="text-white text-sm font-medium">Live Selfie</p>
                                <p className="text-slate-400 text-xs mt-0.5">Selfie of yourself with clear lighting.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">3</div>
                            <div>
                                <p className="text-white text-sm font-medium">Manual Review</p>
                                <p className="text-slate-400 text-xs mt-0.5">Our team will manually verify your documents within 24-48 hours.</p>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Footer Note - Only show when not verified */}
            {currentStatus !== 'approved' && (
                <p className="text-center text-slate-400 text-xs">
                    Your data is encrypted and processed securely according to our privacy policy.
                </p>
            )}
        </div>
    );
}
