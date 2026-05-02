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

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    console.error("CRITICAL: JWT_SECRET environment variable is missing!");
}

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
    return { secret: 'mock-secret', qrCodeUrl: 'mock-url' };
}

export async function enableTOTP(secret: string, code: string) {
    return { success: true };
}

export async function generateTOTPSecretForSetup(tempToken: string) {
    return { secret: 'mock-secret', qrCodeUrl: 'mock-url' };
}

export async function enableTOTPForSetup(tempToken: string, secret: string, code: string) {
    return { success: true, pendingWebAuthnSetup: true };
}

export async function finalizeLoginFromSetup(tempToken: string) {
    return { success: true };
}

export async function disable2FA() {
    return { success: true };
}

export async function getWebAuthnRegistrationOptionsForSetup(tempToken: string) {
    return { challenge: 'mock-challenge' };
}

export async function verifyWebAuthnRegistrationForSetup(tempToken: string, attestationResponse: any) {
    return { success: true };
}

export async function getWebAuthnRegistrationOptions() {
    return { challenge: 'mock-challenge' };
}

export async function verifyWebAuthnRegistration(attestationResponse: any) {
    return { success: true };
}

export async function getWebAuthnAuthenticationOptions(tempToken: string) {
    return { challenge: 'mock-challenge' };
}

export async function verifyWebAuthnLogin(tempToken: string, authResponse: any) {
    return { success: true };
}

async function establishAdminSession(user: any) {
    return { success: true };
}

