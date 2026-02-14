"use client";

import { useState, useEffect } from "react";
import { Shield, Key, Smartphone, Fingerprint, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import {
    generateTOTPSecret,
    enableTOTP,
    disable2FA,
    getWebAuthnRegistrationOptions,
    verifyWebAuthnRegistration
} from "@/app/actions/admin-2fa-actions";
import { QRCodeSVG } from "qrcode.react";
import { startRegistration } from "@simplewebauthn/browser";
import { toast } from "sonner";

export function SecuritySettingsClient() {
    const [is2FAEnabled, setIs2FAEnabled] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
    const [verificationCode, setVerificationCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [webauthnEnabled, setWebauthnEnabled] = useState(false);

    // In a real app, we'd fetch the current status on mount
    useEffect(() => {
        // Assume we fetch this from the user object or a specific endpoint
        // For now, it's managed by the actions
    }, []);

    const handleStartSetup = async () => {
        setLoading(true);
        try {
            const data = await generateTOTPSecret();
            setSetupData(data);
            setShowSetup(true);
        } catch (error) {
            toast.error("Failed to generate 2FA secret");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAndEnable = async () => {
        if (!setupData || !verificationCode) return;
        setLoading(true);
        try {
            const result = await enableTOTP(setupData.secret, verificationCode);
            if (result.success) {
                setIs2FAEnabled(true);
                setShowSetup(false);
                setSetupData(null);
                setVerificationCode("");
                toast.success("2FA enabled successfully");
            } else {
                toast.error(result.error || "Invalid code");
            }
        } catch (error) {
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleDisable = async () => {
        if (!confirm("Are you sure you want to disable 2FA? This will decrease your account security.")) return;
        setLoading(true);
        try {
            const result = await disable2FA();
            if (result.success) {
                setIs2FAEnabled(false);
                setWebauthnEnabled(false);
                toast.success("2FA disabled");
            }
        } catch (error) {
            toast.error("Failed to disable 2FA");
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterWebAuthn = async () => {
        setLoading(true);
        try {
            const options = await getWebAuthnRegistrationOptions();
            const attestationResponse = await startRegistration({ optionsJSON: options });
            const verification = await verifyWebAuthnRegistration(attestationResponse);

            if (verification.success) {
                setWebauthnEnabled(true);
                toast.success("Biometric authentication registered!");
            } else {
                toast.error(verification.error || "Registration failed");
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "FaceID/TouchID registration failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl space-y-6">
            {/* TOTP Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex gap-3">
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Authenticator App (TOTP)</h3>
                            <p className="text-sm text-gray-500">Use an app like Google Authenticator or Authy to generate codes.</p>
                        </div>
                    </div>
                    {is2FAEnabled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Enabled
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Disabled
                        </span>
                    )}
                </div>

                {!is2FAEnabled && !showSetup && (
                    <button
                        onClick={handleStartSetup}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                        Setup Authenticator
                    </button>
                )}

                {showSetup && setupData && (
                    <div className="mt-6 border-t pt-6 space-y-6">
                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="bg-white p-4 border rounded-xl shadow-sm">
                                <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-[180px] h-[180px]" />
                            </div>
                            <div className="space-y-4 flex-1">
                                <p className="text-sm text-gray-600">
                                    1. Scan this QR code with your authenticator app.
                                </p>
                                <p className="text-sm text-gray-600">
                                    2. Enter the 6-digit code from the app to verify.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        maxLength={6}
                                        placeholder="000000"
                                        value={verificationCode}
                                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                                        className="block w-32 rounded-lg border border-gray-300 px-3 py-2 text-center text-lg tracking-widest focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    />
                                    <button
                                        onClick={handleVerifyAndEnable}
                                        disabled={loading || verificationCode.length !== 6}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                        Verify & Enable
                                    </button>
                                    <button
                                        onClick={() => setShowSetup(false)}
                                        className="text-gray-500 px-4 py-2 text-sm font-medium hover:text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {is2FAEnabled && (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3 items-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <p className="text-sm text-green-700">Your account is protected by 2FA.</p>
                        </div>
                        <button
                            onClick={handleDisable}
                            className="text-red-600 flex items-center gap-2 text-sm font-medium hover:underline"
                        >
                            <Trash2 className="w-4 h-4" />
                            Disable 2FA
                        </button>
                    </div>
                )}
            </div>

            {/* WebAuthn Section */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Fingerprint className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Biometric Authentication</h3>
                            <p className="text-sm text-gray-500">Sign in using FaceID, TouchID, or your computer's security key.</p>
                        </div>
                    </div>
                    {webauthnEnabled ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Registered
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Not Registered
                        </span>
                    )}
                </div>

                <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        {webauthnEnabled
                            ? "You have already registered a biometric device. You can register another one if you'd like."
                            : "Register your device's biometric system for even faster and more secure logins."}
                    </p>
                    <button
                        onClick={handleRegisterWebAuthn}
                        disabled={loading}
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
                    >
                        <Shield className="w-4 h-4" />
                        {webauthnEnabled ? "Register Another Device" : "Setup Biometrics"}
                    </button>
                </div>
            </div>

            {/* Warning Section */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                <div className="flex gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                        <h4 className="text-sm font-bold text-amber-900">Important Note</h4>
                        <p className="mt-1 text-sm text-amber-700">
                            Enabling 2FA adds an extra layer of security. Please ensure you have access to your recovery methods.
                            If you lose access to your 2FA device, you'll need to contact another super admin to reset it.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
