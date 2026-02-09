"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Trash2, Plus, Users, Mail, Type, FileEdit } from "lucide-react";
import { AccountSelectionModal } from "@/components/admin/AccountSelectionModal";

interface Recipient {
    name: string;
    email: string;
}

export default function EmailsPage() {
    const [recipients, setRecipients] = useState<Recipient[]>([{ name: "", email: "" }]);
    const [isLoading, setIsLoading] = useState(false);
    const [bulkInput, setBulkInput] = useState("");
    const [mode, setMode] = useState<'invite' | 'custom'>('invite');
    const [entryMode, setEntryMode] = useState<'manual' | 'bulk'>('manual');
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

    // Custom Email State
    const [subject, setSubject] = useState("");
    const [body, setBody] = useState("");

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
            setRecipients([...recipients.filter(r => r.email), ...parsed]);
            setEntryMode('manual');
            setBulkInput("");
            if (errors > 0) toast.warning(`Parsed ${parsed.length} recipients. ${errors} lines skipped.`);
            else toast.success(`Parsed ${parsed.length} recipients.`);
        } else {
            toast.error("No valid recipients found. Use 'Name, Email' format per line.");
        }
    };

    const handlePreview = async () => {
        if (mode === 'custom') {
            const formattedBody = body.includes('<') ? body : `<div style="font-family: sans-serif; line-height: 1.5; color: #333;">${body.replace(/\n/g, '<br>')}</div>`;
            setPreviewHtml(`
                <div style="padding: 20px; border-bottom: 1px solid #eee; background: #f8f9fa;">
                    <p style="margin: 0; font-size: 12px; color: #666; font-weight: bold; text-transform: uppercase;">Subject</p>
                    <p style="margin: 5px 0 0 0; font-weight: 600; color: #000;">${subject || "(No Subject)"}</p>
                </div>
                <div style="padding: 30px;">
                    ${formattedBody || "<p style='color: #999; font-style: italic;'>Compose your message to see preview...</p>"}
                </div>
            `);
            toast.success("Preview updated");
            return;
        }

        setIsLoading(true);
        try {
            const nameToPreview = recipients[0]?.name || "Traders";
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/email/preview-invite`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: nameToPreview }),
            });
            const data = await response.json();
            if (response.ok) setPreviewHtml(data.html);
            else toast.error("Failed to load preview");
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

        if (mode === 'custom') {
            if (!subject.trim() || !body.trim()) {
                toast.error("Subject and Body are required for custom emails.");
                return;
            }
        }

        if (!confirm(`Are you sure you want to send to ${validRecipients.length} recipients?`)) {
            return;
        }

        setIsLoading(true);
        try {
            const endpoint = mode === 'invite' ? 'send-event-invites' : 'send-custom';
            const payload = mode === 'invite'
                ? { recipients: validRecipients }
                : { recipients: validRecipients, subject, body };

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/email/${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || "Failed to send emails");

            toast.success(`Broadcasting initiated! Total recipients: ${validRecipients.length}`);
            setRecipients([{ name: "", email: "" }]); // Reset form
            if (mode === 'custom') {
                setSubject("");
                setBody("");
            }
        } catch (error: any) {
            toast.error("Error sending emails: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Broadcast</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Send invitations or custom messages to your community.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setMode('invite')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'invite' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                        Event Invite
                    </button>
                    <button
                        onClick={() => setMode('custom')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${mode === 'custom' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
                    >
                        Custom Email
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Input Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 flex flex-col min-h-[700px]">
                    {/* Header Controls */}
                    <div className="flex justify-between items-center mb-8 bg-gray-50 p-4 rounded-xl">
                        <div className="flex gap-2">
                            <button
                                onClick={() => setEntryMode('manual')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${entryMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Manual
                            </button>
                            <button
                                onClick={() => setEntryMode('bulk')}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${entryMode === 'bulk' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Bulk CSV
                            </button>
                        </div>
                        <button
                            onClick={() => setIsSelectionModalOpen(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        >
                            <Users className="w-3.5 h-3.5" />
                            SELECT ACCOUNTS
                        </button>
                    </div>

                    {/* Recipient List Area */}
                    <div className="flex-1 overflow-y-auto max-h-[300px] mb-8 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                        {entryMode === 'manual' ? (
                            <div className="space-y-3">
                                {recipients.map((recipient, index) => (
                                    <div key={index} className="group flex gap-3 items-center">
                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                            <input
                                                type="text"
                                                placeholder="Name"
                                                value={recipient.name}
                                                onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-sm"
                                            />
                                            <input
                                                type="email"
                                                placeholder="Email"
                                                value={recipient.email}
                                                onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium text-sm"
                                            />
                                        </div>
                                        <button
                                            onClick={() => removeRecipient(index)}
                                            className="p-2.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    onClick={addRecipient}
                                    className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 mt-4 px-2"
                                >
                                    <Plus className="w-4 h-4" strokeWidth={3} />
                                    ADD RECIPIENT
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <textarea
                                    value={bulkInput}
                                    onChange={(e) => setBulkInput(e.target.value)}
                                    placeholder="Paste format: Name, Email (One per line)"
                                    className="w-full h-48 px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all font-mono text-sm leading-relaxed"
                                />
                                <button
                                    onClick={parseBulkInput}
                                    disabled={!bulkInput.trim()}
                                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/10 text-sm"
                                >
                                    PARSE AND ADD TO LIST
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Custom Email Content */}
                    {mode === 'custom' && (
                        <div className="space-y-5 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <Type className="w-3 h-3" /> Email Subject
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter your email subject..."
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-bold"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                                    <FileEdit className="w-3 h-3" /> Message Body
                                </label>
                                <textarea
                                    placeholder="Start typing your message... (HTML supported)"
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    className="w-full h-64 px-4 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-medium leading-relaxed resize-none"
                                />
                            </div>
                        </div>
                    )}

                    <div className="mt-auto pt-8 border-t border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="bg-gray-50 px-4 py-2 rounded-xl">
                                <span className="text-[10px] font-bold text-gray-400 uppercase block tracking-tighter">Selected</span>
                                <span className="text-xl font-bold text-gray-900">{recipients.filter(r => r.email).length}</span>
                            </div>
                            <button
                                onClick={handlePreview}
                                disabled={isLoading}
                                className="px-4 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm"
                            >
                                <Mail className="w-4 h-4" /> Preview
                            </button>
                        </div>

                        <button
                            onClick={sendEmails}
                            disabled={isLoading || recipients.filter(r => r.email).length === 0}
                            className={`flex items-center gap-3 px-10 py-3 text-white font-bold rounded-2xl transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${mode === 'invite' ? 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700' : 'bg-indigo-600 shadow-indigo-500/20 hover:bg-indigo-700'}`}
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <Send className="w-5 h-5" />
                            )}
                            {mode === 'invite' ? 'Send Invitations' : 'Send Custom Broadcast'}
                        </button>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col min-h-[700px] overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Live Experience Preview</h3>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto bg-gray-100/50 p-8">
                        {previewHtml ? (
                            <div className="bg-white rounded-2xl shadow-2xl mx-auto max-w-[600px] overflow-hidden border border-gray-200 animate-in zoom-in-95 duration-500">
                                <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-6">
                                <div className="w-20 h-20 bg-white rounded-full shadow-lg flex items-center justify-center text-blue-100">
                                    <Send className="w-10 h-10 opacity-20" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-gray-500">No active preview</p>
                                    <p className="text-xs text-gray-400 mt-1 max-w-[200px]">Click the preview button to see how your email will look in the inbox.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">
                        Preview is optimized for desktop and mobile clients
                    </div>
                </div>
            </div>

            <AccountSelectionModal
                isOpen={isSelectionModalOpen}
                onClose={() => setIsSelectionModalOpen(false)}
                existingEmails={recipients.map(r => r.email)}
                onSelect={(newRecipients) => {
                    // Filter out truly empty placeholders before merging
                    const activeRecipients = recipients.filter(r => r.email.trim() !== "");
                    setRecipients([...activeRecipients, ...newRecipients]);
                }}
            />
        </div>
    );
}
