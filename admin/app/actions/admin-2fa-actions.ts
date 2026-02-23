"use server";

import { generateSecret, generateURI, verify } from "otplib";
import qrcode from "qrcode";
import { getAdminUser } from "@/utils/get-admin-user";
import {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { isoUint8Array } from "@simplewebauthn/server/helpers";
import { cookies } from "next/headers";
import { createAdminClient } from "@/utils/supabase/admin";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || 'shark_admin_session_secure_2026_k8s_prod_v1';

const RP_NAME = "SharkFunded Admin";

// Helper to dynamically get RP_ID and ORIGIN per request avoiding cached "localhost"
async function getDynamicConfig() {
    const headersList = await cookies(); // In server actions we can just get origin headers securely, but simple string match is fine
    const origin = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.sharkfunded.com";

    let rpId = "localhost";
    try {
        rpId = new URL(origin).hostname;
    } catch (e) { }

    // Explicit override if set
    rpId = process.env.NEXT_PUBLIC_RP_ID || rpId || "localhost";

    return { RP_ID: rpId, ORIGIN: origin };
}

// --- TOTP Actions ---

export async function generateTOTPSecret() {
    const user = await getAdminUser();
    if (!user) throw new Error("Unauthorized");

    const secret = generateSecret();
    const otpauth = generateURI({
        secret,
        label: user.email,
        issuer: RP_NAME,
    });
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    return { secret, qrCodeUrl };
}

export async function enableTOTP(secret: string, code: string) {
    const user = await getAdminUser();
    if (!user) throw new Error("Unauthorized");

    const isValid = (await verify({ token: code, secret })) as any;
    if (!isValid || !isValid.valid) return { error: "Invalid verification code" };

    const supabase = createAdminClient();
    const { error } = await supabase
        .from("admin_users")
        .update({
            two_factor_secret: secret,
            is_two_factor_enabled: true
        })
        .eq("id", user.id);

    if (error) throw new Error(error.message);
    return { success: true };
}

// Actions for mandatory setup during login (using tempToken)
export async function generateTOTPSecretForSetup(tempToken: string) {
    const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
    if (!decoded || decoded.purpose !== '2fa_verification') {
        throw new Error("Invalid or expired session");
    }

    const supabase = createAdminClient();
    const { data: user } = await supabase
        .from("admin_users")
        .select("email")
        .eq("id", decoded.id)
        .single();

    if (!user) throw new Error("User not found");

    const secret = generateSecret();
    const otpauth = generateURI({
        secret,
        label: user.email,
        issuer: RP_NAME,
    });
    const qrCodeUrl = await qrcode.toDataURL(otpauth);

    return { secret, qrCodeUrl };
}

export async function enableTOTPForSetup(tempToken: string, secret: string, code: string) {
    const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
    if (!decoded || decoded.purpose !== '2fa_verification') {
        return { error: "Invalid or expired session" };
    }

    const isValid = (await verify({ token: code, secret })) as any;
    if (!isValid || !isValid.valid) return { error: "Invalid verification code" };

    const supabase = createAdminClient();

    // 1. Enable 2FA
    const { error: updateError } = await supabase
        .from("admin_users")
        .update({
            two_factor_secret: secret,
            is_two_factor_enabled: true
        })
        .eq("id", decoded.id);

    if (updateError) return { error: updateError.message };

    // 2. Fetch full user to establish session
    const { data: user } = await supabase
        .from("admin_users")
        .select("id, email, full_name, role, permissions")
        .eq("id", decoded.id)
        .single();

    if (!user) return { error: "User not found after update" };

    // Note: We intentionally do NOT establish a session here anymore.
    // This allows the UI to proceed to the "Setup Biometrics?" step. 
    // The UI must explicitly call a new function to finalize login if they skip it.
    return { success: true, pendingWebAuthnSetup: true };
}

export async function finalizeLoginFromSetup(tempToken: string) {
    const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
    if (!decoded || decoded.purpose !== '2fa_verification') {
        return { error: "Invalid or expired session" };
    }

    const supabase = createAdminClient();
    const { data: user } = await supabase
        .from("admin_users")
        .select("id, email, full_name, role, permissions")
        .eq("id", decoded.id)
        .single();

    if (!user) return { error: "User not found" };

    return await establishAdminSession(user);
}

export async function disable2FA() {
    const user = await getAdminUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = createAdminClient();
    const { error } = await supabase
        .from("admin_users")
        .update({
            two_factor_secret: null,
            is_two_factor_enabled: false,
            is_webauthn_enabled: false
        })
        .eq("id", user.id);

    if (error) throw new Error(error.message);
    return { success: true };
}

// --- WebAuthn Actions ---

// WebAuthn Setup during initial login flow
export async function getWebAuthnRegistrationOptionsForSetup(tempToken: string) {
    const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
    if (!decoded || decoded.purpose !== '2fa_verification') {
        throw new Error("Invalid or expired session");
    }

    const supabase = createAdminClient();
    const { data: user } = await supabase
        .from("admin_users")
        .select("id, email, webauthn_credentials")
        .eq("id", decoded.id)
        .single();

    if (!user) throw new Error("User not found");

    const existingCredentials = (user.webauthn_credentials as any[]) || [];

    const { RP_ID, ORIGIN } = await getDynamicConfig();

    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: isoUint8Array.fromUTF8String(user.id),
        userName: user.email,
        attestationType: "none",
        excludeCredentials: existingCredentials.map((cred) => ({
            id: cred.id,
            type: "public-key",
        })),
        authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred",
            authenticatorAttachment: "platform", // Encourages FaceID/TouchID
        },
    });

    // Store challenge in cookie/session for verification
    const cookieStore = await cookies();
    cookieStore.set("webauthn_registration_challenge", options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 5, // 5 minutes
    });

    return options;
}

export async function verifyWebAuthnRegistrationForSetup(tempToken: string, attestationResponse: any) {
    const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
    if (!decoded || decoded.purpose !== '2fa_verification') {
        return { error: "Invalid or expired session" };
    }

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get("webauthn_registration_challenge")?.value;
    if (!expectedChallenge) return { error: "Registration challenge expired" };

    const { RP_ID, ORIGIN } = await getDynamicConfig();

    const verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        const supabase = createAdminClient();

        const { data: user } = await supabase
            .from("admin_users")
            .select("id, email, full_name, role, permissions, webauthn_credentials")
            .eq("id", decoded.id)
            .single();

        if (!user) return { error: "User not found" };

        const credentials = (user.webauthn_credentials as any[]) || [];

        // Add new credential
        credentials.push({
            id: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString("base64"),
            counter: credential.counter,
            deviceType: "platform", // Simplified for now
            transports: attestationResponse.response.transports,
        });

        await supabase
            .from("admin_users")
            .update({
                webauthn_credentials: credentials,
                is_webauthn_enabled: true
            })
            .eq("id", user.id);

        cookieStore.delete("webauthn_registration_challenge");

        // Finalize login now that WebAuthn is set up
        return await establishAdminSession(user);
    }

    return { error: "Registration verification failed" };
}

export async function getWebAuthnRegistrationOptions() {
    const user = await getAdminUser();
    if (!user) throw new Error("Unauthorized");

    const supabase = createAdminClient();
    const { data: adminUser } = await supabase
        .from("admin_users")
        .select("webauthn_credentials")
        .eq("id", user.id)
        .single();

    const existingCredentials = (adminUser?.webauthn_credentials as any[]) || [];

    const { RP_ID, ORIGIN } = await getDynamicConfig();

    const options = await generateRegistrationOptions({
        rpName: RP_NAME,
        rpID: RP_ID,
        userID: isoUint8Array.fromUTF8String(user.id),
        userName: user.email,
        attestationType: "none",
        excludeCredentials: existingCredentials.map((cred) => ({
            id: cred.id,
            type: "public-key",
        })),
        authenticatorSelection: {
            residentKey: "preferred",
            userVerification: "preferred",
            authenticatorAttachment: "platform", // Encourages FaceID/TouchID
        },
    });

    // Store challenge in cookie/session for verification
    const cookieStore = await cookies();
    cookieStore.set("webauthn_registration_challenge", options.challenge, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 5, // 5 minutes
    });

    return options;
}

export async function verifyWebAuthnRegistration(attestationResponse: any) {
    const user = await getAdminUser();
    if (!user) throw new Error("Unauthorized");

    const cookieStore = await cookies();
    const expectedChallenge = cookieStore.get("webauthn_registration_challenge")?.value;
    if (!expectedChallenge) throw new Error("Registration challenge expired");

    const { RP_ID, ORIGIN } = await getDynamicConfig();

    const verification = await verifyRegistrationResponse({
        response: attestationResponse,
        expectedChallenge,
        expectedOrigin: ORIGIN,
        expectedRPID: RP_ID,
    });

    if (verification.verified && verification.registrationInfo) {
        const { credential } = verification.registrationInfo;
        const supabase = createAdminClient();

        const { data: adminUser } = await supabase
            .from("admin_users")
            .select("webauthn_credentials")
            .eq("id", user.id)
            .single();

        const credentials = (adminUser?.webauthn_credentials as any[]) || [];

        // Add new credential
        credentials.push({
            id: credential.id,
            publicKey: Buffer.from(credential.publicKey).toString("base64"),
            counter: credential.counter,
            deviceType: "platform", // Simplified for now
            transports: attestationResponse.response.transports,
        });

        await supabase
            .from("admin_users")
            .update({
                webauthn_credentials: credentials,
                is_webauthn_enabled: true
            })
            .eq("id", user.id);

        cookieStore.delete("webauthn_registration_challenge");
        return { success: true };
    }

    return { error: "Registration verification failed" };
}

// --- Login Flow Actions for WebAuthn ---

export async function getWebAuthnAuthenticationOptions(tempToken: string) {
    try {
        const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
        if (!decoded || decoded.purpose !== '2fa_verification') {
            throw new Error("Invalid or expired session");
        }

        const supabase = createAdminClient();
        const { data: user } = await supabase
            .from("admin_users")
            .select("id, email, webauthn_credentials")
            .eq("id", decoded.id)
            .single();

        if (!user || !(user.webauthn_credentials as any[])?.length) {
            throw new Error("No WebAuthn credentials found");
        }

        const { RP_ID, ORIGIN } = await getDynamicConfig();

        const options = await generateAuthenticationOptions({
            rpID: RP_ID,
            allowCredentials: (user.webauthn_credentials as any[]).map((cred) => ({
                id: cred.id,
                type: "public-key",
                transports: cred.transports,
            })),
            userVerification: "preferred",
        });

        const cookieStore = await cookies();
        cookieStore.set("webauthn_auth_challenge", options.challenge, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 5,
        });

        return options;
    } catch (e) {
        throw e;
    }
}


export async function verifyWebAuthnLogin(tempToken: string, authResponse: any) {
    try {
        const decoded = jwt.verify(tempToken, JWT_SECRET) as any;
        if (!decoded || decoded.purpose !== '2fa_verification') {
            return { error: "Invalid or expired session" };
        }

        const supabase = createAdminClient();
        const { data: user } = await supabase
            .from("admin_users")
            .select("id, email, full_name, role, permissions, webauthn_credentials")
            .eq("id", decoded.id)
            .single();

        if (!user || !(user.webauthn_credentials as any[])?.length) {
            return { error: "WebAuthn not configured for this user" };
        }

        const cookieStore = await cookies();
        const expectedChallenge = cookieStore.get("webauthn_auth_challenge")?.value;
        if (!expectedChallenge) return { error: "Authentication challenge expired" };

        const credential = (user.webauthn_credentials as any[]).find(
            (c) => c.id === authResponse.id
        );

        if (!credential) return { error: "Credential not found" };

        const { RP_ID, ORIGIN } = await getDynamicConfig();

        const verification = await verifyAuthenticationResponse({
            response: authResponse,
            expectedChallenge,
            expectedOrigin: ORIGIN,
            expectedRPID: RP_ID,
            credential: {
                id: credential.id,
                publicKey: new Uint8Array(Buffer.from(credential.publicKey, "base64")),
                counter: credential.counter,
                transports: credential.transports,
            },
        });

        if (verification.verified) {
            // Update counter
            const updatedCredentials = (user.webauthn_credentials as any[]).map(c =>
                c.id === authResponse.id ? { ...c, counter: verification.authenticationInfo.newCounter } : c
            );

            await supabase
                .from("admin_users")
                .update({ webauthn_credentials: updatedCredentials })
                .eq("id", user.id);

            cookieStore.delete("webauthn_auth_challenge");

            // This part is tricky because we need to set the session cookie from here.
            // Ideally, establishAdminSession should be shared.
            // For now, I'll return success and the login page can call establishAdminSession if possible,
            // or I'll just duplicate the session logic here.
            return await establishAdminSession(user);
        }

        return { error: "WebAuthn verification failed" };
    } catch (e) {
        console.error("WebAuthn verify error:", e);
        return { error: "Verification failed" };
    }
}

async function establishAdminSession(user: any) {
    const supabase = createAdminClient();

    // Fetch current tracking data to handle daily reset
    const { data: dbUser } = await supabase
        .from("admin_users")
        .select("daily_login_count, last_login_date")
        .eq("id", user.id)
        .single();

    const today = new Date().toISOString().split('T')[0];
    let newCount = 1;

    if (dbUser) {
        if (dbUser.last_login_date === today) {
            newCount = (dbUser.daily_login_count || 0) + 1;
        }
    }

    // Update tracking data
    await supabase
        .from("admin_users")
        .update({
            last_seen: new Date().toISOString(),
            daily_login_count: newCount,
            last_login_date: today
        })
        .eq("id", user.id);

    const token = jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role || 'admin',
            full_name: user.full_name,
            permissions: user.permissions || []
        },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const cookieStore = await cookies();
    cookieStore.set("admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
        path: "/",
        sameSite: "lax"
    });

    cookieStore.set("admin_email", user.email, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 15, // 15 minutes
        path: "/",
        sameSite: "lax"
    });

    return { success: true };
}

