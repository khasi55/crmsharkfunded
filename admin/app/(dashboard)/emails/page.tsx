
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Trash2, Plus } from "lucide-react";

interface Recipient {
    name: string;
    email: string;
}

export default function EmailsPage() {
    const [recipients, setRecipients] = useState<Recipient[]>([{ name: "", email: "" }]);
    const [isLoading, setIsLoading] = useState(false);
    const [bulkInput, setBulkInput] = useState("");
    const [mode, setMode] = useState<'manual' | 'bulk'>('manual');
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);

    const addRecipient = () => {
        setRecipients([...recipients, { name: "", email: "" }]);
    };

    const removeRecipient = (index: number) => {
        const newRecipients = [...recipients];
        newRecipients.splice(index, 1);
        setRecipients(newRecipients);
    };

    const updateRecipient = (index: number, field: keyof Recipient, value: string) => {
        const newRecipients = [...recipients];
        newRecipients[index][field] = value;
        setRecipients(newRecipients);
    };

    const parseBulkInput = () => {
        // Format: Name, Email (one per line)
        const lines = bulkInput.split('\n');
        const parsed: Recipient[] = [];
        let errors = 0;

        lines.forEach(line => {
            const parts = line.split(',');
            if (parts.length >= 2) {
                const name = parts[0].trim();
                const email = parts[1].trim();
                if (name && email && email.includes('@')) {
                    parsed.push({ name, email });
                } else {
                    errors++;
                }
            }
        });

        if (parsed.length > 0) {
            setRecipients(parsed);
            setMode('manual');
            setBulkInput("");
            if (errors > 0) toast.warning(`Parsed ${parsed.length} recipients. ${errors} lines skipped.`);
            else toast.success(`Parsed ${parsed.length} recipients.`);
        } else {
            toast.error("No valid recipients found. Use 'Name, Email' format per line.");
        }
    };

    const handlePreview = async () => {
        setIsLoading(true);
        try {
            // Use the first recipient's name or a default
            const nameToPreview = recipients[0]?.name || "Traders";

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/email/preview-invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: nameToPreview }),
            });

            const data = await response.json();
            if (response.ok) {
                setPreviewHtml(data.html);
            } else {
                toast.error("Failed to load preview");
            }
        } catch (error) {
            toast.error("Error loading preview");
        } finally {
            setIsLoading(false);
        }
    };

    const sendEmails = async () => {
        const validRecipients = recipients.filter(r => r.name && r.email);

        if (validRecipients.length === 0) {
            toast.error("Please add at least one valid recipient.");
            return;
        }

        if (!confirm(`Are you sure you want to send invitations to ${validRecipients.length} people?`)) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/email/send-event-invites`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ recipients: validRecipients }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send emails");
            }

            toast.success(`Broadcasting initiated! Processed: ${validRecipients.length}`);
            setRecipients([{ name: "", email: "" }]); // Reset form
        } catch (error: any) {
            toast.error("Error sending emails: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Event Invitations</h1>
                    <p className="text-sm text-gray-500">Send Shark Funded Event invitations in bulk.</p>
                </div>
                <button
                    onClick={handlePreview}
                    disabled={isLoading}
                    className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Preview Email</>}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Input Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setMode('manual')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'manual' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Manual Entry
                            </button>
                            <button
                                onClick={() => setMode('bulk')}
                                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${mode === 'bulk' ? 'bg-blue-50 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                Bulk CSV Paste
                            </button>
                        </div>
                        <div className="text-sm text-gray-500">
                            Total Recipients: <span className="font-semibold text-gray-900">{recipients.filter(r => r.email).length}</span>
                        </div>
                    </div>

                    {mode === 'manual' ? (
                        <div className="space-y-3">
                            {recipients.map((recipient, index) => (
                                <div key={index} className="flex gap-3 items-start">
                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                        <input
                                            type="text"
                                            placeholder="Full Name"
                                            value={recipient.name}
                                            onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                        <input
                                            type="email"
                                            placeholder="Email Address"
                                            value={recipient.email}
                                            onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        />
                                    </div>
                                    {recipients.length > 1 && (
                                        <button
                                            onClick={() => removeRecipient(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}

                            <button
                                onClick={addRecipient}
                                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 mt-2"
                            >
                                <Plus className="w-4 h-4" />
                                Add Another
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <textarea
                                value={bulkInput}
                                onChange={(e) => setBulkInput(e.target.value)}
                                placeholder="Paste CSV format here:\nJohn Doe, john@example.com\nJane Smith, jane@example.com"
                                className="w-full h-48 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono text-sm"
                            />
                            <button
                                onClick={parseBulkInput}
                                disabled={!bulkInput.trim()}
                                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
                            >
                                Parse List
                            </button>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
                        <button
                            onClick={sendEmails}
                            disabled={isLoading || recipients.filter(r => r.email).length === 0}
                            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    Send Invitations
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[600px] overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Email Preview</h3>
                        <span className="text-xs text-gray-500">Live Render</span>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-100 p-4">
                        {previewHtml ? (
                            <div className="bg-white rounded-lg shadow-sm mx-auto max-w-[600px] overflow-hidden">
                                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <Send className="w-8 h-8 opacity-20" />
                                </div>
                                <p>Click "Preview Email" to generate a preview</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
