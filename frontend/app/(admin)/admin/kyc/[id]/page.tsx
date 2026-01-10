"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { StatusBadge } from "@/components/admin/StatusBadge";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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

    profiles: {
        full_name: string;
        email: string;
    };
}

export default function AdminKYCDetailsPage() {
    const params = useParams();
    const id = params?.id as string;

    const [session, setSession] = useState<KYCSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="flex items-center justify-center py-12">
                    <div className="text-gray-500">Loading...</div>
                </div>
            </div>
        );
    }

    if (error || !session) {
        return (
            <div className="mx-auto max-w-5xl space-y-6">
                <div className="mb-4">
                    <Link href="/admin/kyc" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900">
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back to KYC Requests
                    </Link>
                </div>
                <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
                    Error: {error || 'KYC session not found'}
                </div>
            </div>
        );
    }

    return (
        <div className="mx-auto max-w-5xl space-y-8 pb-12">
            <div className="flex items-center gap-4">
                <Link href="/admin/kyc" className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-900 transition-colors">
                    <ChevronLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">KYC Session Details</h1>
                    <div className="text-sm text-gray-500">ID: {session.didit_session_id}</div>
                </div>
                <div className="ml-auto">
                    <StatusBadge status={session.status} className="px-3 py-1 text-sm" />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                {/* User Info Card */}
                <div className="lg:col-span-1 rounded-xl border border-gray-200 bg-white p-6 shadow-sm h-fit">
                    <h2 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">User Profile</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                            <div className="mt-1 font-medium text-gray-900">{session.profiles?.full_name}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
                            <div className="mt-1 font-medium text-gray-900 break-all">{session.profiles?.email}</div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Session Created</label>
                            <div className="mt-1 text-sm text-gray-900">{new Date(session.created_at).toLocaleString()}</div>
                        </div>
                        {session.completed_at && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Completed At</label>
                                <div className="mt-1 text-sm text-gray-900">{new Date(session.completed_at).toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Details */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Identity & Address */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Identity & Address</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Identity */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">Personal Information</h3>
                                <div>
                                    <label className="block text-xs text-gray-500">First Name</label>
                                    <div className="font-medium">{session.first_name || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Last Name</label>
                                    <div className="font-medium">{session.last_name || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Date of Birth</label>
                                    <div className="font-medium">{session.date_of_birth ? new Date(session.date_of_birth).toLocaleDateString() : '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Nationality</label>
                                    <div className="font-medium">{session.nationality || '-'}</div>
                                </div>
                            </div>

                            {/* Address */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">Address Details</h3>
                                <div>
                                    <label className="block text-xs text-gray-500">Street Address</label>
                                    <div className="font-medium">
                                        {session.address_line1 || '-'}
                                        {session.address_line2 && <br />}
                                        {session.address_line2}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500">City</label>
                                        <div className="font-medium">{session.city || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500">State/Region</label>
                                        <div className="font-medium">{session.state || '-'}</div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500">Postal Code</label>
                                        <div className="font-medium">{session.postal_code || '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500">Country</label>
                                        <div className="font-medium">{session.country || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Document & Risk */}
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                        <h2 className="mb-4 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">Document & Risk Analysis</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">Document</h3>
                                <div>
                                    <label className="block text-xs text-gray-500">Document Type</label>
                                    <div className="font-medium capitalize">{session.document_type || '-'}</div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Document Number</label>
                                    <div className="font-mono bg-gray-50 border border-gray-200 rounded px-2 py-1 inline-block text-sm">
                                        {session.document_number || '-'}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs text-gray-500">Issuing Country</label>
                                    <div className="font-medium">{session.document_country || '-'}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-900 bg-gray-50 p-2 rounded">Risk Compliance</h3>
                                <div>
                                    <label className="block text-xs text-gray-500">AML Status</label>
                                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium capitalize ${session.aml_status === 'clear' || session.aml_status === 'passed' ? 'bg-green-50 text-green-700 border border-green-200' :
                                            session.aml_status === 'hit' || session.aml_status === 'failed' ? 'bg-red-50 text-red-700 border border-red-200' :
                                                'bg-gray-100 text-gray-700 border border-gray-200'
                                        }`}>
                                        {session.aml_status || 'Pending'}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs text-gray-500">Face Match</label>
                                        <div className="font-medium">{session.face_match_score !== undefined ? session.face_match_score : '-'}</div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500">Liveness</label>
                                        <div className="font-medium">{session.liveness_score !== undefined ? session.liveness_score : '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
