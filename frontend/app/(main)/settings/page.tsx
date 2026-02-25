"use client";

import { useState, useEffect, useRef } from "react";
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
        pincode: "",
        avatarUrl: ""
    });

    // File Input Ref
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

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

    const [bank, setBank] = useState({
        id: "",
        accountHolderName: "",
        bankName: "",
        accountNumber: "",
        ifscCode: "",
        swiftCode: "",
        isLocked: false
    });

    const [isKycVerified, setIsKycVerified] = useState(false);

    // OTP States
    const [showOtpWallet, setShowOtpWallet] = useState(false);
    const [showOtpBank, setShowOtpBank] = useState(false);
    const [otpCode, setOtpCode] = useState("");

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
                    pincode: profileData.profile?.pincode || "",
                    avatarUrl: profileData.profile?.avatar_url || ""
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

                // Fetch bank details from API
                const bankData = await fetchFromBackend('/api/user/bank-details');
                if (bankData.bankDetails) {
                    setBank({
                        id: bankData.bankDetails.id || "",
                        accountHolderName: bankData.bankDetails.account_holder_name || "",
                        bankName: bankData.bankDetails.bank_name || "",
                        accountNumber: bankData.bankDetails.account_number || "",
                        ifscCode: bankData.bankDetails.ifsc_code || "",
                        swiftCode: bankData.bankDetails.swift_code || "",
                        isLocked: bankData.bankDetails.is_locked || false
                    });
                }

                // Fetch KYC status
                const kycData = await fetchFromBackend('/api/kyc/status');
                setIsKycVerified(kycData.status === 'approved');
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
                if (!security.current) {
                    throw new Error("Current password is required");
                }
                if (!security.newPass || security.newPass.length < 6) {
                    throw new Error("Password must be at least 6 characters");
                }
                if (security.newPass !== security.confirmPass) {
                    throw new Error("Passwords do not match");
                }

                // Call Password Update Endpoint
                await fetchFromBackend('/api/user/update-password', {
                    method: 'PUT',
                    body: JSON.stringify({
                        currentPassword: security.current,
                        newPassword: security.newPass
                    })
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
                        avatar_url: profile.avatarUrl
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

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            setUploading(true);
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Lazy import supabase client
            const { createClient } = await import('@/utils/supabase/client');
            const supabase = createClient();

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) {
                // Try creating bucket if it doesn't exist (though usually done via dashboard/migration)
                // If bucket doesn't exist, this will fail. User needs to ensure bucket exists.
                throw uploadError;
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // 3. Update local state
            setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));

            // 4. Trigger Save to persist immediately
            // We'll just updated local state, user can click save, OR we can auto-save.
            // Let's auto-save the avatar URL to backend for better UX.
            await fetchFromBackend('/api/user/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    avatar_url: publicUrl
                })
            });

            setSaveMessage({ type: 'success', text: 'Profile picture updated!' });
            setTimeout(() => setSaveMessage(null), 3000);

        } catch (error: any) {
            console.error('Error uploading avatar:', error);
            setSaveMessage({ type: 'error', text: 'Error uploading image. Make sure "avatars" bucket exists.' });
        } finally {
            setUploading(false);
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
                                    <div className="relative group">
                                        <div className="w-20 h-20 rounded-full bg-muted border-2 border-border overflow-hidden">
                                            {uploading ? (
                                                <div className="flex items-center justify-center w-full h-full bg-black/50">
                                                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                                                </div>
                                            ) : (
                                                <img
                                                    src={profile.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.displayName || 'User'}`}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            )}
                                        </div>
                                        <button
                                            onClick={handleAvatarClick}
                                            disabled={uploading}
                                            className="absolute -bottom-2 -right-2 p-1.5 bg-primary text-primary-foreground rounded-full border-4 border-card hover:scale-110 transition-transform cursor-pointer disabled:opacity-50"
                                        >
                                            <Camera size={14} />
                                        </button>
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            className="hidden"
                                            accept="image/png, image/jpeg, image/gif"
                                        />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm">{profile.displayName || profile.fullName || 'User'}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Profile Photo • Supports JPG, PNG</p>
                                    </div>
                                </div>

                                {/* Locked Fields Info */}
                                {isKycVerified && (
                                    <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
                                        <Shield className="inline w-4 h-4 mr-2" />
                                        Name and email are locked after KYC verification for security reasons.
                                    </div>
                                )}

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <TerminalInput
                                        label="Full Name (KYC Verified)"
                                        value={profile.fullName}
                                        onChange={(e: any) => setProfile({ ...profile, fullName: e.target.value })}
                                        readOnly={isKycVerified}
                                        icon={User}
                                    />
                                    <TerminalInput
                                        label="Email Address"
                                        value={profile.email}
                                        readOnly={true} // Keep email locked as it's the primary account ID
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

                                {/* Wallet Section */}
                                <div className="space-y-6 max-w-2xl mb-12">
                                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                        <Wallet size={16} /> Crypto Wallet (USDT TRC-20)
                                    </h4>

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
                                                    Once saved, your wallet address will be permanently locked for security.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-6">
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
                                            <div className="flex flex-col items-end gap-4 pt-4">
                                                {showOtpWallet && (
                                                    <div className="w-full max-w-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                        <TerminalInput
                                                            label="Verification Code"
                                                            value={otpCode}
                                                            onChange={(e: any) => setOtpCode(e.target.value)}
                                                            placeholder="Enter 6-digit OTP"
                                                            icon={Shield}
                                                        />
                                                        <p className="text-[10px] text-muted-foreground mt-2">
                                                            Check your email for a verification code.
                                                        </p>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={async () => {
                                                        if (!wallet.address || wallet.address.length < 30) {
                                                            setSaveMessage({ type: 'error', text: 'Please enter a valid TRON wallet address' });
                                                            return;
                                                        }

                                                        if (!showOtpWallet) {
                                                            try {
                                                                setIsLoading(true);
                                                                await fetchFromBackend('/api/user/request-financial-otp', {
                                                                    method: 'POST',
                                                                    body: JSON.stringify({ type: 'wallet' }),
                                                                });
                                                                setShowOtpWallet(true);
                                                                setSaveMessage({ type: 'success', text: 'Verification code sent to your email.' });
                                                            } catch (err: any) {
                                                                setSaveMessage({ type: 'error', text: err.message || 'Failed to send OTP' });
                                                            } finally {
                                                                setIsLoading(false);
                                                            }
                                                            return;
                                                        }

                                                        if (otpCode.length !== 6) {
                                                            setSaveMessage({ type: 'error', text: 'Please enter a 6-digit verification code' });
                                                            return;
                                                        }

                                                        setIsLoading(true);
                                                        setSaveMessage(null);

                                                        try {
                                                            await fetchFromBackend('/api/user/wallet', {
                                                                method: 'POST',
                                                                body: JSON.stringify({
                                                                    walletAddress: wallet.address,
                                                                    otp: otpCode
                                                                }),
                                                            });

                                                            setWallet({ ...wallet, isLocked: true });
                                                            setShowOtpWallet(false);
                                                            setOtpCode("");
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
                                                        <><Loader2 className="w-4 h-4 animate-spin" /> {showOtpWallet ? 'Verifying...' : 'Sending...'}</>
                                                    ) : (
                                                        <>{showOtpWallet ? <><CheckCircle size={16} /> Verify & Lock</> : <><Lock size={16} /> Save & Request OTP</>}</>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Bank Details Section */}
                                <div className="pt-8 border-t border-border mt-8 space-y-6 max-w-2xl">
                                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                                        <MapPin size={16} /> Bank Wire Details
                                    </h4>

                                    {bank.isLocked && (
                                        <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/10 flex items-start gap-4">
                                            <div className="mt-1 p-2 bg-green-500/10 rounded text-green-500"><CheckCircle size={18} /></div>
                                            <div>
                                                <h4 className="font-bold text-sm text-green-500">Bank Details Saved & Locked</h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Your bank details are securely locked. Contact support if you need to change them.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {!bank.isLocked && (
                                        <div className="p-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 flex items-start gap-4">
                                            <div className="mt-1 p-2 bg-yellow-500/10 rounded text-yellow-500"><AlertTriangle size={18} /></div>
                                            <div>
                                                <h4 className="font-bold text-sm text-yellow-500">Important: Details Cannot Be Changed</h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    Once saved, your bank details will be permanently locked for security.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <TerminalInput
                                            label="Account Holder Name"
                                            value={bank.accountHolderName}
                                            onChange={(e: any) => !bank.isLocked && setBank({ ...bank, accountHolderName: e.target.value })}
                                            readOnly={bank.isLocked}
                                            placeholder="Full name as per bank records"
                                        />
                                        <TerminalInput
                                            label="Bank Name"
                                            value={bank.bankName}
                                            onChange={(e: any) => !bank.isLocked && setBank({ ...bank, bankName: e.target.value })}
                                            readOnly={bank.isLocked}
                                            placeholder="e.g. HDFC, Chase, HSBC"
                                        />
                                        <TerminalInput
                                            label="Account Number"
                                            value={bank.accountNumber}
                                            onChange={(e: any) => !bank.isLocked && setBank({ ...bank, accountNumber: e.target.value })}
                                            readOnly={bank.isLocked}
                                            placeholder="Your bank account number"
                                        />
                                        <TerminalInput
                                            label="IFSC Code (for Indian Banks)"
                                            value={bank.ifscCode}
                                            onChange={(e: any) => !bank.isLocked && setBank({ ...bank, ifscCode: e.target.value })}
                                            readOnly={bank.isLocked}
                                            placeholder="e.g. HDFC0001234"
                                        />
                                        <div className="md:col-span-2">
                                            <TerminalInput
                                                label="SWIFT / BIC Code (for International Transfers)"
                                                value={bank.swiftCode}
                                                onChange={(e: any) => !bank.isLocked && setBank({ ...bank, swiftCode: e.target.value })}
                                                readOnly={bank.isLocked}
                                                placeholder="e.g. CHASUS33"
                                            />
                                        </div>
                                    </div>

                                    {!bank.isLocked && (
                                        <div className="flex flex-col items-end gap-4 pt-4">
                                            {showOtpBank && (
                                                <div className="w-full max-w-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                                    <TerminalInput
                                                        label="Verification Code"
                                                        value={otpCode}
                                                        onChange={(e: any) => setOtpCode(e.target.value)}
                                                        placeholder="Enter 6-digit OTP"
                                                        icon={Shield}
                                                    />
                                                    <p className="text-[10px] text-muted-foreground mt-2">
                                                        Check your email for a verification code.
                                                    </p>
                                                </div>
                                            )}

                                            <button
                                                onClick={async () => {
                                                    if (!bank.accountHolderName || !bank.bankName || !bank.accountNumber) {
                                                        setSaveMessage({ type: 'error', text: 'Please fill in required bank details' });
                                                        return;
                                                    }

                                                    if (!showOtpBank) {
                                                        try {
                                                            setIsLoading(true);
                                                            await fetchFromBackend('/api/user/request-financial-otp', {
                                                                method: 'POST',
                                                                body: JSON.stringify({ type: 'bank' }),
                                                            });
                                                            setShowOtpBank(true);
                                                            setSaveMessage({ type: 'success', text: 'Verification code sent to your email.' });
                                                        } catch (err: any) {
                                                            setSaveMessage({ type: 'error', text: err.message || 'Failed to send OTP' });
                                                        } finally {
                                                            setIsLoading(false);
                                                        }
                                                        return;
                                                    }

                                                    if (otpCode.length !== 6) {
                                                        setSaveMessage({ type: 'error', text: 'Please enter a 6-digit verification code' });
                                                        return;
                                                    }

                                                    setIsLoading(true);
                                                    setSaveMessage(null);

                                                    try {
                                                        await fetchFromBackend('/api/user/bank-details', {
                                                            method: 'POST',
                                                            body: JSON.stringify({
                                                                account_holder_name: bank.accountHolderName,
                                                                bank_name: bank.bankName,
                                                                account_number: bank.accountNumber,
                                                                ifsc_code: bank.ifscCode,
                                                                swift_code: bank.swiftCode,
                                                                otp: otpCode
                                                            }),
                                                        });

                                                        setBank({ ...bank, isLocked: true });
                                                        setShowOtpBank(false);
                                                        setOtpCode("");
                                                        setSaveMessage({ type: 'success', text: 'Bank details saved and locked successfully!' });
                                                    } catch (err: any) {
                                                        console.error("Bank details save error:", err);
                                                        setSaveMessage({ type: 'error', text: err.message || 'Failed to save bank details' });
                                                    } finally {
                                                        setIsLoading(false);
                                                    }
                                                }}
                                                disabled={isLoading || !bank.accountNumber}
                                                className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {isLoading ? (
                                                    <><Loader2 className="w-4 h-4 animate-spin" /> {showOtpBank ? 'Verifying...' : 'Sending...'}</>
                                                ) : (
                                                    <>{showOtpBank ? <><CheckCircle size={16} /> Verify & Lock</> : <><Lock size={16} /> Save & Request OTP</>}</>
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
