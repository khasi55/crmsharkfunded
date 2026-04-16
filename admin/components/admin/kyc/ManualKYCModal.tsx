"use client";

import { useState, useEffect } from "react";
import { 
    X, 
    Upload, 
    User, 
    Calendar, 
    Globe, 
    FileText, 
    CheckCircle2, 
    Loader2,
    Search,
    ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchFromBackend } from "@/lib/backend-api";
import { createClient } from "@/utils/supabase/client";

interface UserInfo {
    id: string;
    full_name: string;
    email: string;
}

interface ManualKYCModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ManualKYCModal({ isOpen, onClose, onSuccess }: ManualKYCModalProps) {
    const [step, setStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Search Users
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<UserInfo[]>([]);
    const [searching, setSearching] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserInfo | null>(null);

    // Form Data
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        date_of_birth: "",
        nationality: "",
        document_type: "id_card",
        document_number: "",
        document_country: "",
        address_line1: "",
        city: "",
        country: ""
    });

    // Files
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

    useEffect(() => {
        if (!isOpen) {
            // Reset state on close
            setStep(1);
            setSelectedUser(null);
            setSearchQuery("");
            setFormData({
                first_name: "",
                last_name: "",
                date_of_birth: "",
                nationality: "",
                document_type: "id_card",
                document_number: "",
                document_country: "",
                address_line1: "",
                city: "",
                country: ""
            });
            setFiles({ front: null, back: null, selfie: null });
            setPreviews({ front: null, back: null, selfie: null });
        }
    }, [isOpen]);

    const searchUsers = async (q: string) => {
        if (!q || q.length < 2) {
            setUsers([]);
            return;
        }
        try {
            setSearching(true);
            const data = await fetchFromBackend(`/api/admin/users/search?q=${q}`);
            setUsers(data.users || []);
        } catch (err) {
            console.error("Search users error:", err);
        } finally {
            setSearching(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery) searchUsers(searchQuery);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleFileChange = (type: 'front' | 'back' | 'selfie', file: File | null) => {
        if (!file) return;
        setFiles(prev => ({ ...prev, [type]: file }));
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviews(prev => ({ ...prev, [type]: reader.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const uploadFile = async (file: File, path: string) => {
        const supabase = createClient();
        const ext = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `manual-kyc/${path}/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('kyc-documents')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('kyc-documents')
            .getPublicUrl(filePath);

        return publicUrl;
    };

    const handleSubmit = async () => {
        if (!selectedUser) return;
        try {
            setSubmitting(true);
            setError(null);

            // 1. Upload files
            let front_id_url = "";
            let back_id_url = "";
            let selfie_url = "";

            if (files.front) front_id_url = await uploadFile(files.front, `${selectedUser.id}/front`);
            if (files.back) back_id_url = await uploadFile(files.back, `${selectedUser.id}/back`);
            if (files.selfie) selfie_url = await uploadFile(files.selfie, `${selectedUser.id}/selfie`);

            // 2. Submit to backend
            await fetchFromBackend('/api/kyc/admin/create-manual', {
                method: 'POST',
                body: JSON.stringify({
                    user_id: selectedUser.id,
                    ...formData,
                    front_id_url,
                    back_id_url,
                    selfie_url
                })
            });

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || "Failed to create manual KYC");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">Add Manual KYC Entry</h2>
                        <p className="text-sm text-slate-500">Record an approved KYC status for a user</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
                    <div className="max-w-xl mx-auto space-y-8">
                        {/* Step Indicator */}
                        <div className="flex items-center justify-between px-8">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center">
                                    <div className={cn(
                                        "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all",
                                        step === i ? "bg-blue-600 text-white" : 
                                        step > i ? "bg-green-500 text-white" : "bg-slate-100 text-slate-400"
                                    )}>
                                        {step > i ? <CheckCircle2 size={16} /> : i}
                                    </div>
                                    {i < 3 && (
                                        <div className={cn(
                                            "w-20 h-0.5 mx-2",
                                            step > i ? "bg-green-500" : "bg-slate-100"
                                        )} />
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Step 1: User Selection */}
                        {step === 1 && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Find User</label>
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input 
                                            type="text"
                                            placeholder="Search by name or email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                        />
                                        {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={18} />}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {selectedUser ? (
                                        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                    <User className="text-blue-600" size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">{selectedUser.full_name}</p>
                                                    <p className="text-xs text-slate-500">{selectedUser.email}</p>
                                                </div>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedUser(null)}
                                                className="text-xs font-bold text-blue-600 hover:underline"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-50">
                                            {users.length > 0 ? users.map(user => (
                                                <button
                                                    key={user.id}
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setStep(2);
                                                    } }
                                                    className="w-full p-4 hover:bg-slate-50 flex items-center gap-3 transition-colors text-left"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <User className="text-slate-400" size={20} />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">{user.full_name}</p>
                                                        <p className="text-xs text-slate-500">{user.email}</p>
                                                    </div>
                                                </button>
                                            )) : searchQuery.length >= 2 && !searching ? (
                                                <div className="p-8 text-center">
                                                    <p className="text-sm text-slate-500">No users found</p>
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center">
                                                    <p className="text-sm text-slate-400">Search for a user to begin</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Step 2: Personal Details */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">First Name</label>
                                        <input 
                                            type="text"
                                            value={formData.first_name}
                                            onChange={(e) => setFormData({...formData, first_name: e.target.value})}
                                            className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="John"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Last Name</label>
                                        <input 
                                            type="text"
                                            value={formData.last_name}
                                            onChange={(e) => setFormData({...formData, last_name: e.target.value})}
                                            className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                            placeholder="Doe"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Date of Birth</label>
                                        <div className="relative">
                                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                type="date"
                                                value={formData.date_of_birth}
                                                onChange={(e) => setFormData({...formData, date_of_birth: e.target.value})}
                                                className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nationality</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                            <input 
                                                type="text"
                                                value={formData.nationality}
                                                onChange={(e) => setFormData({...formData, nationality: e.target.value})}
                                                className="w-full pl-10 pr-3 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. USA"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-50">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Type</label>
                                            <select 
                                                value={formData.document_type}
                                                onChange={(e) => setFormData({...formData, document_type: e.target.value})}
                                                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                                            >
                                                <option value="id_card">ID Card</option>
                                                <option value="passport">Passport</option>
                                                <option value="driver_license">Driver's License</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Document Number</label>
                                            <input 
                                                type="text"
                                                value={formData.document_number}
                                                onChange={(e) => setFormData({...formData, document_number: e.target.value})}
                                                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. 12345678"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button 
                                        onClick={() => setStep(1)}
                                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        onClick={() => setStep(3)}
                                        className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 3: Document Upload */}
                        {step === 3 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { id: 'front' as const, label: 'Front of ID' },
                                        { id: 'back' as const, label: 'Back of ID (Opt)' },
                                        { id: 'selfie' as const, label: 'Live Selfie' }
                                    ].map(item => (
                                        <div key={item.id} className="space-y-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase text-center block tracking-tight">{item.label}</label>
                                            <div className={cn(
                                                "relative aspect-square border-2 border-dashed rounded-xl overflow-hidden flex flex-col items-center justify-center transition-all",
                                                previews[item.id] ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                                            )}>
                                                {previews[item.id] ? (
                                                    <img src={previews[item.id]!} alt={item.label} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Upload className="text-slate-300" size={24} />
                                                )}
                                                <input 
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => handleFileChange(item.id, e.target.files?.[0] || null)}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100 flex gap-3 text-sm text-yellow-800 leading-relaxed">
                                    <FileText className="shrink-0 text-yellow-600 mt-1" size={18} />
                                    <p>By clicking "Submit and Approve", you confirm that you have manually verified the user's documents and identity.</p>
                                </div>

                                {error && (
                                    <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-red-600 text-xs font-medium">
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-end gap-3">
                                    <button 
                                        disabled={submitting}
                                        onClick={() => setStep(2)}
                                        className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        disabled={submitting}
                                        onClick={handleSubmit}
                                        className="px-8 py-2.5 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                                        Submit and Approve
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
