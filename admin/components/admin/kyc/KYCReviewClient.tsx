"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import {
    ChevronLeft, User, MapPin, FileText, Shield,
    CheckCircle, XCircle, AlertTriangle, Download,
    Maximize2, ExternalLink, Calendar, Mail, Upload
} from "lucide-react";
import { format } from "date-fns";

interface KYCSession {
    id: string;
    didit_session_id: string;
    status: string;
    created_at: string;
    updated_at: string;
    completed_at?: string;

    // Identity
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    nationality?: string;

    // Document
    document_type?: string;
    document_number?: string;
    document_country?: string;

    // Address
    address_line1?: string;
    address_line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;

    // Risk
    aml_status?: string;
    face_match_score?: number;
    liveness_score?: number;

    // Manual Document Upload
    manual_document_url?: string;
    manual_document_type?: string;
    front_id_url?: string;
    back_id_url?: string;
    selfie_url?: string;
    kyc_mode?: string;
    rejection_reason?: string;
    approved_by?: string;
    approved_at?: string;

    profiles: {
        full_name: string;
        email: string;
    };
    raw_response?: Record<string, any>;
}

export function KYCReviewClient({ id }: { id: string }) {
    const [session, setSession] = useState<KYCSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedData, setEditedData] = useState<Partial<KYCSession>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) return;

        async function fetchSession() {
            try {
                const response = await fetch(`/api/kyc/admin/${id}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch KYC session');
                }

                setSession(data.session);
            } catch (err: any) {
                console.error('Error fetching KYC session:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchSession();
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gray-200"></div>
                    <div className="h-4 w-32 rounded bg-gray-200"></div>
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="mx-auto max-w-6xl space-y-6 p-6">
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800 flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Error: {error || 'KYC session not found'}</span>
                </div>
                <Link href="/kyc" className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-900">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back to KYC Requests
                </Link>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/kyc"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-full border border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">KYC Verification</h1>
                        <StatusBadge status={session.status} className="px-2.5 py-0.5 text-xs shadow-sm" />
                    </div>
                    <div className="flex items-center gap-3 pl-11 text-xs text-gray-500 font-mono">
                        <span>ID: {session.didit_session_id}</span>
                        <span className="text-gray-300">|</span>
                        <span>UID: {session.id}</span>
                        <span className="text-gray-300">|</span>
                        <span>{format(new Date(session.created_at), 'PPP p')}</span>
                    </div>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-3">
                    {!isEditing ? (
                        <button
                            onClick={() => {
                                setIsEditing(true);
                                setEditedData({
                                    first_name: session.first_name,
                                    last_name: session.last_name,
                                    date_of_birth: session.date_of_birth,
                                    nationality: session.nationality,
                                    address_line1: session.address_line1,
                                    address_line2: session.address_line2,
                                    city: session.city,
                                    state: session.state,
                                    postal_code: session.postal_code,
                                    country: session.country,
                                    document_type: session.document_type,
                                    document_number: session.document_number,
                                    document_country: session.document_country,
                                });
                            }}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                        >
                            Edit Details
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={async () => {
                                    setSaving(true);
                                    try {
                                        const response = await fetch(`/api/kyc/admin/${id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(editedData),
                                        });

                                        if (!response.ok) {
                                            const data = await response.json();
                                            throw new Error(data.error || 'Failed to update details');
                                        }

                                        const data = await response.json();
                                        setSession({ ...session, ...data.session });
                                        setIsEditing(false);
                                        alert('Details updated successfully');
                                    } catch (err: any) {
                                        alert(err.message);
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                            <button
                                onClick={() => setIsEditing(false)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Column: Profile & Manual Actions (Small on Desktop) */}
                <div className="lg:col-span-4 space-y-6">

                    {/* User Profile Card */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shadow-sm">
                                {session.profiles?.full_name?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div>
                                <h2 className="font-semibold text-gray-900">{session.profiles?.full_name}</h2>
                                <p className="text-xs text-gray-500">{session.profiles?.email}</p>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Email</p>
                                    <p className="text-sm text-gray-900 break-all">{session.profiles?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
                                <div>
                                    <p className="text-xs font-medium text-gray-500 uppercase">Registered</p>
                                    <p className="text-sm text-gray-900">{format(new Date(session.created_at), 'PPP')}</p>
                                </div>
                            </div>
                            {session.completed_at && (
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-medium text-gray-500 uppercase">Completed</p>
                                        <p className="text-sm text-gray-900">{format(new Date(session.completed_at), 'PPP p')}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Manual Actions Panel */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden sticky top-6">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-blue-600" />
                                Verification Actions
                            </h2>
                        </div>
                        <div className="p-5">
                            <div className="p-5">
                                {session.status === 'approved' ? (
                                    <div className="rounded-lg p-4 border bg-green-50 border-green-200 text-green-800">
                                        <div className="flex items-center gap-2 font-semibold mb-1">
                                            <CheckCircle className="h-5 w-5" />
                                            KYC Approved
                                        </div>
                                        <p className="text-sm opacity-90">
                                            Processed on {session.approved_at ? format(new Date(session.approved_at), 'PP p') : 'Unknown date'}
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        {session.status === 'rejected' && (
                                            <div className="rounded-lg p-4 border bg-red-50 border-red-200 text-red-800 mb-6">
                                                <div className="flex items-center gap-2 font-semibold mb-1">
                                                    <XCircle className="h-5 w-5" />
                                                    Currently Rejected
                                                </div>
                                                <p className="text-sm opacity-90 mb-2">
                                                    Processed on {session.approved_at ? format(new Date(session.approved_at), 'PP p') : 'Unknown date'}
                                                </p>
                                                {session.rejection_reason && (
                                                    <div className="p-3 bg-white/60 rounded text-sm border border-red-100">
                                                        <span className="font-semibold block mb-1">Reason:</span>
                                                        {session.rejection_reason}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <ManualKYCActions sessionId={session.id} />
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column: Detailed Information */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Identity & Address Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Personal Information */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                Personal Information
                            </h3>
                            <div className="space-y-3">
                                <InfoRow
                                    label="First Name"
                                    value={session.first_name}
                                    isEditing={isEditing}
                                    editedValue={editedData.first_name}
                                    onChange={(val) => setEditedData({ ...editedData, first_name: val })}
                                />
                                <InfoRow
                                    label="Last Name"
                                    value={session.last_name}
                                    isEditing={isEditing}
                                    editedValue={editedData.last_name}
                                    onChange={(val) => setEditedData({ ...editedData, last_name: val })}
                                />
                                <InfoRow
                                    label="Date of Birth"
                                    value={session.date_of_birth ? format(new Date(session.date_of_birth), 'PPP') : undefined}
                                    isEditing={isEditing}
                                    editedValue={editedData.date_of_birth}
                                    onChange={(val) => setEditedData({ ...editedData, date_of_birth: val })}
                                    type="date"
                                />
                                <InfoRow
                                    label="Nationality"
                                    value={session.nationality}
                                    isEditing={isEditing}
                                    editedValue={editedData.nationality}
                                    onChange={(val) => setEditedData({ ...editedData, nationality: val })}
                                />
                            </div>
                        </div>

                        {/* Address Details */}
                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                            <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                Address Details
                            </h3>
                            <div className="space-y-3">
                                <InfoRow
                                    label="Street"
                                    value={session.address_line1}
                                    isEditing={isEditing}
                                    editedValue={editedData.address_line1}
                                    onChange={(val) => setEditedData({ ...editedData, address_line1: val })}
                                />
                                <InfoRow
                                    label="Apt / Suite"
                                    value={session.address_line2}
                                    isEditing={isEditing}
                                    editedValue={editedData.address_line2}
                                    onChange={(val) => setEditedData({ ...editedData, address_line2: val })}
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <InfoRow
                                        label="City"
                                        value={session.city}
                                        isEditing={isEditing}
                                        editedValue={editedData.city}
                                        onChange={(val) => setEditedData({ ...editedData, city: val })}
                                    />
                                    <InfoRow
                                        label="State"
                                        value={session.state}
                                        isEditing={isEditing}
                                        editedValue={editedData.state}
                                        onChange={(val) => setEditedData({ ...editedData, state: val })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <InfoRow
                                        label="Postal Code"
                                        value={session.postal_code}
                                        isEditing={isEditing}
                                        editedValue={editedData.postal_code}
                                        onChange={(val) => setEditedData({ ...editedData, postal_code: val })}
                                    />
                                    <InfoRow
                                        label="Country"
                                        value={session.country}
                                        isEditing={isEditing}
                                        editedValue={editedData.country}
                                        onChange={(val) => setEditedData({ ...editedData, country: val })}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document & Risk Analysis */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-semibold text-gray-900">Document & Risk Analysis</h3>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Document Details</h4>
                                <InfoRow
                                    label="Type"
                                    value={session.document_type}
                                    capitalize
                                    isEditing={isEditing}
                                    editedValue={editedData.document_type}
                                    onChange={(val) => setEditedData({ ...editedData, document_type: val })}
                                />
                                <InfoRow
                                    label="Number"
                                    value={session.document_number}
                                    mono
                                    isEditing={isEditing}
                                    editedValue={editedData.document_number}
                                    onChange={(val) => setEditedData({ ...editedData, document_number: val })}
                                />
                                <InfoRow
                                    label="Issuing Country"
                                    value={session.document_country}
                                    isEditing={isEditing}
                                    editedValue={editedData.document_country}
                                    onChange={(val) => setEditedData({ ...editedData, document_country: val })}
                                />
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Risk Signals</h4>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">AML Status</p>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border ${isClean(session.aml_status)
                                        ? 'bg-green-50 text-green-700 border-green-200'
                                        : isHit(session.aml_status)
                                            ? 'bg-red-50 text-red-700 border-red-200'
                                            : 'bg-gray-100 text-gray-700 border-gray-200'
                                        }`}>
                                        {isClean(session.aml_status) && <CheckCircle className="w-3 h-3 mr-1" />}
                                        {isHit(session.aml_status) && <AlertTriangle className="w-3 h-3 mr-1" />}
                                        {session.aml_status || 'Pending'}
                                    </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <ScoreBadge label="Face Match" score={session.face_match_score} />
                                    <ScoreBadge label="Liveness" score={session.liveness_score} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Evidence & Documents */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                            <FileText className="h-5 w-5 text-gray-500" />
                            Evidence & Documents
                        </h3>

                        <DocumentGallery rawResponse={session.raw_response} />

                        {session.manual_document_url && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-4 shadow-sm mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Shield className="h-4 w-4 text-blue-600" />
                                    <h4 className="font-semibold text-blue-900">Admin-Uploaded Verification Document</h4>
                                </div>
                                <div className="bg-white rounded-lg p-3 border border-blue-100">
                                    <div className="flex items-start gap-4">
                                        <div className="h-20 w-20 rounded bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={session.manual_document_url} alt="Manual Doc" className="h-full w-full object-cover" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900 capitalize mb-1">{session.manual_document_type || 'Document'}</p>
                                            <a
                                                href={session.manual_document_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                                            >
                                                View Original <ExternalLink className="h-3 w-3" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Manual KYC Uploads (User Side) */}
                        {(session.front_id_url || session.back_id_url || session.selfie_url) && (
                            <div className="rounded-xl border border-amber-200 bg-amber-50/10 p-5 shadow-sm mt-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Upload className="h-5 w-5 text-amber-600" />
                                        <h4 className="font-bold text-gray-900">User Manual KYC Submissions</h4>
                                    </div>
                                    <div className="px-2 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider">
                                        Manual Mode
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {session.front_id_url && (
                                        <ManualDocCard url={session.front_id_url} label="Front ID" />
                                    )}
                                    {session.back_id_url && (
                                        <ManualDocCard url={session.back_id_url} label="Back ID" />
                                    )}
                                    {session.selfie_url && (
                                        <ManualDocCard url={session.selfie_url} label="Selfie" />
                                    )}
                                </div>
                            </div>
                        )}

                        <RawDataViewer data={session.raw_response} />
                    </div>

                </div>
            </div>
        </div>
    );
}

// Sub-components

function InfoRow({
    label,
    value,
    mono = false,
    capitalize = false,
    isEditing = false,
    editedValue = '',
    onChange,
    type = 'text'
}: {
    label: string,
    value?: string,
    mono?: boolean,
    capitalize?: boolean,
    isEditing?: boolean,
    editedValue?: string,
    onChange?: (val: string) => void,
    type?: string
}) {
    return (
        <div>
            <p className="text-xs text-gray-500 mb-0.5">{label}</p>
            {isEditing ? (
                <input
                    type={type}
                    value={editedValue || ''}
                    onChange={(e) => onChange?.(e.target.value)}
                    className={`w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none ${mono ? 'font-mono' : ''}`}
                />
            ) : (
                <p className={`text-sm font-medium text-gray-900 ${mono ? 'font-mono' : ''} ${capitalize ? 'capitalize' : ''}`}>
                    {value || '-'}
                </p>
            )}
        </div>
    );
}

function ScoreBadge({ label, score }: { label: string, score?: number }) {
    const getScoreColor = (s?: number) => {
        if (s === undefined) return 'bg-gray-100 text-gray-500';
        if (s >= 80) return 'bg-green-50 text-green-700 border-green-200';
        if (s >= 50) return 'bg-amber-50 text-amber-700 border-amber-200';
        return 'bg-red-50 text-red-700 border-red-200';
    };

    return (
        <div>
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            <div className={`inline-flex items-center px-2 py-1 rounded border text-xs font-bold ${getScoreColor(score)}`}>
                {score !== undefined ? `${score}%` : 'N/A'}
            </div>
        </div>
    );
}

function DocumentGallery({ rawResponse }: { rawResponse?: Record<string, any> }) {
    if (!rawResponse || typeof rawResponse !== 'object') return null;

    // Recursive function to find all image URLs in the object
    const findImages = (obj: any, prefix = ''): Array<{ key: string, value: string }> => {
        let results: Array<{ key: string, value: string }> = [];

        if (!obj || typeof obj !== 'object') return results;

        Object.entries(obj).forEach(([key, value]) => {
            const currentKey = prefix ? `${prefix}.${key}` : key;

            if (typeof value === 'string') {
                // Check if it looks like an image URL or base64 image
                if ((value.startsWith('http') || value.startsWith('data:image')) &&
                    // Optional: Filter by common image key names if strictness is needed, 
                    // but for now, we'll be broad to catch everything, effectively trusting the value format more.
                    // We can filter out obvious non-images if they start with http but are clearly API endpoints (unless they are image serving endpoints).
                    !value.includes('api.didit.me') // Example exclusion if needed, but keeping it open for now.
                ) {
                    // Additional check: valid image extensions if it's a URL
                    if (value.startsWith('http')) {
                        const lower = value.toLowerCase();
                        if (lower.match(/\.(jpeg|jpg|png|gif|webp|bmp|svg)/) ||
                            currentKey.toLowerCase().includes('photo') ||
                            currentKey.toLowerCase().includes('image') ||
                            currentKey.toLowerCase().includes('picture') ||
                            currentKey.toLowerCase().includes('url') ||
                            currentKey.toLowerCase().includes('front') ||
                            currentKey.toLowerCase().includes('back') ||
                            currentKey.toLowerCase().includes('selfie')
                        ) {
                            results.push({ key: currentKey, value });
                        }
                    } else if (value.startsWith('data:image')) {
                        results.push({ key: currentKey, value });
                    }
                }
            } else if (typeof value === 'object' && value !== null) {
                results = [...results, ...findImages(value, currentKey)];
            }
        });

        return results;
    };

    const images = findImages(rawResponse);

    if (images.length === 0) {
        return (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                No document images detected in the response.
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img, index) => {
                const isDataUrl = img.value.startsWith('data:');
                const src = isDataUrl ? img.value : `/api/kyc/image-proxy?url=${encodeURIComponent(img.value)}`;

                return (
                    <div key={`${img.key}-${index}`} className="group relative rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition-all">
                        <div className="aspect-[4/3] bg-gray-100 relative">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt={img.key} className="h-full w-full object-contain" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <a
                                    href={src}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-white/90 rounded-full p-2 text-gray-900 shadow-lg hover:bg-white"
                                    title="View Fullsize"
                                >
                                    <Maximize2 className="h-5 w-5" />
                                </a>
                            </div>
                        </div>
                        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-700 uppercase tracking-wide truncate" title={img.key}>
                                {img.key.split('.').pop()?.replace(/_/g, ' ')}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function RawDataViewer({ data }: { data?: any }) {
    if (!data) return null;
    return (
        <details className="group rounded-xl border border-gray-200 bg-white overflow-hidden">
            <summary className="flex cursor-pointer items-center justify-between p-4 bg-gray-50 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    View Raw Verification Data
                </span>
                <ChevronLeft className="h-4 w-4 transition-transform group-open:-rotate-90" />
            </summary>
            <div className="p-4 bg-gray-900 text-gray-50 overflow-x-auto text-xs font-mono max-h-96 border-t border-gray-200">
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        </details>
    );
}

function ManualKYCActions({ sessionId }: { sessionId: string }) {
    const router = useRouter();
    const [uploading, setUploading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('');
    const [documentType, setDocumentType] = useState('passport');
    const [rejectionReason, setRejectionReason] = useState('');
    const [mode, setMode] = useState<'view' | 'approve' | 'reject'>('view');

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setUploadedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            let documentUrl = '';

            if (uploadedFile) {
                setUploading(true);
                const formData = new FormData();
                formData.append('file', uploadedFile);
                formData.append('bucket', 'kyc-documents');
                formData.append('path', `kyc/${sessionId}/${uploadedFile.name}`);

                const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
                if (!uploadRes.ok) throw new Error('Failed to upload document');

                const uploadData = await uploadRes.json();
                documentUrl = uploadData.url;
                setUploading(false);
            }

            const response = await fetch(`/api/kyc/admin/${sessionId}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    document_url: documentUrl,
                    document_type: documentType
                })
            });

            if (!response.ok) throw new Error('Failed to approve KYC');

            alert('KYC approved successfully!');
            window.location.reload(); // Reload to show status update
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setProcessing(false);
            setUploading(false);
        }
    };

    const handleReject = async () => {
        if (!rejectionReason.trim()) {
            alert('Please provide a rejection reason');
            return;
        }

        setProcessing(true);
        try {
            const response = await fetch(`/api/kyc/admin/${sessionId}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectionReason })
            });

            if (!response.ok) throw new Error('Failed to reject KYC');

            alert('KYC rejected');
            window.location.reload();
        } catch (error: any) {
            alert(`Error: ${error.message}`);
        } finally {
            setProcessing(false);
        }
    };

    // Simplified view: Show upload options always, and buttons below.
    return (
        <div className="space-y-6">
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Download className="h-4 w-4 text-blue-500" />
                    Upload Verified Document (Optional)
                </label>
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2">
                        <select
                            value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            className="w-1/3 rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-white"
                        >
                            <option value="passport">Passport</option>
                            <option value="drivers_license">Driver's License</option>
                            <option value="national_id">National ID</option>
                            <option value="utility_bill">Utility Bill</option>
                            <option value="other">Other</option>
                        </select>
                        <input
                            type="file"
                            accept="image/*,application/pdf"
                            onChange={handleFileChange}
                            className="block w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
                        />
                    </div>
                </div>
                {previewUrl && (
                    <div className="relative aspect-video w-32 rounded-lg overflow-hidden border border-gray-300">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={previewUrl} alt="Preview" className="object-cover w-full h-full" />
                        <button
                            onClick={() => { setUploadedFile(null); setPreviewUrl(''); }}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                        >
                            <XCircle className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>

            {mode === 'reject' ? (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection (required)..."
                        rows={3}
                        className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                    />
                    <div className="flex gap-3">
                        <button
                            onClick={handleReject}
                            disabled={processing || !rejectionReason.trim()}
                            className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                        >
                            {processing ? 'Processing...' : 'Confirm Rejection'}
                        </button>
                        <button
                            onClick={() => setMode('view')}
                            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 bg-white"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                        {uploading ? 'Uploading...' : processing ? 'Processing...' : (
                            <>
                                <CheckCircle className="h-4 w-4" />
                                {uploadedFile ? 'Approve & Upload' : 'Approve'}
                            </>
                        )}
                    </button>
                    <button
                        onClick={() => setMode('reject')}
                        disabled={processing}
                        className="flex items-center justify-center gap-2 rounded-lg bg-white border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 shadow-sm hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                        <XCircle className="h-4 w-4" />
                        Reject
                    </button>
                </div>
            )}
        </div>
    );
}

// Helpers
const isClean = (status?: string) => ['clear', 'passed', 'approved'].includes(status?.toLowerCase() || '');
const isHit = (status?: string) => ['hit', 'failed', 'rejected', 'suspicious'].includes(status?.toLowerCase() || '');

function ManualDocCard({ url, label }: { url: string, label: string }) {
    return (
        <div className="bg-white rounded-lg p-3 border border-gray-200 overflow-hidden group">
            <p className="text-[10px] font-bold text-gray-500 uppercase mb-2 tracking-tight">{label}</p>
            <div className="relative aspect-[4/3] rounded bg-gray-50 overflow-hidden border border-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={label} className="h-full w-full object-contain group-hover:scale-110 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-white p-2 rounded-full shadow-lg text-gray-900 hover:scale-110 transition-transform"
                    >
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>
            <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-medium"
            >
                Open Full Size <Maximize2 size={10} />
            </a>
        </div>
    );
}
