"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Server, Search } from "lucide-react";

const MT5_GROUPS = {
    "Lite Instant Funding": "demo\\S\\0-SF",
    "Lite 1-Step Challenge": "demo\\S\\1-SF",
    "Lite 2-Step Challenge": "demo\\S\\2-SF",
    "Prime Instant Funding": "demo\\SF\\0-Pro",
    "Prime 1-Step Challenge": "demo\\SF\\1-Pro",
    "Prime 2-Step Challenge": "demo\\SF\\2-Pro",
    "Funded Live Account": "SF Funded Live",
};

const ACCOUNT_SIZES = {
    lite: [5000, 10000, 25000, 50000, 100000],
    prime: [5000, 10000, 25000, 50000, 100000,],
    funded: [5000, 10000, 25000, 50000, 100000,],
};

interface User {
    id: string;
    email: string;
    full_name: string | null;
}

interface AccountAssignmentFormProps {
    users?: User[]; // Made optional, we use API search now
}

export default function AccountAssignmentForm({ users = [] }: AccountAssignmentFormProps) {
    const router = useRouter();
    const [selectedEmail, setSelectedEmail] = useState("");
    const [selectedGroup, setSelectedGroup] = useState("");
    const [accountSize, setAccountSize] = useState<number | "">("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Server-side Search
    useEffect(() => {
        const query = selectedEmail;
        if (!query || query.length < 2) {
            setFilteredUsers([]);
            setShowDropdown(false);
            return;
        }

        // If user selected from dropdown, don't search again immediately if it matches
        // (Optional optimization: if we had a proper selectedUser state, but here we use email string)

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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Get available account sizes based on selected group
    const getAvailableSizes = () => {
        if (selectedGroup.includes("Lite")) return ACCOUNT_SIZES.lite;
        if (selectedGroup.includes("Prime")) return ACCOUNT_SIZES.prime;
        if (selectedGroup.includes("Funded")) return ACCOUNT_SIZES.funded;
        return [];
    };

    const handleSelectUser = (user: User) => {
        setSelectedEmail(user.email);
        setShowDropdown(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!selectedEmail || !selectedGroup || !accountSize) {
            setError("Please fill in all fields");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch("/api/mt5/assign", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: selectedEmail,
                    mt5Group: MT5_GROUPS[selectedGroup as keyof typeof MT5_GROUPS],
                    accountSize: accountSize,
                    planType: selectedGroup,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || "Failed to assign account");
            }

            setSuccess(true);
            setTimeout(() => {
                router.push("/mt5");
            }, 2000);
        } catch (err: any) {
            setError(err.message || "Failed to assign account");
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="bg-white rounded-lg border border-gray-200 p-8">
                <div className="text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 mb-4">
                        <Server className="h-8 w-8 text-emerald-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Account Assigned Successfully!</h2>
                    <p className="text-gray-600">
                        The MT5 account has been created and credentials have been sent to the user's email.
                    </p>
                    <p className="text-sm text-gray-500 mt-4">Redirecting to MT5 accounts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-8 max-w-5xl">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* User Email Input with Autocomplete */}
                <div className="relative" ref={dropdownRef}>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                        User Email
                    </label>
                    <div className="relative">
                        <input
                            id="email"
                            type="email"
                            value={selectedEmail}
                            onChange={(e) => setSelectedEmail(e.target.value)}
                            onFocus={() => selectedEmail.length > 0 && setShowDropdown(filteredUsers.length > 0)}
                            placeholder="Start typing user email..."
                            className="block w-full rounded-lg border border-gray-300 pl-10 pr-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                            required
                        />
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>

                    {/* Autocomplete Dropdown */}
                    {showDropdown && filteredUsers.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                            {filteredUsers.map((user) => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => handleSelectUser(user)}
                                    className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 focus:bg-indigo-50 focus:outline-none transition-colors border-b border-gray-100 last:border-b-0"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{user.email}</p>
                                            {user.full_name && (
                                                <p className="text-xs text-gray-500 mt-0.5">{user.full_name}</p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedEmail && !showDropdown && (
                        <p className="text-xs text-gray-700 mt-1.5">
                            Credentials will be sent to: <span className="font-medium">{selectedEmail}</span>
                        </p>
                    )}
                </div>

                <div className="border-t border-gray-100 pt-8">
                    <h3 className="text-base font-semibold text-gray-900 mb-6">Account Configuration</h3>

                    <div className="space-y-8">
                        {/* Package Type Grouped */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3 block">
                                Package Type
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {Object.keys(MT5_GROUPS).map((group) => (
                                    <button
                                        key={group}
                                        type="button"
                                        onClick={() => {
                                            setSelectedGroup(group);
                                            setAccountSize("");
                                        }}
                                        className={`relative group flex flex-col items-start p-4 text-left border rounded-xl transition-all duration-200 ${selectedGroup === group
                                            ? "border-indigo-600 bg-indigo-50/50 ring-1 ring-indigo-600 shadow-sm"
                                            : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                                            }`}
                                    >
                                        <span className={`block text-sm font-semibold mb-1 ${selectedGroup === group ? "text-indigo-900" : "text-gray-900"
                                            }`}>
                                            {group}
                                        </span>
                                        <span className="text-xs text-gray-500 font-mono break-all">
                                            {MT5_GROUPS[group as keyof typeof MT5_GROUPS]}
                                        </span>

                                        {/* Selection Indicator */}
                                        <div className={`absolute top-3 right-3 h-4 w-4 rounded-full border flex items-center justify-center transition-colors ${selectedGroup === group
                                            ? "border-indigo-600 bg-indigo-600"
                                            : "border-gray-300 bg-transparent group-hover:border-gray-400"
                                            }`}>
                                            {selectedGroup === group && (
                                                <div className="h-1.5 w-1.5 rounded-full bg-white" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Account Size Pills */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-3">
                                Account Size
                            </label>
                            {selectedGroup ? (
                                <div className="flex flex-wrap gap-3">
                                    {getAvailableSizes().map((size) => (
                                        <button
                                            key={size}
                                            type="button"
                                            onClick={() => setAccountSize(size)}
                                            className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 ${accountSize === size
                                                ? "border-indigo-600 bg-indigo-600 text-white shadow-md transform scale-105"
                                                : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                                                }`}
                                        >
                                            ${size.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-4 rounded-lg bg-gray-50 border border-gray-100 text-sm text-gray-500 text-center italic">
                                    Please select a package type above to see available sizes.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => router.push("/mt5")}
                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || !selectedEmail || !selectedGroup || !accountSize}
                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {loading ? "Creating Account..." : "Assign Account"}
                    </button>
                </div>
            </form>
        </div>
    );
}
