"use client";

import { loginAdmin, verifyTOTPLogin } from "@/app/actions/admin-auth";
import {
    getWebAuthnAuthenticationOptions,
    verifyWebAuthnLogin,
    generateTOTPSecretForSetup,
    enableTOTPForSetup
} from "@/app/actions/admin-2fa-actions";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Smartphone, Fingerprint, Loader2, ArrowRight } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";

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
    const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);

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
            if (result.success) {
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

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
                    <div className="text-center mb-8">
                        <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-600 mb-4">
                            <Shield className="h-6 w-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900">
                            {show2FA || show2FASetup ? "Security Verification" : "Admin Portal"}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {show2FASetup
                                ? "Two-factor authentication is required"
                                : (show2FA ? "Choose a verification method to continue" : "Sign in to manage your dashboard")}
                        </p>
                    </div>

                    {!show2FA && !show2FASetup ? (
                        <form className="space-y-5" onSubmit={handleSubmit}>
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 mb-1.5"
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
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 placeholder:text-gray-400"
                                    placeholder="admin@sharkfunded.com"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700 mb-1.5"
                                >
                                    Password
                                </label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                    placeholder="••••••••"
                                />
                            </div>

                            {error && (
                                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                {loading ? "Signing in..." : "Sign in"}
                            </button>
                        </form>
                    ) : show2FASetup ? (
                        <div className="space-y-6">
                            {!setupData ? (
                                <div className="space-y-4 text-center">
                                    <p className="text-sm text-gray-600">
                                        For your protection, you must enable Two-Factor Authentication (2FA) before accessing the admin portal.
                                    </p>
                                    <button
                                        onClick={handleSetupStart}
                                        disabled={loading}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
                                    >
                                        Start 2FA Setup
                                        <ArrowRight className="h-4 w-4" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-white p-4 border rounded-xl shadow-sm flex justify-center">
                                        <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-[160px] h-[160px]" />
                                    </div>
                                    <div className="space-y-4">
                                        <p className="text-sm text-gray-600 text-center">
                                            Scan the QR code with your authenticator app and enter the 6-digit code.
                                        </p>
                                        <form onSubmit={handleSetupVerify} className="space-y-3">
                                            <input
                                                type="text"
                                                maxLength={6}
                                                placeholder="000000"
                                                value={totpCode}
                                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                                                className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-xl tracking-[0.5em] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                            />
                                            <button
                                                type="submit"
                                                disabled={loading || totpCode.length !== 6}
                                                className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                            >
                                                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                                Enable & Login
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setShow2FASetup(false);
                                    setSetupData(null);
                                    setError(null);
                                }}
                                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 font-medium"
                            >
                                Back to login
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {availableMethods?.webauthn && (
                                <button
                                    onClick={handleWebAuthnVerify}
                                    disabled={loading}
                                    className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                >
                                    <Fingerprint className="h-5 w-5 text-indigo-600" />
                                    Use Biometrics (FaceID/TouchID)
                                </button>
                            )}

                            {availableMethods?.totp && (
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 text-sm font-medium text-gray-700">
                                        <Smartphone className="h-5 w-5 text-indigo-600" />
                                        <span>Authenticator App</span>
                                    </div>
                                    <form onSubmit={handleTOTPVerify} className="space-y-3">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000000"
                                            value={totpCode}
                                            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ""))}
                                            className="block w-full rounded-lg border border-gray-300 px-3 py-2.5 text-center text-xl tracking-[0.5em] focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading || totpCode.length !== 6}
                                            className="flex w-full justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                        >
                                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                            Verify Code
                                        </button>
                                    </form>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                                    {error}
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    setShow2FA(false);
                                    setError(null);
                                }}
                                className="w-full text-center text-sm text-gray-500 hover:text-gray-700 font-medium"
                            >
                                Back to login
                            </button>
                        </div>
                    )}
                </div>

                <p className="mt-4 text-center text-xs text-gray-500">
                    Protected area - Authorized personnel only
                </p>
            </div>
        </div>
    );
}
