import Image from "next/image";
import { useState } from "react";
import { X, Copy, Check, Eye, EyeOff, Server, Shield, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CredentialsModalProps {
    isOpen: boolean;
    onClose: () => void;
    account: {
        login: number;
        password?: string;
        server?: string;
        account_type?: string;
    } | null;
}

export default function CredentialsModal({ isOpen, onClose, account }: CredentialsModalProps) {
    const [showPassword, setShowPassword] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    if (!isOpen || !account) return null;

    const copyToClipboard = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const CredentialRow = ({ label, value, field, isPassword = false, icon: Icon }: any) => (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex items-center justify-between group hover:border-blue-500/30 hover:bg-white hover:shadow-sm transition-all duration-200">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm">
                    <Icon size={20} />
                </div>
                <div>
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="text-slate-900 font-mono font-medium text-lg tracking-wide select-all">
                        {isPassword && !showPassword ? '••••••••••' : value}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                {isPassword && (
                    <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                    >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                )}
                <button
                    onClick={() => copyToClipboard(value?.toString() || '', field)}
                    className={cn(
                        "p-2 rounded-lg transition-all duration-200",
                        copiedField === field
                            ? "bg-green-100 text-green-600"
                            : "hover:bg-slate-200 text-slate-400 hover:text-slate-700"
                    )}
                >
                    {copiedField === field ? <Check size={18} /> : <Copy size={18} />}
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl shadow-slate-200/50 overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white relative">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/20">
                            <Image src="/shark-icon.svg" alt="Shark" width={24} height={24} className="brightness-0 invert" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">Account Credentials</h2>
                            <p className="text-xs text-slate-500 font-medium">MT5 Login Details</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                        <p className="text-sm text-blue-700 leading-relaxed font-medium">
                            Use these credentials to log in to the <strong className="font-bold text-blue-800">MetaTrader 5</strong> platform (PC, Web, or Mobile).
                        </p>
                    </div>

                    <CredentialRow
                        label="Login ID"
                        value={account.login}
                        field="login"
                        icon={Shield}
                    />

                    <CredentialRow
                        label="Master Password"
                        value={account.password || '••••••••'}
                        field="password"
                        isPassword
                        icon={Key}
                    />

                    <CredentialRow
                        label="Server"
                        value={account.server || 'SharkFunded-Demo'}
                        field="server"
                        icon={Server}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                        Never share your master password with anyone provided by support.
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
