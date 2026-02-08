"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Server, Search, Upload, FileText, Check, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { fetchFromBackend } from "@/lib/backend-api";
import { toast } from "sonner";

const supabase = createClient();

// Definition of Sizes per Category
const SIZES_CONFIG = {
    lite_instant: [3000, 6000, 12000, 25000, 50000, 100000],
    lite_step: [5000, 10000, 25000, 50000, 100000],
    prime: [5000, 10000, 25000, 50000, 100000],
    funded: [5000, 10000, 25000, 50000, 100000],
    competition: [100000],
};

interface User {
    id: string;
    email: string;
    full_name: string | null;
}

interface AccountAssignmentFormProps {
    users?: User[];
}

export default function AccountAssignmentForm({ users = [] }: AccountAssignmentFormProps) {
    const router = useRouter();

    // Form State
    const [selectedEmail, setSelectedEmail] = useState("");
    const [category, setCategory] = useState<"challenge" | "funded" | "competition">("challenge");

    // Challenge Specific State
    const [model, setModel] = useState<"lite" | "prime">("lite");
    const [type, setType] = useState<"2-step" | "1-step" | "instant">("2-step");

    const [accountSize, setAccountSize] = useState<number | "">("");
    const [note, setNote] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Competition State
    const [activeCompetitions, setActiveCompetitions] = useState<any[]>([]);
    const [selectedCompetitionId, setSelectedCompetitionId] = useState("");

    // Fetch Competitions
    useEffect(() => {
        const fetchComps = async () => {
            try {
                const data = await fetchFromBackend('/api/competitions/admin');
                if (data) {
                    const eligible = data.filter((c: any) => c.status === 'active' || c.status === 'upcoming');
                    setActiveCompetitions(eligible);
                }
            } catch (err) {
                console.error("Failed to fetch competitions", err);
            }
        };
        fetchComps();
    }, []);

    // Search Users
    useEffect(() => {
        const query = selectedEmail;
        if (!query || query.length < 2) {
            setFilteredUsers([]);
            setShowDropdown(false);
            return;
        }

        const timeoutId = setTimeout(async () => {
            setIsSearching(true);
            try {
                const res = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
                if (res.ok) {
                    const data = await res.json();
                    setFilteredUsers(data.users || []);
                    setShowDropdown((data.users || []).length > 0);
                }
            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [selectedEmail]);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // --- Logic Helpers ---

    // 1. Get MT5 Group String
    const getMt5Group = () => {
        if (category === 'funded') return "SF Funded Live";
        if (category === 'competition') return "demo\\SF\\0-Demo\\comp";

        // Challenge Logic
        if (model === 'lite') {
            if (type === 'instant') return "demo\\S\\0-SF";
            if (type === '1-step') return "demo\\S\\1-SF";
            if (type === '2-step') return "demo\\S\\2-SF";
        } else if (model === 'prime') {
            if (type === 'instant') return "demo\\SF\\0-Pro";
            if (type === '1-step') return "demo\\SF\\1-Pro";
            if (type === '2-step') return "demo\\SF\\2-Pro";
        }
        return "";
    };

    // 2. Get Plan Type Display Name
    const getPlanTypeName = () => {
        if (category === 'funded') return "Funded Live Account";
        if (category === 'competition') return "Competition Account";

        // Challenge Name
        const modelName = model === 'lite' ? 'Lite' : 'Prime';
        const typeName = type === 'instant' ? 'Instant Funding' : (type === '1-step' ? '1-Step Challenge' : '2-Step Challenge');
        return `${modelName} ${typeName}`;
    };

    // 3. Get Available Sizes
    const getAvailableSizes = () => {
        if (category === 'funded') return SIZES_CONFIG.funded;
        if (category === 'competition') return SIZES_CONFIG.competition;

        if (model === 'prime') return SIZES_CONFIG.prime;

        // Lite
        if (type === 'instant') return SIZES_CONFIG.lite_instant;
        return SIZES_CONFIG.lite_step;
    };

    // 4. Validate Constraints
    useEffect(() => {
        // Rule: Prime 1-Step is NOT allowed
        if (model === 'prime' && type === '1-step') {
            setType('2-step');
        }
    }, [model, type]);

    // 5. Reset Size if invalid
    useEffect(() => {
        const sizes = getAvailableSizes();
        if (accountSize !== "" && !sizes.includes(accountSize)) {
            setAccountSize("");
        }
    }, [category, model, type]);


    const handleSelectUser = (user: User) => {
        setSelectedEmail(user.email);
        setShowDropdown(false);
    };

    // --- Form Handlers ---

    const handleReset = () => {
        setSelectedEmail("");
        setNote("");
        setImageFile(null);
        setError(null);
        setSuccess(false);
        // Reset file input manually if needed via ref, but standard state update handles most
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedEmail || !accountSize || !note || !imageFile) {
            setError("Please fill in all fields (Note and Proof are required)");
            return;
        }

        if (category === 'competition' && !selectedCompetitionId) {
            setError("Please select a competition");
            return;
        }

        setLoading(true);
        try {
            let imageUrl = "";
            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('proofs')
                    .upload(fileName, imageFile);

                if (uploadError) throw new Error("Image upload failed: " + uploadError.message);

                const { data: { publicUrl } } = supabase.storage
                    .from('proofs')
                    .getPublicUrl(fileName);
                imageUrl = publicUrl;
            }

            const response = await fetch("/api/mt5/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: selectedEmail,
                    mt5Group: getMt5Group(),
                    accountSize: accountSize,
                    planType: getPlanTypeName(),
                    note,
                    imageUrl,
                    competitionId: category === 'competition' ? selectedCompetitionId : undefined
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to assign account");
            }

            // toast.success(`Account assigned to ${selectedEmail} successfully!`);
            setSuccess(true); // Now triggers modal
        } catch (err: any) {
            setError(err.message || "Failed to assign account");
            toast.error(err.message || "Failed to assign account");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative">
            {/* Success Modal Overlay */}
            {success && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full transform animate-in zoom-in-95 duration-200">
                        <div className="text-center">
                            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
                                <Check className="h-8 w-8 text-emerald-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Assigned!</h2>
                            <p className="text-gray-600 mb-8">
                                The MT5 account has been created and the user has been notified.
                            </p>

                            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-left">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Trader Email</p>
                                        <p className="text-sm font-semibold text-gray-900 truncate">{selectedEmail}</p>
                                    </div>
                                    <div className="space-y-1 border-l border-gray-200 pl-4">
                                        <p className="text-[10px] text-gray-400 uppercase font-bold">Account Plan</p>
                                        <p className="text-sm font-semibold text-gray-900 italic">{getPlanTypeName()} - ${accountSize?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={handleReset}
                                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    Assign Another Account
                                </button>
                                <button
                                    onClick={() => router.push('/mt5')}
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-600 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                                >
                                    View MT5 List
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-5xl">
                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* 1. User Selection */}
                    <div className="relative" ref={dropdownRef}>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">User Email</label>
                        <div className="relative">
                            <input
                                id="email"
                                type="email"
                                value={selectedEmail}
                                onChange={(e) => setSelectedEmail(e.target.value)}
                                onFocus={() => selectedEmail.length > 0 && setShowDropdown(filteredUsers.length > 0)}
                                placeholder="Start typing user email..."
                                className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                required
                            />
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        </div>
                        {showDropdown && filteredUsers.length > 0 && (
                            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                                {filteredUsers.map((user) => (
                                    <button key={user.id} type="button" onClick={() => handleSelectUser(user)} className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0">
                                        <p className="text-sm font-medium text-gray-900">{user.email}</p>
                                        {user.full_name && <p className="text-xs text-gray-500">{user.full_name}</p>}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 pt-8">
                        <h3 className="text-base font-semibold text-gray-900 mb-6">Account Configuration</h3>

                        {/* 2. Category Selection */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-3">Category</label>
                            <div className="flex flex-wrap gap-3">
                                {[
                                    { id: 'challenge', label: 'Evaluation Challenge' },
                                    { id: 'funded', label: 'Funded Live Account' },
                                    { id: 'competition', label: 'Competition Account' }
                                ].map(c => (
                                    <button
                                        key={c.id}
                                        type="button"
                                        onClick={() => setCategory(c.id as any)}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-all ${category === c.id ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"}`}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Challenge Options (Only for Challenge Category) */}
                        {category === 'challenge' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 p-5 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Model</label>
                                    <div className="flex gap-3">
                                        {['lite', 'prime'].map(m => (
                                            <button
                                                key={m}
                                                type="button"
                                                onClick={() => setModel(m as any)}
                                                className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold border transition-all uppercase ${model === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"}`}
                                            >
                                                {m}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">Type</label>
                                    <div className="flex gap-3">
                                        {[
                                            { id: '2-step', label: '2-Step' },
                                            { id: '1-step', label: '1-Step' },
                                            { id: 'instant', label: 'Instant' }
                                        ].map(t => {
                                            const disabled = model === 'prime' && t.id === '1-step';
                                            return (
                                                <button
                                                    key={t.id}
                                                    type="button"
                                                    onClick={() => !disabled && setType(t.id as any)}
                                                    disabled={disabled}
                                                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-semibold border transition-all ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200" :
                                                        type === t.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                                                        }`}
                                                >
                                                    {t.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    {model === 'prime' && <p className="text-[10px] text-gray-400 mt-1.5 ml-1">* 1-Step not available on Prime</p>}
                                </div>
                            </div>
                        )}

                        {/* 3. Account Size */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">Account Size</label>
                            <div className="flex flex-wrap gap-3">
                                {getAvailableSizes().map((size) => (
                                    <button
                                        key={size}
                                        type="button"
                                        onClick={() => setAccountSize(size)}
                                        className={`px-5 py-2.5 rounded-lg text-sm font-bold border transition-all ${accountSize === size ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"}`}
                                    >
                                        ${size.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Competition Selector */}
                        {category === "competition" && (
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Select Competition <span className="text-red-500">*</span></label>
                                <select
                                    value={selectedCompetitionId}
                                    onChange={(e) => setSelectedCompetitionId(e.target.value)}
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                >
                                    <option value="">-- Choose Competition --</option>
                                    {activeCompetitions.map(comp => (
                                        <option key={comp.id} value={comp.id}>{comp.title} ({comp.status.toUpperCase()})</option>
                                    ))}
                                </select>
                                {activeCompetitions.length === 0 && <p className="text-xs text-orange-500 mt-1">No active competitions found.</p>}
                            </div>
                        )}
                    </div>

                    <div className="border-t border-gray-100 pt-8">
                        <h3 className="text-base font-semibold text-gray-900 mb-6">Justification</h3>
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="note" className="block text-sm font-medium text-gray-700 mb-2">Note / Reason <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Reason for assignment..." />
                                    <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Proof / Attachment <span className="text-red-500">*</span></label>
                                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-400 bg-gray-50/50">
                                    <div className="space-y-1 text-center">
                                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                        <div className="flex text-sm text-gray-600">
                                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                                                <span>Upload a file</span>
                                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                                            </label>
                                            <p className="pl-1">or drag and drop</p>
                                        </div>
                                        <p className="text-xs text-gray-500">{imageFile ? imageFile.name : "PNG, JPG up to 5MB"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {error && <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-center gap-3"><AlertCircle className="text-red-600 h-5 w-5" /><p className="text-sm text-red-700">{error}</p></div>}

                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button type="button" onClick={() => router.push("/mt5")} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                        <button type="submit" disabled={loading || !selectedEmail || !accountSize || !note || !imageFile || (category === "competition" && !selectedCompetitionId)} className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                            {loading ? "Creating Account..." : "Assign Account"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
