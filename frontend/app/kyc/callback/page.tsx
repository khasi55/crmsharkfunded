"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

function KYCCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'declined'>('loading');
    const [message, setMessage] = useState('Processing verification...');
    const [callbackData, setCallbackData] = useState<Record<string, string>>({});
    const [updateResult, setUpdateResult] = useState<any>(null);

    useEffect(() => {
        // Extract all query parameters from Didit callback
        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            params[key] = value;
        });
        setCallbackData(params);

        console.log('Didit Callback Parameters:', params);

        // Get the status from query params (Didit uses various formats)
        const verificationStatus = params.status || params.Status || params.decision;
        const sessionId = params.verificationSessionId || params.session_id || params.sessionId;

        // Extract KYC data from callback params
        const kycData: Record<string, any> = {
            didit_session_id: sessionId,
            raw_response: params,
        };

        // Map common Didit callback fields to our schema
        if (params.firstName || params.first_name) kycData.first_name = params.firstName || params.first_name;
        if (params.lastName || params.last_name) kycData.last_name = params.lastName || params.last_name;
        if (params.dateOfBirth || params.date_of_birth || params.dob) {
            kycData.date_of_birth = params.dateOfBirth || params.date_of_birth || params.dob;
        }
        if (params.nationality) kycData.nationality = params.nationality;
        if (params.documentType || params.document_type) {
            kycData.document_type = params.documentType || params.document_type;
        }
        if (params.documentNumber || params.document_number) {
            kycData.document_number = params.documentNumber || params.document_number;
        }
        if (params.documentCountry || params.document_country || params.issuingCountry) {
            kycData.document_country = params.documentCountry || params.document_country || params.issuingCountry;
        }
        if (params.country) kycData.country = params.country;
        if (params.city) kycData.city = params.city;
        if (params.address || params.address_line1) kycData.address_line1 = params.address || params.address_line1;
        if (params.postalCode || params.postal_code || params.zipCode) {
            kycData.postal_code = params.postalCode || params.postal_code || params.zipCode;
        }

        // Update status based on Didit response
        if (verificationStatus) {
            const normalizedStatus = verificationStatus.toLowerCase();
            if (normalizedStatus === 'approved' || normalizedStatus === 'accepted') {
                setStatus('success');
                setMessage('Verification successful!');
                kycData.status = 'approved';
            } else if (normalizedStatus === 'declined' || normalizedStatus === 'rejected') {
                setStatus('declined');
                setMessage('Verification was declined.');
                kycData.status = 'declined';
            } else if (normalizedStatus.includes('review')) {
                setStatus('loading');
                setMessage('Verification is under review.');
                kycData.status = 'requires_review';
            } else {
                setStatus('loading');
                setMessage(`Verification status: ${verificationStatus}`);
                kycData.status = 'in_progress';
            }

            // Send all data to our API
            updateKycData(kycData);
        } else {
            setStatus('loading');
            setMessage('Checking verification status...');
            checkStatus();
        }
    }, [searchParams]);

    const updateKycData = async (data: Record<string, any>) => {
        try {
            console.log('Sending KYC data to API:', data);
            const res = await fetch('/api/kyc/update-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            const result = await res.json();
            console.log('KYC Update Result:', result);
            setUpdateResult(result);
        } catch (error) {
            console.error('Failed to update KYC data:', error);
            setUpdateResult({ error: 'Failed to update' });
        }
    };

    const checkStatus = async () => {
        try {
            const res = await fetch('/api/kyc/status');
            const data = await res.json();

            if (data.status === 'approved') {
                setStatus('success');
                setMessage('Verification successful!');
            } else if (data.status === 'declined') {
                setStatus('declined');
                setMessage('Verification was not successful.');
            } else {
                setStatus('success');
                setMessage('Verification submitted. We are processing your documents...');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Something went wrong.');
        }
    };

    const goToKycPage = () => {
        router.push('/kyc');
    };

    return (
        <div className="min-h-[60vh] flex items-center justify-center">
            <div className="text-center max-w-lg mx-auto p-6">
                {status === 'loading' && (
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
                )}
                {status === 'success' && (
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                )}
                {status === 'declined' && (
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                )}
                {status === 'error' && (
                    <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                )}

                <h2 className="text-xl font-bold text-white mb-2">{message}</h2>

                {/* Show callback data for debugging */}
                {Object.keys(callbackData).length > 0 && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg text-left">
                        <p className="text-gray-400 text-xs mb-2">Callback Data from Didit:</p>
                        <pre className="text-green-400 text-xs overflow-auto max-h-48">
                            {JSON.stringify(callbackData, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Show update result */}
                {updateResult && (
                    <div className="mt-4 p-4 bg-gray-800 rounded-lg text-left">
                        <p className="text-gray-400 text-xs mb-2">Database Update Result:</p>
                        <pre className={`text-xs overflow-auto ${updateResult.error ? 'text-red-400' : 'text-blue-400'}`}>
                            {JSON.stringify(updateResult, null, 2)}
                        </pre>
                    </div>
                )}

                <button
                    onClick={goToKycPage}
                    className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                    Go to KYC Page
                </button>
            </div>
        </div>
    );
}

export default function KYCCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[60vh] flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <KYCCallbackContent />
        </Suspense>
    );
}
