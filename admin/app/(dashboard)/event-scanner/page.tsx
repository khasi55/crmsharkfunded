'use client';

import { useState, useRef } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { CheckCircle2, XCircle, Search, Camera, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface EntryData {
    name: string;
    email: string;
    event: string;
    date: string;
    id: string;
}

export default function EventScannerPage() {
    const [scannedData, setScannedData] = useState<EntryData | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);

    // For manual error handling when backend is unreachable
    const [isProcessing, setIsProcessing] = useState(false);

    const handleScan = async (detectedCodes: any[]) => {
        if (isPaused || isProcessing || !detectedCodes.length) return;

        const rawValue = detectedCodes[0].rawValue;
        setIsProcessing(true);

        try {
            let data;
            try {
                data = JSON.parse(rawValue);
            } catch {
                throw new Error('Invalid QR Data Type');
            }

            // Basic validation
            if (!data.event || !data.id || !data.name) {
                throw new Error('Invalid Entry Pass Format');
            }

            if (data.event !== 'Shark Funded Exclusive Event') {
                throw new Error(`Wrong Event: ${data.event}`);
            }

            // Call Backend API
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/event/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code: data.id })
            });

            const result = await response.json();

            if (!response.ok || !result.valid) {
                throw new Error(result.message || 'Verification Failed');
            }

            setScannedData(data);
            setScanError(null);
            setIsPaused(true);
            toast.success(`Access Granted: ${data.name}`);

        } catch (error: any) {
            console.error('Scan Error:', error);
            setScanError(error.message || 'Invalid Entry Pass');
            setScannedData(null);
            setIsPaused(true);
            toast.error(error.message || 'Invalid QR Code');

            // Should prompt to retry manually instead of instant retry to avoid feedback loop
        } finally {
            setIsProcessing(false);
        }
    };

    const resetScan = () => {
        setScannedData(null);
        setScanError(null);
        setIsPaused(false);
        setIsProcessing(false);
    };

    return (
        <div className="min-h-[calc(100vh-80px)] p-4 md:p-8 flex flex-col items-center">

            <div className="w-full max-w-5xl">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                            Event Check-In
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">Shark Funded Exclusive Event</p>
                    </div>

                    {isPaused && (
                        <button
                            onClick={resetScan}
                            className="hidden md:flex items-center gap-2 px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-semibold hover:opacity-90 transition-all shadow-lg active:scale-95"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Next Attendee
                        </button>
                    )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">

                    {/* Scanner Column */}
                    <div className="order-1 flex flex-col gap-4">
                        <div className="bg-white dark:bg-[#0a0d20] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden relative group">

                            {/* Header overlay */}
                            <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-center text-white">
                                <span className="flex items-center gap-2 text-sm font-medium backdrop-blur-md bg-black/30 px-3 py-1 rounded-full border border-white/10">
                                    <Camera className="w-4 h-4 text-green-400" />
                                    Live Camera
                                </span>
                                {isProcessing && (
                                    <span className="text-xs uppercase tracking-wider font-bold animate-pulse text-blue-400">Processing...</span>
                                )}
                            </div>

                            <div className="aspect-[4/3] relative bg-black flex items-center justify-center">
                                {!isPaused ? (
                                    <>
                                        <Scanner
                                            onScan={handleScan}
                                            components={{
                                                onOff: true,
                                                torch: true,
                                                zoom: false,
                                                finder: true
                                            }}
                                            styles={{
                                                container: { width: '100%', height: '100%', objectFit: 'cover' },
                                                video: { width: '100%', height: '100%', objectFit: 'cover' }
                                            }}
                                            allowMultiple={true}
                                            scanDelay={800} // Increased delay to prevent double reads slightly
                                        />
                                        {/* Custom Overlay Grid */}
                                        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat"></div>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center">
                                        <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center mb-4">
                                            <Camera className="w-8 h-8 text-blue-500" />
                                        </div>
                                        <h3 className="text-xl font-bold mb-2">Scanning Paused</h3>
                                        <p className="text-gray-400 mb-6 max-w-xs text-sm">Review the result on the side or click below to verify the next attendee.</p>
                                        <button
                                            onClick={resetScan}
                                            className="px-8 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-500 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                            Resume Camera
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        <p className="text-center text-xs text-gray-400 dark:text-gray-600 px-4">
                            Ensure the QR code is clearly visible and centered. Good lighting helps.
                        </p>
                    </div>

                    {/* Result Column */}
                    <div className="order-2 flex flex-col h-full min-h-[400px]">
                        <div className={`flex-1 rounded-3xl shadow-2xl border transition-all duration-500 flex flex-col relative overflow-hidden ${scannedData
                                ? 'bg-gradient-to-br from-green-50 to-white dark:from-green-900/10 dark:to-[#0a0d20] border-green-200 dark:border-green-800'
                                : scanError
                                    ? 'bg-gradient-to-br from-red-50 to-white dark:from-red-900/10 dark:to-[#0a0d20] border-red-200 dark:border-red-800'
                                    : 'bg-white dark:bg-[#0a0d20] border-gray-100 dark:border-white/5'
                            }`}>

                            {/* Status Stripe */}
                            <div className={`h-2 w-full absolute top-0 left-0 ${scannedData ? 'bg-green-500' : scanError ? 'bg-red-500' : 'bg-transparent'
                                }`} />

                            <div className="flex-1 p-8 md:p-10 flex flex-col items-center justify-center text-center">
                                {scannedData ? (
                                    <>
                                        <div className="scale-100 animate-[bounce_0.5s_ease-in-out_1]">
                                            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                                <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
                                            </div>
                                        </div>

                                        <h2 className="text-3xl font-bold text-green-700 dark:text-green-400 mb-1">Access Granted</h2>
                                        <p className="text-green-600/80 dark:text-green-500/80 font-medium mb-8">Valid Entry Pass</p>

                                        <div className="w-full bg-white/50 dark:bg-black/20 rounded-2xl p-6 text-left border border-green-100 dark:border-green-900/30 shadow-sm backdrop-blur-sm">
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1 block">Attendee Name</label>
                                                    <p className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{scannedData.name}</p>
                                                </div>
                                                <div className="h-px bg-gray-200 dark:bg-white/10 w-full" />
                                                <div>
                                                    <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1 block">Email Address</label>
                                                    <p className="text-base text-gray-700 dark:text-gray-300 font-medium break-all">{scannedData.email}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4 pt-2">
                                                    <div>
                                                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1 block">Event Date</label>
                                                        <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{scannedData.date}</p>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-1 block">Pass Reference</label>
                                                        <p className="font-mono text-sm text-gray-500">{scannedData.id}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={resetScan}
                                            className="mt-auto pt-8 w-full"
                                        >
                                            <div className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-green-200 dark:shadow-none shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                                <RefreshCw className="w-5 h-5" />
                                                Verify Next Person
                                            </div>
                                        </button>
                                    </>
                                ) : scanError ? (
                                    <>
                                        <div className="scale-100 animate-[shake_0.5s_ease-in-out_1]">
                                            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6 shadow-sm">
                                                <XCircle className="w-12 h-12 text-red-600 dark:text-red-400" />
                                            </div>
                                        </div>

                                        <h2 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">Access Denied</h2>

                                        <div className="max-w-xs mx-auto mb-8 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg border border-red-100 dark:border-red-900/50">
                                            <p className="text-red-700 dark:text-red-300 font-medium text-sm leading-relaxed">{scanError}</p>
                                        </div>

                                        <button
                                            onClick={resetScan}
                                            className="mt-auto w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold shadow-xl transition-all hover:opacity-90 active:scale-[0.98]"
                                        >
                                            Try Again
                                        </button>
                                    </>
                                ) : (
                                    <div className="opacity-50 flex flex-col items-center">
                                        <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                            <Search className="w-10 h-10 text-gray-400" />
                                        </div>
                                        <h2 className="text-2xl font-semibold text-gray-400 dark:text-gray-500">Ready to Scan</h2>
                                        <p className="text-gray-400 text-sm mt-2 max-w-[200px]">
                                            Point the camera at an attendee's QR code.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
