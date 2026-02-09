"use client";

import { useState, useEffect } from "react";
import { Search, Loader2, X, CheckCircle2, User, Mail, Server, CheckSquare, Square } from "lucide-react";
import { toast } from "sonner";

interface Account {
    id: string;
    login: number | null;
    challenge_type: string;
    status: string;
    profiles?: {
        full_name: string | null;
        email: string | null;
    };
}

interface Recipient {
    name: string;
    email: string;
}

interface AccountSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (recipients: Recipient[]) => void;
    existingEmails: string[];
}

export function AccountSelectionModal({ isOpen, onClose, onSelect, existingEmails }: AccountSelectionModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(false);
    // Use a Map to store recipient data so we don't lose it when paginating
    const [selectedRecipients, setSelectedRecipients] = useState<Map<string, Recipient>>(new Map());
    const [totalAccounts, setTotalAccounts] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 50;

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
        } else {
            setSearchQuery("");
            setSelectedRecipients(new Map());
            setCurrentPage(1);
        }
    }, [isOpen, searchQuery, currentPage]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('login', searchQuery);
            params.append('page', currentPage.toString());
            params.append('limit', itemsPerPage.toString());
            params.append('status', 'active');

            const response = await fetch(`/api/mt5/accounts?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch accounts");

            const data = await response.json();
            setAccounts(data.accounts || []);
            setTotalAccounts(data.total || 0);
            setTotalPages(Math.ceil((data.total || 0) / itemsPerPage));
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAllPage = () => {
        const eligiblePageItems = accounts.filter(acc => acc.profiles?.email && !existingEmails.includes(acc.profiles.email));
        const allPageSelected = eligiblePageItems.every(acc => selectedRecipients.has(acc.id));

        const newSelected = new Map(selectedRecipients);
        if (allPageSelected) {
            eligiblePageItems.forEach(acc => newSelected.delete(acc.id));
        } else {
            eligiblePageItems.forEach(acc => {
                newSelected.set(acc.id, {
                    name: acc.profiles?.full_name || "Trader",
                    email: acc.profiles?.email || ""
                });
            });
        }
        setSelectedRecipients(newSelected);
    };

    const handleSelectAllResults = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchQuery) params.append('login', searchQuery);
            params.append('page', "1");
            params.append('limit', "2000"); // Safety cap
            params.append('status', 'active');

            const response = await fetch(`/api/mt5/accounts?${params.toString()}`);
            if (!response.ok) throw new Error("Failed to fetch all matching accounts");

            const data = await response.json();
            const allMatching = data.accounts || [];

            const newSelected = new Map(selectedRecipients);
            let addedCount = 0;
            allMatching.forEach((acc: Account) => {
                if (acc.profiles?.email && !existingEmails.includes(acc.profiles.email)) {
                    if (!newSelected.has(acc.id)) {
                        newSelected.set(acc.id, {
                            name: acc.profiles?.full_name || "Trader",
                            email: acc.profiles?.email || ""
                        });
                        addedCount++;
                    }
                }
            });
            setSelectedRecipients(newSelected);
            toast.success(`Added ${addedCount} accounts to selection.`);
        } catch (error) {
            console.error("Select all results error:", error);
            toast.error("Failed to select all results");
        } finally {
            setLoading(false);
        }
    };

    const toggleSelection = (acc: Account) => {
        if (!acc.profiles?.email) return;
        const newSelected = new Map(selectedRecipients);
        if (newSelected.has(acc.id)) {
            newSelected.delete(acc.id);
        } else {
            newSelected.set(acc.id, {
                name: acc.profiles?.full_name || "Trader",
                email: acc.profiles?.email || ""
            });
        }
        setSelectedRecipients(newSelected);
    };

    const handleConfirm = () => {
        onSelect(Array.from(selectedRecipients.values()));
        onClose();
    };

    if (!isOpen) return null;

    const isPageFullySelected = accounts.length > 0 && accounts
        .filter(acc => acc.profiles?.email && !existingEmails.includes(acc.profiles.email))
        .every(acc => selectedRecipients.has(acc.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Select Recipients</h2>
                        <p className="text-sm text-gray-500 font-medium">Add traders from active accounts</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-900">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Search & Bulk Actions */}
                <div className="p-6 border-b border-gray-100 space-y-4">
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search login or email..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium"
                            />
                        </div>
                        <button
                            onClick={handleSelectAllResults}
                            disabled={loading || totalAccounts === 0}
                            className="px-6 py-3 bg-indigo-50 text-indigo-600 font-bold rounded-xl hover:bg-indigo-100 transition-all text-sm border border-indigo-100 whitespace-nowrap disabled:opacity-50"
                        >
                            Select All {totalAccounts} Results
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={toggleSelectAllPage}
                                className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-all"
                            >
                                {isPageFullySelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                Select Page ({accounts.length})
                            </button>
                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest border-l border-gray-200 pl-4">
                                {selectedRecipients.size} Selected
                            </span>
                        </div>
                        {selectedRecipients.size > 0 && (
                            <button
                                onClick={() => setSelectedRecipients(new Map())}
                                className="text-sm font-bold text-red-600 hover:text-red-700"
                            >
                                Clear Selection
                            </button>
                        )}
                    </div>
                </div>

                {/* Account List */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {loading && accounts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                            <p className="font-medium">Loading accounts...</p>
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                            <Search className="w-10 h-10 opacity-20" />
                            <p className="font-medium text-lg">No matching accounts</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {accounts.map((acc) => {
                                const isSelected = selectedRecipients.has(acc.id);
                                const isDuplicate = existingEmails.includes(acc.profiles?.email || "");
                                return (
                                    <div
                                        key={acc.id}
                                        onClick={() => !isDuplicate && toggleSelection(acc)}
                                        className={`group relative p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${isSelected
                                                ? 'border-blue-500 bg-blue-50 shadow-sm'
                                                : isDuplicate
                                                    ? 'border-gray-50 bg-gray-50/50 cursor-not-allowed opacity-50'
                                                    : 'border-white bg-white hover:border-gray-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                {isSelected ? <CheckCircle2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-gray-900 truncate">
                                                    {acc.profiles?.full_name || "Unknown"}
                                                    {isDuplicate && <span className="ml-1 px-1 bg-gray-200 text-gray-500 text-[8px] rounded uppercase">Added</span>}
                                                </p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-mono font-bold text-blue-600">#{acc.login}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase truncate">{acc.challenge_type}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            disabled={currentPage === 1 || loading}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
                        >
                            Previous
                        </button>
                        <span className="text-xs font-bold text-gray-500">Page {currentPage} of {totalPages}</span>
                        <button
                            disabled={currentPage === totalPages || loading}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="px-3 py-1.5 text-xs font-bold bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all"
                        >
                            Next
                        </button>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedRecipients.size === 0}
                            className="px-8 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 disabled:bg-gray-400 transition-all shadow-lg shadow-blue-500/20"
                        >
                            Add {selectedRecipients.size} Recipients
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
