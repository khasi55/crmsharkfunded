"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Trash2, Plus, Users, Edit3 } from "lucide-react";
import dynamic from "next/dynamic";
import 'react-quill-new/dist/quill.snow.css';

// Dynamically import ReactQuill to avoid SSR issues
const ReactQuill = dynamic(
    async () => {
        const { default: RQ } = await import("react-quill-new");
        // Create a wrapper component
        return function ReactQuillWrapper(props: any) {
            return <RQ {...props} />;
        };
    },
    { ssr: false, loading: () => <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg border border-gray-200">Loading Editor...</div> }
);


interface Recipient {
    name: string;
    email: string;
}

export default function EmailsPage() {
    const [recipients, setRecipients] = useState<Recipient[]>([{ name: "", email: "" }]);
    const [isLoading, setIsLoading] = useState(false);
    const [bulkInput, setBulkInput] = useState("");
    const [mode, setMode] = useState<'manual' | 'bulk'>('manual');
    const [targetGroup, setTargetGroup] = useState<'manual' | 'active_accounts'>('manual');

    // Email Content State
    const [subject, setSubject] = useState("");
    const [htmlContent, setHtmlContent] = useState("");
    const [previewMode, setPreviewMode] = useState(false);

    // Quill configuration
    const modules = {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'color': [] }, { 'background': [] }],
            ['link', 'image', 'clean']
        ],
    };

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
            setRecipients(parsed);
            setMode('manual');
            setBulkInput("");
            if (errors > 0) toast.warning(`Parsed ${parsed.length} recipients. ${errors} lines skipped.`);
            else toast.success(`Parsed ${parsed.length} recipients.`);
        } else {
            toast.error("No valid recipients found. Use 'Name, Email' format per line.");
        }
    };

    const sendCampaign = async () => {
        if (!subject.trim()) {
            toast.error("Please enter a subject line.");
            return;
        }

        if (!htmlContent.trim() || htmlContent === '<p><br></p>') {
            toast.error("Please enter some email content.");
            return;
        }

        const validRecipients = recipients.filter(r => r.name && r.email);

        if (targetGroup === 'manual' && validRecipients.length === 0) {
            toast.error("Please add at least one valid recipient or select a different target group.");
            return;
        }

        const targetDescription = targetGroup === 'active_accounts' ? 'ALL Active Accounts' : `${validRecipients.length} manual recipients`;

        if (!confirm(`Are you sure you want to broadcast this email to ${targetDescription}?`)) {
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/admin/email/send-custom-campaign', {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    subject,
                    htmlContent,
                    targetGroup,
                    recipients: targetGroup === 'manual' ? validRecipients : []
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to send emails");
            }

            toast.success(`Campaign broadcasted! Processed: ${data.totalSent} recipients.`);

            // Optional: reset form after success
            if (targetGroup === 'manual') setRecipients([{ name: "", email: "" }]);
            setSubject("");
            setHtmlContent("");
            setPreviewMode(false);

        } catch (error: any) {
            toast.error("Error sending emails: " + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const getPreviewHtml = () => {
        return `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px; background-color: #fff;">
                <h2 style="color: #333; border-bottom: 2px solid #0d47a1; padding-bottom: 10px; margin-bottom: 20px;">
                    ${subject || 'Subject Line Preview'}
                </h2>
                <div style="color: #444; font-size: 15px; line-height: 1.6;">
                    ${htmlContent || '<p class="text-gray-400">Email body preview will appear here...</p>'}
                </div>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #888; text-align: center;">
                    <p>Sent by <strong>SharkFunded</strong></p>
                    <p>If you no longer wish to receive these emails, you can update your preferences in your dashboard.</p>
                </div>
            </div>
        `;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Email Marketing</h1>
                    <p className="text-sm text-gray-500">Compose and send targeted HTML emails to traders.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Compose & Targeting */}
                <div className="lg:col-span-7 space-y-6">

                    {/* Compose Email Box */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                <Edit3 className="w-5 h-5 text-indigo-500" />
                                Compose
                            </h2>
                            <button
                                onClick={() => setPreviewMode(!previewMode)}
                                className="text-sm text-indigo-600 font-medium hover:text-indigo-700 hover:underline"
                            >
                                {previewMode ? 'Edit Content' : 'View Full Preview'}
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject Line</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Enter attention-grabbing subject..."
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            <div className="pb-10"> {/* Padding for standard toolbars */}
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email Body</label>
                                <div className="h-64 sm:h-80">
                                    <ReactQuill
                                        theme="snow"
                                        value={htmlContent}
                                        onChange={setHtmlContent}
                                        modules={modules}
                                        className="h-full rounded-lg"
                                        placeholder="Type your message here..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Targeting Section */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 flex flex-col h-full justify-between">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                <Users className="w-5 h-5 text-indigo-500" />
                                Targeting
                            </h2>

                            <div className="flex gap-4 mb-6">
                                <label className={`cursor-pointer flex-1 border rounded-xl p-4 transition-all ${targetGroup === 'manual' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-200'}`}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="targetGroup"
                                            value="manual"
                                            checked={targetGroup === 'manual'}
                                            onChange={() => setTargetGroup('manual')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-semibold text-gray-900">Manual List</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">Input emails directly or bulk paste from CSV.</p>
                                </label>

                                <label className={`cursor-pointer flex-1 border rounded-xl p-4 transition-all ${targetGroup === 'active_accounts' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500' : 'border-gray-200 hover:border-indigo-200'}`}>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="radio"
                                            name="targetGroup"
                                            value="active_accounts"
                                            checked={targetGroup === 'active_accounts'}
                                            onChange={() => setTargetGroup('active_accounts')}
                                            className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="font-semibold text-gray-900">Active Accounts</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1 ml-6">All users with non-breached MT5 accounts.</p>
                                </label>
                            </div>

                            {/* Conditional Manual Inputs */}
                            {targetGroup === 'manual' && (
                                <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setMode('manual')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'manual' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
                                            >
                                                Entry
                                            </button>
                                            <button
                                                onClick={() => setMode('bulk')}
                                                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${mode === 'bulk' ? 'bg-white shadow-sm text-gray-900 border border-gray-200' : 'text-gray-500 hover:bg-gray-200'}`}
                                            >
                                                Bulk Paste
                                            </button>
                                        </div>
                                        <div className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-2 py-1 rounded-md">
                                            {recipients.filter(r => r.email).length} Valid
                                        </div>
                                    </div>

                                    {mode === 'manual' ? (
                                        <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                            {recipients.map((recipient, index) => (
                                                <div key={index} className="flex gap-2 items-start">
                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                        <input
                                                            type="text"
                                                            placeholder="Name"
                                                            value={recipient.name}
                                                            onChange={(e) => updateRecipient(index, 'name', e.target.value)}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                        />
                                                        <input
                                                            type="email"
                                                            placeholder="Email"
                                                            value={recipient.email}
                                                            onChange={(e) => updateRecipient(index, 'email', e.target.value)}
                                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                                        />
                                                    </div>
                                                    {recipients.length > 1 && (
                                                        <button
                                                            onClick={() => removeRecipient(index)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            <button
                                                onClick={addRecipient}
                                                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 mt-2"
                                            >
                                                <Plus className="w-3 h-3" />
                                                Add Another
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <textarea
                                                value={bulkInput}
                                                onChange={(e) => setBulkInput(e.target.value)}
                                                placeholder="Format:\nName, Email\nJohn, john@example.com"
                                                className="w-full h-32 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-mono"
                                            />
                                            <button
                                                onClick={parseBulkInput}
                                                disabled={!bulkInput.trim()}
                                                className="px-3 py-1.5 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition-colors text-xs"
                                            >
                                                Parse CSV
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={sendCampaign}
                                disabled={isLoading || (targetGroup === 'manual' && recipients.filter(r => r.email).length === 0)}
                                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-500/20"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Sending Campaign...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Blast Campaign
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Live Preview */}
                <div className="lg:col-span-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col max-h-[800px] overflow-hidden sticky top-6">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center z-10">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Send className="w-4 h-4 text-gray-500" />
                            Live Preview
                        </h3>
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium tracking-wide shadow-sm">Real-time Render</span>
                    </div>
                    <div className="flex-1 overflow-auto bg-slate-100 p-4 lg:p-6 custom-scrollbar">
                        <div
                            className="bg-white rounded-lg shadow-md mx-auto w-full max-w-[500px] overflow-hidden min-h-[400px]"
                        >
                            <div
                                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
                                className="email-preview-content" // Can target globally if needed
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
