"use client";

import { loginAdmin, verifyTOTPLogin } from "@/app/actions/admin-auth";
import {
    getWebAuthnAuthenticationOptions,
    verifyWebAuthnLogin,
    generateTOTPSecretForSetup,
    enableTOTPForSetup,
    getWebAuthnRegistrationOptionsForSetup,
    verifyWebAuthnRegistrationForSetup,
    finalizeLoginFromSetup
} from "@/app/actions/admin-2fa-actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Smartphone, Fingerprint, Loader2, ArrowRight } from "lucide-react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export default function AdminLoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // 2FA States
    const [show2FA, setShow2FA] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [twoFactorToken, setTwoFactorToken] = useState<string | null>(null);
    const [totpCode, setTotpCode] = useState("");
    const [availableMethods, setAvailableMethods] = useState<{ totp?: boolean; webauthn?: boolean } | null>(null);

    // Setup States
    const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
    const [setupStep, setSetupStep] = useState<"initial" | "totp" | "webauthn_prompt">("initial");

    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const formData = new FormData();
            formData.append("email", email);
            formData.append("password", password);

            const result = await loginAdmin(formData);
            console.log("Login result:", result);

            if (result?.error) {
                setError(result.error);
            } else if (result?.requires2FA) {
                setTwoFactorToken(result.tempToken);
                setAvailableMethods(result.methods);
                setShow2FA(true);
            } else if (result?.requires2FASetup) {
                setTwoFactorToken(result.tempToken);
                setShow2FASetup(true);
                setSetupStep("initial");
            } else if (result?.success) {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err) {
            setError("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleTOTPVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!twoFactorToken || totpCode.length !== 6) return;

        setError(null);
        setLoading(true);
        try {
            const result = await verifyTOTPLogin(twoFactorToken, totpCode);
            if ('success' in result && result.success) {
                router.push("/dashboard");
                router.refresh();
            } else if ('error' in result) {
                setError(result.error || "Verification failed");
            }
        } catch (err) {
            setError("Verification error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleWebAuthnVerify = async () => {
        if (!twoFactorToken) return;
        setError(null);
        setLoading(true);
        try {
            const options = await getWebAuthnAuthenticationOptions(twoFactorToken);
            const authResponse = await startAuthentication({ optionsJSON: options });
            const result = (await verifyWebAuthnLogin(twoFactorToken, authResponse)) as any;

            if (result.success) {
                router.push("/dashboard");
                router.refresh();
            } else {
                setError(result.error || "Biometric auth failed");
            }
        } catch (err: any) {
            setError(err.message || "Biometric authentication error");
        } finally {
            setLoading(false);
        }
    };

    const handleSetupStart = async () => {
        if (!twoFactorToken) return;
        setLoading(true);
        try {
            const data = await generateTOTPSecretForSetup(twoFactorToken);
            setSetupData(data);
            setSetupStep("totp");
        } catch (err) {
            setError("Failed to generate setup data");
        } finally {
            setLoading(false);
        }
    };

    const handleSetupVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!twoFactorToken || !setupData || totpCode.length !== 6) return;

        setError(null);
        setLoading(true);
        try {
            const result = (await enableTOTPForSetup(twoFactorToken, setupData.secret, totpCode)) as any;
            if (result.pendingWebAuthnSetup) {
                // TOTP succeeded, move to WebAuthn prompt
                setSetupStep("webauthn_prompt");
            } else if (result.success) {
                router.push("/dashboard");
                router.refresh();
            } else {
                setError(result.error || "Setup failed");
            }
        } catch (err) {
            setError("Setup verification error");
        } finally {
            setLoading(false);
        }
    };

    const handleWebAuthnSetupStart = async () => {
        if (!twoFactorToken) return;
        setError(null);
        setLoading(true);
        try {
            const options = await getWebAuthnRegistrationOptionsForSetup(twoFactorToken);
            const authResponse = await startRegistration({ optionsJSON: options });
            const result = (await verifyWebAuthnRegistrationForSetup(twoFactorToken, authResponse)) as any;

            if (result.success) {
                router.push("/dashboard");
                router.refresh();
            } else {
                setError(result.error || "Biometric setup failed");
            }
        } catch (err: any) {
            // Ignore abort errors from the browser cancelling the prompt
            if (err.name === 'NotAllowedError') {
                setError("Registration cancelled");
            } else {
                setError("Biometric registration error");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSkipWebAuthnSetup = async () => {
        if (!twoFactorToken) return;
        setLoading(true);
        try {
            const result = await finalizeLoginFromSetup(twoFactorToken);
            if ('success' in result && result.success) {
                router.push("/dashboard");
                router.refresh();
            } else if ('error' in result) {
                setError(result.error || "Failed to finalize login");
            }
        } catch (err) {
            setError("Failed to finalize login");
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="flex min-h-screen items-center justify-center bg-[#f8f9fa] px-4 font-sans relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/50 rounded-full blur-[100px] -mr-40 -mt-40 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-50/50 rounded-full blur-[100px] -ml-40 -mb-40 pointer-events-none" />

            <div className="w-full max-w-[420px] relative z-10">
                {/* Logo Area */}
                <div className="flex justify-center mb-8">
                    <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Shield className="h-5 w-5 text-white" />
                        </div>
                        <span className="text-2xl font-bold tracking-tight text-gray-900">SharkFunded</span>
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-white/80 backdrop-blur-xl rounded-[24px] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-10 transition-all duration-300">
                    <div className="text-center mb-8">
                        <h2 className="text-[22px] font-bold text-gray-900 tracking-tight">
                            {show2FA || show2FASetup ? "Security Verification" : "Admin Portal"}
                        </h2>
                        <p className="mt-2 text-[15px] text-gray-500 font-medium">
                            {show2FASetup
                                ? "Two-factor authentication is required"
                                : (show2FA ? "Choose a verification method to continue" : "Sign in to manage your workspace")}
                        </p>
                    </div>

                    {!show2FA && !show2FASetup ? (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div className="space-y-1.5">
                                <label
                                    htmlFor="email"
                                    className="block text-[13px] font-semibold text-gray-700 uppercase tracking-wider"
                                >
                                    Email Address
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-[15px] text-gray-900 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400"
                                    placeholder="admin@sharkfunded.com"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                    <label
                                        htmlFor="password"
                                        className="block text-[13px] font-semibold text-gray-700 uppercase tracking-wider"
                                    >
                                        Password
                                    </label>
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-3 text-[15px] text-gray-900 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                                    placeholder="••••••••••••"
                                />
                            </div>

                            {error && (
                                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center rounded-xl bg-gray-900 px-4 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none mt-6"
                            >
                                {loading ? (
                                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                ) : null}
                                {loading ? "Authenticating..." : "Sign In"}
                            </button>
                        </form>
                    ) : show2FASetup ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            {setupStep === "initial" && (
                                <div className="space-y-6 text-center">
                                    <div className="bg-blue-50 text-blue-800 text-[14px] leading-relaxed p-4 rounded-xl border border-blue-100">
                                        For your protection, you must enable Two-Factor Authentication (2FA) before accessing the admin portal.
                                    </div>
                                    <button
                                        onClick={handleSetupStart}
                                        disabled={loading}
                                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                                    >
                                        Start 2FA Setup
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            )}

                            {setupStep === "totp" && setupData && (
                                <div className="space-y-6">
                                    <div className="bg-gray-50/80 p-6 border border-gray-100 rounded-2xl flex flex-col items-center justify-center gap-4">
                                        <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100">
                                            <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-[180px] h-[180px]" />
                                        </div>
                                        <p className="text-[14px] text-gray-500 text-center font-medium max-w-[280px]">
                                            Scan the QR code with your authenticator app
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        <form onSubmit={handleSetupVerify} className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="block text-[13px] font-semibold text-gray-700 uppercase tracking-wider text-center">
                                                    Enter 6-Digit Code
                                                </label>
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    placeholder="000000"
                                                    value={totpCode}
                                                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                                                    className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] text-gray-900 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-300"
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={loading || totpCode.length !== 6}
                                                className="flex w-full justify-center rounded-xl bg-gray-900 px-4 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                                            >
                                                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                                                Verify App
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {setupStep === "webauthn_prompt" && (
                                <div className="space-y-6 text-center">
                                    <div className="flex justify-center mb-2">
                                        <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100">
                                            <Fingerprint className="h-8 w-8 text-blue-600" />
                                        </div>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-900">Authenticator Verified!</h3>
                                    <div className="bg-gray-50 text-gray-600 text-[14px] leading-relaxed p-4 rounded-xl border border-gray-100">
                                        Would you also like to add Face ID / Touch ID for faster login next time?
                                    </div>

                                    <div className="space-y-3 pt-2">
                                        <button
                                            onClick={handleWebAuthnSetupStart}
                                            disabled={loading}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                                        >
                                            <Fingerprint className="h-5 w-5" />
                                            Setup Biometrics
                                        </button>
                                        <button
                                            onClick={handleSkipWebAuthnSetup}
                                            disabled={loading}
                                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3.5 text-[15px] font-semibold text-gray-700 transition-all hover:bg-gray-50 border border-gray-200 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                                        >
                                            Skip & Go to Dashboard
                                        </button>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}

                            {(setupStep === "initial" || setupStep === "totp") && (
                                <button
                                    onClick={() => {
                                        setShow2FASetup(false);
                                        setSetupData(null);
                                        setSetupStep("initial");
                                        setError(null);
                                    }}
                                    className="w-full text-center text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors"
                                >
                                    Back to login
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                            {availableMethods?.webauthn && (
                                <button
                                    onClick={handleWebAuthnVerify}
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3.5 text-[15px] font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] shadow-sm"
                                >
                                    <Fingerprint className="h-5 w-5 text-gray-900" />
                                    Use Biometrics (FaceID/TouchID)
                                </button>
                            )}

                            {availableMethods?.totp && (
                                <div className="space-y-5">
                                    <div className="flex items-center gap-3 text-[14px] font-medium text-gray-600 justify-center">
                                        <Smartphone className="h-5 w-5" />
                                        <span>Authenticator App Verification</span>
                                    </div>
                                    <form onSubmit={handleTOTPVerify} className="space-y-4">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000000"
                                            value={totpCode}
                                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                                            className="block w-full rounded-xl border border-gray-200 bg-gray-50/50 px-4 py-4 text-center text-3xl font-mono tracking-[0.5em] text-gray-900 transition-colors focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-300"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading || totpCode.length !== 6}
                                            className="flex w-full justify-center rounded-xl bg-gray-900 px-4 py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-gray-800 hover:shadow-lg hover:shadow-gray-900/20 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none"
                                        >
                                            {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                                            Verify Code
                                        </button>
                                    </form>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-600 font-medium animate-in fade-in slide-in-from-top-1">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setShow2FA(false);
                                    setError(null);
                                }}
                                className="w-full text-center text-[14px] text-gray-500 hover:text-gray-900 font-medium transition-colors mt-2"
                            >
                                Back to login
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center text-[13px] text-gray-400 font-medium tracking-wide pb-12">
                    SharkFunded Admin Portal &copy; {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
}
