"use client";

import { useState, useEffect } from "react";
import { User, Lock, Wallet, Shield, Save, Camera, Mail, Phone, Globe, Key, MapPin, Hash, Loader2, AlertTriangle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { fetchFromBackend } from "@/lib/backend-api";

// --- Reusable UI Components ---
const RadioPill = ({
    active,
    label,
    onClick,
    icon: Icon
}: {
    active: boolean;
    label: string;
    onClick: () => void;
    icon?: any
}) => (
    <div
        onClick={onClick}
        className={cn(
            "relative flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all duration-200 select-none",
            active
                ? "bg-primary/10 border-primary shadow-[0_0_0_1px_rgba(var(--primary),1)]"
                : "bg-card border-border hover:border-gray-600"
        )}
    >
        <div className={cn(
            "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
            active ? "border-primary bg-primary" : "border-gray-500"
        )}>
            {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>

        {Icon && <Icon size={16} className={cn(active ? "text-primary" : "text-muted-foreground")} />}
        <span className={cn("text-sm font-bold", active ? "text-primary" : "text-foreground")}>{label}</span>
    </div>
);

const SectionHeader = ({ title, sub }: { title: string, sub: string }) => (
    <div className="mb-6 pb-2 border-b border-border">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{sub}</p>
    </div>
);

const TerminalInput = ({ label, value, onChange, type = "text", readOnly = false, icon: Icon, placeholder }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{label}</label>
        <div className="relative group">
            {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />}
            <input
                type={type}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                placeholder={placeholder}
                className={cn(
                    "w-full bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all font-mono",
                    Icon ? "pl-10" : "",
                    readOnly ? "opacity-60 cursor-not-allowed bg-gray-800/50" : ""
                )}
            />
            {readOnly && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Locked</span>
            )}
        </div>
    </div>
);

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState("profile");
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form States
    const [profile, setProfile] = useState({
        fullName: "",
        displayName: "",
        email: "",
        phone: "",
        country: "",
        address: "",
        pincode: ""
    });

    const [security, setSecurity] = useState({
        current: "",
        newPass: "",
        confirmPass: ""
    });

    const [wallet, setWallet] = useState({
        id: "",
        address: "",
        network: "USDT_TRC20",
        isLocked: false
    });

    // Fetch User Data on Mount
    useEffect(() => {
        const fetchUserData = async () => {
            try {
                setIsFetching(true);

                // Fetch profile from API
                const profileData = await fetchFromBackend('/api/user/profile');
                setProfile({
                    email: profileData.user?.email || "",
                    fullName: profileData.profile?.full_name || "",
                    displayName: profileData.profile?.display_name || "",
                    phone: profileData.profile?.phone || "",
                    country: profileData.profile?.country || "",
                    address: profileData.profile?.address || "",
                    pincode: profileData.profile?.pincode || ""
                });

                // Fetch wallet from API
                const walletData = await fetchFromBackend('/api/user/wallet');
                if (walletData.wallet) {
                    setWallet({
                        id: walletData.wallet.id || "",
                        address: walletData.wallet.wallet_address || "",
                        network: walletData.wallet.wallet_type || "USDT_TRC20",
                        isLocked: walletData.wallet.is_locked || false
                    });
                }
            } catch (err) {
                console.error("Unexpected error in Settings:", err);
            } finally {
                setIsFetching(false);
            }
        };
        fetchUserData();
    }, []);

    const handleSave = async () => {
        setIsLoading(true);
        setSaveMessage(null);

        try {
            if (activeTab === 'security') {
                // Validate Password
                if (!security.newPass || security.newPass.length < 6) {
                    throw new Error("Password must be at least 6 characters");
                }
                if (security.newPass !== security.confirmPass) {
                    throw new Error("Passwords do not match");
                }

                // Call Password Update Endpoint
                await fetchFromBackend('/api/user/update-password', {
                    method: 'PUT',
                    body: JSON.stringify({ password: security.newPass })
                });

                setSaveMessage({ type: 'success', text: 'Password updated successfully!' });
                setSecurity({ current: "", newPass: "", confirmPass: "" }); // Reset form
            } else {
                // Update profile via API
                await fetchFromBackend('/api/user/profile', {
                    method: 'PUT',
                    body: JSON.stringify({
                        full_name: profile.fullName,
                        display_name: profile.displayName,
                        phone: profile.phone,
                        country: profile.country,
                        address: profile.address,
                        pincode: profile.pincode,
                    })
                });
                setSaveMessage({ type: 'success', text: 'Profile updated successfully!' });
            }
            setTimeout(() => setSaveMessage(null), 3000);
        } catch (err: any) {
            console.error("Save error:", err);
            setSaveMessage({ type: 'error', text: err.message || 'Failed to save changes' });
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return (
            <div className="w-full max-w-[1200px] mx-auto p-6 md:p-10 flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-[1200px] mx-auto p-6 md:p-10 font-sans text-foreground">

            {/* Page Header */}
            <div className="mb-8 flex items-center gap-4">
                <div className="h-8 w-1 bg-primary rounded-full" />
                <h1 className="text-3xl font-black tracking-tight text-black">Account Settings</h1>
            </div>

            {/* Navigation Pills */}
            <div className="flex flex-wrap gap-4 mb-10">
                {[
                    { id: "profile", label: "Profile", icon: User },
                    { id: "security", label: "Security", icon: Lock },
                    { id: "billing", label: "Billing", icon: Wallet }
                ].map(tab => (
                    <RadioPill
                        key={tab.id}
                        active={activeTab === tab.id}
                        label={tab.label}
                        icon={tab.icon}
                        onClick={() => setActiveTab(tab.id)}
                    />
                ))}
            </div>

            {/* Save Message */}
            <AnimatePresence>
                {saveMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className={cn(
                            "mb-6 p-4 rounded-lg border",
                            saveMessage.type === 'success'
                                ? "bg-green-500/10 border-green-500/20 text-green-400"
                                : "bg-red-500/10 border-red-500/20 text-red-400"
                        )}
                    >
                        {saveMessage.text}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="w-full max-w-4xl">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        {/* PROFILE TAB */}
                        {activeTab === "profile" && (
                            <div className="space-y-8">
                                <SectionHeader title="Personal Information" sub="Manage your profile details" />

                                {/* Avatar Section */}
                                <div className="flex items-center gap-6 p-6 bg-card border border-border rounded-xl">
                                    <div className="relative">
                                        <div className="w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden">
                                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full object-cover" />
                                        </div>
                                        <button className="absolute -bottom-2 -right-2 p-1.5 bg-primary text-primary-foreground rounded-full border-4 border-card hover:scale-110 transition-transform">
                                            <Camera size={14} />
                                        </button>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{profile.displayName || profile.fullName || 'User'}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Profile Photo • Supports JPG, PNG</p>
                                    </div>
                                </div>

                                {/* Locked Fields Info */}
                                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
                                    <Shield className="inline w-4 h-4 mr-2" />
                                    Name and email are locked after KYC verification for security reasons.
                                </div>

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <TerminalInput
                                        label="Full Name (KYC Verified)"
                                        value={profile.fullName}
                                        readOnly
                                        icon={User}
                                    />
                                    <TerminalInput
                                        label="Email Address"
                                        value={profile.email}
                                        readOnly
                                        icon={Mail}
                                    />
                                    <TerminalInput
                                        label="Display Name"
                                        value={profile.displayName}
                                        onChange={(e: any) => setProfile({ ...profile, displayName: e.target.value })}
                                        icon={User}
                                        placeholder="How you want to be called"
                                    />
                                    <TerminalInput
                                        label="Phone Number"
                                        value={profile.phone}
                                        onChange={(e: any) => setProfile({ ...profile, phone: e.target.value })}
                                        icon={Phone}
                                        placeholder="+1 234 567 8900"
                                    />
                                    <TerminalInput
                                        label="Country"
                                        value={profile.country}
                                        onChange={(e: any) => setProfile({ ...profile, country: e.target.value })}
                                        icon={Globe}
                                        placeholder="Your country"
                                    />
                                    <TerminalInput
                                        label="Pincode / ZIP Code"
                                        value={profile.pincode}
                                        onChange={(e: any) => setProfile({ ...profile, pincode: e.target.value })}
                                        icon={Hash}
                                        placeholder="123456"
                                    />
                                    <div className="md:col-span-2">
                                        <TerminalInput
                                            label="Address"
                                            value={profile.address}
                                            onChange={(e: any) => setProfile({ ...profile, address: e.target.value })}
                                            icon={MapPin}
                                            placeholder="Your full address"
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4 border-t border-border">
                                    <button
                                        onClick={handleSave}
                                        disabled={isLoading}
                                        className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                Save Changes
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* SECURITY TAB */}
                        {activeTab === "security" && (
                            <div className="space-y-8">
                                <SectionHeader title="Login & Security" sub="Manage your password and 2FA preferences" />

                                <div className="max-w-xl space-y-6">
                                    <TerminalInput
                                        label="Current Password" type="password"
                                        value={security.current}
                                        onChange={(e: any) => setSecurity({ ...security, current: e.target.value })}
                                        icon={Lock}
                                    />
                                    <div className="h-px bg-border border-dashed" />
                                    <TerminalInput
                                        label="New Password" type="password"
                                        value={security.newPass}
                                        onChange={(e: any) => setSecurity({ ...security, newPass: e.target.value })}
                                        icon={Key}
                                    />
                                    <TerminalInput
                                        label="Confirm Password" type="password"
                                        value={security.confirmPass}
                                        onChange={(e: any) => setSecurity({ ...security, confirmPass: e.target.value })}
                                        icon={Key}
                                    />

                                    <div className="flex justify-end pt-4">
                                        <button
                                            onClick={handleSave}
                                            disabled={isLoading}
                                            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-sm flex items-center gap-2"
                                        >
                                            Update Password
                                        </button>
                                    </div>
                                </div>

                                {/* 2FA Section Placeholder */}
                                <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/5 flex items-start gap-4">
                                    <div className="mt-1 p-2 bg-yellow-500/10 rounded text-yellow-500"><Shield size={18} /></div>
                                    <div>
                                        <h4 className="font-bold text-sm text-yellow-500">Two-Factor Authentication</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Protect your account with an extra layer of security.</p>
                                        <button className="mt-3 text-xs font-bold px-3 py-1.5 rounded border border-yellow-500/30 text-yellow-500 hover:bg-yellow-500/10">
                                            Enable 2FA
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* BILLING TAB */}
                        {activeTab === "billing" && (
                            <div className="space-y-8">
                                <SectionHeader title="Payout Methods" sub="Manage your withdrawal destinations" />

                                {/* Locked Wallet Notice */}
                                {wallet.isLocked && (
                                    <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/10 flex items-start gap-4">
                                        <div className="mt-1 p-2 bg-green-500/10 rounded text-green-500"><CheckCircle size={18} /></div>
                                        <div>
                                            <h4 className="font-bold text-sm text-green-500">Wallet Address Saved & Locked</h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Your withdrawal wallet is securely locked. Contact support if you need to change it.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!wallet.isLocked && (
                                    <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 flex items-start gap-4">
                                        <div className="mt-1 p-2 bg-yellow-500/10 rounded text-yellow-500"><AlertTriangle size={18} /></div>
                                        <div>
                                            <h4 className="font-bold text-sm text-yellow-500">Important: Wallet Cannot Be Changed</h4>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Once saved, your wallet address will be permanently locked for security. Make sure it's correct!
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-6 max-w-2xl">
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Withdrawal Network</label>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div
                                                className={cn(
                                                    "p-4 rounded-xl border flex items-center gap-3",
                                                    "bg-primary/10 border-primary",
                                                    wallet.isLocked ? "opacity-60 cursor-not-allowed" : ""
                                                )}
                                            >
                                                <div className="w-4 h-4 rounded-full border border-primary bg-primary flex items-center justify-center">
                                                    <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                                </div>
                                                <div>
                                                    <span className="font-bold text-sm">USDT (TRC-20)</span>
                                                    <p className="text-xs text-muted-foreground">TRON Network - Low fees, fast transfers</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <TerminalInput
                                        label="USDT TRC-20 Wallet Address"
                                        value={wallet.address}
                                        onChange={(e: any) => !wallet.isLocked && setWallet({ ...wallet, address: e.target.value })}
                                        readOnly={wallet.isLocked}
                                        icon={Wallet}
                                        placeholder="T... (TRON wallet address)"
                                    />

                                    {!wallet.isLocked && (
                                        <div className="flex justify-end pt-4">
                                            <button
                                                onClick={async () => {
                                                    if (!wallet.address || wallet.address.length < 30) {
                                                        setSaveMessage({ type: 'error', text: 'Please enter a valid TRON wallet address' });
                                                        return;
                                                    }

                                                    setIsLoading(true);
                                                    setSaveMessage(null);

                                                    try {
                                                        const response = await fetch('/api/user/wallet', {
                                                            method: 'POST',
                                                            headers: {
                                                                'Content-Type': 'application/json',
                                                            },
                                                            body: JSON.stringify({ walletAddress: wallet.address }),
                                                        });

                                                        const data = await response.json();

                                                        if (!response.ok) {
                                                            throw new Error(data.error || 'Failed to save wallet');
                                                        }

                                                        setWallet({ ...wallet, isLocked: true });
                                                        setSaveMessage({ type: 'success', text: 'Wallet saved and locked successfully!' });
                                                    } catch (err: any) {
                                                        console.error("Wallet save error:", err);
                                                        setSaveMessage({ type: 'error', text: err.message || 'Failed to save wallet' });
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                disabled={isLoading || !wallet.address}
                                                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isLoading ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
                                                ) : (
                                                    <><Lock size={16} /> Save & Lock Wallet</>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
